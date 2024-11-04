const Password = require('../models/Password');
const { decrypt } = require('../utils/crypto');

// Create a new password entry
exports.createPassword = async (req, res) => {
  const { serviceName, username, password, visibility } = req.body;
  const { id: userId } = req.user;

  try {
    const passwordEntry = await Password.create(userId, serviceName, username, password, visibility);
    res.status(201).json(passwordEntry);
  } catch (error) {
    console.error("Error creating password entry:", error.message);
    res.status(500).json({ error: "Failed to create password entry" });
  }
};

// Get all visible passwords for a user (includes family-visible)
exports.getVisiblePasswords = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const passwords = await Password.getAllVisiblePasswords(userId);
    res.json(passwords);
  } catch (error) {
    console.error("Error retrieving passwords:", error.message);
    res.status(500).json({ error: "Failed to retrieve passwords" });
  }
};

// Update a password entry
exports.updatePassword = async (req, res) => {
  const { id } = req.params;
  const { serviceName, username, password, visibility } = req.body;
  const { role } = req.user;

  // Only admins can update family-visible passwords
  if (visibility === 'family' && role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized to update family-visible passwords' });
  }

  try {
    const result = await Password.update(id, serviceName, username, password, visibility);
    res.json(result);
  } catch (error) {
    console.error("Error updating password entry:", error.message);
    res.status(500).json({ error: "Failed to update password entry" });
  }
};

// Delete a password entry
exports.deletePassword = async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;

  try {
    const password = await Password.findById(id);

    if (password.visibility === 'family' && role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete family-visible passwords' });
    }

    const result = await Password.delete(id);
    res.json(result);
  } catch (error) {
    console.error("Error deleting password entry:", error.message);
    res.status(500).json({ error: "Failed to delete password entry" });
  }
};

// Get passwords by service name
exports.getPasswordsByService = async (req, res) => {
  const { serviceName } = req.params;
  const { id: userId, family_id: familyId } = req.user;

  try {
    const passwords = await Password.getByServiceName(userId, familyId, serviceName);
    res.json({ success: true, passwords });
  } catch (error) {
    console.error("Error retrieving passwords by service name:", error.message);
    res.status(500).json({ error: "Failed to retrieve passwords by service name" });
  }
};

// Update only the password for a specific entry
exports.updatePasswordOnly = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, password: newPassword } = req.body;
  const { id: userId } = req.user;

  try {
    const entry = await Password.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this password' });
    }

    let isMatch = false;
    try {
      const decryptedPassword = decrypt(entry.encrypted_password);
      isMatch = decryptedPassword === currentPassword;
    } catch (error) {
      console.error("Error decrypting current password:", error.message);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const updatedEntry = await Password.updatePassword(id, newPassword);
    res.json({ message: 'Password updated successfully', updatedEntry });
  } catch (error) {
    console.error("Error updating password only:", error.message);
    res.status(500).json({ error: "Failed to update password" });
  }
};

// Update only the username for a specific entry
exports.updateUsernameOnly = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, username: newUsername } = req.body;

  try {
    const entry = await Password.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Password entry not found' });
    }

    let isMatch = false;
    try {
      const decryptedPassword = decrypt(entry.encrypted_password);
      isMatch = decryptedPassword === currentPassword;
    } catch (error) {
      console.error("Error decrypting current password:", error.message);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    await Password.updateUsername(id, newUsername);
    res.json({ message: 'Username updated successfully' });
  } catch (error) {
    console.error("Error updating username only:", error.message);
    res.status(500).json({ error: "Failed to update username" });
  }
};