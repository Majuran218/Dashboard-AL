// backend/src/controllers/notesController.js
const Note = require('../models/Note');
const Subject = require('../models/Subject');
const Stream = require('../models/Stream');
const NoteBookmark = require('../models/NoteBookmark');
const NoteDownload = require('../models/NoteDownload');
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// Get all notes with filters
exports.getAllNotes = catchAsync(async (req, res, next) => {
  const {
    subject_id,
    stream_id,
    topic,
    difficulty,
    search,
    sort_by = 'created_at',
    order = 'DESC',
    page = 1,
    limit = 20
  } = req.query;

  const whereClause = { is_published: true };
  
  if (subject_id) whereClause.subject_id = subject_id;
  if (stream_id) whereClause.stream_id = stream_id;
  if (topic) whereClause.topic = { [Op.iLike]: `%${topic}%` };
  if (difficulty) whereClause.difficulty = difficulty;
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { topic: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const offset = (page - 1) * limit;

  const { count, rows: notes } = await Note.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'code']
      },
      {
        model: Stream,
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'full_name']
      }
    ],
    order: [[sort_by, order]],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Add bookmark and download status for logged in users
  if (req.user) {
    const bookmarks = await NoteBookmark.findAll({
      where: {
        user_id: req.user.id,
        note_id: notes.map(n => n.id)
      }
    });

    const downloads = await NoteDownload.findAll({
      where: {
        user_id: req.user.id,
        note_id: notes.map(n => n.id)
      }
    });

    const bookmarkedIds = new Set(bookmarks.map(b => b.note_id));
    const downloadedIds = new Set(downloads.map(d => d.note_id));

    notes.forEach(note => {
      note.setDataValue('is_bookmarked', bookmarkedIds.has(note.id));
      note.setDataValue('is_downloaded', downloadedIds.has(note.id));
    });
  }

  res.status(200).json({
    status: 'success',
    results: notes.length,
    total: count,
    total_pages: Math.ceil(count / limit),
    current_page: parseInt(page),
    data: {
      notes
    }
  });
});

// Get single note by ID
exports.getNoteById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await Note.findByPk(id, {
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'code']
      },
      {
        model: Stream,
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'full_name']
      }
    ]
  });

  if (!note) {
    return next(new AppError('Note not found', 404));
  }

  // Check if note is published or user is admin/owner
  if (!note.is_published && (!req.user || (req.user.id !== note.uploaded_by && !req.user.is_admin))) {
    return next(new AppError('Note not found', 404));
  }

  // Increment view count
  await note.increment('view_count');

  // Get user-specific data if logged in
  if (req.user) {
    const [isBookmarked, isDownloaded] = await Promise.all([
      NoteBookmark.findOne({
        where: { user_id: req.user.id, note_id: id }
      }),
      NoteDownload.findOne({
        where: { user_id: req.user.id, note_id: id }
      })
    ]);

    note.setDataValue('is_bookmarked', !!isBookmarked);
    note.setDataValue('is_downloaded', !!isDownloaded);
  }

  res.status(200).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Create new note (teachers/admins only)
exports.createNote = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if user has permission (teacher or admin)
  if (!req.user.is_teacher && !req.user.is_admin) {
    return next(new AppError('You do not have permission to upload notes', 403));
  }

  const {
    title,
    description,
    subject_id,
    stream_id,
    topic,
    difficulty,
    page_count,
    is_published = false
  } = req.body;

  // Handle file upload
  if (!req.file) {
    return next(new AppError('Please upload a note file', 400));
  }

  const file_url = `/uploads/notes/${req.file.filename}`;
  const file_size = req.file.size;
  const file_type = req.file.mimetype;

  const note = await Note.create({
    title,
    description,
    subject_id,
    stream_id,
    topic,
    difficulty,
    file_url,
    file_size,
    file_type,
    page_count: page_count || 0,
    is_published,
    uploaded_by: req.user.id,
    uploaded_at: new Date()
  });

  // Send email notification to subject teachers if published
  if (is_published) {
    await notifySubjectTeachers(note, 'created');
  }

  res.status(201).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Update note (owner or admin only)
exports.updateNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const note = await Note.findByPk(id);

  if (!note) {
    return next(new AppError('Note not found', 404));
  }

  // Check permission
  if (note.uploaded_by !== req.user.id && !req.user.is_admin) {
    return next(new AppError('You do not have permission to update this note', 403));
  }

  // Handle file update if new file uploaded
  if (req.file) {
    // Delete old file
    const oldFilePath = path.join(__dirname, '../../', note.file_url);
    try {
      await fs.unlink(oldFilePath);
    } catch (err) {
      console.error('Error deleting old file:', err);
    }

    updates.file_url = `/uploads/notes/${req.file.filename}`;
    updates.file_size = req.file.size;
    updates.file_type = req.file.mimetype;
    updates.updated_at = new Date();
  }

  await note.update(updates);

  res.status(200).json({
    status: 'success',
    data: {
      note
    }
  });
});

// Delete note (owner or admin only)
exports.deleteNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await Note.findByPk(id);

  if (!note) {
    return next(new AppError('Note not found', 404));
  }

  // Check permission
  if (note.uploaded_by !== req.user.id && !req.user.is_admin) {
    return next(new AppError('You do not have permission to delete this note', 403));
  }

  // Delete file from storage
  const filePath = path.join(__dirname, '../../', note.file_url);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error('Error deleting file:', err);
  }

  await note.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Download note
exports.downloadNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await Note.findByPk(id);

  if (!note) {
    return next(new AppError('Note not found', 404));
  }

  // Track download
  await NoteDownload.create({
    user_id: req.user.id,
    note_id: id,
    downloaded_at: new Date()
  });

  // Increment download count
  await note.increment('download_count');

  // Send file
  const filePath = path.join(__dirname, '../../', note.file_url);
  
  try {
    await fs.access(filePath);
    res.download(filePath, `${note.title}.pdf`);
  } catch (err) {
    return next(new AppError('File not found', 404));
  }
});

// Bookmark/Unbookmark note
exports.toggleBookmark = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const note = await Note.findByPk(id);

  if (!note) {
    return next(new AppError('Note not found', 404));
  }

  const existingBookmark = await NoteBookmark.findOne({
    where: {
      user_id: req.user.id,
      note_id: id
    }
  });

  if (existingBookmark) {
    await existingBookmark.destroy();
    await note.decrement('bookmark_count');
    
    res.status(200).json({
      status: 'success',
      data: {
        bookmarked: false,
        message: 'Bookmark removed'
      }
    });
  } else {
    await NoteBookmark.create({
      user_id: req.user.id,
      note_id: id
    });
    await note.increment('bookmark_count');
    
    res.status(200).json({
      status: 'success',
      data: {
        bookmarked: true,
        message: 'Note bookmarked'
      }
    });
  }
});

// Get user's bookmarked notes
exports.getBookmarkedNotes = catchAsync(async (req, res, next) => {
  const bookmarks = await NoteBookmark.findAll({
    where: { user_id: req.user.id },
    include: [{
      model: Note,
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code']
        },
        {
          model: Stream,
          attributes: ['id', 'name']
        }
      ]
    }],
    order: [['created_at', 'DESC']]
  });

  const notes = bookmarks.map(b => ({
    ...b.Note.toJSON(),
    bookmarked_at: b.created_at
  }));

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Get notes by subject
exports.getNotesBySubject = catchAsync(async (req, res, next) => {
  const { subjectId } = req.params;
  const { topic, difficulty } = req.query;

  const whereClause = {
    subject_id: subjectId,
    is_published: true
  };

  if (topic) whereClause.topic = { [Op.iLike]: `%${topic}%` };
  if (difficulty) whereClause.difficulty = difficulty;

  const notes = await Note.findAll({
    where: whereClause,
    include: [
      {
        model: Stream,
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'full_name']
      }
    ],
    order: [['uploaded_at', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Get popular notes (most viewed/downloaded)
exports.getPopularNotes = catchAsync(async (req, res, next) => {
  const { period = 'week', limit = 10 } = req.query;

  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case 'day':
      dateFilter = {
        uploaded_at: {
          [Op.gte]: new Date(now.setDate(now.getDate() - 1))
        }
      };
      break;
    case 'week':
      dateFilter = {
        uploaded_at: {
          [Op.gte]: new Date(now.setDate(now.getDate() - 7))
        }
      };
      break;
    case 'month':
      dateFilter = {
        uploaded_at: {
          [Op.gte]: new Date(now.setMonth(now.getMonth() - 1))
        }
      };
      break;
  }

  const notes = await Note.findAll({
    where: {
      is_published: true,
      ...dateFilter
    },
    include: [
      {
        model: Subject,
        attributes: ['id', 'name']
      }
    ],
    order: [
      ['view_count', 'DESC'],
      ['download_count', 'DESC']
    ],
    limit: parseInt(limit)
  });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Get recent notes
exports.getRecentNotes = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const notes = await Note.findAll({
    where: { is_published: true },
    include: [
      {
        model: Subject,
        attributes: ['id', 'name']
      },
      {
        model: Stream,
        attributes: ['id', 'name']
      }
    ],
    order: [['uploaded_at', 'DESC']],
    limit: parseInt(limit)
  });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Get notes by topic
exports.getNotesByTopic = catchAsync(async (req, res, next) => {
  const { topic } = req.params;

  const notes = await Note.findAll({
    where: {
      topic: { [Op.iLike]: `%${topic}%` },
      is_published: true
    },
    include: [
      {
        model: Subject,
        attributes: ['id', 'name']
      },
      {
        model: Stream,
        attributes: ['id', 'name']
      }
    ],
    order: [['uploaded_at', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Admin: Get all notes (including unpublished)
exports.getAllNotesAdmin = catchAsync(async (req, res, next) => {
  if (!req.user.is_admin) {
    return next(new AppError('Access denied', 403));
  }

  const { status = 'all' } = req.query;

  const whereClause = {};
  if (status === 'published') whereClause.is_published = true;
  if (status === 'unpublished') whereClause.is_published = false;

  const notes = await Note.findAll({
    where: whereClause,
    include: [
      {
        model: Subject,
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'full_name', 'email']
      }
    ],
    order: [['uploaded_at', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: {
      notes
    }
  });
});

// Admin: Bulk publish notes
exports.bulkPublishNotes = catchAsync(async (req, res, next) => {
  if (!req.user.is_admin) {
    return next(new AppError('Access denied', 403));
  }

  const { noteIds } = req.body;

  await Note.update(
    { is_published: true },
    {
      where: {
        id: { [Op.in]: noteIds }
      }
    }
  );

  // Send notifications
  for (const noteId of noteIds) {
    const note = await Note.findByPk(noteId);
    await notifySubjectTeachers(note, 'published');
  }

  res.status(200).json({
    status: 'success',
    message: `${noteIds.length} notes published successfully`
  });
});

// Helper function to notify subject teachers
async function notifySubjectTeachers(note, action) {
  try {
    const teachers = await User.findAll({
      where: {
        subject_id: note.subject_id,
        is_teacher: true
      }
    });

    const emailPromises = teachers.map(teacher =>
      sendEmail({
        to: teacher.email,
        subject: `Note ${action}: ${note.title}`,
        html: `
          <h1>Note ${action}</h1>
          <p>Dear ${teacher.full_name || teacher.username},</p>
          <p>A note has been ${action} in your subject:</p>
          <ul>
            <li>Title: ${note.title}</li>
            <li>Topic: ${note.topic}</li>
            <li>Uploaded by: ${note.uploader?.full_name || 'Unknown'}</li>
          </ul>
          <p>You can review it in the admin dashboard.</p>
          <p>Best regards,<br/>Advanced Level Education Team</p>
        `
      })
    );

    await Promise.all(emailPromises);
  } catch (err) {
    console.error('Error sending teacher notifications:', err);
  }
}