export async function saveAllData(dateValue, formData) {
  const user = getCurrentUser();
  if (!user) {
    console.error("You must be logged in to save data.");
    return false;
  }

  const userId = user.uid;
  const date = dateValue;
  
  try {
    // Add timestamp
    formData.lastUpdated = new Date().toISOString();

    // Save to localStorage
    let userData = getFromLocalStorage(USER_DATA_KEY) || {};
    userData[date] = formData;
    const localSaved = saveToLocalStorage(USER_DATA_KEY, userData);
    saveToLocalStorage(CURRENT_DATE_KEY, date);

    // If online, sync to Firebase
    if (navigator.onLine) {
      try {
        await set(dbRef(db, `users/${userId}/habits/${date}`), formData);
        await processPendingUploads(); // in case other non-image uploads are queued
        return true;
      } catch (firebaseError) {
        console.error("Error saving to Firebase:", firebaseError);
        return localSaved; // Still valid if local save succeeded
      }
    }

    return localSaved;
  } catch (error) {
    console.error("Error in saveAllData:", error);
    return false;
  }
}
