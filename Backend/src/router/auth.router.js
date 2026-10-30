import { Router } from "express";
import { authMiddleware, allowRoles } from "../middleware/auth.middleware.js";
import * as controller from "../controller/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", controller.register);

authRouter.post("/verify-email", controller.verifyEmail);

authRouter.post("/resend-otp", controller.resendOtp);

authRouter.post("/create-admin", controller.createAdmin);

authRouter.post("/login", controller.login);

authRouter.post("/logout", controller.logout);

authRouter.post("/refresh", controller.refreshAccessToken);

authRouter.get(
  "/admin-test",
  authMiddleware,
  allowRoles("admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin access granted",
      user: req.user,
    });
  },
);

authRouter.get("/user-test", authMiddleware, allowRoles("user"), (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User access granted",
    user: req.user,
  });
});

// authRouter.get( "/admin-dashboard",
//   authMiddleware,
//
//   allowRoles("admin"),
//   adminDashboardController,
// );

authRouter.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default authRouter;
