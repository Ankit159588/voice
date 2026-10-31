import express from "express";

import { getAllUsers } from "../controller/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const userRouter = express.Router();

// Both admins and regular users can access this route.
userRouter.get("/", authMiddleware, getAllUsers);

export default userRouter;
