import userModel from "../model/model.user.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select("name email role group isActive verified createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
