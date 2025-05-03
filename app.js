import { db, storage } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { ref as dbRef, set, get, child, push, remove, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
import * as DataManager from './dataManager.js';

// Get form elements
const habitForm = document.getElementById("habit-form");
const dateInput = document.getElementById("date");
const streakDisplay = document.getElementById("streak");
const reviewTextarea = document.getElementById("review");
const photoInput = document.getElementById("photo");
const newGoalInput = document.getElementById("new-goal");
const addGoalBtn = document.getElementById("add-goal-btn");
const goalsList = document.getElementById("goals-list");
const saveBtn = document.getElementById("save-btn");
const offlineIndicator = document.getElementById("offline-indicator");

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
let photoURL = null;
let photoChanged = false;

const today = new Date().toISOString().split("T")[0];

// Initialize offline status indicator
function updateOfflineStatus() {
  if (offlineIndicator) {
    if (navigator.onLine) {
      offlineIndicator.classList.add('hidden');
    } else {
      offlineIndicator.classList.remove('hidden');
    }
  }
}

// Network status listeners
window.addEventListener('online', () => {
  updateOfflineStatus();
  DataManager.syncWithFirebase(); // Sync data when back online
});

window.addEventListener('offline', updateOfflineStatus);

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

// Service worker message handler
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_REQUIRED') {
    DataManager.syncWithFirebase();
  }
});

window.addEventListener("load", async () => {
  // Initialize offline indicator
  updateOfflineStatus();
  
  // Initialize DataManager sync listeners
  DataManager.initSyncListeners();
  
  // Check for user
  const user = getCurrentUser();
  if (user) {
    currentUserID = user.uid;
    
    // Get the saved date or default to today
    const savedDate = DataManager.getSavedDate() || today;
    dateInput.value = savedDate;
    
    // Load data for the active date
    await loadData(savedDate, user.uid);
    
    // Calculate and display streak
    const streak = await DataManager.calculateStreak(user.uid);
    streakDisplay.textContent = `🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`;
  } else {
    console.log("User not logged in yet");
    dateInput.value = today;
  }
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { 
        scope: './' 
      });
      console.log('ServiceWorker registered with scope:', registration.scope);
      
      // Check if there's a waiting service worker
      if (registration.waiting) {
        // New service worker is waiting - we could notify the user here
        console.log('New service worker is waiting to activate');
      }
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('New service worker installing');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker installed and waiting');
            // We could show a prompt to the user here to refresh for updates
          }
        });
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
});

dateInput.addEventListener("change", () => {
  const user = getCurrentUser();
  if (user) {
    loadData(dateInput.value, user.uid);
    // Save the current date to localStorage
    DataManager.saveToLocalStorage('current-date', dateInput.value);
  } else {
    alert("Please log in to access your data.");
  }
});

// Photo change handler
photoInput.addEventListener("change", () => {
  photoChanged = true;
  
  // Preview image if possible
  const file = photoInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      // If preview element exists, update it
      const photoPreview = document.getElementById('photo-preview');
      if (photoPreview) {
        photoPreview.src = e.target.result;
        photoPreview.classList.remove('hidden');
      } else {
        // Create preview element if it doesn't exist
        const previewContainer = document.createElement('div');
        previewContainer.className = 'mt-2';
        previewContainer.innerHTML = `
          <img id="photo-preview" src="${e.target.result}" 
               alt="Preview" class="w-full max-h-48 object-contain rounded">
        `;
        photoInput.parentNode.