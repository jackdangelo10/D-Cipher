import { getUsers, addUser, deleteOtherUser } from './api.js';

// Redirect to login if the user is not authenticated
const token = localStorage.getItem("authToken");
if (!token) {
  window.location.href = "/index.html";
}

// Load users on page load
async function loadUsers() {
  const users = await getUsers();
  const userEntries = document.getElementById("user-entries");
  userEntries.innerHTML = ""; // Clear previous entries

  users.forEach(user => {
    const userCard = createUserCard(user);
    userEntries.appendChild(userCard);
  });
}

// Create a user card
function createUserCard(user) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.setAttribute("data-id", user.id); // Store user ID as data attribute

  const cardLeft = document.createElement("div");
  cardLeft.classList.add("card-left");
  cardLeft.innerHTML = `<span class="username"><strong>Username:</strong> ${user.username}</span>`;

  const cardRight = document.createElement("div");
  cardRight.classList.add("card-right");
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.addEventListener("click", () => openDeleteUserModal(user.id)); // Pass the user ID to delete function
  cardRight.appendChild(deleteBtn);

  card.appendChild(cardLeft);
  card.appendChild(cardRight);

  return card;
}

// Open the Add User Modal
document.getElementById("add-user-btn").addEventListener("click", () => {
  document.getElementById("add-user-modal").style.display = "flex";
});

// Handle adding a new user
document.getElementById("submit-add-user").addEventListener("click", async () => {
  const username = document.getElementById("new-username").value;
  const password = document.getElementById("new-password").value;

  await addUser({ username, password });
  document.getElementById("add-user-modal").style.display = "none";
  loadUsers(); // Reload user list after adding
});

// Open the Delete User Modal
function openDeleteUserModal(userId) {
  const deleteModal = document.getElementById("delete-user-modal");
  deleteModal.style.display = "flex";
  deleteModal.setAttribute("data-id", userId); // Store the user ID in the modal as data attribute
}

// Confirm deletion of user
document.getElementById("confirm-delete-user").addEventListener("click", async () => {
  const deleteModal = document.getElementById("delete-user-modal");
  const userId = deleteModal.getAttribute("data-id"); // Retrieve the user ID from the modal data attribute

  await deleteOtherUser(userId);
  deleteModal.style.display = "none";
  loadUsers(); // Reload user list after deletion
});

// Close modal functionality
document.querySelectorAll(".close-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.parentElement.parentElement.style.display = "none";
  });
});

// Initial load
loadUsers();