import express from "express";

import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controller/service.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/auth.middleware.js";

const serviceRouter = express.Router();

// All service routes require admin authentication.
serviceRouter.use(authMiddleware, allowRoles("admin"));

serviceRouter.post("/", createService);
serviceRouter.get("/", getAllServices);
serviceRouter.get("/:id", getServiceById);
serviceRouter.patch("/:id", updateService);
serviceRouter.delete("/:id", deleteService);

export default serviceRouter;
