import { getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
import { env } from "@/config/env";

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(env.firebase);

export const firebaseAuth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: "acadally.com" });

export async function signInWithGoogle(): Promise<string> {
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  return credential.user.getIdToken();
}
