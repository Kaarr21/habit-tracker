import { db, storage } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { ref as dbRef, set, get, child, push, remove, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Get form elements
const habitForm = document.getElementById("habit-form");
const dateInput = document.getElementById("date");
const streakDisplay = document.getElementById("streak");
const reviewTextarea = document.getElementById("review");
const photoInput = document.getElementById("photo");
const newGoalInput = document.getElementById("new-goal");
const addGoalBtn = document.getElementById("add-goal-btn");
const goalsList = document.getElementById("goals-list");

// Tab navigation elements
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// Journal elements
const gratitudeInputs = [
  document.getElementById("gratitude-1"),
  document.getElementById("gratitude-2"),
  document.getElementById("gratitude-3")
];

const greatInputs = [
  document.getElementById("great-1"),
  document.getElementById("great-2"), 
  document.getElementById("great-3")
];

const affirmationInput = document.getElementById("affirmation");

const highlightInputs = [
  document.getElementById("highlight-1"),
  document.getElementById("highlight-2"),
  document.getElementById("highlight-3")
];

const betterDayInput = document.getElementById("better-day");

// Bible study elements
const scriptureReference = document.getElementById("scripture-reference");
const scriptureText = document.getElementById("scripture-text");
const bibleObservations = document.getElementById("bible-observations");
const bibleApplication = document.getElementById("bible-application");
const biblePrayer = document.getElementById("bible-prayer");

let currentUserID = null;
let currentGoals = {};

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

// Initialize tabs
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs and contents
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));
    
    // Add active class to clicked tab and corresponding content
    tab.classList.add("active");
    const tabId = tab.getAttribute("data-tab");
    document.getElementById(`${tabId}-tab`).classList.add("active");
  });
});

// Add goal functionality
addGoalBtn.addEventListener("click", () => addNewGoal());

newGoalInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addNewGoal();
  }
});

function addNewGoal() {
  const goalText = newGoalInput.value.trim();
  if (goalText) {
    const goalId = Date.now().toString();
    
    // Add to current goals object
    currentGoals[goalId] = {
      text: goalText,
      completed: false
    };
    
    // Add to UI
    renderGoals();
    
    // Clear input
    newGoalInput.value = '';
  }
}

function renderGoals() {
  // Clear current goals
  goalsList.innerHTML = '';
  
  // Add each goal
  Object.entries(currentGoals).forEach(([id, goal]) => {
    const goalItem = document.createElement('div');
    goalItem.className = 'flex items-center p-2 border rounded mb-2';
    goalItem.innerHTML = `
      <input type="checkbox" class="w-5 h-5 mr-2 goal-checkbox" 
             data-id="${id}" ${goal.completed ? 'checked' : ''}>
      <span class="${goal.completed ? 'line-through text-gray-500' : ''}">${goal.text}</span>
      <button class="ml-auto text-red-500 delete-goal" data-id="${id}">×</button>
    `;
    goalsList.appendChild(goalItem);
  });
  
  // Add event listeners to new elements
  document.querySelectorAll('.goal-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const id = this.getAttribute('data-id');
      currentGoals[id].completed = this.checked;
      renderGoals();
    });
  });
  
  document.querySelectorAll('.delete-goal').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      delete currentGoals[id];
      renderGoals();
    });
  });
}

window.addEventListener("load", () => {
  const user = getCurrentUser();
  if (user) {
    currentUserID = user.uid;
    loadData(today, user.uid);
    loadStreak(user.uid);
  } else {
    console.log("User not logged in yet");
  }
  
  // Register service worker
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
    alert("Please log in to access your data.");
  }
});

// Save all data
window.saveData = async function() {
  const user = getCurrentUser();
  if (!user) {
    return alert("You must be logged in to save.");
  }

  const date = dateInput.value;
  
  // Collect habits data
  const habits = {};
  document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => {
    habits[cb.name] = cb.checked;
  });

  // Collect journal data
  const journalData = {
    gratitude: gratitudeInputs.map(input => input.value),
    great: greatInputs.map(input => input.value),
    affirmation: affirmationInput.value,
    highlights: highlightInputs.map(input => input.value),
    betterDay: betterDayInput.value
  };

  // Collect Bible study data
  const bibleData = {
    reference: scriptureReference.value,
    text: scriptureText.value,
    observations: bibleObservations.value,
    application: bibleApplication.value,
    prayer: biblePrayer.value
  };

  // Compile all data
  const dailyData = {
    habits,
    goals: currentGoals,
    journal: journalData,
    bible: bibleData,
    review: reviewTextarea.value
  };

  const userId = user.uid;

  try {
    // Save all data
    await set(dbRef(db, `users/${userId}/habits/${date}`), dailyData);

    // Handle image upload
    const file = photoInput.files[0];
    if (file) {
      const imgRef = storageRef(storage, `users/${userId}/photos/${date}.jpg`);
      await uploadBytes(imgRef, file);
      
      // Get and store download URL
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
      
      // Load goals
      currentGoals = data.goals || {};
      renderGoals();
      
      // Load journal data
      if (data.journal) {
        const journal = data.journal;
        
        // Gratitude
        if (journal.gratitude) {
          journal.gratitude.forEach((item, index) => {
            if (index < gratitudeInputs.length) {
              gratitudeInputs[index].value = item || "";
            }
          });
        }
        
        // Great day items
        if (journal.great) {
          journal.great.forEach((item, index) => {
            if (index < greatInputs.length) {
              greatInputs[index].value = item || "";
            }
          });
        }
        
        // Affirmation
        affirmationInput.value = journal.affirmation || "";
        
        // Highlights
        if (journal.highlights) {
          journal.highlights.forEach((item, index) => {
            if (index < highlightInputs.length) {
              highlightInputs[index].value = item || "";
            }
          });
        }
        
        // Better day
        betterDayInput.value = journal.betterDay || "";
      } else {
        // Reset journal fields
        gratitudeInputs.forEach(input => input.value = "");
        greatInputs.forEach(input => input.value = "");
        affirmationInput.value = "";
        highlightInputs.forEach(input => input.value = "");
        betterDayInput.value = "";
      }
      
      // Load Bible study data
      if (data.bible) {
        const bible = data.bible;
        scriptureReference.value = bible.reference || "";
        scriptureText.value = bible.text || "";
        bibleObservations.value = bible.observations || "";
        bibleApplication.value = bible.application || "";
        biblePrayer.value = bible.prayer || "";
      } else {
        // Reset Bible study fields
        scriptureReference.value = "";
        scriptureText.value = "";
        bibleObservations.value = "";
        bibleApplication.value = "";
        biblePrayer.value = "";
      }
      
      // Load review
      reviewTextarea.value = data.review || "";
    } else {
      // Reset form if no data exists
      resetAllFields();
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

function resetAllFields() {
  // Reset habits
  document.querySelectorAll("#habit-form input[type=checkbox]").forEach(cb => cb.checked = false);
  
  // Reset goals
  currentGoals = {};
  renderGoals();
  
  // Reset journal
  gratitudeInputs.forEach(input => input.value = "");
  greatInputs.forEach(input => input.value = "");
  affirmationInput.value = "";
  highlightInputs.forEach(input => input.value = "");
  betterDayInput.value = "";
  
  // Reset Bible study
  scriptureReference.value = "";
  scriptureText.value = "";
  bibleObservations.value = "";
  bibleApplication.value = "";
  biblePrayer.value = "";
  
  // Reset review
  reviewTextarea.value = "";
}

async function loadStreak(userId) {
  try {
    const snap = await get(child(dbRef(db), `users/${userId}/habits`));
    if (snap.exists()) {
      const data = snap.val();
      const days = Object.entries(data).sort(([a], [b]) => a > b ? -1 : 1);
      
      let count = 0;
      for (const [_, val] of days) {
        // Consider a day complete if all habits are checked
        let allHabitsComplete = true;
        
        if (val.habits) {
          const habitEntries = Object.entries(val.habits);
          if (habitEntries.length > 0) {
            allHabitsComplete = habitEntries.every(([_, completed]) => completed === true);
          } else {
            allHabitsComplete = false;
          }
        } else {
          allHabitsComplete = false;
        }
        
        if (allHabitsComplete) {
          count++;
        } else {
          break;
        }
      }
      
      streakDisplay.textContent = `🔥 Streak: ${count} day${count !== 1 ? 's' : ''}`;
    } else {
      streakDisplay.textContent = "🔥 Streak: 0 days";
    }
  } catch (error) {
    console.error("Error loading streak:", error);
  }
}