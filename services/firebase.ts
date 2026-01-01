
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1hEzNHIFCKZMVK2z6F4FZSPFe1a_B2AU",
  authDomain: "phre-health-agent.firebaseapp.com",
  projectId: "phre-health-agent",
  storageBucket: "phre-health-agent.firebasestorage.app",
  messagingSenderId: "731317503004",
  appId: "1:731317503004:web:5972edf77103e5d6388bd9",
  measurementId: "G-2YH4CV8RJZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
