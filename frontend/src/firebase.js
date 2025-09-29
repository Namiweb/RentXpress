import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "rentxpress-b717e.firebaseapp.com",
  projectId: "rentxpress-b717e",
  storageBucket: "rentxpress-b717e.firebasestorage.app",
  messagingSenderId: "945123480105",
  appId: "1:945123480105:web:ed0967fa78a79908334238",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
