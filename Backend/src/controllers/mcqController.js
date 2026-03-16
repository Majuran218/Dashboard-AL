// backend/src/controllers/mcqController.js
const MCQ = require('../models/MCQ');
const MCQSet = require('../models/MCQSet');
const Subject = require('../models/Subject');
const UserProgress = require('../models/UserProgress');
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { Op } = require('sequelize');

// Get all MCQ sets with filters
exports.getAllMCQSets = catchAsync(async (req, res, next) => {
  const { subject_id, stream_id, difficulty, search } = req.query;
  
  const whereClause = {};
  
  if (subject_id) whereClause.subject_id = subject_id;
  if (stream_id) whereClause.stream_id = stream_id;
  if (difficulty) whereClause.difficulty = difficulty;
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const mcqSets = await MCQSet.findAll({
    where: whereClause,
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Get question counts for each set
  const setsWithCounts = await Promise.all(
    mcqSets.map(async (set) => {
      const questionCount = await MCQ.count({
        where: { mcq_set_id: set.id }
      });
      
      return {
        ...set.toJSON(),
        question_count: questionCount
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: setsWithCounts.length,
    data: {
      mcqSets: setsWithCounts
    }
  });
});

// Get single MCQ set with questions
exports.getMCQSet = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const mcqSet = await MCQSet.findByPk(id, {
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'code']
      },
      {
        model: MCQ,
        attributes: ['id', 'question_text', 'options', 'correct_answer', 'explanation', 'difficulty'],
        order: [['id', 'ASC']]
      }
    ]
  });

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  // Get user progress if logged in
  let userProgress = null;
  if (req.user) {
    userProgress = await UserProgress.findOne({
      where: {
        user_id: req.user.id,
        mcq_set_id: id
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      mcqSet,
      userProgress: userProgress || {
        attempts: 0,
        score: 0,
        completed: false
      }
    }
  });
});

// Create new MCQ set (admin only)
exports.createMCQSet = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, subject_id, stream_id, difficulty, time_limit, total_marks, passing_score } = req.body;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const mcqSet = await MCQSet.create({
    title,
    description,
    subject_id,
    stream_id,
    difficulty,
    time_limit,
    total_marks,
    passing_score,
    created_by: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      mcqSet
    }
  });
});

// Update MCQ set (admin only)
exports.updateMCQSet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const mcqSet = await MCQSet.findByPk(id);

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  await mcqSet.update(updates);

  res.status(200).json({
    status: 'success',
    data: {
      mcqSet
    }
  });
});

// Delete MCQ set (admin only)
exports.deleteMCQSet = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const mcqSet = await MCQSet.findByPk(id);

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  await mcqSet.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Submit MCQ answers and calculate score
exports.submitMCQAnswers = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { answers, time_taken } = req.body;

  const mcqSet = await MCQSet.findByPk(id, {
    include: [{
      model: MCQ,
      attributes: ['id', 'correct_answer', 'marks']
    }]
  });

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  // Calculate score
  let totalMarks = 0;
  let obtainedMarks = 0;
  const results = [];

  mcqSet.MCQs.forEach(question => {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correct_answer;
    
    totalMarks += question.marks;
    if (isCorrect) {
      obtainedMarks += question.marks;
    }

    results.push({
      question_id: question.id,
      user_answer: userAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      marks_obtained: isCorrect ? question.marks : 0
    });
  });

  const percentage = (obtainedMarks / totalMarks) * 100;
  const passed = percentage >= mcqSet.passing_score;

  // Save user progress
  const [userProgress, created] = await UserProgress.findOrCreate({
    where: {
      user_id: req.user.id,
      mcq_set_id: id
    },
    defaults: {
      attempts: 1,
      highest_score: percentage,
      last_score: percentage,
      time_taken: time_taken,
      completed: passed,
      passed: passed,
      answers: answers,
      results: results
    }
  });

  if (!created) {
    await userProgress.update({
      attempts: userProgress.attempts + 1,
      highest_score: Math.max(userProgress.highest_score, percentage),
      last_score: percentage,
      time_taken: time_taken,
      completed: passed,
      passed: passed,
      answers: answers,
      results: results,
      last_attempt_at: new Date()
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      total_marks: totalMarks,
      obtained_marks: obtainedMarks,
      percentage: percentage,
      passed: passed,
      results: results,
      userProgress
    }
  });
});

// Add question to MCQ set (admin only)
exports.addQuestion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { question_text, options, correct_answer, explanation, difficulty, marks } = req.body;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const mcqSet = await MCQSet.findByPk(id);

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  const question = await MCQ.create({
    mcq_set_id: id,
    question_text,
    options,
    correct_answer,
    explanation,
    difficulty,
    marks,
    created_by: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      question
    }
  });
});

// Update question (admin only)
exports.updateQuestion = catchAsync(async (req, res, next) => {
  const { questionId } = req.params;
  const updates = req.body;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const question = await MCQ.findByPk(questionId);

  if (!question) {
    return next(new AppError('Question not found', 404));
  }

  await question.update(updates);

  res.status(200).json({
    status: 'success',
    data: {
      question
    }
  });
});

// Delete question (admin only)
exports.deleteQuestion = catchAsync(async (req, res, next) => {
  const { questionId } = req.params;

  // Check if user is admin
  if (!req.user.is_admin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const question = await MCQ.findByPk(questionId);

  if (!question) {
    return next(new AppError('Question not found', 404));
  }

  await question.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get user's MCQ progress
exports.getUserProgress = catchAsync(async (req, res, next) => {
  const progress = await UserProgress.findAll({
    where: { user_id: req.user.id },
    include: [{
      model: MCQSet,
      include: [{
        model: Subject,
        attributes: ['id', 'name', 'code']
      }]
    }],
    order: [['last_attempt_at', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    results: progress.length,
    data: {
      progress
    }
  });
});

// Get statistics for a specific MCQ set
exports.getMCQSetStatistics = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const mcqSet = await MCQSet.findByPk(id);

  if (!mcqSet) {
    return next(new AppError('MCQ set not found', 404));
  }

  const totalAttempts = await UserProgress.count({
    where: { mcq_set_id: id }
  });

  const averageScore = await UserProgress.findOne({
    where: { mcq_set_id: id },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('highest_score')), 'avg_score']
    ]
  });

  const passRate = await UserProgress.count({
    where: {
      mcq_set_id: id,
      passed: true
    }
  });

  const statistics = {
    total_attempts: totalAttempts,
    average_score: parseFloat(averageScore?.dataValues?.avg_score || 0),
    pass_rate: totalAttempts > 0 ? (passRate / totalAttempts) * 100 : 0,
    question_count: await MCQ.count({ where: { mcq_set_id: id } })
  };

  res.status(200).json({
    status: 'success',
    data: {
      statistics
    }
  });
});