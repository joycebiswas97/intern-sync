const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const EmployerProfile = require("../models/EmployerProfile");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least 1 number and 1 special character.',
      'string.min': 'Password must be at least 8 characters long.'
    }),
  role: Joi.string().valid("STUDENT", "EMPLOYER").required(),
  fullName: Joi.when("role", {
    is: "STUDENT",
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  companyName: Joi.when("role", {
    is: "EMPLOYER",
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  })
});

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const { email, password, role, fullName, companyName } = value;

    // Check if user already exists (as an extra safety, though mongoose unique index handles it too)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // Hash the password with cost 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const user = new User({
      email,
      passwordHash,
      role
    });
    
    // Save User
    await user.save();

    // Create corresponding Profile Stub
    if (role === "STUDENT") {
      const studentProfile = new StudentProfile({
        user: user._id,
        fullName
      });
      await studentProfile.save();
    } else if (role === "EMPLOYER") {
      const employerProfile = new EmployerProfile({
        user: user._id,
        companyName,
        verificationStatus: "PENDING"
      });
      await employerProfile.save();
    }

    // Generate email verification token (expires in 24h)
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "24h" }
    );

    // Simulate sending email by logging to console
    console.log("\n================ EMAIL SIMULATION ================");
    console.log(`To: ${user.email}`);
    console.log(`Subject: Verify your InternSync Account`);
    console.log(`Body: Welcome to InternSync! Please verify your email using the token below:`);
    console.log(`Token: ${verificationToken}`);
    console.log("==================================================\n");

    return res.status(201).json({ message: "User registered successfully. Please check your email to verify your account." });

  } catch (error) {
    // Handle Mongoose duplicate key error specifically
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered." });
    }
    
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

const verifyEmail = async (req, res) => {
  try {
    const { error, value } = verifyEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const { token } = value;

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired verification token." });
    }

    // Find the user and check if already verified
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Mark as verified
    user.isEmailVerified = true;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully." });

  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const { email, password } = value;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check if the user is banned
    if (user.isBanned) {
      return res.status(403).json({ message: "Not authorized, your account has been banned." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Issue tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Set refresh token in an httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return access token and user data (unverified users are allowed to log in but flagged)
    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Not authorized, no refresh token provided." });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, invalid or expired refresh token." });
    }

    const user = await User.findById(decoded.userId || decoded.id);
    if (!user || user.isBanned) {
      return res.status(403).json({ message: "Not authorized or account is banned." });
    }

    // Issue a new access token
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      // Don't leak whether user exists
      return res.status(200).json({ message: "If that email is registered, we have sent a reset link." });
    }

    // Generate reset token (expires in 1h)
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    // Simulate sending email
    console.log("\n================ EMAIL SIMULATION ================");
    console.log(`To: ${user.email}`);
    console.log(`Subject: Password Reset Request`);
    console.log(`Body: You requested a password reset. Please use the token below:`);
    console.log(`Token: ${resetToken}`);
    console.log("==================================================\n");

    return res.status(200).json({ message: "If that email is registered, we have sent a reset link." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least 1 number and 1 special character.',
      'string.min': 'Password must be at least 8 characters long.'
    })
});

const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const { token, newPassword } = value;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const user = await User.findById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user; // Attached by requireAuth middleware
    let profile = null;

    if (user.role === "STUDENT") {
      profile = await StudentProfile.findOne({ user: user._id });
    } else if (user.role === "EMPLOYER") {
      profile = await EmployerProfile.findOne({ user: user._id });
    }

    return res.status(200).json({ user, profile });
  } catch (error) {
    console.error("Get Me Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe
};
