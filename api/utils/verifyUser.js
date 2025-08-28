import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.access_token;
  if (!token) {
    return next(errorHandler(401, 'Unauthorized'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(errorHandler(500, 'JWT secret is missing'));
  }

  try {
    const user = jwt.verify(token, secret);
    req.user = user;
    next();
  } catch {
    next(errorHandler(401, 'Unauthorized'));
  }
};