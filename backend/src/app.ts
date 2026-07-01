import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import { healthRoutes } from './routes/healthRoutes';
import { analyzeRoutes } from './routes/analyzeRoutes';
import { config } from './config';

const app = express();

// Middleware setup
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());
app.use(requestLogger);

// Application Routing
app.use('/health', healthRoutes);
app.use('/api/analyze', analyzeRoutes);

// Fallback 404 Routing
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Boundaries
app.use(errorHandler);

export default app;
