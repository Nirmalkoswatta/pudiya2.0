import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseProjectMeta = {
  name: 'shakyapudi',
  projectId: 'shakyapudi',
  projectNumber: '694189751650',
};

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ?? firebaseProjectMeta.projectId,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const requiredKeys = ['apiKey', 'authDomain', 'storageBucket', 'messagingSenderId', 'appId'];
const hasRequiredKeys = requiredKeys.every((key) => Boolean(firebaseConfig[key]));
const isFirebaseConfigured = hasRequiredKeys && Boolean(firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const apps = getApps();
  app = apps.length ? apps[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  if (process.env.NODE_ENV !== 'production') {
    const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
    const hint = `Populate REACT_APP_FIREBASE_* environment variables for project "${firebaseProjectMeta.projectId}"`;
    const details = missingKeys.length ? ` Missing values: ${missingKeys.join(', ')}.` : '';
    // eslint-disable-next-line no-console
    console.warn(`${hint}.${details}`);
  }
}

export { app, auth, db, firebaseConfig, firebaseProjectMeta, isFirebaseConfigured };
