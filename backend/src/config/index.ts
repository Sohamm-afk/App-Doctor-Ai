import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  GIT_CLONE_TIMEOUT: parseInt(process.env.GIT_CLONE_TIMEOUT || '60000', 10),
  TEMP_DIR: path.join(__dirname, '../../temp'),
  UPLOADS_DIR: path.join(__dirname, '../../uploads'),
};
