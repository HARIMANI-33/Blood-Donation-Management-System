import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config/environment';
import apiRoutes from './routes';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Core Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true
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

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`[Server] Blood Bank API is running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
});

export default app;
