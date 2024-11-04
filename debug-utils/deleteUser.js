require('dotenv').config(); // Load environment variables
const User = require('./models/User');

// Get the username from the command-line arguments
const args = process.argv.slice(2);
const [username] = args;

if (!username) {
  console.error("Usage: node deleteUser.js <username>");
  process.exit(1);
}

// Function to delete a user by username
async function deleteUser() {
  try {
    // Find the user by username
    const user = await User.findByUsername(username);
    if (!user) {
      console.error("User not found:", username);
      process.exit(1);
    }

    // Delete the user by their ID
    const result = await User.delete(user.id);
    console.log("User deleted successfully:", username);
    process.exit(0);
  } catch (error) {
    console.error("Error deleting user:", error.message);
    process.exit(1);
  }
}

// Run the delete function
deleteUser();