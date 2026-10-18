import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRouter from "./router/auth.router.js";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.get("/test", (req, res) => {
  res.status(200).json({
    message: "App is working fine",
  });
});

app.use("/api/auth", authRouter);

export default app;
