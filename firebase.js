// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBj_0it9xRC_RDJ6G6nTumNdHlyCOe__-s",
  authDomain: "habittrackerapp-47da5.firebaseapp.com",
  // Fix the database URL - use the URL from the warning message
  databaseURL: "https://habittrackerapp-47da5-default-rtdb.firebaseio.com",
  projectId: "habittrackerapp-47da5",
  storageBucket: "habittrackerapp-47da5.appspot.com",
  messagingSenderId: "308625902639",
  appId: "1:308625902639:web:48e42253ebc7d732fbcada"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { auth, db, storage };