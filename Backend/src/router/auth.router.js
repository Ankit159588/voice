import { Router } from "express";
import * as controller from "../controller/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", controller.register);

authRouter.post("/verify-email", controller.verifyEmail);

authRouter.post("/resend-otp", controller.resendOtp);

authRouter.post("/create-admin", controller.createAdmin);

authRouter.post("/login", controller.login);

authRouter.post("/logout", controller.logout);

export default authRouter;
