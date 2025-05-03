async function saveData() {
  const user = getCurrentUser();
  if (!user) {
    alert("Please log in to save your data.");
    return;
  }
  
  const date = dateInput.value;
  if (!date) {
    alert("Please select a date.");
    return;
  }
  
  // Collect habits data
  const habits = {};
  for (const habitInput of habitForm.elements) {
    if (habitInput.type === 'checkbox') {
      habits[habitInput.name] = habitInput.checked;
    }
  }
  
  // Collect journal data
  const journal = {
    gratitude: gratitudeInputs.map(input => input.value.trim()),
    great: greatInputs.map(input => input.value.trim()),
    affirmation: affirmationInput.value.trim(),
    highlights: highlightInputs.map(input => input.value.trim()),
    betterDay: betterDayInput.value.trim()
  };
  
  // Collect Bible study data
  const bibleStudy = {
    reference: scriptureReference.value.trim(),
    text: scriptureText.value.trim(),
    observations: bibleObservations.value.trim(),
    application: bibleApplication.value.trim(),
    prayer: biblePrayer.value.trim()
  };
  
  // Prepare form data
  const formData = {
    habits,
    goals: currentGoals,
    review: reviewTextarea.value.trim(),
    journal,
    bibleStudy,
    lastUpdated: new Date().toISOString()
  };
  
  try {
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    
    const saved = await DataManager.saveAllData(date, formData);
    
    if (saved === true) {
      saveBtn.textContent = "✓ Saved!";
      
      // Update streak after saving
      const streak = await DataManager.calculateStreak(user.uid);
      streakDisplay.textContent = `🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`;
      
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
      }, 2000);
    } else {
      saveBtn.textContent = "⚠️ Saved Locally";
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
      }, 2000);
    }
  } catch (error) {
    console.error("Error saving data:", error);
    saveBtn.textContent = "❌ Error!";
    alert("Failed to save data: " + error.message);
    
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.textContent = originalBtnText;
    }, 2000);
  }
}

window.saveData = saveData;
