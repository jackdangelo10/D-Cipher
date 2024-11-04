const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

const Password = {
  // Create a new password entry
  async create(userId, serviceName, username, password, visibility = 'private') {
    try {
      const encryptedPassword = encrypt(password);
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO passwords (user_id, service_name, username, encrypted_password, visibility)
          VALUES (?, ?, ?, ?, ?)`,
          [userId, serviceName, username, encryptedPassword, visibility],
          function (err) {
            if (err) {
              console.error("Error creating password entry:", err.message);
              return reject(new Error('Failed to create password entry'));
            }
            resolve({ id: this.lastID, serviceName, username, visibility });
          }
        );
      });
    } catch (error) {
      console.error("Encryption error:", error.message);
      throw new Error("Failed to encrypt password");
    }
  },

  // Update only the username for a specific entry
  async updateUsername(id, newUsername) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE passwords SET username = ? WHERE id = ?`,
        [newUsername, id],
        function (err) {
          if (err) {
            console.error("Error updating username:", err.message);
            return reject(new Error('Failed to update username'));
          }
          resolve({ message: 'Username updated successfully' });
        }
      );
    });
  },

  // Find password entry by ID
  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM passwords WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error("Error finding password by ID:", err.message);
            return reject(new Error('Failed to retrieve password entry'));
          }
          resolve(row || null); // Return null if no entry is found
        }
      );
    });
  },

  // Update only the password for a specific entry
  async updatePassword(id, newPassword) {
    try {
      const encryptedPassword = encrypt(newPassword);
      return new Promise((resolve, reject) => {
        db.run(
          `UPDATE passwords SET encrypted_password = ? WHERE id = ?`,
          [encryptedPassword, id],
          function (err) {
            if (err) {
              console.error("Error updating password:", err.message);
              return reject(new Error('Failed to update password'));
            }
            resolve({ message: 'Password updated successfully' });
          }
        );
      });
    } catch (error) {
      console.error("Encryption error:", error.message);
      throw new Error("Failed to encrypt new password");
    }
  },

  // Retrieve all visible passwords for a user
  async getAllVisiblePasswords(userId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT passwords.*, users.username AS owner
        FROM passwords
        JOIN users ON passwords.user_id = users.id
        WHERE passwords.user_id = ? OR passwords.visibility = 'family'
      `, [userId], (err, rows) => {
        if (err) {
          console.error("Error retrieving passwords:", err.message);
          return reject(new Error('Failed to retrieve passwords'));
        }
        
        // Attempt to decrypt passwords, log errors without failing entire request
        const decryptedRows = rows.map(row => {
          try {
            return { ...row, password: decrypt(row.encrypted_password) };
          } catch (error) {
            console.error("Decryption error:", error.message);
            return { ...row, password: null }; // Set to null if decryption fails
          }
        });
        resolve(decryptedRows);
      });
    });
  },

  // Update entire password entry
  async update(id, serviceName, username, password) {
    try {
      const encryptedPassword = encrypt(password);
      return new Promise((resolve, reject) => {
        db.run(`
          UPDATE passwords SET service_name = ?, username = ?, encrypted_password = ?
          WHERE id = ?`,
          [serviceName, username, encryptedPassword, id],
          function (err) {
            if (err) {
              console.error("Error updating password entry:", err.message);
              return reject(new Error('Failed to update password entry'));
            }
            resolve({ message: 'Password updated successfully' });
          }
        );
      });
    } catch (error) {
      console.error("Encryption error:", error.message);
      throw new Error("Failed to encrypt password for update");
    }
  },

  // Retrieve password entries by service name for a user
  async getByServiceName(userId, serviceName) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT passwords.*, users.username AS owner
        FROM passwords
        JOIN users ON passwords.user_id = users.id
        WHERE (passwords.user_id = ? OR passwords.visibility = 'family')
          AND passwords.service_name = ?
      `, [userId, serviceName], (err, rows) => {
        if (err) {
          console.error("Error retrieving passwords by service name:", err.message);
          return reject(new Error('Failed to retrieve passwords by service name'));
        }
        
        // Attempt to decrypt passwords
        const decryptedRows = rows.map(row => {
          try {
            return { ...row, password: decrypt(row.encrypted_password) };
          } catch (error) {
            console.error("Decryption error:", error.message);
            return { ...row, password: null }; // Set to null if decryption fails
          }
        });
        resolve(decryptedRows);
      });
    });
  },

  // Delete password entry
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM passwords WHERE id = ?`, [id], function (err) {
        if (err) {
          console.error("Error deleting password entry:", err.message);
          return reject(new Error('Failed to delete password entry'));
        }
        resolve({ message: 'Password deleted successfully' });
      });
    });
  }
};

module.exports = Password;