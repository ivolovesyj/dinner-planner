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

// Serve static files (Frontend)
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

export default app;
