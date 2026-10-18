import config from "./src/config/config.js";
import connectDB from "./src/config/db.js";
import app from "../Backend/src/app.js";

async function startServer() {
  try {
    await connectDB();
    app.listen(config.PORT, () => {
      console.log(`Server is Started on Port ${config.PORT}`);
    });
  } catch (error) {
    console.log("Failed to start the server:", error.message);
    process.exit(1);
  }
}

startServer();
