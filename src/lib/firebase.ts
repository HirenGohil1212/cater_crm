// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4wClnjyaAG7Fq4D1gDJ1EFk9DtjOuJtY",
  authDomain: "fir-5d78f.firebaseapp.com",
  projectId: "fir-5d78f",
  storageBucket: "fir-5d78f.appspot.com",
  messagingSenderId: "31823748514",
  appId: "1:31823748514:web:71afefa9f1b0e294b466fb",
  measurementId: "G-DLZXNPR7CG"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const DUMMY_EMAIL_DOMAIN = 'eventstaffingpro.app';

export { app, auth, db, DUMMY_EMAIL_DOMAIN };
