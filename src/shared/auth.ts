import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA8_NLsIU-daIZpNmuuAHGDI0ihDrBDqnM",
  authDomain: "app1-99b5a.firebaseapp.com",
  projectId: "app1-99b5a",
  storageBucket: "app1-99b5a.firebasestorage.app",
  messagingSenderId: "967175964103",
  appId: "1:967175964103:web:9aa30081b8538660c6c5e2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);
export { signOut, onAuthStateChanged };
export type { User };
