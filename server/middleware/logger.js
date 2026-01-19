// Request Logger Middleware

export const loggerMiddleware = (req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl || req.url}`);
    next();
};

export default loggerMiddleware;
