// auth.js
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Reference DOM elements
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

// Signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("Signup successful!"))
    .catch((error) => alert("Signup error: " + error.message));
}

// Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => alert("Login successful!"))
    .catch((error) => alert("Login error: " + error.message));
}

// Logout
function logout() {
  signOut(auth).then(() => {
    alert("Logged out");
  });
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// Attach event listeners
signupBtn?.addEventListener("click", signup);
loginBtn?.addEventListener("click", login);
logoutBtn?.addEventListener("click", logout);
