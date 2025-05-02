import { db, storage } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { ref as dbRef, set, get, child } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Get correct form elements
const habitForm = document.getElementById("habit-form");
const dateInput = document.getElementById("date");
const streakDisplay = document.getElementById("streak");
const goalInput = document.getElementById("goal");
const goalDoneCheckbox = document.getElementById("goalDone");
const reviewTextarea = document.getElementById("review");
const photoInput = document.getElementById("photo");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

window.addEventListener("load", () => {
  const user = getCurrentUser();
  if (user) {
    loadData(today, user.uid);
    loadStreak(user.uid);
  } else {
    console.log("User not logged in yet");
  }
  
  // Register service worker - with proper error handling
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./service-worker.js')
        .then(function(registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(function(error) {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
});

dateInput.addEventListener("change", () => {
  const user = getCurrentUser();
  if (user) {
    loadData(dateInput.value, user.uid);
  } else {
    alert("Please log in to access your habits.");
  }
});

// Fix saveData function - make it global for HTML onclick
window.saveData = async function() {
  const user = getCurrentUser();
  if (!user) {
    return alert("You must be logged in to save.");
  }

  const date = dateInput.value;
  const habits = {};
  document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => {
    habits[cb.name] = cb.checked;
  });

  const dailyData = {
    habits,
    goal: {
      text: goalInput.value,
      completed: goalDoneCheckbox.checked
    },
    review: reviewTextarea.value
  };

  const userId = user.uid;

  try {
    // Save habit data
    await set(dbRef(db, `users/${userId}/habits/${date}`), dailyData);

    // Handle image upload
    const file = photoInput.files[0];
    if (file) {
      const imgRef = storageRef(storage, `users/${userId}/photos/${date}.jpg`);
      await uploadBytes(imgRef, file);
      
      // Optional: Get and store download URL
      const downloadURL = await getDownloadURL(imgRef);
      await set(dbRef(db, `users/${userId}/habits/${date}/photoURL`), downloadURL);
    }

    alert("Progress saved successfully!");
    loadStreak(userId);
  } catch (error) {
    console.error("Error saving data:", error);
    alert("There was an error saving your data: " + error.message);
  }
};

async function loadData(date, userId) {
  try {
    const snap = await get(child(dbRef(db), `users/${userId}/habits/${date}`));
    if (snap.exists()) {
      const data = snap.val();
      
      // Load habits
      const habits = data.habits || {};
      document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => {
        cb.checked = habits[cb.name] || false;
      });
      
      // Load goal
      if (data.goal) {
        goalInput.value = data.goal.text || "";
        goalDoneCheckbox.checked = data.goal.completed || false;
      } else {
        goalInput.value = "";
        goalDoneCheckbox.checked = false;
      }
      
      // Load review
      reviewTextarea.value = data.review || "";
    } else {
      // Reset form if no data exists
      document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => cb.checked = false);
      goalInput.value = "";
      goalDoneCheckbox.checked = false;
      reviewTextarea.value = "";
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

async function loadStreak(userId) {
  try {
    const snap = await get(child(dbRef(db), `users/${userId}/habits`));
    if (snap.exists()) {
      const data = snap.val();
      const days = Object.entries(data).sort(([a], [b]) => a > b ? -1 : 1);
      
      let count = 0;
      for (const [_, val] of days) {
        // Check if all habits are completed
        const habitChecks = Object.values(val.habits || {}).every(v => v === true);
        
        // Check if goal is completed (if exists)
        const goalCompleted = val.goal?.completed !== false;
        
        // Count the day only if all habits and goal are completed
        if (habitChecks && goalCompleted) count++;
        else break;
      }
      
      streakDisplay.textContent = `🔥 Streak: ${count} day${count !== 1 ? 's' : ''}`;
    } else {
      streakDisplay.textContent = "🔥 Streak: 0 days";
    }
  } catch (error) {
    console.error("Error loading streak:", error);
  }
}