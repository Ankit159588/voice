import dotenv from "dotenv";
dotenv.config();

const enVar = [
  "MONGO_URI",
  "PORT",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "REFRESH_TOKEN",
  "EMAIL_USER",
  "JWT_SECRET",
];

for (const key of enVar) {
  if (!process.env[key]) {
    throw new Error(`${key} doesn't exist in the environment variables`);
  }
}

const config = {
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
  EMAIL_USER: process.env.EMAIL_USER,
};

export default config;
