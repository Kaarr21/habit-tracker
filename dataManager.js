// dataManager.js - Handles data persistence for offline use
import { db, storage } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { ref as dbRef, set, get, child } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Cache keys
const CACHE_PREFIX = 'lifestyle-tracker-';
const USER_DATA_KEY = 'user-data';
const CURRENT_DATE_KEY = 'current-date';
const PENDING_UPLOADS_KEY = 'pending-uploads';

// Local storage helper functions
export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to local storage:', error);
    return false;
  }
}

export function getFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting from local storage:', error);
    return null;
  }
}

export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.error('Error removing from local storage:', error);
    return false;
  }
}

// Indexed DB for storing images
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('lifestyle-tracker-db', 1);
  
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    
    // Create an object store for pending image uploads
    if (!db.objectStoreNames.contains('pendingUploads')) {
      db.createObjectStore('pendingUploads', { keyPath: 'id' });
    }
  };
  
  request.onsuccess = function(event) {
    resolve(event.target.result);
  };
  
  request.onerror = function(event) {
    console.error('IndexedDB error:', event.target.error);
    reject(event.target.error);
  };
});

// Save image to IndexedDB for offline use
export async function saveImageLocally(date, file) {
  try {
    if (!file) return null;
    
    const db = await dbPromise;
    const transaction = db.transaction(['pendingUploads'], 'readwrite');
    const store = transaction.objectStore('pendingUploads');
    
    // Read file as data URL
    const reader = new FileReader();
    const fileDataPromise = new Promise((resolve) => {
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(file);
    });
    
    const fileData = await fileDataPromise;
    const id = `${getCurrentUser()?.uid || 'anonymous'}-${date}`;
    
    // Store image data and metadata
    await new Promise((resolve, reject) => {
      const request = store.put({
        id,
        date,
        userId: getCurrentUser()?.uid || 'anonymous',
        fileData,
        fileName: file.name,
        fileType: file.type,
        timestamp: new Date().getTime()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = (error) => reject(error);
    });
    
    // Track pending uploads
    const pendingUploads = getFromLocalStorage(PENDING_UPLOADS_KEY) || [];
    if (!pendingUploads.includes(id)) {
      pendingUploads.push(id);
      saveToLocalStorage(PENDING_UPLOADS_KEY, pendingUploads);
    }
    
    return fileData; // Return the data URL for immediate display
  } catch (error) {
    console.error('Error saving image locally:', error);
    return null;
  }
}

// Get locally stored image
export async function getLocalImage(date, userId) {
  try {
    userId = userId || getCurrentUser()?.uid || 'anonymous';
    const id = `${userId}-${date}`;
    
    const db = await dbPromise;
    const transaction = db.transaction(['pendingUploads'], 'readonly');
    const store = transaction.objectStore('pendingUploads');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.fileData);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error('Error getting local image:', error);
    return null;
  }
}

// Process pending uploads when online
export async function processPendingUploads() {
  try {
    const pendingUploads = getFromLocalStorage(PENDING_UPLOADS_KEY) || [];
    if (pendingUploads.length === 0) return;
    
    const db = await dbPromise;
    const currentUser = getCurrentUser();
    if (!currentUser) return; // User must be logged in to upload
    
    for (const id of pendingUploads) {
      const transaction = db.transaction(['pendingUploads'], 'readwrite');
      const store = transaction.objectStore('pendingUploads');
      
      const uploadData = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (error) => reject(error);
      });
      
      if (uploadData && uploadData.userId === currentUser.uid) {
        try {
          // Convert data URL back to file
          const response = await fetch(uploadData.fileData);
          const blob = await response.blob();
          const file = new File([blob], uploadData.fileName, { type: uploadData.fileType });
          
          // Upload to Firebase Storage
          const imgRef = storageRef(storage, `users/${currentUser.uid}/photos/${uploadData.date}.jpg`);
          await uploadBytes(imgRef, file);
          
          // Get and store download URL
          const downloadURL = await getDownloadURL(imgRef);
          await set(dbRef(db, `users/${currentUser.uid}/habits/${uploadData.date}/photoURL`), downloadURL);
          
          // Remove from pending uploads
          await new Promise((resolve, reject) => {
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = (error) => reject(error);
          });
          
          console.log(`Successfully uploaded pending image for ${uploadData.date}`);
        } catch (error) {
          console.error(`Error uploading pending image for ${id}:`, error);
          // Keep in pending uploads to retry later
          continue;
        }
      }
    }
    
    // Update pending uploads list
    const remainingUploads = (await db.transaction(['pendingUploads'], 'readonly')
      .objectStore('pendingUploads')
      .getAllKeys())
      .filter(key => key.startsWith(`${currentUser.uid}-`))
      .map(key => key.toString());
    
    saveToLocalStorage(PENDING_UPLOADS_KEY, remainingUploads);
  } catch (error) {
    console.error('Error processing pending uploads:', error);
  }
}

// Save all data and ensure persistence
export async function saveAllData(dateValue, formData, file) {
  const user = getCurrentUser();
  if (!user) {
    alert("You must be logged in to save data.");
    return false;
  }

  const userId = user.uid;
  const date = dateValue;
  
  try {
    // Save data to Firebase if online
    if (navigator.onLine) {
      await set(dbRef(db, `users/${userId}/habits/${date}`), formData);
      
      // Handle image upload
      if (file) {
        const imgRef = storageRef(storage, `users/${userId}/photos/${date}.jpg`);
        await uploadBytes(imgRef, file);
        
        // Get and store download URL
        const downloadURL = await getDownloadURL(imgRef);
        await set(dbRef(db, `users/${userId}/habits/${date}/photoURL`), downloadURL);
      }
    }
    
    // Always save to local storage for offline access
    formData.lastUpdated = new Date().toISOString();
    
    // Save the form data for this date
    let userData = getFromLocalStorage(USER_DATA_KEY) || {};
    userData[date] = formData;
    saveToLocalStorage(USER_DATA_KEY, userData);
    
    // Save current date for next session
    saveToLocalStorage(CURRENT_DATE_KEY, date);
    
    // Handle image for offline
    if (file) {
      await saveImageLocally(date, file);
    }
    
    // Process any pending uploads if we're online
    if (navigator.onLine) {
      processPendingUploads();
    }
    
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    
    // Even if Firebase save fails, ensure local storage save
    let userData = getFromLocalStorage(USER_DATA_KEY) || {};
    userData[date] = formData;
    saveToLocalStorage(USER_DATA_KEY, userData);
    
    if (file) {
      await saveImageLocally(date, file);
    }
    
    return false;
  }
}

// Load data with fallback to local storage
export async function loadData(date, userId) {
  try {
    // Try Firebase first if online
    if (navigator.onLine) {
      try {
        const snap = await get(child(dbRef(db), `users/${userId}/habits/${date}`));
        if (snap.exists()) {
          const data = snap.val();
          
          // Save to local storage for offline access
          let userData = getFromLocalStorage(USER_DATA_KEY) || {};
          userData[date] = data;
          saveToLocalStorage(USER_DATA_KEY, userData);
          
          return data;
        }
      } catch (error) {
        console.error("Error fetching from Firebase:", error);
        // Fall back to local storage
      }
    }
    
    // Try local storage if Firebase failed or offline
    const userData = getFromLocalStorage(USER_DATA_KEY) || {};
    return userData[date] || null;
  } catch (error) {
    console.error("Error loading data:", error);
    return null;
  }
}

// Get the most recent date the user worked with
export function getSavedDate() {
  return getFromLocalStorage(CURRENT_DATE_KEY) || new Date().toISOString().split("T")[0];
}

// Calculate streak with offline support
export async function calculateStreak(userId) {
  try {
    let daysData = {};
    
    // Try Firebase first if online
    if (navigator.onLine) {
      try {
        const snap = await get(child(dbRef(db), `users/${userId}/habits`));
        if (snap.exists()) {
          daysData = snap.val();
          
          // Cache this data for offline
          saveToLocalStorage(`${userId}-streak-data`, daysData);
        }
      } catch (error) {
        console.error("Error fetching streak data from Firebase:", error);
        // Fall back to local storage
      }
    }
    
    // If no data from Firebase or offline, try local storage
    if (Object.keys(daysData).length === 0) {
      daysData = getFromLocalStorage(`${userId}-streak-data`) || {};
      
      // Also check user data for additional days
      const userData = getFromLocalStorage(USER_DATA_KEY) || {};
      
      // Merge any data from user data that might not be in streak data
      Object.entries(userData).forEach(([date, data]) => {
        if (!daysData[date]) {
          daysData[date] = data;
        }
      });
    }
    
    // No data available
    if (Object.keys(daysData).length === 0) {
      return 0;
    }
    
    // Calculate streak
    const days = Object.entries(daysData).sort(([a], [b]) => a > b ? -1 : 1);
    
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
    
    return count;
  } catch (error) {
    console.error("Error calculating streak:", error);
    return 0;
  }
}

// Sync local data with Firebase when coming back online
export async function syncWithFirebase() {
  const user = getCurrentUser();
  if (!user || !navigator.onLine) return;
  
  try {
    const userData = getFromLocalStorage(USER_DATA_KEY) || {};
    
    // Upload each date's data that we have locally
    for (const [date, data] of Object.entries(userData)) {
      try {
        // Check if the server has newer data
        const snap = await get(child(dbRef(db), `users/${user.uid}/habits/${date}`));
        const serverData = snap.exists() ? snap.val() : null;
        
        // Only update if local data is newer or server has no data
        if (!serverData || 
            (data.lastUpdated && (!serverData.lastUpdated || new Date(data.lastUpdated) > new Date(serverData.lastUpdated)))) {
          await set(dbRef(db, `users/${user.uid}/habits/${date}`), data);
        }
      } catch (error) {
        console.error(`Error syncing data for ${date}:`, error);
      }
    }
    
    // Process any pending image uploads
    await processPendingUploads();
    
  } catch (error) {
    console.error("Error syncing with Firebase:", error);
  }
}

// Initialize sync listeners
export function initSyncListeners() {
  // Listen for online status changes
  window.addEventListener('online', () => {
    console.log('App is online. Syncing data...');
    syncWithFirebase();
  });
  
  // Periodic sync attempt (every 5 minutes when online)
  setInterval(() => {
    if (navigator.onLine && getCurrentUser()) {
      syncWithFirebase();
    }
  }, 5 * 60 * 1000);
}