import { loadCards } from './card.js'; // Assume loadCards dynamically creates cards and attaches necessary listeners
import { getVisiblePasswords, getUserRole } from './api.js'; // Assume getVisiblePasswords fetches passwords from the backend

// Redirect to login if the user is not authenticated
const token = localStorage.getItem("authToken");
if (!token) {
  window.location.href = "/index.html";
}

async function loadPage() {
  // Load passwords
  const passwords = await getVisiblePasswords();
  // Load cards
  await loadCards(passwords);

  // Check for admin privileges
  await checkAdminPrivileges();

  // Attach the search filter
  attachSearchFilter(passwords);
}

loadPage();


// Check if the user is an admin and add the "Manage Users" button if true
async function checkAdminPrivileges() {
  const role = await getUserRole();
  if (role === 'admin') {
    const sidePanel = document.getElementById("side-panel");

    const manageUsersBtn = document.createElement("button");
    manageUsersBtn.classList.add("side-panel-btn");
    manageUsersBtn.id = "manage-users-btn";
    manageUsersBtn.textContent = "Manage Users";
    manageUsersBtn.addEventListener("click", () => {
      window.location.href = "/manage-users.html"; // Redirect to the manage users page
    });

    sidePanel.appendChild(manageUsersBtn);
  }
}

// Function to filter cards by service name
function attachSearchFilter(passwords) {
  const searchBar = document.getElementById("search-bar");

  searchBar.addEventListener("input", () => {
    const searchText = searchBar.value.toLowerCase();

    // Filter passwords by matching the service name with search text
    const filteredPasswords = passwords.filter(entry =>
      entry.service_name.toLowerCase().includes(searchText)
    );

    // Load cards based on the filtered passwords
    loadCards(filteredPasswords);
  });
}
