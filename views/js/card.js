import { openUserChangeUsernameModal, openUserChangePasswordModal, 
  openCardChangeUsernameModal, openCardChangePasswordModal } from './modals.js';
import { updateVisibility, deletePassword } from './api.js';

const container = document.getElementById("password-entries");
let openDropdownMenu = null;

// Main function to load cards
export function loadCards(entries) {
  container.innerHTML = "";

  entries.forEach(entry => {
    ////console.log("Creating card for:", entry);
    const card = createCard(entry);
    container.appendChild(card);
  });
}

// Create card element
function createCard(entry) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.id = `card-${entry.id}`;

  const cardLeft = document.createElement("div");
  cardLeft.classList.add("card-left");
  cardLeft.innerHTML = `
    <span class="service"><strong>Service:</strong> ${entry.service_name}</span>
    <span class="username"><strong>Username:</strong> ${entry.username}</span>
  `;

  ////console.log("password:", entry.password);
  const cardCenter = createPasswordSection(entry.password);
  const cardRight = createOptionsSection(entry);

  card.appendChild(cardLeft);
  card.appendChild(cardCenter);
  card.appendChild(cardRight);

  return card;
}

// Password section with toggle
function createPasswordSection(password) {
  const cardCenter = document.createElement("div");
  cardCenter.classList.add("card-center");

  const passwordSpan = document.createElement("span");
  passwordSpan.classList.add("password");
  passwordSpan.textContent = "••••••••";

  const toggleIcon = document.createElement("img");
  toggleIcon.src = "img/icons/hidden.png";
  toggleIcon.alt = "Toggle visibility";
  toggleIcon.classList.add("eye-icon");

  toggleIcon.addEventListener("click", () => {
    const isHidden = passwordSpan.textContent === "••••••••";
    passwordSpan.textContent = isHidden ? password : "••••••••";
    toggleIcon.src = isHidden ? "img/icons/visible.png" : "img/icons/hidden.png";
  });

  cardCenter.appendChild(passwordSpan);
  cardCenter.appendChild(toggleIcon);

  return cardCenter;
}

// Options section with visibility dropdown and options menu
function createOptionsSection(entry) {
  const cardRight = document.createElement("div");
  cardRight.classList.add("card-right");

  if (entry.owned) {
      const select = document.createElement("select");
      select.innerHTML = `
          <option value="private" ${entry.visibility === "private" ? "selected" : ""}>Me</option>
          <option value="family" ${entry.visibility === "family" ? "selected" : ""}>Family</option>
      `;
      select.addEventListener("change", async () => {
          entry.visibility = select.value;
          try {
              await updateVisibility(entry.id, entry.visibility);
              ////console.log("Visibility updated successfully.");
          } catch (error) {
              ////console.error("Error updating visibility:", error);
          }
      });
      cardRight.appendChild(select);
  } else {
      cardRight.textContent = entry.visibility === "private" ? "Me" : "Family";
  }

  // Options menu setup
  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("options-container");

  const optionsBtn = document.createElement("button");
  optionsBtn.classList.add("options-btn");
  optionsBtn.textContent = "⋮";
  optionsContainer.appendChild(optionsBtn);

  // Dropdown menu
  const optionsMenu = createOptionsMenu(entry);
  document.body.appendChild(optionsMenu);

  // Toggle options menu visibility
  optionsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (optionsMenu === openDropdownMenu) {
          optionsMenu.classList.remove("show");
          openDropdownMenu = null;
      } else {
          closeOpenDropdown(); 
          positionDropdown(optionsMenu, optionsBtn);
          optionsMenu.classList.add("show");
          openDropdownMenu = optionsMenu;
      }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
      if (!optionsContainer.contains(event.target) && !optionsMenu.contains(event.target)) {
          closeOpenDropdown();
      }
  });

  cardRight.appendChild(optionsContainer);
  return cardRight;
}

// Function to position dropdown near the button
function positionDropdown(dropdown, button) {
  const buttonRect = button.getBoundingClientRect();
  dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
  dropdown.style.left = `${buttonRect.left + window.scrollX}px`;
  dropdown.style.position = 'absolute'; // Ensure the dropdown is positioned absolutely
}

// Handle deleting an entry
async function handleDelete(event) {
  const entryId = event.target.dataset.id;
  try {
    const response = await deletePassword(entryId);
    ////console.log(response.message || "Password deleted successfully.");
    document.getElementById(`card-${entryId}`).remove();
  } catch (error) {
    ////console.error("Error deleting password:", error);
  }
}

// Create dropdown menu with options
function createOptionsMenu(entry) {
  const optionsMenu = document.createElement("div");
  optionsMenu.classList.add("dropdown-menu");
  optionsMenu.innerHTML = `
    <button class="dropdown-item card-change-password-btn" data-id="${entry.id}">Change Password</button>
    <button class="dropdown-item card-change-username-btn" data-id="${entry.id}">Change Username</button>
    <button class="dropdown-item card-delete-btn" data-id="${entry.id}">Delete</button>
  `;

  optionsMenu.querySelector(".card-change-username-btn").addEventListener("click", openCardChangeUsernameModal);
  optionsMenu.querySelector(".card-change-password-btn").addEventListener("click", openCardChangePasswordModal);
  optionsMenu.querySelector(".card-delete-btn").addEventListener("click", handleDelete);

  return optionsMenu;
}

// Close currently open dropdown menu if any
function closeOpenDropdown() {
  if (openDropdownMenu) openDropdownMenu.classList.remove("show");
  openDropdownMenu = null;
}