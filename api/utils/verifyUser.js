import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const verifyToken = (req, res, next) => {
    const token = req.cookies?.access_token;
    if (!token) {
        return next(errorHandler(401, 'Unauthorized'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // It's good practice to handle this case, as a missing secret is a critical server configuration issue.
        console.error('JWT_SECRET is not defined in the environment variables.');
        return next(errorHandler(500, 'Internal Server Error'));
    }

    try {
        const user = jwt.verify(token, secret);
        req.user = user;
        next();
    } catch (error) {
        // It's helpful to log the error for debugging purposes.
        console.error('JWT Verification Error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return next(errorHandler(401, 'Token expired'));
        }
        return next(errorHandler(401, 'Unauthorized'));
    }
};