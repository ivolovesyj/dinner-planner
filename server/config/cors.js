// CORS Configuration
import cors from 'cors';

const allowedOrigins = [
    'https://dinner-planner-nine.vercel.app',
    'http://localhost:5173'
];

export const corsOptions = {
    origin: allowedOrigins,
    credentials: true
};

export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
