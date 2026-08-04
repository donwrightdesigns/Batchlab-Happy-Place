import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Set log level to error to suppress "Disconnecting idle stream" warnings
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

// Test connection to Firestore
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    // Gracefully handle initial offline / connecting state
    const message = error?.message || String(error);
    if (message.includes('unavailable') || message.includes('offline')) {
      console.log("Firestore initial connection status: offline or connecting.");
    } else {
      console.warn("Firebase connection notice:", message);
    }
  }
}
testConnection();

export { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider };
export type { User };
