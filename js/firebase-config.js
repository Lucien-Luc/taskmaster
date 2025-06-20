// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyC_7qOCFGQH_NVAeZfdlvZ2TFVkgaIiuKY",
    authDomain: "m-e-tasks.firebaseapp.com",
    projectId: "m-e-tasks",
    storageBucket: "m-e-tasks.firebasestorage.app",
    messagingSenderId: "42361400827",
    appId: "1:42361400827:web:e53e77060ce943711d6f5e",
    measurementId: "G-M95Y51ZSVP"
};

// Helper function to get environment variables with fallback
function getEnvVar(name, defaultValue) {
    // In a real deployment, you would get this from environment variables
    // For development, you can hardcode your Firebase config here
    const envVars = {
        "FIREBASE_API_KEY": "AIzaSyC_7qOCFGQH_NVAeZfdlvZ2TFVkgaIiuKY",
        "FIREBASE_AUTH_DOMAIN": "m-e-tasks.firebaseapp.com",
        "FIREBASE_PROJECT_ID": "m-e-tasks",
        "FIREBASE_STORAGE_BUCKET": "m-e-tasks.firebasestorage.app",
        "FIREBASE_MESSAGING_SENDER_ID": "42361400827",
        "FIREBASE_APP_ID": "1:42361400827:web:e53e77060ce943711d6f5e"
    };
    
    return envVars[name] || defaultValue;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Make database available globally
window.db = db;

console.log('Firebase initialized successfully');

export { db };
