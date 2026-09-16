import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, deleteUser, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

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

// 계정 삭제: Firestore 데이터 먼저 지우고, 인증 계정 자체도 삭제
// [!] Firebase는 보안상 '최근에 로그인한 사용자'만 삭제를 허용함.
//     오래 전에 로그인한 상태라면 auth/requires-recent-login 에러가 나고,
//     이 경우엔 로그아웃 후 다시 로그인하고 바로 삭제해야 함.
export async function deleteAccount(uid) {
  await deleteDoc(doc(db, "users", uid));
  await deleteUser(auth.currentUser);
}
