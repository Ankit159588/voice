import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service is required"],
      index: true,
    },

    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned user is required"],
      index: true,
    },

    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigning admin is required"],
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

assignmentSchema.index({ service_id: 1, assigned_to: 1 }, { unique: true });

const assignmentModel = mongoose.model("ServiceAssignment", assignmentSchema);

export default assignmentModel;
