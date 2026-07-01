import app from './app';
import { config } from './config';
import fs from 'fs';

// Assure required folder storage boundaries exist
if (!fs.existsSync(config.TEMP_DIR)) {
  fs.mkdirSync(config.TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(config.UPLOADS_DIR)) {
  fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
}

app.listen(config.PORT, () => {
  console.log(`==================================================`);
  console.log(`  AppDoctor Repository Intelligence Engine Backend`);
  console.log(`  Running on: http://localhost:${config.PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
