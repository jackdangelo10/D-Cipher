// USER CREDENTIALS

import { validatePassword, changeUsername, changePassword, 
  updatePasswordEntry, updateUsernameEntry, addPassword, getVisiblePasswords } from './api.js';
import { calculatePasswordStrength } from './password-strength.js';
import { loadCards } from './card.js';

// Function to open a modal and add outside click functionality
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "flex";

  // Close modal when clicking outside of it
  function outsideClickHandler(event) {
    if (event.target === modal) {
      closeModal(modalId);
      modal.removeEventListener("click", outsideClickHandler);
    }
  }

  modal.addEventListener("click", outsideClickHandler);
}

// Function to close a modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "none";
}

// Add event listeners to each close button
document.querySelectorAll(".close-btn").forEach(button => {
  button.addEventListener("click", (event) => {
    const modal = event.target.closest(".modal");
    if (modal) closeModal(modal.id);
  });
});

// Open User Change Username Modal
export function openUserChangeUsernameModal() {
  openModal("user-change-username-modal");
}

// Open User Change Password Modal
export function openUserChangePasswordModal() {
  openModal("user-change-password-modal");
}

// Submit Username Change with Validation
document.getElementById("user-submit-username-change").addEventListener("click", async () => {
  const currentPassword = document.getElementById("user-change-username-current-password").value;
  const newUsername = document.getElementById("user-new-username").value;
  
  try {
    const isValid = await validatePassword(currentPassword);
    if (!isValid) {
      document.getElementById("user-modal-message").textContent = "Invalid current password.";
      return;
    }

    const response = await changeUsername(currentPassword, newUsername);
    document.getElementById("user-modal-message").textContent = response.message || "Username changed successfully!";
    closeModal("user-change-username-modal"); // Close modal after submission
    reloadCards()
  } catch (error) {
    document.getElementById("user-modal-message").textContent = error.message || "Error changing username.";
  }
});

// Submit Password Change with Validation
document.getElementById("user-submit-password-change").addEventListener("click", async () => {
  const currentPassword = document.getElementById("user-change-password-current-password").value;
  const newPassword = document.getElementById("user-new-password").value;

  try {
    const isValid = await validatePassword(currentPassword);
    if (!isValid) {
      document.getElementById("user-password-modal-message").textContent = "Invalid current password.";
      return;
    }

    const response = await changePassword(currentPassword, newPassword);
    document.getElementById("user-password-modal-message").textContent = response.message || "Password changed successfully!";
    closeModal("user-change-password-modal"); // Close modal after submission
    reloadCards()
  } catch (error) {
    document.getElementById("user-password-modal-message").textContent = error.message || "Error changing password.";
  }
});

// PASSWORD ENTRY MODAL

// Open Card Change Username Modal
export function openCardChangeUsernameModal(event) {
  const changeUsernameModal = document.getElementById("card-change-username-modal");
  const entryId = event.target.getAttribute("data-id");
  changeUsernameModal.setAttribute("data-id", entryId);
  openModal("card-change-username-modal");
}

// Open Card Change Password Modal
export function openCardChangePasswordModal(event) {
  const changePasswordModal = document.getElementById("card-change-password-modal");
  const entryId = event.target.getAttribute("data-id");
  changePasswordModal.setAttribute("data-id", entryId);
  openModal("card-change-password-modal");
}

// Submit Card Username Change
document.getElementById("card-submit-username-change").addEventListener("click", async () => {
  const entryId = document.getElementById("card-change-username-modal").getAttribute("data-id");
  const newUsername = document.getElementById("card-new-username").value;
  const currentPassword = document.getElementById("card-change-username-current-password").value;

  try {
    const response = await updateUsernameEntry(entryId, currentPassword, newUsername);
    document.getElementById("card-username-modal-message").textContent = response.message || "Username updated successfully!";
    closeModal("card-change-username-modal"); // Close modal after submission
    reloadCards()
  } catch (error) {
    document.getElementById("card-username-modal-message").textContent = error.message || "Error updating username.";
  }
});

// Submit Card Password Change
document.getElementById("card-submit-password-change").addEventListener("click", async () => {
  const entryId = document.getElementById("card-change-password-modal").getAttribute("data-id");
  const newPassword = document.getElementById("card-new-password").value;
  const currentPassword = document.getElementById("card-change-password-current-password").value;

  try {
    const response = await updatePasswordEntry(entryId, currentPassword, newPassword);
    document.getElementById("card-password-modal-message").textContent = response.message || "Password updated successfully!";
    closeModal("card-change-password-modal"); // Close modal after submission
    reloadCards()
  } catch (error) {
    document.getElementById("card-password-modal-message").textContent = error.message || "Error updating password.";
  }
});

// ADD PASSWORD

// Open the Add Password Modal
export function openAddPasswordModal() {
  openModal("add-password-modal");
}

// Close the Add Password Modal
document.getElementById("close-add-password-modal").addEventListener("click", () => {
  closeModal("add-password-modal");
});

document.getElementById("add-password-btn").addEventListener("click", openAddPasswordModal);

// Handle Add Password Form Submission
document.getElementById("submit-add-password").addEventListener("click", async () => {
  const serviceName = document.getElementById("service-name").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("add-new-password").value;
  const visibility = document.getElementById("visibility").value;
  const messageElement = document.getElementById("add-password-message");

  try {
    const response = await addPassword({ serviceName, username, password, visibility });
    messageElement.textContent = response.message || "Password added successfully!";
    messageElement.style.color = "green";

    document.getElementById("service-name").value = "";
    document.getElementById("username").value = "";
    document.getElementById("add-new-password").value = "";
    document.getElementById("visibility").value = "private";

    closeModal("add-password-modal"); // Close modal after submission
    reloadCards()
  } catch (error) {
    messageElement.textContent = error.message || "Error adding password.";
    messageElement.style.color = "red";
  }
});

// Add event listener for password strength feedback
document.getElementById("add-new-password").addEventListener("input", (event) => {
  const password = event.target.value;
  const strengthInfo = calculatePasswordStrength(password);

  // Set strength text and apply corresponding color class
  const strengthElement = document.getElementById("add-password-strength");
  strengthElement.textContent = `(Crack Time: ${formatCrackTime(strengthInfo)})`;
  strengthElement.className = `password-strength ${strengthInfo.level}`; // Dynamically set class based on strength level
});

// Event listener for password strength feedback
document.getElementById("card-new-password").addEventListener("input", (event) => {
  const password = event.target.value;
  const strengthInfo = calculatePasswordStrength(password);

  // Set strength text and apply corresponding color class
  const strengthElement = document.getElementById("card-password-strength");
  strengthElement.textContent = `(Crack Time: ${formatCrackTime(strengthInfo)})`;
  strengthElement.className = `password-strength ${strengthInfo.level}`; // Dynamically set class based on strength level
});

// Event listener for password strength feedback
document.getElementById("user-new-password").addEventListener("input", (event) => {
  const password = event.target.value;
  const strengthInfo = calculatePasswordStrength(password);

  // Set strength text and apply corresponding color class
  const strengthElement = document.getElementById("user-password-strength");
  strengthElement.textContent = `Strength: ${strengthInfo.level} (Crack Time: ${formatCrackTime(strengthInfo)})`;
  strengthElement.className = `password-strength ${strengthInfo.level}`; // Dynamically set class based on strength level
});

// Helper function to format the crack time into a readable string
function formatCrackTime({ years, months, days, hours, minutes, seconds }) {
  return `${years}Y:${months}M:${days}D:${hours}H:${minutes}M:${seconds}S`;
}

async function reloadCards() {
  const passwords = await getVisiblePasswords();
  loadCards(passwords);
}