import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config/environment';
import apiRoutes from './routes';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Core Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin === config.clientUrl ||
      origin === 'https://blood-donation-management-system-nu.vercel.app' ||
      /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Blood Bank API is operational. Access endpoints via /api'
  });
});

// Mount REST API routes
app.use('/api', apiRoutes);

// 404 Not Found Middleware (catches unhandled routes)
app.use(notFoundHandler);

// Global Error Handling Middleware
app.use(errorHandler);

import { initDatabase } from './config/initDb';

// Start server
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, async () => {
  console.log(`[Server] Blood Bank API is running on port ${PORT}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  await initDatabase();
});

export default app;
