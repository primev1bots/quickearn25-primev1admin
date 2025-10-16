// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
