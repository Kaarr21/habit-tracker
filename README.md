# Lifestyle Tracker

## Features

- **User Authentication** - Secure login/signup system
- **Daily Habit Tracking** - Track multiple habits with simple checkboxes
- **Streak Counter** - Stay motivated with a streak counter
- **Goal Management** - Set and track daily goals
- **5-Minute Journal** - Practice gratitude and reflection
- **Bible Study Journal** - Record scripture readings and personal reflections
- **Weekly Review** - Reflect on your progress and set plans
- **Progress Photos** - Upload photos to track visual progress
- **Date Navigation** - Access and update past entries
- **Offline Support** - Works without internet connection
- **Mobile-Friendly** - Responsive design for all device sizes
- **Installable** - Add to home screen on mobile devices

## Demo

The app is live at: [https://kaarr21.github.io/habit-tracker/](https://kaarr21.github.io/habit-tracker/)
It has also been deployed on vercel:[https://habit-tracker-six-topaz.vercel.app/]

## Technologies

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Backend**: Firebase (Authentication, Realtime Database, Storage)
- **PWA**: Service Worker, Web App Manifest
- **Modules**: ES6 Modules
- **Animation**: CSS Keyframes


### Option 2: Use as a PWA

1. Visit [https://kaarr21.github.io/habit-tracker/](https://kaarr21.github.io/habit-tracker/) in your browser
2. For mobile devices: tap the "Add to Home Screen" option in your browser menu
3. For desktop: click the install icon in the address bar (varies by browser)

## Usage

### Authentication

1. Create an account using your email and password
2. Log in with your credentials
3. Use the logout button when finished

### Tracking Habits

1. Select the date you want to track
2. Check off completed habits
3. Upload a progress photo if desired
4. Click "Save All" to save your progress

### Setting Goals

1. Navigate to the Goals tab
2. Enter a new goal and click "Add"
3. Check off goals as you complete them
4. Delete goals by clicking the "×" button

### Journaling

1. Navigate to the Journal tab
2. Fill in the gratitude prompts
3. Complete the daily reflection sections
4. Weekly review section is available at the bottom of all tabs

### Bible Study

1. Navigate to the Bible Study tab
2. Enter scripture reference and text
3. Record your observations, applications, and prayers
4. All entries are saved when you click "Save All"

## 🔥Firebase Setup

This app uses Firebase for backend services. To set up your own Firebase project:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication, Realtime Database, and Storage services
3. Update the `firebase.js` file with your Firebase configuration:
4. Set up Realtime Database rules
5. Set up Storage rules
   
## Project Structure

```
lifestyle-tracker/
├── index.html          # Main HTML file
├── app.js              # Main application logic
├── auth.js             # Authentication functionality
├── firebase.js         # Firebase configuration
├── manifest.json       # PWA manifest file
├── service-worker.js   # Service worker for offline functionality
└── site.webmanifest    # Alternative manifest file
```

## Progressive Web App

This application is a PWA which means:

1. It can be installed on your device like a native app
2. It works offline using cached resources
3. It loads quickly and reliably

The service worker caches key assets and manages offline functionality, while the manifest file provides metadata for the installed app experience.
