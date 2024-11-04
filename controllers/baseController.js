const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');

class BaseController {
  // Encrypt data with error handling
  static encryptData(data) {
    try {
      if (typeof data !== 'string') {
        throw new TypeError('Data to encrypt must be a string');
      }
      return encrypt(data);
    } catch (error) {
      console.error("Error in encryptData:", error.message);
      return null; // or handle error appropriately, such as returning a default value or rethrowing
    }
  }

  // Decrypt data with error handling
  static decryptData(encryptedData) {
    try {
      if (typeof encryptedData !== 'string') {
        throw new TypeError('Data to decrypt must be a string');
      }
      return decrypt(encryptedData);
    } catch (error) {
      console.error("Error in decryptData:", error.message);
      return null; // or handle error appropriately
    }
  }

  // Check if user is admin
  static isAdmin(user) {
    return user.role === 'admin';
  }

  // Enhanced authorization check allowing multiple roles
  static isAuthorized(user, requiredRoles) {
    if (!Array.isArray(requiredRoles)) {
      requiredRoles = [requiredRoles];
    }
    return requiredRoles.includes(user.role) || user.role === 'admin';
  }
}

module.exports = BaseController;