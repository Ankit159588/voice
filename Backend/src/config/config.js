import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "MONGO_URI",
  "PORT",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "REFRESH_TOKEN",
  "EMAIL_USER",
  "JWT_ACCESS_SECRET",
];

for (const key of requiredEnvVars) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const config = {
  MONGO_URI: process.env.MONGO_URI,
  PORT: Number(process.env.PORT),

  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,

  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
  EMAIL_USER: process.env.EMAIL_USER,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "30m",

  JWT_REFRESH_DAYS: Number(process.env.JWT_REFRESH_DAYS || 7),

  NODE_ENV: process.env.NODE_ENV || "development",
};

// Validate numeric configuration.
if (!Number.isInteger(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
  throw new Error("PORT must be a valid port number");
}

if (
  !Number.isInteger(config.JWT_REFRESH_DAYS) ||
  config.JWT_REFRESH_DAYS < 1 ||
  config.JWT_REFRESH_DAYS > 30
) {
  throw new Error("JWT_REFRESH_DAYS must be between 1 and 30");
}

export default config;
