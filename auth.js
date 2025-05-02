import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Reference DOM elements
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

let currentUser = null;

// Signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    return alert("Please enter both email and password");
  }
  
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Signup successful!");
      document.getElementById("email").value = "";
      document.getElementById("password").value = "";
    })
    .catch((error) => alert("Signup error: " + error.message));
}

// Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    return alert("Please enter both email and password");
  }
  
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Login successful!");
      document.getElementById("email").value = "";
      document.getElementById("password").value = "";
    })
    .catch((error) => alert("Login error: " + error.message));
}

// Logout
function logout() {
  signOut(auth).then(() => {
    alert("Logged out");
  }).catch((error) => {
    console.error("Logout error:", error);
    alert("Error logging out: " + error.message);
  });
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    console.log("User logged in:", user.email);
    authSection?.classList.add("hidden");
    appSection?.classList.remove("hidden");
  } else {
    console.log("User logged out");
    authSection?.classList.remove("hidden");
    appSection?.classList.add("hidden");
  }
});

// Attach event listeners
signupBtn?.addEventListener("click", signup);
loginBtn?.addEventListener("click", login);
logoutBtn?.addEventListener("click", logout);

// Export getter
export function getCurrentUser() {
  return currentUser;
}
export { currentUser };
export { signup, login, logout };