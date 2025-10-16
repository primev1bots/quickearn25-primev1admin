// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref as dbRef,
  onValue as dbOnValue,
  get as dbGet,
  set as dbSet,
} from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-ij-FWOgRmBF9vWcJ16PqJjGLA8HGkF0",
  authDomain: "quickearn25bot.firebaseapp.com",
  databaseURL: "https://quickearn25bot-default-rtdb.firebaseio.com",
  projectId: "quickearn25bot",
  storageBucket: "quickearn25bot.firebasestorage.app",
  messagingSenderId: "835656750621",
  appId: "1:835656750621:web:73babcd3b45114ff2098f4",
  measurementId: "G-3D9VT454PS"
};

// Initialize Firebase (ensure it's only initialized once)
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database & Storage
const database = getDatabase(app);
const storage = getStorage(app);

// Export everything you need
export {
  app,
  database,
  storage,
  dbRef as ref,
  dbOnValue as onValue,
  dbGet as get,
  dbSet as set,
};

export default app;
