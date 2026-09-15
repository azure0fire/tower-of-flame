import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// [!] Render/로컬 .env 파일에 아래 값들을 채워야 동작합니다. (README 참고)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export function logout() {
  return signOut(auth);
}

// users/{uid} 문서: { displayName, charKey, bestFloor, createdAt }
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, { displayName, charKey }) {
  const profile = { displayName, charKey, bestFloor: 0, createdAt: Date.now() };
  await setDoc(doc(db, "users", uid), profile);
  return profile;
}

// 새로 도달한 층수가 기존 최고 기록보다 높을 때만 갱신
export async function updateBestFloor(uid, floor, currentBest) {
  if (floor <= currentBest) return currentBest;
  await updateDoc(doc(db, "users", uid), { bestFloor: floor });
  return floor;
}
