import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import sessionModel from "../model/session.model.js";
import userModel from "../model/model.user.js";
import otpModel from "../model/otp.model.js";

import { generateOtp, getOtpHtml } from "../utils/utils.js";
import sendEmail from "../service/email.service.js";

const ALLOWED_GROUPS = ["NAKULA", "ARJUNA", "BHIMA", "YUDHISHTHIRA"];

export const register = async (req, res) => {
  try {
    const { name, email, password, group } = req.body;

    // 1. Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof group !== "string" ||
      !group.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and group are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedGroup = group.trim().toUpperCase();

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // 3. Validate group
    if (!ALLOWED_GROUPS.includes(normalizedGroup)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group",
        allowedGroups: ALLOWED_GROUPS,
      });
    }

    // 4. Validate password length
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters",
      });
    }

    // 5. Check whether email already exists
    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // 6. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 7. Create user
    // Public registration must never grant admin privileges.
    const user = await userModel.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: "user",
      group: normalizedGroup,
      isActive: true,
    });

    try {
      // 8. Generate OTP and hash it
      const otp = String(generateOtp());
      const otpHash = await bcrypt.hash(otp, 10);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // 9. Remove previous email-verification OTPs
      await otpModel.deleteMany({
        user_id: user._id,
        purpose: "EMAIL_VERIFICATION",
      });

      // 10. Save OTP before sending the email
      const otpRecord = await otpModel.create({
        email: user.email,
        user_id: user._id,
        otpHash,
        expiresAt,
        purpose: "EMAIL_VERIFICATION",
      });

      try {
        // 11. Send verification email
        const html = getOtpHtml(otp);

        await sendEmail(
          user.email,
          "Verify your email",
          `Your OTP is ${otp}. It expires in 10 minutes.`,
          html,
        );
      } catch (emailError) {
        // Remove the unusable OTP and incomplete account.
        await otpModel.deleteOne({ _id: otpRecord._id });
        await userModel.deleteOne({ _id: user._id });

        throw emailError;
      }
    } catch (otpEmailError) {
      console.error("OTP generation or email delivery failed:", otpEmailError);

      return res.status(502).json({
        success: false,
        message:
          "Unable to complete email verification setup. Please try again.",
      });
    }

    // 12. Return safe user data
    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: {
        user_id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
        isActive: user.isActive,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate email requests, including concurrent requests.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Validate the request
    if (typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and OTP must be strings",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const submittedOtp = otp.trim();

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Assumes OTPs contain exactly six digits
    if (!/^\d{6}$/.test(submittedOtp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must contain exactly 6 digits",
      });
    }

    // 2. Find the user
    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Check verification status
    if (user.verified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    // 4. Find the email-verification OTP
    const otpRecord = await otpModel.findOne({
      user_id: user._id,
      purpose: "EMAIL_VERIFICATION",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP",
      });
    }

    // 5. Check expiry explicitly; MongoDB TTL deletion is asynchronous
    if (otpRecord.expiresAt.getTime() <= Date.now()) {
      await otpModel.deleteMany({
        user_id: user._id,
        purpose: "EMAIL_VERIFICATION",
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP",
      });
    }

    // 6. Check attempt limit
    const MAX_ATTEMPTS = 5;

    if (otpRecord.attemptCount >= MAX_ATTEMPTS) {
      await otpModel.deleteMany({
        user_id: user._id,
        purpose: "EMAIL_VERIFICATION",
      });

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP",
      });
    }

    // 7. Compare submitted OTP against its hash
    const isOtpValid = await bcrypt.compare(submittedOtp, otpRecord.otpHash);

    if (!isOtpValid) {
      otpRecord.attemptCount += 1;

      const attemptsRemaining = Math.max(
        0,
        MAX_ATTEMPTS - otpRecord.attemptCount,
      );

      if (attemptsRemaining === 0) {
        await otpModel.deleteMany({
          user_id: user._id,
          purpose: "EMAIL_VERIFICATION",
        });

        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Please request a new OTP",
        });
      }

      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        attemptsRemaining,
      });
    }

    // 8. Mark email as verified
    user.verified = true;
    await user.save();

    // 9. Remove verification OTP records after successful verification
    await otpModel.deleteMany({
      user_id: user._id,
      purpose: "EMAIL_VERIFICATION",
    });

    // 10. Return a safe response
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate email
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // 2. Find user
    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Check verification status
    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // 4. Find the existing verification OTP
    const existingOtp = await otpModel.findOne({
      user_id: user._id,
      purpose: "EMAIL_VERIFICATION",
    });

    // 5. Enforce a 60-second resend cooldown
    const COOLDOWN_MS = 30 * 1000;

    if (existingOtp?.lastSentAt) {
      const elapsed = Date.now() - existingOtp.lastSentAt.getTime();

      if (elapsed < COOLDOWN_MS) {
        const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);

        return res.status(429).json({
          success: false,
          message: "Please wait before requesting another OTP",
          retryAfter,
        });
      }
    }

    // 6. Generate and hash a fresh OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const now = new Date();

    // 7. Replace the old verification OTP
    await otpModel.deleteMany({
      user_id: user._id,
      purpose: "EMAIL_VERIFICATION",
    });

    const newOtp = await otpModel.create({
      email: user.email,
      user_id: user._id,
      otpHash,
      purpose: "EMAIL_VERIFICATION",
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      attemptCount: 0,
      lastSentAt: now,
    });

    // 8. Send the new OTP email
    try {
      await sendEmail(
        user.email,
        "Verify your email",
        `Your OTP is ${otp}. It expires in 10 minutes.`,
        getOtpHtml(otp),
      );
    } catch (emailError) {
      // Remove the new OTP if email delivery fails
      await otpModel.deleteOne({ _id: newOtp._id });

      throw emailError;
    }

    // 9. Return success
    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email",
      expiresIn: 600,
      resendAfter: 60,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP right now",
    });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    const providedSecret = req.get("x-admin-setup-secret");

    // 1. Protect the setup endpoint
    if (!setupSecret || !providedSecret || providedSecret !== setupSecret) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    // 2. Validate input
    const { name, email, password, group } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof group !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and group are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedGroup = group.trim().toUpperCase();

    const allowedGroups = ["NAKULA", "ARJUNA", "BHIMA", "YUDHISHTHIRA"];

    if (!normalizedName || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid name and email",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters",
      });
    }

    if (!allowedGroups.includes(normalizedGroup)) {
      return res.status(400).json({
        success: false,
        message: "Invalid group",
      });
    }

    // 3. Check whether the email already exists
    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // 4. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. Create the admin account
    const admin = await userModel.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      group: normalizedGroup,
      isActive: true,
      verified: false,
    });

    // 6. Generate and store an email verification OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const now = new Date();

    const otpRecord = await otpModel.create({
      email: admin.email,
      user_id: admin._id,
      otpHash,
      purpose: "EMAIL_VERIFICATION",
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      attemptCount: 0,
      lastSentAt: now,
    });

    // 7. Send the verification email
    try {
      await sendEmail(
        admin.email,
        "Verify your admin account",
        `Your OTP is ${otp}. It expires in 10 minutes.`,
        getOtpHtml(otp),
      );
    } catch (emailError) {
      // Clean up if email delivery fails
      await otpModel.deleteOne({ _id: otpRecord._id });
      await userModel.deleteOne({ _id: admin._id });

      throw emailError;
    }

    // 8. Return safe admin details
    return res.status(201).json({
      success: true,
      message: "Admin created. Please verify the email address.",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        group: admin.group,
        isActive: admin.isActive,
        verified: admin.verified,
      },
    });
  } catch (error) {
    // Handle duplicate email races
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("Admin creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create admin",
    });
  }
};

// Add this function alongside your existing controllers.

export const login = async (req, res) => {
  let createdSession;

  try {
    const { email, password } = req.body ?? {};

    // 1. Validate request
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_ACCESS_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication is not configured",
      });
    }

    const refreshDays = Number(process.env.JWT_REFRESH_DAYS || 7);

    if (!Number.isInteger(refreshDays) || refreshDays < 1 || refreshDays > 30) {
      return res.status(500).json({
        success: false,
        message: "Invalid refresh-token configuration",
      });
    }

    // 2. Find user
    const user = await userModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Verify password
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Check account status
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // 5. Generate refresh token and hash it for database storage
    const refreshToken = crypto.randomBytes(32).toString("hex");

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const sessionExpiresAt = new Date(
      Date.now() + refreshDays * 24 * 60 * 60 * 1000,
    );

    // 6. CREATE THE SESSION IN MONGODB
    createdSession = await sessionModel.create({
      user_id: user._id,
      refreshTokenHash,
      ip: req.ip || null,
      userAgent: req.get("user-agent") || null,
      expiresAt: sessionExpiresAt,
    });

    // 7. Generate access token, linked to this session
    const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "30m";

    const accessToken = jwt.sign(
      {
        user_id: user._id.toString(),
        role: user.role,
        group: user.group,
        sid: createdSession._id.toString(),
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: accessTokenExpiresIn,
        issuer: "your-app",
        audience: "your-app-users",
      },
    );

    // 8. Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    // 9. Return access token and safe user information
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: accessTokenExpiresIn,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          group: user.group,
          verified: user.verified,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    // Clean up a newly created session if login fails afterward
    if (createdSession?._id) {
      await sessionModel
        .deleteOne({ _id: createdSession._id })
        .catch((cleanupError) => {
          console.error("Session cleanup error:", cleanupError);
        });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken && typeof refreshToken === "string") {
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await sessionModel.updateOne(
        {
          refreshTokenHash,
          revoked: false,
        },
        {
          $set: { revoked: true },
        },
      );
    }

    // Cookie options must match those used when setting it.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
