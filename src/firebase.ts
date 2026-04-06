import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDocFromServer, 
  doc,
  initializeFirestore,
  limit,
  getDocs,
  where
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { toast } from 'sonner';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to avoid WebSocket/proxy issues in sandboxed environments
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log(`Initializing Firestore with database ID: ${dbId}`);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: true,
}, dbId);

// Enable offline persistence if possible
try {
  // Persistence is handled automatically in newer SDKs or can be configured via settings.
  // We'll rely on the default behavior for now.
} catch (err) {
  console.warn("Firestore persistence could not be enabled:", err);
}

export { db };
export const auth = getAuth();

// Test connection to Firestore
async function testConnection() {
  // Only run test once per session to save reads
  if (sessionStorage.getItem('fs_connection_tested')) return;

  let retries = 3;
  while (retries > 0) {
    try {
      // Use getDocFromServer to bypass local cache and force a network request
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log("Firestore connection successful.");
      sessionStorage.setItem('fs_connection_tested', 'true');
      return;
    } catch (error) {
      const err = error as any;
      // If the error is 'unavailable', it might be a transient network issue or proxy problem
      if (err.code === 'unavailable') {
        console.warn(`Firestore connection unavailable. Retrying... (${retries} left)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      } else if (err.message?.includes('the client is offline')) {
        console.error("Firestore Error: The client is offline. Please check your internet connection or Firebase configuration.");
        return;
      } else {
        // Other errors might be permissions or config issues
        console.error("Firestore connection test failed:", err.message);
        return;
      }
    }
  }
  console.error("Firestore connection could not be established after multiple retries.");
  toast.error("Could not reach the database. Please check your internet connection or refresh the page.", {
    description: "Firestore is currently unavailable.",
    duration: 10000,
  });
}
testConnection();

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit, getDocs, where };

// Simple in-memory cache to reduce reads during the same session
const firestoreCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days for persistent cache
const REFRESH_THRESHOLD = 1000 * 60 * 15; // 15 minutes threshold for background refresh

export function clearCache(cacheKeyPrefix?: string) {
  if (cacheKeyPrefix) {
    // Clear specific keys
    for (const key of Array.from(firestoreCache.keys())) {
      if (key.startsWith(cacheKeyPrefix)) {
        firestoreCache.delete(key);
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`fs_cache_${cacheKeyPrefix}`)) {
        localStorage.removeItem(key);
      }
    }
  } else {
    // Clear all
    firestoreCache.clear();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('fs_cache_')) {
        localStorage.removeItem(key);
      }
    }
    toast.success('Cache cleared successfully');
  }
}

export const clearAllCache = () => clearCache();

async function fetchAndCache(q: any, cacheKey: string) {
  try {
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));
    
    const cacheEntry = { data, timestamp: Date.now() };
    firestoreCache.set(cacheKey, cacheEntry);
    
    try {
      localStorage.setItem(`fs_cache_${cacheKey}`, JSON.stringify(cacheEntry));
    } catch (e) {
      // Clear old cache if full
      console.warn("LocalStorage full, clearing old cache...");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('fs_cache_')) {
          localStorage.removeItem(key);
        }
      }
      try {
        localStorage.setItem(`fs_cache_${cacheKey}`, JSON.stringify(cacheEntry));
      } catch (e2) {}
    }
    return data;
  } catch (error) {
    console.error(`Fetch failed for ${cacheKey}:`, error);
    throw error;
  }
}

export async function getDocsCached(q: any, cacheKey: string, force = false) {
  const now = Date.now();
  
  if (!force) {
    // 1. Check in-memory cache first
    const cached = firestoreCache.get(cacheKey);
    if (cached && (now - cached.timestamp < REFRESH_THRESHOLD)) {
      return cached.data;
    }

    // 2. Check localStorage for persistent cache
    let localData = null;
    try {
      const localCached = localStorage.getItem(`fs_cache_${cacheKey}`);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        const age = now - parsed.timestamp;
        
        if (age < CACHE_TTL) {
          // Update in-memory cache
          firestoreCache.set(cacheKey, parsed);
          
          // If data is older than REFRESH_THRESHOLD, refresh in background
          if (age > REFRESH_THRESHOLD) {
            console.log(`Refreshing cache in background for: ${cacheKey}`);
            fetchAndCache(q, cacheKey).catch(err => {
              console.warn(`Background refresh failed for ${cacheKey}`, err);
            });
          }
          
          return parsed.data;
        }
        localData = parsed.data; // Keep as fallback if expired but still exists
      }
    } catch (e) {
      console.warn("LocalStorage cache read failed", e);
    }

    // 3. Fetch from Firestore if not cached or expired
    try {
      return await fetchAndCache(q, cacheKey);
    } catch (error) {
      // If quota exceeded or offline, return ANY cached data as last resort
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('quota-exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded') || msg.includes('offline')) {
          console.warn("Firestore unavailable, using stale cache fallback for:", cacheKey);
          if (localData) return localData;
          if (cached) return cached.data;
        }
      }
      throw error;
    }
  }

  // Force fetch from Firestore
  return await fetchAndCache(q, cacheKey);
}
