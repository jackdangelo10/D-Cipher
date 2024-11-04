// Import the modal functions if they’re in a separate file
import { openUserChangeUsernameModal, openUserChangePasswordModal } from './modals.js';

const sidePanel = document.getElementById("side-panel");
const hamburgerBtn = document.getElementById("hamburger-btn");
const changeUsernameBtn = document.getElementById("user-change-username-btn");
const changePasswordBtn = document.getElementById("user-change-password-btn");
const signOutBtn = document.getElementById("sign-out-btn");

// Toggle side panel visibility
hamburgerBtn.addEventListener("click", () => {
  sidePanel.classList.toggle("open");
});

// Attach the change username and change password modals
changeUsernameBtn.addEventListener("click", () => {
  openUserChangeUsernameModal();
  closeSidePanel();
});

changePasswordBtn.addEventListener("click", () => {
  openUserChangePasswordModal();
  closeSidePanel();
});

// Sign Out button functionality
signOutBtn.addEventListener("click", () => {
  // Remove token from localStorage
  localStorage.removeItem("token");
  // Redirect to login page
  window.location.href = "/index.html";
});

// Helper function to close side panel
function closeSidePanel() {
  sidePanel.classList.remove("open");
}

// Close side panel when clicking outside of it
document.addEventListener("click", (event) => {
  const isClickInsidePanel = sidePanel.contains(event.target) || hamburgerBtn.contains(event.target);
  if (!isClickInsidePanel) {
    closeSidePanel();
  }
});