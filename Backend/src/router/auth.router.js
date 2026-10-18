import { Router } from "express";
import * as controller from "../controller/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", controller.register);

export default authRouter;
