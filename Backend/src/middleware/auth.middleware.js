import jwt from "jsonwebtoken";
import userModel from "../model/model.user.js";
import sessionModel from "../model/session.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read the access token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const accessToken = authHeader.slice(7).trim();

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // 2. Verify the JWT signature, expiry, issuer and audience
    if (!process.env.JWT_ACCESS_SECRET) {
      console.error("JWT_ACCESS_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication is not configured",
      });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET, {
      issuer: "your-app",
      audience: "your-app-users",
      algorithms: ["HS256"],
    });

    // 3. Validate required token claims
    if (
      !decoded ||
      typeof decoded === "string" ||
      typeof decoded.user_id !== "string" ||
      typeof decoded.sid !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // 4. Find the active session belonging to this user
    const session = await sessionModel
      .findOne({
        _id: decoded.sid,
        user_id: decoded.user_id,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
      .select("_id");

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid or expired. Please log in again.",
      });
    }

    // 5. Load the current user from MongoDB
    const user = await userModel.findById(decoded.user_id);

    if (!user || !user.verified || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is unavailable",
      });
    }

    // 6. Attach trusted, current database data to the request
    req.user = {
      user_id: user._id.toString(),
      role: user.role,
      group: user.group,
      email: user.email,
      name: user.name,
      session_id: session._id.toString(),
    };

    // 7. Continue to the route/controller
    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication must run before role authorization.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check whether the user's role is allowed.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };
};
