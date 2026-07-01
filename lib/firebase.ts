type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

declare global {
  interface Window {
    firebase?: any;
  }
}

let firebasePromise: Promise<unknown> | null = null;
let authPromise: Promise<unknown> | null = null;

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

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Firebase can only be initialized in the browser."));
      return;
    }

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
}

async function ensureFirebaseLoaded() {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized in the browser.");
  }

  if (firebasePromise) {
    return firebasePromise;
  }

  firebasePromise = (async () => {
    if (window.firebase) {
      return window.firebase;
    }

    await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js");

    if (!window.firebase) {
      throw new Error("Firebase SDK failed to load.");
    }

    const config = getFirebaseConfig();
    const firebaseSdk = window.firebase;

    if (!firebaseSdk.apps?.length) {
      firebaseSdk.initializeApp(config);
    }

    return firebaseSdk;
  })();

  return firebasePromise;
}

export async function getFirebaseAuth() {
  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    const firebaseSdk = await ensureFirebaseLoaded();
    return firebaseSdk.auth();
  })();

  return authPromise;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const auth = await getFirebaseAuth();
  return (auth as any).signInWithEmailAndPassword(email, password);
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const auth = await getFirebaseAuth();
  return (auth as any).createUserWithEmailAndPassword(email, password);
}

export async function signInWithGooglePopup() {
  const auth = await getFirebaseAuth();
  const provider = new (window.firebase as any).auth.GoogleAuthProvider();
  return (auth as any).signInWithPopup(provider);
}

export async function signOutFirebase() {
  const auth = await getFirebaseAuth();
  return (auth as any).signOut();
}

export async function listenToAuthState(callback: (user: unknown) => void) {
  const auth = await getFirebaseAuth();
  return (auth as any).onAuthStateChanged(callback);
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
