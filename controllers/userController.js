const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Admin-only route for creating a new user
exports.createUser = async (req, res) => {
  const { username, password} = req.body;
  //console.log("userController createUser with username", req.user);
  const { roles: requesterRole } = req.user;

  if (requesterRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create users' });
  }
  else
  {
    //console.log("userController createUser with requesterRole", requesterRole);
  }

  try {
    const user = await User.create(username, password);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving users', details: error.message });
  }
};


exports.getNonAdminUsers = async (req, res) => {
  //console.log("userController getNonAdminUsers");
  try {
    const users = await User.getNonAdminUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving users', details: error.message });
  }
};

// Only admins or the user themselves can update user information
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;
  const { id: requesterId, role } = req.user;

  if (role !== 'admin' && requesterId !== parseInt(id)) {
    return res.status(403).json({ message: 'Unauthorized to update this user' });
  }

  try {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const result = await User.update(id, username, hashedPassword);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating user', details: error.message });
  }
};

// Only admins or the user themselves can delete a user account
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { id: requesterId, role } = req.user;

  if (role !== 'admin' && requesterId !== parseInt(id)) {
    return res.status(403).json({ message: 'Unauthorized to delete this user' });
  }

  try {
    const result = await User.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};


// Validate user's current password
exports.validatePassword = async (req, res) => {
  const { password } = req.body;
  const { id: userId } = req.user;

  try {
    const user = await User.findById(userId);

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.status(200).json({ message: "Password validated successfully" });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error validating password", details: error.message });
  }
};


// Retrieve user information by ID
exports.getUser = async (req, res) => {
  const { id } = req.params;
  const { id: requesterId, role } = req.user;

  // Only allow admins or the user themselves to view user information
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
    res.status(500).json({ error: 'Error retrieving user', details: error.message });
  }
};

// Delete a user by ID
exports.deleteUserId = async (req, res) => {
  const { id } = req.params;
  const { id: requesterId, role } = req.user;

  // Only allow admins or the user themselves to delete the account
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
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};

// Change a user's username
exports.changeUsername = async (req, res) => {
  const { currentPassword, newUsername } = req.body;
  const { id: userId } = req.user;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate the current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Check if the new username is already taken
    const existingUser = await User.findByUsername(newUsername);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Update the username
    await User.updateUsername(userId, newUsername);
    res.json({ message: 'Username changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error changing username', details: error.message });
  }
};


// Other functions like createUser, updateUser, getUser, deleteUserId, changeUsername...

// Change a user's password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id: userId } = req.user;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      //console.log("userController changePassword user not found");
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate the current password
    //console.log("currentPassword", currentPassword);
    //console.log("user.password", user.password);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    user.password = currentPassword;
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }


    // Update the password in the database
    await User.updatePassword(userId, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error changing password', details: error.message });
  }
};

// Retrieve the role of the authenticated user
exports.getUserRole = async (req, res) => {
  const { id: userId } = req.user;
  //console.log("getUserRole userId", userId);

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user's role
    res.json({ role: user.roles });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving user role', details: error.message });
  }
};