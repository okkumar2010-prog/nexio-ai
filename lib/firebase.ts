import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function getFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };

  const missingFields = Object.entries(config).filter(([, value]) => !value);
  if (missingFields.length > 0) {
    throw new Error("Firebase configuration is missing. Please check your environment variables.");
  }

  return config;
}

const firebaseConfig = getFirebaseConfig();

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export async function getFirebaseAuth() {
  return auth;
}

export async function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmailPassword(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase() {
  return signOut(auth);
}

export async function listenToAuthState(callback: (user: unknown) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getAuthCookieValue() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie.split(";").some((cookie) => cookie.trim().startsWith("nexio-auth=true"));
}

export function setAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = "nexio-auth=true; path=/; max-age=604800; SameSite=Lax";
}

export function clearAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = "nexio-auth=; path=/; max-age=0; SameSite=Lax";
}

export function getFriendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account was found for that email address.";
    case "auth/wrong-password":
      return "The password you entered is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password with at least six characters.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/network-request-failed":
      return "A network issue interrupted sign-in. Please try again.";
    default:
      return "Something went wrong while signing you in. Please try again.";
  }
}
