import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: [true, "Refresh token hash is required"],
    },

    ip: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, "Session expiry is required"],
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// Helps find active sessions belonging to a user.
sessionSchema.index({ user_id: 1, revoked: 1 });

const sessionModel = mongoose.model("Session", sessionSchema);

export default sessionModel;
