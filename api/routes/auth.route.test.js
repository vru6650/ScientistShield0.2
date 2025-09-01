/**
 * @jest-environment node
 */
import express from 'express';
import request from 'supertest';
import authRouter from './auth.route.js';
import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';

jest.mock('../models/user.model.js');
jest.mock('bcryptjs');

/**
 * Creates an express app instance with the auth router mounted. This avoids
 * starting the full server and allows isolated route testing.
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  // Minimal error handler mirroring the production one
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ success: false, statusCode, message });
  });
  return app;
}

describe('Auth routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers a user successfully', async () => {
    bcryptjs.hash.mockResolvedValue('hashed');
    User.prototype.save = jest.fn().mockResolvedValue();

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'test', email: 'test@example.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body).toBe('Signup successful');
    expect(User.prototype.save).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });
});
