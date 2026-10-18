import userModel from "../model/model.user.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import bcrypt from "bcryptjs";
import config from "../config/config.js";
import sessionModel from "../model/session.model.js";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  const { username, email, group } = req.body;
  try {
    const hashPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hashPassword,
      group: group,
    });

    const otp = generateOtp();
    const html = getOtpHtml(otp);

    await sendEmail(
      user.email,
      "Verify your email",
      `Your OTP is ${otp}`,
      html,
    );

    await otpModel.create({
      email: user.email,
      user_id: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      purpose: "EMAIL_VERIFICATION",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        group: user.group,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
