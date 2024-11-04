// Sign Out functionality
const signOutBtn = document.getElementById("sign-out-btn"); // Assuming it's the third button

signOutBtn.addEventListener("click", () => {
  // Remove the JWT token from local storage
  localStorage.removeItem("token");

  // Redirect to login page
  window.location.href = "/index.html";
});