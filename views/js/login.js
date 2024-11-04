import { login } from './api.js'; // Import the login function from api.js

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent = "";
  
    try {
      // Use the login function from api.js
      const data = await login(username, password);
      if (!data.token) throw new Error("Login failed");

      // Redirect to the home page after successful login
      window.location.href = "/home.html";
    } catch (error) {
      errorMessage.textContent = error.message;
    }
  });