import express from "express";

import {
  createAssignment,
  getAssignmentDashboard,
  updateAssignmentProgress,
  updateAssignment,
  deleteAssignment,
} from "../controller/assignment.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/auth.middleware.js";

const assignmentRouter = express.Router();

// All routes require authentication.
assignmentRouter.use(authMiddleware);

// Both admins and users can view all assignments.
assignmentRouter.get("/dashboard", getAssignmentDashboard);

// Only admins can create assignments.
assignmentRouter.post("/", allowRoles("admin"), createAssignment);

// Users can update only their own assignments.
assignmentRouter.patch("/:id/progress", updateAssignmentProgress);

// admin is able to update the assigment
assignmentRouter.patch("/:id", allowRoles("admin"), updateAssignment);

assignmentRouter.delete("/:id", allowRoles("admin"), deleteAssignment);

export default assignmentRouter;
