// Express App Configuration
import express from 'express';
import corsMiddleware from './config/cors.js';
import { loggerMiddleware } from './middleware/logger.js';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(loggerMiddleware);

// Routes
app.use(routes);

export default app;
