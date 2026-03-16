// backend/src/controllers/paperController.js
const PastPaper = require('../models/PastPaper');
const Subject = require('../models/Subject');
const Stream = require('../models/Stream');
const PaperBookmark = require('../models/PaperBookmark');
const PaperDownload = require('../models/PaperDownload');
const PaperAttempt = require('../models/PaperAttempt');
const Question = require('../models/Question');
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { Op } = require('sequelize');
const sequelize = require('../utils/database');
const path = require('path');
const fs = require('fs').promises;

// Get all past papers with filters
exports.getAllPapers = catchAsync(async (req, res, next) => {
  const {
    subject_id,
    stream_id,
    year,
    term,
    paper_type,
    difficulty,
    search,
    sort_by = 'year',
    order = 'DESC',
    page = 1,
    limit = 20
  } = req.query;

  const whereClause = { is_published: true };
  
  if (subject_id) whereClause.subject_id = subject_id;
  if (stream_id) whereClause.stream_id = stream_id;
  if (year) whereClause.year = year;
  if (term) whereClause.term = term;
  if (paper_type) whereClause.paper_type = paper_type;
  if (difficulty) whereClause.difficulty = difficulty;
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { subject_code: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const offset = (page - 1) * limit;

  const { count, rows: papers } = await PastPaper.findAndCountAll({
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
    const [bookmarks, downloads, attempts] = await Promise.all([
      PaperBookmark.findAll({
        where: {
          user_id: req.user.id,
          paper_id: papers.map(p => p.id)
        }
      }),
      PaperDownload.findAll({
        where: {
          user_id: req.user.id,
          paper_id: papers.map(p => p.id)
        }
      }),
      PaperAttempt.findAll({
        where: {
          user_id: req.user.id,
          paper_id: papers.map(p => p.id)
        }
      })
    ]);

    const bookmarkedIds = new Set(bookmarks.map(b => b.paper_id));
    const downloadedIds = new Set(downloads.map(d => d.paper_id));
    const attemptedIds = new Set(attempts.map(a => a.paper_id));

    papers.forEach(paper => {
      paper.setDataValue('is_bookmarked', bookmarkedIds.has(paper.id));
      paper.setDataValue('is_downloaded', downloadedIds.has(paper.id));
      paper.setDataValue('is_attempted', attemptedIds.has(paper.id));
    });
  }

  res.status(200).json({
    status: 'success',
    results: papers.length,
    total: count,
    total_pages: Math.ceil(count / limit),
    current_page: parseInt(page),
    data: {
      papers
    }
  });
});

// Get single paper by ID
exports.getPaperById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id, {
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
      },
      {
        model: Question,
        attributes: ['id', 'question_number', 'question_text', 'marks', 'topic'],
        order: [['question_number', 'ASC']]
      }
    ]
  });

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  // Check if paper is published or user is admin/owner
  if (!paper.is_published && (!req.user || (req.user.id !== paper.uploaded_by && !req.user.is_admin))) {
    return next(new AppError('Past paper not found', 404));
  }

  // Increment view count
  await paper.increment('view_count');

  // Get user-specific data if logged in
  if (req.user) {
    const [isBookmarked, isDownloaded, lastAttempt] = await Promise.all([
      PaperBookmark.findOne({
        where: { user_id: req.user.id, paper_id: id }
      }),
      PaperDownload.findOne({
        where: { user_id: req.user.id, paper_id: id }
      }),
      PaperAttempt.findOne({
        where: { user_id: req.user.id, paper_id: id },
        order: [['attempt_date', 'DESC']]
      })
    ]);

    paper.setDataValue('is_bookmarked', !!isBookmarked);
    paper.setDataValue('is_downloaded', !!isDownloaded);
    paper.setDataValue('last_attempt', lastAttempt);
  }

  res.status(200).json({
    status: 'success',
    data: {
      paper
    }
  });
});

// Create new past paper (teachers/admins only)
exports.createPaper = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if user has permission (teacher or admin)
  if (!req.user.is_teacher && !req.user.is_admin) {
    return next(new AppError('You do not have permission to upload past papers', 403));
  }

  const {
    title,
    description,
    subject_id,
    stream_id,
    year,
    term,
    paper_type,
    paper_code,
    subject_code,
    duration,
    total_marks,
    difficulty,
    is_published = false
  } = req.body;

  // Handle file upload
  if (!req.file) {
    return next(new AppError('Please upload the paper file', 400));
  }

  const file_url = `/uploads/past-papers/${req.file.filename}`;
  const file_size = req.file.size;
  const file_type = req.file.mimetype;

  // Handle answer sheet if uploaded
  let answer_sheet_url = null;
  if (req.files && req.files.answer_sheet) {
    answer_sheet_url = `/uploads/answer-sheets/${req.files.answer_sheet[0].filename}`;
  }

  const paper = await PastPaper.create({
    title,
    description,
    subject_id,
    stream_id,
    year,
    term,
    paper_type,
    paper_code,
    subject_code,
    file_url,
    answer_sheet_url,
    file_size,
    file_type,
    duration,
    total_marks,
    difficulty,
    is_published,
    uploaded_by: req.user.id,
    uploaded_at: new Date()
  });

  // Send email notification to subject teachers if published
  if (is_published) {
    await notifySubjectTeachers(paper, 'uploaded');
  }

  res.status(201).json({
    status: 'success',
    data: {
      paper
    }
  });
});

// Update past paper (owner or admin only)
exports.updatePaper = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  // Check permission
  if (paper.uploaded_by !== req.user.id && !req.user.is_admin) {
    return next(new AppError('You do not have permission to update this paper', 403));
  }

  // Handle file update if new file uploaded
  if (req.file) {
    // Delete old file
    const oldFilePath = path.join(__dirname, '../../', paper.file_url);
    try {
      await fs.unlink(oldFilePath);
    } catch (err) {
      console.error('Error deleting old file:', err);
    }

    updates.file_url = `/uploads/past-papers/${req.file.filename}`;
    updates.file_size = req.file.size;
    updates.file_type = req.file.mimetype;
  }

  // Handle answer sheet update
  if (req.files && req.files.answer_sheet) {
    if (paper.answer_sheet_url) {
      const oldAnswerSheetPath = path.join(__dirname, '../../', paper.answer_sheet_url);
      try {
        await fs.unlink(oldAnswerSheetPath);
      } catch (err) {
        console.error('Error deleting old answer sheet:', err);
      }
    }
    updates.answer_sheet_url = `/uploads/answer-sheets/${req.files.answer_sheet[0].filename}`;
  }

  updates.updated_at = new Date();
  await paper.update(updates);

  res.status(200).json({
    status: 'success',
    data: {
      paper
    }
  });
});

// Delete past paper (owner or admin only)
exports.deletePaper = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  // Check permission
  if (paper.uploaded_by !== req.user.id && !req.user.is_admin) {
    return next(new AppError('You do not have permission to delete this paper', 403));
  }

  // Delete files from storage
  const filePath = path.join(__dirname, '../../', paper.file_url);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error('Error deleting file:', err);
  }

  if (paper.answer_sheet_url) {
    const answerSheetPath = path.join(__dirname, '../../', paper.answer_sheet_url);
    try {
      await fs.unlink(answerSheetPath);
    } catch (err) {
      console.error('Error deleting answer sheet:', err);
    }
  }

  await paper.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Download past paper
exports.downloadPaper = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  // Track download
  await PaperDownload.create({
    user_id: req.user.id,
    paper_id: id,
    downloaded_at: new Date()
  });

  // Increment download count
  await paper.increment('download_count');

  // Send file
  const filePath = path.join(__dirname, '../../', paper.file_url);
  
  try {
    await fs.access(filePath);
    res.download(filePath, `${paper.title || 'past-paper'}.pdf`);
  } catch (err) {
    return next(new AppError('File not found', 404));
  }
});

// Download answer sheet
exports.downloadAnswerSheet = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  if (!paper.answer_sheet_url) {
    return next(new AppError('Answer sheet not available for this paper', 404));
  }

  // Send file
  const filePath = path.join(__dirname, '../../', paper.answer_sheet_url);
  
  try {
    await fs.access(filePath);
    res.download(filePath, `${paper.title || 'answer-sheet'}.pdf`);
  } catch (err) {
    return next(new AppError('Answer sheet file not found', 404));
  }
});

// Bookmark/Unbookmark paper
exports.toggleBookmark = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  const existingBookmark = await PaperBookmark.findOne({
    where: {
      user_id: req.user.id,
      paper_id: id
    }
  });

  if (existingBookmark) {
    await existingBookmark.destroy();
    
    res.status(200).json({
      status: 'success',
      data: {
        bookmarked: false,
        message: 'Bookmark removed'
      }
    });
  } else {
    await PaperBookmark.create({
      user_id: req.user.id,
      paper_id: id
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        bookmarked: true,
        message: 'Paper bookmarked'
      }
    });
  }
});

// Get user's bookmarked papers
exports.getBookmarkedPapers = catchAsync(async (req, res, next) => {
  const bookmarks = await PaperBookmark.findAll({
    where: { user_id: req.user.id },
    include: [{
      model: PastPaper,
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

  const papers = bookmarks.map(b => ({
    ...b.PastPaper.toJSON(),
    bookmarked_at: b.created_at
  }));

  res.status(200).json({
    status: 'success',
    results: papers.length,
    data: {
      papers
    }
  });
});

// Start paper attempt
exports.startPaperAttempt = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id, {
    include: [{
      model: Question,
      attributes: ['id', 'question_number', 'question_text', 'marks', 'topic']
    }]
  });

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  // Check for existing incomplete attempt
  const existingAttempt = await PaperAttempt.findOne({
    where: {
      user_id: req.user.id,
      paper_id: id,
      completed: false
    }
  });

  if (existingAttempt) {
    return res.status(200).json({
      status: 'success',
      data: {
        attempt: existingAttempt,
        paper: paper,
        message: 'Continuing previous attempt'
      }
    });
  }

  // Create new attempt
  const attempt = await PaperAttempt.create({
    user_id: req.user.id,
    paper_id: id,
    start_time: new Date(),
    answers: {},
    marks_obtained: 0,
    completed: false
  });

  res.status(201).json({
    status: 'success',
    data: {
      attempt,
      paper: {
        id: paper.id,
        title: paper.title,
        duration: paper.duration,
        total_marks: paper.total_marks,
        questions: paper.Questions
      }
    }
  });
});

// Submit paper attempt
exports.submitPaperAttempt = catchAsync(async (req, res, next) => {
  const { id, attemptId } = req.params;
  const { answers, time_taken } = req.body;

  const paper = await PastPaper.findByPk(id, {
    include: [{
      model: Question,
      attributes: ['id', 'question_number', 'correct_answer', 'marks']
    }]
  });

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  const attempt = await PaperAttempt.findOne({
    where: {
      id: attemptId,
      user_id: req.user.id,
      paper_id: id,
      completed: false
    }
  });

  if (!attempt) {
    return next(new AppError('Attempt not found or already completed', 404));
  }

  // Calculate marks
  let totalMarks = 0;
  let obtainedMarks = 0;
  const results = [];

  paper.Questions.forEach(question => {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correct_answer;
    
    totalMarks += question.marks;
    if (isCorrect) {
      obtainedMarks += question.marks;
    }

    results.push({
      question_id: question.id,
      question_number: question.question_number,
      user_answer: userAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      marks_obtained: isCorrect ? question.marks : 0,
      marks: question.marks
    });
  });

  const percentage = (obtainedMarks / totalMarks) * 100;

  // Update attempt
  await attempt.update({
    answers: answers,
    results: results,
    marks_obtained: obtainedMarks,
    total_marks: totalMarks,
    percentage: percentage,
    time_taken: time_taken,
    end_time: new Date(),
    completed: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      attempt: {
        id: attempt.id,
        obtained_marks: obtainedMarks,
        total_marks: totalMarks,
        percentage: percentage,
        time_taken: time_taken,
        results: results
      }
    }
  });
});

// Get papers by year
exports.getPapersByYear = catchAsync(async (req, res, next) => {
  const { year } = req.params;
  const { subject_id } = req.query;

  const whereClause = {
    year: year,
    is_published: true
  };

  if (subject_id) whereClause.subject_id = subject_id;

  const papers = await PastPaper.findAll({
    where: whereClause,
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'code']
      },
      {
        model: Stream,
        attributes: ['id', 'name']
      }
    ],
    order: [['term', 'ASC']]
  });

  res.status(200).json({
    status: 'success',
    results: papers.length,
    data: {
      papers
    }
  });
});

// Get papers by subject with statistics
exports.getPapersBySubject = catchAsync(async (req, res, next) => {
  const { subjectId } = req.params;
  const { stream_id, year_range } = req.query;

  const whereClause = {
    subject_id: subjectId,
    is_published: true
  };

  if (stream_id) whereClause.stream_id = stream_id;
  if (year_range) {
    const [startYear, endYear] = year_range.split('-').map(Number);
    whereClause.year = {
      [Op.between]: [startYear, endYear]
    };
  }

  const papers = await PastPaper.findAll({
    where: whereClause,
    include: [
      {
        model: Stream,
        attributes: ['id', 'name']
      }
    ],
    order: [
      ['year', 'DESC'],
      ['term', 'ASC']
    ]
  });

  // Group papers by year
  const groupedByYear = papers.reduce((acc, paper) => {
    if (!acc[paper.year]) {
      acc[paper.year] = [];
    }
    acc[paper.year].push(paper);
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    total: papers.length,
    data: {
      grouped_by_year: groupedByYear,
      papers: papers
    }
  });
});

// Get paper statistics
exports.getPaperStatistics = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const paper = await PastPaper.findByPk(id);

  if (!paper) {
    return next(new AppError('Past paper not found', 404));
  }

  const [totalAttempts, averageScore, passRate, questionStats] = await Promise.all([
    PaperAttempt.count({
      where: { paper_id: id, completed: true }
    }),
    PaperAttempt.findOne({
      where: { paper_id: id, completed: true },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score']
      ]
    }),
    PaperAttempt.count({
      where: {
        paper_id: id,
        completed: true,
        percentage: { [Op.gte]: 50 }
      }
    }),
    sequelize.query(`
      SELECT 
        q.id,
        q.question_number,
        q.marks,
        COUNT(pa.id) as attempt_count,
        AVG(CASE 
          WHEN pa.results->'questions' @> ? 
          THEN 1 ELSE 0 END) as correct_rate
      FROM questions q
      LEFT JOIN paper_attempts pa ON pa.paper_id = q.paper_id
      WHERE q.paper_id = ?
      GROUP BY q.id
    `, {
      replacements: [{ question_id: sequelize.col('q.id') }, id],
      type: sequelize.QueryTypes.SELECT
    })
  ]);

  const statistics = {
    total_attempts: totalAttempts,
    average_score: parseFloat(averageScore?.dataValues?.avg_score || 0),
    pass_rate: totalAttempts > 0 ? (passRate / totalAttempts) * 100 : 0,
    view_count: paper.view_count,
    download_count: paper.download_count,
    bookmark_count: await PaperBookmark.count({ where: { paper_id: id } }),
    question_statistics: questionStats
  };

  res.status(200).json({
    status: 'success',
    data: {
      statistics
    }
  });
});

// Get available years
exports.getAvailableYears = catchAsync(async (req, res, next) => {
  const { subject_id, stream_id } = req.query;

  const whereClause = { is_published: true };
  if (subject_id) whereClause.subject_id = subject_id;
  if (stream_id) whereClause.stream_id = stream_id;

  const years = await PastPaper.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('year')), 'year']
    ],
    order: [['year', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    data: {
      years: years.map(y => y.year)
    }
  });
});

// Admin: Get all papers (including unpublished)
exports.getAllPapersAdmin = catchAsync(async (req, res, next) => {
  if (!req.user.is_admin) {
    return next(new AppError('Access denied', 403));
  }

  const { status = 'all', subject_id } = req.query;

  const whereClause = {};
  if (status === 'published') whereClause.is_published = true;
  if (status === 'unpublished') whereClause.is_published = false;
  if (subject_id) whereClause.subject_id = subject_id;

  const papers = await PastPaper.findAll({
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
    order: [['year', 'DESC'], ['term', 'ASC']]
  });

  res.status(200).json({
    status: 'success',
    results: papers.length,
    data: {
      papers
    }
  });
});

// Admin: Bulk publish papers
exports.bulkPublishPapers = catchAsync(async (req, res, next) => {
  if (!req.user.is_admin) {
    return next(new AppError('Access denied', 403));
  }

  const { paperIds } = req.body;

  await PastPaper.update(
    { is_published: true },
    {
      where: {
        id: { [Op.in]: paperIds }
      }
    }
  );

  // Send notifications
  for (const paperId of paperIds) {
    const paper = await PastPaper.findByPk(paperId, {
      include: [Subject]
    });
    await notifySubjectTeachers(paper, 'published');
  }

  res.status(200).json({
    status: 'success',
    message: `${paperIds.length} papers published successfully`
  });
});

// Helper function to notify subject teachers
async function notifySubjectTeachers(paper, action) {
  try {
    const teachers = await User.findAll({
      where: {
        subject_id: paper.subject_id,
        is_teacher: true
      }
    });

    const emailPromises = teachers.map(teacher =>
      sendEmail({
        to: teacher.email,
        subject: `Past Paper ${action}: ${paper.title || paper.subject_code} ${paper.year}`,
        html: `
          <h1>Past Paper ${action}</h1>
          <p>Dear ${teacher.full_name || teacher.username},</p>
          <p>A past paper has been ${action} in your subject:</p>
          <ul>
            <li>Subject: ${paper.Subject?.name || 'N/A'}</li>
            <li>Year: ${paper.year}</li>
            <li>Term: ${paper.term}</li>
            <li>Paper Type: ${paper.paper_type}</li>
            <li>Paper Code: ${paper.paper_code}</li>
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