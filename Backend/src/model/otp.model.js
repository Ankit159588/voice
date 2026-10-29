import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    otpHash: {
      type: String,
      required: [true, "OTP hash is required"],
    },

    expiresAt: {
      type: Date,
      required: [true, "OTP expiry is required"],
      index: { expires: 0 },
    },

    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: [true, "OTP purpose is required"],
    },

    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const otpModel = mongoose.model("Otp", otpSchema);

export default otpModel;
