require('dotenv').config(); // Load environment variables
const User = require('../models/User');

// Get command-line arguments for username and password
const args = process.argv.slice(2);
const [username, password] = args;

if (!username || !password) {
  console.error("Usage: node addUser.js <username> <password>");
  process.exit(1);
}

// Function to add a user
async function addUser() {
  try {
    // Create the user in the database (bcrypt hashing is handled in User.create)
    const user = await User.create(username, password);
    console.log("User created successfully:", user);
    process.exit(0);
  } catch (error) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  }
}

// Run the function to add the user
addUser();