// auth.js
import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

export let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  if (loginForm.dataset.mode === "signup") {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => loginForm.reset())
      .catch(err => alert(err.message));
  } else {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => loginForm.reset())
      .catch(err => alert(err.message));
  }
});

logoutBtn.addEventListener("click", () => {
  signOut(auth).catch(err => alert(err.message));
});

document.getElementById("toggle-auth").addEventListener("click", () => {
  const isSignup = loginForm.dataset.mode === "signup";
  loginForm.dataset.mode = isSignup ? "login" : "signup";
  loginForm.querySelector("button").textContent = isSignup ? "Login" : "Sign Up";
});
