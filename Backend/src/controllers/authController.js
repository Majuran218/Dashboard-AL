// backend/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.register = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, full_name } = req.body;

  const existingUser = await User.findOne({ 
    where: { 
      [Op.or]: [{ email }, { username }] 
    } 
  });

  if (existingUser) {
    return next(new AppError('User already exists with this email or username', 400));
  }

  const user = await User.create({
    username,
    email,
    password_hash: password,
    full_name
  });

  // Send welcome email
  await sendEmail({
    to: email,
    subject: 'Successfully Registered!',
    html: `
      <h1>Welcome to Advanced Level Education Platform!</h1>
      <p>Dear ${full_name || username},</p>
      <p>You have successfully registered to our platform. We're excited to have you on board!</p>
      <p>You can now access all our educational resources including past papers, MCQ questions, video recordings, and PDF notes.</p>
      <p>Best regards,<br/>Advanced Level Education Team</p>
    `
  });

  const token = generateToken(user.id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ 
    where: { email },
    include: ['stream']
  });

  if (!user || !(await user.validatePassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Update last login
  user.last_login = new Date();
  await user.save();

  // Send login notification email
  await sendEmail({
    to: email,
    subject: 'Successfully Logged In!',
    html: `
      <h1>Login Successful</h1>
      <p>Dear ${user.full_name || user.username},</p>
      <p>You have successfully logged into your account at ${new Date().toLocaleString()}.</p>
      <p>If this wasn't you, please contact support immediately.</p>
      <p>Best regards,<br/>Advanced Level Education Team</p>
    `
  });

  const token = generateToken(user.id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        stream: user.stream
      }
    }
  });
});