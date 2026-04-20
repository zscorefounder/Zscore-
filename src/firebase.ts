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
  where,
  setLogLevel
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
  experimentalAutoDetectLongPolling: false,
  ignoreUndefinedProperties: true,
}, dbId);

// Set log level to error to suppress the verbose "Could not reach Cloud Firestore backend" warning in transient network states
setLogLevel('error');

// Enable offline persistence if possible
try {
  // Persistence is handled automatically in newer SDKs or can be configured via settings.
  // We'll rely on the default behavior for now.
} catch (err) {
  console.warn("Firestore persistence could not be enabled:", err);
}

export { db };
export const auth = getAuth();

// Connection status state
let isFirestoreConnected = false;
const connectionListeners: ((status: boolean) => void)[] = [];

export function onFirestoreStatusChange(callback: (status: boolean) => void) {
  connectionListeners.push(callback);
  callback(isFirestoreConnected);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
}

function setFirestoreStatus(status: boolean) {
  isFirestoreConnected = status;
  connectionListeners.forEach(cb => cb(status));
}

// Test connection to Firestore
async function testConnection() {
  // Only run test once per session to save reads
  if (sessionStorage.getItem('fs_connection_tested')) {
    setFirestoreStatus(true);
    return;
  }

  // Global unhandled rejection handler to catch elusive Firebase network errors
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason?.code === 'auth/network-request-failed' || 
          reason?.message?.includes('auth/network-request-failed') ||
          reason?.message?.includes('Fetching auth token failed')) {
        console.warn('Caught and suppressed Firebase Auth network error.');
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

  let retries = 2; // Reduced retries to avoid long hang times on boot
  while (retries > 0) {
    try {
      // Use getDocFromServer to bypass local cache and force a network request
      // We use a non-existent doc to just test reachability
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      console.log("Firestore connection successful.");
      sessionStorage.setItem('fs_connection_tested', 'true');
      setFirestoreStatus(true);
      return;
    } catch (error) {
      const err = error as any;
      const isNetworkError = 
        err.code === 'unavailable' || 
        err.code === 'deadline-exceeded' || 
        err.code === 'auth/network-request-failed' ||
        err.message?.includes('auth/network-request-failed') ||
        err.message?.includes('Fetching auth token failed');

      if (err.code === 'unavailable' || err.code === 'deadline-exceeded') {
        console.warn(`Firestore connection ${err.code}. Retrying... (${retries} left)`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 3000)); 
      } else if (isNetworkError || err.message?.includes('the client is offline')) {
        console.warn("Firestore/Auth: Network request failed. Entering offline mode.");
        setFirestoreStatus(false);
        // Do not show error toast for expected sandbox network limitations
        return;
      } else if (err.code === 'permission-denied') {
        console.log("Firestore connection reached (Permission Denied is expected).");
        sessionStorage.setItem('fs_connection_tested', 'true');
        setFirestoreStatus(true);
        return;
      } else {
        console.error("Firestore connection test failed:", err.message);
        setFirestoreStatus(false);
        return;
      }
    }
  }
  setFirestoreStatus(false);
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
  const err = error as any;
  const isNetworkError = err.code === 'unavailable' || err.code === 'deadline-exceeded' || err.code === 'auth/network-request-failed';
  
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
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days for persistent cache
const REFRESH_THRESHOLD = 1000 * 60 * 60 * 2; // 2 hours threshold for background refresh (increased from 15m)

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

// Hardcoded fallback data for maximum resilience (Quota exceeded or Offline)
const FALLBACK_DATA: Record<string, any[]> = {
  'thumbnails': [
    { id: 'fb1', title: "I Spent 100 Days in a Secret Bunker", category: "Gaming", imageUrl: "https://i.ibb.co/5Xd8rDDZ/image.png", stats: "14.2% CTR", createdAt: { seconds: Date.now()/1000 } },
    { id: 'fb2', title: "The Crypto Crash: Why Everything is Falling", category: "Finance", imageUrl: "https://i.ibb.co/V0nZTDcZ/image.png", stats: "12.8% CTR", createdAt: { seconds: Date.now()/1000 } },
    { id: 'fb3', title: "AI is Replacing Designers (The Truth)", category: "Tech", imageUrl: "https://i.ibb.co/rKFrLL2S/image.png", stats: "10.5% CTR", createdAt: { seconds: Date.now()/1000 } },
    { id: 'fb4', title: "Solo Travel in Japan", category: "Vlog", imageUrl: "https://picsum.photos/seed/thumb4/800/450", stats: "42K Views", createdAt: { seconds: Date.now()/1000 } }
  ],
  'behind_the_scenes': [
    { 
      id: 'fb_bts1', 
      title: "The Psychology of a Viral Hook", 
      description: "How we achieved a 15% CTR for a major tech creator.",
      imageUrl: "https://picsum.photos/seed/bts1/1920/1080",
      category: "Case Study",
      createdAt: { seconds: Date.now()/1000 }
    }
  ]
};

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
      // If we have local data but it's just past REFRESH_THRESHOLD, 
      // we can still return it and refresh in background to save user wait time
      if (localData) {
        console.log(`Using local cache for ${cacheKey}, refreshing in background...`);
        fetchAndCache(q, cacheKey).catch(err => {
          console.warn(`Background refresh failed for ${cacheKey}`, err);
        });
        return localData;
      }

      return await fetchAndCache(q, cacheKey);
    } catch (error) {
      // If quota exceeded or offline, return ANY cached data as last resort
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('quota-exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded') || msg.includes('offline')) {
          console.warn("Firestore unavailable, using stale cache fallback for:", cacheKey);
          if (localData) return localData;
          if (cached) return cached.data;
          
          // 4. Final Fallback: Hardcoded Data
          const collectionName = cacheKey.split('_')[0]; // e.g., 'thumbnails' from 'thumbnails_all'
          if (FALLBACK_DATA[collectionName]) {
            console.warn(`Using hardcoded fallback data for: ${collectionName}`);
            return FALLBACK_DATA[collectionName];
          }
        }
      }
      throw error;
    }
  }

  // Force fetch from Firestore
  return await fetchAndCache(q, cacheKey);
}
