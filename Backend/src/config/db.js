import mongoose from "mongoose";
import config from "./config.js";

async function connnectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
  } catch (error) {
    console.log("error connecting db: ", error);
  }
}

export default connnectDB;
