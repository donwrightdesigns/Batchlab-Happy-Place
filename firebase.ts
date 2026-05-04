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
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Test connection to Firestore
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    const message = error?.message || String(error);
    if (message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration. The client appears to be offline.");
    } else {
      console.warn("Firebase connection error:", message);
    }
  }
}
testConnection();

export { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider };
export type { User };
