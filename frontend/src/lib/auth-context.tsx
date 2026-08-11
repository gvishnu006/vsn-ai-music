"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import type { UserProfile } from "./types";

const DEMO_USER_KEY = "vsn-demo-user";

interface DemoUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

function getOrCreateDemoUser(): DemoUser {
  if (typeof window === "undefined") {
    return { uid: "demo-user", displayName: "Guest Creator", email: "guest@vsn.local" };
  }
  const raw = window.localStorage.getItem(DEMO_USER_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoUser;
    } catch {
      /* fall through */
    }
  }
  const demo: DemoUser = {
    uid: `demo-${Math.random().toString(36).slice(2, 10)}`,
    displayName: "Guest Creator",
    email: "guest@vsn.local",
  };
  window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
  return demo;
}

function buildDemoProfile(demo: DemoUser): UserProfile {
  return {
    uid: demo.uid,
    displayName: demo.displayName,
    email: demo.email,
    photoURL: demo.photoURL,
    bio: demo.bio,
    createdAt: Date.now(),
    dailyQuota: 10,
    usedToday: 0,
  };
}

function initialUser(): UserProfile | null {
  if (isFirebaseConfigured) return null;
  return buildDemoProfile(getOrCreateDemoUser());
}

function initialToken(): string | null {
  if (isFirebaseConfigured) return null;
  return `demo-${getOrCreateDemoUser().uid}`;
}

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  demoMode: boolean;
  token: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (override?: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isFirebaseConfigured);
  const [token, setToken] = useState<string | null>(initialToken);
  const tokenRef = useRef<string | null>(initialToken());

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current;
    if (!isFirebaseConfigured) {
      const demo = getOrCreateDemoUser();
      const t = `demo-${demo.uid}`;
      tokenRef.current = t;
      setToken(t);
      return t;
    }
    if (!auth?.currentUser) return null;
    try {
      const t = await auth.currentUser.getIdToken();
      tokenRef.current = t;
      setToken(t);
      return t;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    api.configure({
      getToken: fetchToken,
      demoMode: !isFirebaseConfigured,
    });
  }, [fetchToken]);

  const refreshProfile = useCallback(async (override?: UserProfile) => {
    if (!isFirebaseConfigured) {
      if (override) {
        const demo = getOrCreateDemoUser();
        demo.displayName = override.displayName;
        demo.photoURL = override.photoURL;
        demo.bio = override.bio;
        window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
        setUser(buildDemoProfile(demo));
      } else {
        setUser(buildDemoProfile(getOrCreateDemoUser()));
      }
      setLoading(false);
      return;
    }
    const t = await fetchToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await api.getProfile(t);
      setUser(profile);
    } catch (err) {
      console.error("Profile load failed", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchToken]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(auth!, async (fbUser) => {
      setFirebaseUser(fbUser);
      tokenRef.current = null;
      setToken(null);
      if (fbUser) {
        const t = await fbUser.getIdToken();
        tokenRef.current = t;
        setToken(t);
        try {
          const profile = await api.getProfile(t);
          setUser(profile);
        } catch (err) {
          console.error("Profile load failed", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      if (!isFirebaseConfigured || !auth) {
        const demo = getOrCreateDemoUser();
        demo.email = email;
        window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
        setUser(buildDemoProfile(demo));
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      const t = await auth.currentUser!.getIdToken();
      tokenRef.current = t;
      setToken(t);
    },
    []
  );

  const signUpEmail = useCallback(async (email: string, password: string, name: string) => {
    if (!isFirebaseConfigured || !auth) {
      const demo = getOrCreateDemoUser();
      demo.email = email;
      demo.displayName = name || demo.displayName;
      window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      setUser(buildDemoProfile(demo));
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await fbUpdateProfile(cred.user, { displayName: name });
    }
    const t = await cred.user.getIdToken();
    tokenRef.current = t;
    setToken(t);
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      const demo = getOrCreateDemoUser();
      setUser(buildDemoProfile(demo));
      return;
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    const t = await auth.currentUser!.getIdToken();
    tokenRef.current = t;
    setToken(t);
  }, []);

  const signInDemo = useCallback(async () => {
    const demo = getOrCreateDemoUser();
    if (auth && isFirebaseConfigured) {
      try {
        await fbSignOut(auth);
      } catch {
        /* ignore */
      }
      setFirebaseUser(null);
    }
    setUser(buildDemoProfile(demo));
    const t = `demo-${demo.uid}`;
    tokenRef.current = t;
    setToken(t);
  }, []);

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      await fbSignOut(auth);
    }
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      demoMode: !isFirebaseConfigured,
      token,
      signInEmail,
      signUpEmail,
      signInGoogle,
      signInDemo,
      signOut,
      refreshProfile,
    }),
    [user, firebaseUser, loading, token, signInEmail, signUpEmail, signInGoogle, signInDemo, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
