const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Admin-only route for creating a new user
exports.createUser = async (req, res) => {
  const { username, password, family_id, role } = req.body;
  const { role: requesterRole } = req.user;

  if (requesterRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create users' });
  }

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.create(username, password, family_id, role || 'user');
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
};

// Get all users (admin-only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error("Error retrieving users:", error.message);
    res.status(500).json({ error: 'Error retrieving users', details: error.message });
  }
};

// Get non-admin users
exports.getNonAdminUsers = async (req, res) => {
  try {
    const users = await User.getNonAdminUsers();
    res.json(users);
  } catch (error) {
    console.error("Error retrieving non-admin users:", error.message);
    res.status(500).json({ error: 'Error retrieving users', details: error.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  const { id: requesterId, role } = req.user;

  if (role !== 'admin' && requesterId !== parseInt(id)) {
    return res.status(403).json({ message: 'Unauthorized to update this user' });
  }

  try {
    if (!username && !password) {
      return res.status(400).json({ message: 'At least one field (username or password) must be provided' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const result = await User.update(id, username, hashedPassword);
    res.json({ message: 'User updated successfully', result });
  } catch (error) {
    console.error("Error updating user:", error.message);
    res.status(500).json({ error: 'Error updating user', details: error.message });
  }
};

// Delete a user by ID (admin or self-deletion)
exports.deleteUserId = async (req, res) => {
  const { id } = req.params;
  const { id: requesterId, role } = req.user;

  if (role !== 'admin' && requesterId !== parseInt(id)) {
    return res.status(403).json({ message: 'Unauthorized to delete this user' });
  }

  try {
    const result = await User.delete(id);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};

// Delete the authenticated user's account
exports.deleteUser = async (req, res) => {
  const { id: requesterId, role } = req.user;

  try {
    const result = await User.delete(requesterId);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};

// Validate user's current password
exports.validatePassword = async (req, res) => {
  const { password } = req.body;
  const { id: userId } = req.user;

  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    res.status(isMatch ? 200 : 401).json({ message: isMatch ? 'Password validated successfully' : 'Invalid password' });
  } catch (error) {
    console.error("Error validating password:", error.message);
    res.status(500).json({ error: 'Error validating password', details: error.message });
  }
};

// Retrieve user information by ID
exports.getUser = async (req, res) => {
  const { id } = req.params;
  const { id: requesterId, role } = req.user;

  if (role !== 'admin' && requesterId !== parseInt(id)) {
    return res.status(403).json({ message: 'Unauthorized to view this user' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error("Error retrieving user:", error.message);
    res.status(500).json({ error: 'Error retrieving user', details: error.message });
  }
};

// Change a user's username
exports.changeUsername = async (req, res) => {
  const { currentPassword, newUsername } = req.body;
  const { id: userId } = req.user;

  try {
    if (!newUsername || !currentPassword) {
      return res.status(400).json({ message: 'New username and current password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const existingUser = await User.findByUsername(newUsername);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    await User.updateUsername(userId, newUsername);
    res.json({ message: 'Username changed successfully' });
  } catch (error) {
    console.error("Error changing username:", error.message);
    res.status(500).json({ error: 'Error changing username', details: error.message });
  }
};

// Change a user's password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id: userId } = req.user;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(userId, hashedPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error("Error changing password:", error.message);
    res.status(500).json({ error: 'Error changing password', details: error.message });
  }
};

// Retrieve the role of the authenticated user
exports.getUserRole = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ role: user.roles });
  } catch (error) {
    console.error("Error retrieving user role:", error.message);
    res.status(500).json({ error: 'Error retrieving user role', details: error.message });
  }
};