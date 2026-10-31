import mongoose from "mongoose";

import serviceModel from "../model/service.model.js";
import assignmentModel from "../model/assigment.model.js";
import userModel from "../model/model.user.js";

export const createAssignment = async (req, res) => {
  try {
    const { service_id, user_ids, dueDate } = req.body;

    // Validate service ID
    if (!mongoose.isValidObjectId(service_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    // Validate user IDs
    if (
      !Array.isArray(user_ids) ||
      user_ids.length === 0 ||
      user_ids.some((id) => !mongoose.isValidObjectId(id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid array of user IDs",
      });
    }

    // Remove duplicate IDs from the request
    const uniqueUserIds = [...new Set(user_ids)];

    // Validate optional due date
    let parsedDueDate = null;

    if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }
    }

    // Check whether service exists and is active
    const service = await serviceModel.findOne({
      _id: service_id,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Active service not found",
      });
    }

    // Check whether all users exist and are eligible
    const users = await userModel
      .find({
        _id: { $in: uniqueUserIds },
        role: "user",
        isActive: true,
        verified: true,
      })
      .select("_id");

    if (users.length !== uniqueUserIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more users are invalid, inactive, or unverified",
      });
    }

    // Check for existing assignments
    const existingAssignments = await assignmentModel
      .find({
        service_id,
        assigned_to: { $in: uniqueUserIds },
      })
      .select("assigned_to");

    if (existingAssignments.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This service is already assigned to one or more selected users",
        existing_user_ids: existingAssignments.map((item) =>
          item.assigned_to.toString(),
        ),
      });
    }

    // Create assignments
    const assignments = await assignmentModel.insertMany(
      uniqueUserIds.map((userId) => ({
        service_id,
        assigned_to: userId,
        assigned_by: req.user.user_id,
        dueDate: parsedDueDate,
      })),
    );

    return res.status(201).json({
      success: true,
      message: "Service assigned successfully",
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One or more users already have this assignment",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// USER DASHBOARD: VIEW ALL ASSIGNMENTS

export const getAssignmentDashboard = async (req, res) => {
  try {
    const { service_id, group, status, user_id } = req.query;

    const filter = {};

    // Filter by service
    if (service_id) {
      if (!mongoose.isValidObjectId(service_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID",
        });
      }

      filter.service_id = service_id;
    }

    // Filter by status
    if (status) {
      const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status",
        });
      }

      filter.status = status;
    }

    // Filter by user
    if (user_id) {
      if (!mongoose.isValidObjectId(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      filter.assigned_to = user_id;
    }

    // Filter by group
    if (group) {
      const allowedGroups = ["NAKULA", "ARJUNA", "BHIMA", "YUDHISHTIRA"];

      if (!allowedGroups.includes(group)) {
        return res.status(400).json({
          success: false,
          message: "Invalid group",
        });
      }

      const users = await userModel.find({ group }).select("_id");

      const groupUserIds = users.map((user) => user._id);

      if (user_id && !groupUserIds.some((id) => id.toString() === user_id)) {
        return res.status(200).json({
          success: true,
          count: 0,
          assignments: [],
        });
      }

      filter.assigned_to = user_id || { $in: groupUserIds };
    }

    const assignments = await assignmentModel
      .find(filter)
      .populate("service_id", "title description isActive")
      .populate("assigned_to", "name email group")
      .populate("assigned_by", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get assignment dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateAssignmentProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, remarks } = req.body;

    // Validate assignment ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    // Validate that at least one field is provided
    if (
      progress === undefined &&
      status === undefined &&
      remarks === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const updates = {};

    // Validate progress
    if (progress !== undefined) {
      if (
        typeof progress !== "number" ||
        !Number.isInteger(progress) ||
        progress < 0 ||
        progress > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Progress must be an integer between 0 and 100",
        });
      }

      updates.progress = progress;
    }

    // Validate status
    if (status !== undefined) {
      const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status",
        });
      }

      updates.status = status;
    }

    // Validate remarks
    if (remarks !== undefined) {
      if (typeof remarks !== "string" || remarks.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Remarks must be a string of at most 1000 characters",
        });
      }

      updates.remarks = remarks.trim();
    }

    // Keep progress and status consistent
    const finalProgress = updates.progress;

    const finalStatus = updates.status;

    if (
      (finalProgress === 100 && finalStatus && finalStatus !== "COMPLETED") ||
      (finalStatus === "COMPLETED" &&
        finalProgress !== undefined &&
        finalProgress !== 100) ||
      (finalStatus === "PENDING" &&
        finalProgress !== undefined &&
        finalProgress !== 0) ||
      (finalStatus === "IN_PROGRESS" &&
        finalProgress !== undefined &&
        (finalProgress === 0 || finalProgress === 100))
    ) {
      return res.status(400).json({
        success: false,
        message: "Progress and status are inconsistent",
      });
    }

    // Update only the logged-in user's assignment
    const assignment = await assignmentModel.findOneAndUpdate(
      {
        _id: id,
        assigned_to: req.user.user_id,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment not found or you do not have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assignment progress updated successfully",
      assignment,
    });
  } catch (error) {
    console.error("Update assignment progress error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, dueDate, status, progress, remarks } = req.body;

    // Validate assignment ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const updates = {};

    // Validate new assigned user
    if (assigned_to !== undefined) {
      if (!mongoose.isValidObjectId(assigned_to)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const user = await userModel.findOne({
        _id: assigned_to,
        role: "user",
        isActive: true,
        verified: true,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Active verified user not found",
        });
      }

      updates.assigned_to = assigned_to;
    }

    // Validate due date
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        updates.dueDate = null;
      } else {
        const parsedDate = new Date(dueDate);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date",
          });
        }

        updates.dueDate = parsedDate;
      }
    }

    // Validate status
    if (status !== undefined) {
      const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status",
        });
      }

      updates.status = status;
    }

    // Validate progress
    if (progress !== undefined) {
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({
          success: false,
          message: "Progress must be an integer between 0 and 100",
        });
      }

      updates.progress = progress;
    }

    // Validate remarks
    if (remarks !== undefined) {
      if (typeof remarks !== "string" || remarks.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Invalid remarks",
        });
      }

      updates.remarks = remarks.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    // Get current assignment
    const assignment = await assignmentModel.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Prevent duplicate assignment to the same service/user
    if (
      updates.assigned_to &&
      updates.assigned_to.toString() !== assignment.assigned_to.toString()
    ) {
      const existing = await assignmentModel.findOne({
        service_id: assignment.service_id,
        assigned_to: updates.assigned_to,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "This service is already assigned to the selected user",
        });
      }
    }

    const finalProgress = updates.progress ?? assignment.progress;
    const finalStatus = updates.status ?? assignment.status;

    // Keep status and progress consistent
    if (
      (finalProgress === 100 && finalStatus !== "COMPLETED") ||
      (finalStatus === "COMPLETED" && finalProgress !== 100) ||
      (finalStatus === "PENDING" && finalProgress !== 0) ||
      (finalStatus === "IN_PROGRESS" &&
        (finalProgress === 0 || finalProgress === 100))
    ) {
      return res.status(400).json({
        success: false,
        message: "Progress and status are inconsistent",
      });
    }

    Object.assign(assignment, updates);

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate assignment detected",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await assignmentModel.findByIdAndDelete(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
