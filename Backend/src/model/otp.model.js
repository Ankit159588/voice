import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    user_id: {
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User is required"],
    },
    otpHash: {
      type: String,
      required: [true, "OTP hash is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "OTP expiary is required"],
    },

    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: [true, "OTP purpose is required"],
    },
  },
  {
    timestamps: true,
  },
);

const otpModel = mongoose.model("Otps", otpSchema);

export default otpModel;
