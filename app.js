// app.js
import { db, storage } from './firebase.js';
import { currentUser } from './auth.js';
import {
  ref as dbRef, set, get, child
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const habitForm = document.getElementById("habit-form");
const saveBtn = document.getElementById("save-btn");
const dateInput = document.getElementById("date");
const streakDisplay = document.getElementById("streak");
const noteInput = document.getElementById("weekly-review");
const photoInput = document.getElementById("photo");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

window.addEventListener("load", () => {
  if (currentUser) loadData(today);
});

dateInput.addEventListener("change", () => {
  if (currentUser) loadData(dateInput.value);
});

saveBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("You must be logged in to save.");
  const date = dateInput.value;
  const habits = {};
  document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => {
    habits[cb.name] = cb.checked;
  });

  const notes = noteInput.value;
  const userId = currentUser.uid;

  // Save habit + note data
  await set(dbRef(db, `users/${userId}/habits/${date}`), {
    habits,
    notes
  });

  // Handle image upload
  const file = photoInput.files[0];
  if (file) {
    const imgRef = storageRef(storage, `users/${userId}/photos/${date}.jpg`);
    await uploadBytes(imgRef, file);
  }

  alert("Saved!");
  loadStreak(userId);
});

async function loadData(date) {
  const userId = currentUser.uid;
  const snap = await get(child(dbRef(db), `users/${userId}/habits/${date}`));
  if (snap.exists()) {
    const data = snap.val();
    const habits = data.habits || {};
    document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => {
      cb.checked = habits[cb.name] || false;
    });
    noteInput.value = data.notes || "";
  } else {
    document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => cb.checked = false);
    noteInput.value = "";
  }
  loadStreak(userId);
}

async function loadStreak(userId) {
  const snap = await get(child(dbRef(db), `users/${userId}/habits`));
  if (snap.exists()) {
    const days = Object.entries(snap.val()).sort(([a], [b]) => a > b ? -1 : 1);
    let count = 0;
    for (const [_, val] of days) {
      const allChecked = Object.values(val.habits || {}).every(v => v === true);
      if (allChecked) count++;
      else break;
    }
    streakDisplay.textContent = `🔥 Streak: ${count} day(s)`;
  } else {
    streakDisplay.textContent = "🔥 Streak: 0 days";
  }
}
