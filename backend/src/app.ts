import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import { healthRoutes } from './routes/healthRoutes';
import { analyzeRoutes } from './routes/analyzeRoutes';
import { aiRoutes } from './routes/aiRoutes';
import { config } from './config';

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGIN can be:
//   "*"                              → allow all (dev only)
//   "https://my-app.vercel.app"      → single origin
//   "https://a.vercel.app,https://b.netlify.app" → comma-separated list
const rawOrigins = (config.CORS_ORIGIN || '*').split(',').map(o => o.trim());
const allowAllOrigins = rawOrigins.includes('*');

app.use(cors({
  origin: allowAllOrigins
    ? '*'
    : (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, Render health checks)
        if (!origin) return callback(null, true);
        if (rawOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: !allowAllOrigins,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);

// Application Routing
app.use('/health', healthRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/ai', aiRoutes);

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

