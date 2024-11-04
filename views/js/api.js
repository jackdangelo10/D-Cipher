// api.js

// Helper function to get the base URL and headers for API calls
function getApiConfig() {
  const authToken = localStorage.getItem('authToken');
  //console.log("getApiConfig", authToken);

  return {
      headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
      }
  };
}
  
  // ---------- USER AUTHENTICATION FUNCTIONS ----------
  
  /**
   * Login user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object>}
   */
  export async function login(username, password) {
    //console.log("login", username, password);
    const response = await fetch(`/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    //console.log("login data", data);
    
    if (response.ok && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('username', username);
    }
  
    return data;
  }
  
  /**
   * Logout user
   */
  export function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userTunnelURL');
  }
  
  /**
   * Create a new user account (Admin only)
   * @param {Object} accountData - {username, password, family_id, role}
   * @returns {Promise<Object>}
   */
  export async function createAccount(accountData) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`create-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify(accountData)
    });
  
    return response.json();
  }
  
  /**
   * Change username
   * @param {string} currentPassword
   * @param {string} newUsername
   * @returns {Promise<Object>}
   */
  export async function changeUsername(currentPassword, newUsername) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`user/change-username`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentPassword, newUsername })
    });

    localStorage.setItem('username', newUsername);
  
    return response.json();
  }
  
  /**
   * Change password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  export async function changePassword(currentPassword, newPassword) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`user/change-password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentPassword, newPassword })
    });
  
    return response.json();
  }
  
  /**
   * Delete user account
   * @param {string} password
   * @returns {Promise<Object>}
   */
  export async function deleteUser(password) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`delete-user`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ password })
    });
  
    return response.json();
  }





  /**
 * Validate the current password for the user
 * @param {string} password - The user's current password
 * @returns {Promise<boolean>} - Resolves to true if valid, false otherwise
 */
export async function validatePassword(password) {
  const { headers } = getApiConfig();

  const response = await fetch(`user/validate-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ password })
  });

  if (response.status === 200) {
    return true; // Password is valid
  } else {
    return false; // Password is invalid
  }
}
  
  // ---------- PASSWORD MANAGEMENT FUNCTIONS ----------
  
  /**
   * Create a new password entry
   * @param {Object} passwordData - {serviceName, username, password, visibility}
   * @returns {Promise<Object>}
   */
  export async function createPassword(passwordData) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`passwords/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(passwordData)
    });
  
    return response.json();
  }
  
  /**
   * Get all visible passwords
   * @returns {Promise<Array>}
   */
  export async function getVisiblePasswords() {
    const { headers } = getApiConfig();
    ////console.log("getVisiblePasswords: ", headers);
  
    const response = await fetch(`passwords/visible`, {
      method: 'GET',
      headers
    });
  
    return response.json();
  }
  
  /**
   * Update a password entry
   * @param {number} id - Password entry ID
   * @param {Object} updatedData - {serviceName, username, password, visibility}
   * @returns {Promise<Object>}
   */
  export async function updatePassword(id, updatedData) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`passwords/update/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedData)
    });
  
    return response.json();
  }
  
  /**
   * Search for password entries by service name
   * @param {string} serviceName
   * @returns {Promise<Array>}
   */
  export async function getPasswordsByService(serviceName) {
    const { headers } = getApiConfig();
  
    const response = await fetch(`passwords/search/${serviceName}`, {
      method: 'GET',
      headers
    });
  
    return response.json();
  }

/**
 * Update the visibility of a password entry
 * @param {number} id - The ID of the password entry
 * @param {string} visibility - The new visibility value ('private' or 'family')
 * @returns {Promise<Object>}
 */
export async function updateVisibility(id, visibility) {
  const { headers } = getApiConfig();

  const response = await fetch(`/passwords/update/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ visibility })
  });

  return response.json();
}


// api.js
/**
 * Delete a password entry by ID
 * @param {number} id - The ID of the password entry
 * @returns {Promise<Object>}
 */
export async function deletePassword(id) {
  const { headers } = getApiConfig();

  const response = await fetch(`passwords/delete/${id}`, {
    method: 'DELETE',
    headers
  });

  return response.json();
}



// Update specific password entry's password
export async function updatePasswordEntry(entryId, currentPassword, newPassword) {
  const { headers } = getApiConfig();

  const response = await fetch(`passwords/update-password/${entryId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ currentPassword, password: newPassword })
  });

  return response.json();
}


// Update specific password entry's username
export async function updateUsernameEntry(entryId, currentPassword, newUsername) {
  const { headers } = getApiConfig();

  //console.log("updateUsernameEntry", entryId, currentPassword, newUsername);

  const response = await fetch(`passwords/update-username/${entryId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ currentPassword, username: newUsername })
  });

  return response.json();
}

/**
 * Add a new password entry
 * @param {Object} passwordData - { serviceName, username, password, visibility }
 * @returns {Promise<Object>}
 */
export async function addPassword(passwordData) {
  const { headers } = getApiConfig();

  const response = await fetch(`passwords/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(passwordData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error adding password.");
  }

  return response.json();
}


// ROLE-BASED ACCESS CONTROL FUNCTIONS

export async function getUserRole() {
  const { headers } = getApiConfig();
  //console.log("Sending headers:", headers); // Confirm headers include the token

  const response = await fetch(`user/role`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user role");
  }

  const data = await response.json();
  return data.role;
}

// Get list of users
export async function getUsers() {
  const { headers } = getApiConfig();
  const response = await fetch(`user/non-admin-users`, { method: 'GET', headers });
  return response.json();
}

// Add a new user
export async function addUser(userData) {
  const { headers } = getApiConfig();
  const response = await fetch(`user/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(userData)
  });

  if (!response.ok) throw new Error("Error adding user.");
  return response.json();
}

// Delete a user by ID
export async function deleteOtherUser(userId) {
  const { headers } = getApiConfig();
  const response = await fetch(`user/delete-user/${userId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) throw new Error("Error deleting user.");
  return response.json();
}

