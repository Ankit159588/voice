import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user_id: {
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User is required"],
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: [true, "Ip is required"],
    },
    userAgent: {
      type: String,
      required: [true, "User agent is required"],
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const sesssionModel = mongoose.model("Session", sessionSchema);

export default sesssionModel;
