const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  // Create a new user
  async create(username, password) {
    try {
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }
  
      const hashedPassword = await bcrypt.hash(password, 12); // Use higher salt rounds for security
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (username, password) VALUES (?, ?)`,
          [username, hashedPassword],
          function (err) {
            if (err) {
              console.error("Error creating user:", err.message);
              return reject(new Error('Failed to create user'));
            }
            resolve({ id: this.lastID, username });
          }
        );
      });
    } catch (error) {
      console.error("Error in create function:", error.message);
      throw error;
    }
  },

  // Retrieve non-admin users
  async getNonAdminUsers() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, username FROM users WHERE roles != ?', ['admin'], (err, rows) => {
        if (err) {
          console.error("Error retrieving non-admin users:", err.message);
          return reject(new Error('Failed to retrieve non-admin users'));
        }
        resolve(rows);
      });
    });
  },

  // Retrieve all users
  async getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
          console.error("Error retrieving all users:", err.message);
          return reject(new Error('Failed to retrieve all users'));
        }
        resolve(rows);
      });
    });
  },

  // Find a user by username
  async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
          console.error("Error finding user by username:", err.message);
          return reject(new Error('Failed to find user'));
        }
        resolve(row);
      });
    });
  },

  // Find a user by ID
  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) {
          console.error("Error finding user by ID:", err.message);
          return reject(new Error('Failed to find user'));
        }
        resolve(row);
      });
    });
  },

  // Update user details (username and/or password)
  async update(id, newUsername, newPassword) {
    try {
      const hashedPassword = newPassword ? await bcrypt.hash(newPassword, 12) : null;
      const updateValues = [newUsername, hashedPassword, id].filter(Boolean);
      
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE users SET username = ?, password = COALESCE(?, password) WHERE id = ?`,
          updateValues,
          function (err) {
            if (err) {
              console.error("Error updating user:", err.message);
              return reject(new Error('Failed to update user'));
            }
            resolve({ message: 'User updated successfully' });
          }
        );
      });
    } catch (error) {
      console.error("Error in update function:", error.message);
      throw error;
    }
  },

  // Delete a user by ID
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
        if (err) {
          console.error("Error deleting user:", err.message);
          return reject(new Error('Failed to delete user'));
        }
        resolve({ message: 'User deleted successfully', changes: this.changes });
      });
    });
  },

  // Update only the username
  async updateUsername(id, newUsername) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE users SET username = ? WHERE id = ?`, [newUsername, id], function (err) {
        if (err) {
          console.error("Error updating username:", err.message);
          return reject(new Error('Failed to update username'));
        }
        resolve({ message: 'Username updated successfully' });
      });
    });
  },

  // Update only the password
  async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      return new Promise((resolve, reject) => {
        db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, id], function (err) {
          if (err) {
            console.error("Error updating password:", err.message);
            return reject(new Error('Failed to update password'));
          }
          resolve({ message: 'Password updated successfully' });
        });
      });
    } catch (error) {
      console.error("Error in updatePassword function:", error.message);
      throw error;
    }
  },
};

module.exports = User;