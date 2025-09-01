import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';

// More descriptive name for API health-check endpoint
export const checkApiHealth = (req, res) => {
  res.json({ message: 'API is working!' });
};

// --- Upgraded updateUser Function ---
export const updateUser = async (req, res, next) => {
  // Allow administrators to update any user while restricting regular users
  // to only update their own account. The previous implementation blocked
  // admins from updating other users, which is inconsistent with the
  // authorization logic used elsewhere (e.g. deleteUser).
  if (!req.user.isAdmin && req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to update this user'));
  }

  try {
    const userToUpdate = await User.findById(req.params.userId);
    if (!userToUpdate) {
      return next(errorHandler(404, 'User not found'));
    }

    // Update fields if they are provided in the request body
    if (req.body.username) {
      userToUpdate.username = req.body.username;
    }
    if (req.body.email) {
      userToUpdate.email = req.body.email;
    }
    if (req.body.password) {
      userToUpdate.password = req.body.password;
    }
    if (req.body.profilePicture) {
      userToUpdate.profilePicture = req.body.profilePicture;
    }
    if (req.body.bio !== undefined) {
      userToUpdate.bio = req.body.bio;
    }
    if (req.body.profileCompleted !== undefined) {
      userToUpdate.profileCompleted = req.body.profileCompleted;
    }

    // Using user.save() will trigger the Mongoose pre-save middleware
    // This automatically handles validation and password hashing as defined in the model
    const updatedUser = await userToUpdate.save();

    // Remove password before returning the user data
    const { password, ...userWithoutPassword } = updatedUser._doc;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    // Mongoose validation errors will be caught here
    next(error);
  }
};

// --- deleteUser Function (already good) ---
export const deleteUser = async (req, res, next) => {
  if (!req.user.isAdmin && req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to delete this user'));
  }
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.status(200).json('User has been deleted');
  } catch (error) {
    next(error);
  }
};

// --- signout Function (already good) ---
export const signout = (req, res, next) => {
  try {
    res
        .clearCookie('access_token')
        .status(200)
        .json('User has been signed out');
  } catch (error) {
    next(error);
  }
};

// --- Upgraded getUsers Function ---
export const getUsers = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, 'You are not allowed to see all users'));
  }
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.sort === 'asc' ? 1 : -1;

    const users = await User.find()
        .sort({ createdAt: sortDirection })
        .skip(startIndex)
        .limit(limit)
        .select('-password'); // Exclude password directly from the query

    const totalUsers = await User.countDocuments();

    const now = new Date();
    const oneMonthAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
    );
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      users, // The password is already excluded
      totalUsers,
      lastMonthUsers,
    });
  } catch (error) {
    next(error);
  }
};

// --- Upgraded getUser Function ---
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};