import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },

    group: {
      type: String,
      enum: ["NAKULA", "ARJUNA", "BHIMA", "YUDHISHTHIRA"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
