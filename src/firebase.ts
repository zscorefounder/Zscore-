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

// Set log level to error to suppress verbose "Could not reach Cloud Firestore backend" warnings
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
      // Use a race to timeout the connection test faster than the default 10s
      const pingPromise = getDocFromServer(doc(db, '_connection_test_', 'ping'));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out')), 5000)
      );

      await Promise.race([pingPromise, timeoutPromise]);
      
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
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const REFRESH_THRESHOLD = 1000 * 60 * 5; // 5 minutes

export function clearCache(cacheKeyPrefix?: string) {
  if (cacheKeyPrefix) {
    console.log(`Clearing cache for prefix: ${cacheKeyPrefix}`);
    // Clear specific keys from memory
    for (const key of Array.from(firestoreCache.keys())) {
      if (key.startsWith(cacheKeyPrefix) || key.includes(cacheKeyPrefix)) {
        firestoreCache.delete(key);
      }
    }
    // Clear specific keys from LocalStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes(`fs_cache_${cacheKeyPrefix}`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } else {
    // Clear all
    firestoreCache.clear();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('fs_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    toast.success('Cache cleared successfully');
  }
}

export const clearAllCache = () => clearCache();

async function fetchAndCache(q: any, cacheKey: string) {
  try {
    // Add a 30-second timeout to the fetch operation (increased from 20s)
    const fetchPromise = getDocs(q).catch(err => {
      // If it's a specific Firestore error like "unavailable", we want to catch it here
      // and let the timeout or success play out.
      throw err;
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch operation timed out')), 30000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
    const data = snapshot.docs.map((doc: any) => ({
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
  } catch (error: any) {
    const msg = error?.message?.toLowerCase() || '';
    const isQuotaError = msg.includes('quota') || msg.includes('limit exceeded');
    
    if (isQuotaError) {
      console.warn(`Firestore Quota Exceeded for ${cacheKey}. Fallback triggered.`);
      // Only show toast once per session to avoid spam
      if (!sessionStorage.getItem('fs_quota_toast_shown')) {
        // Silently handle if we have valid fallback
        console.log("Using rich fallback data due to quota limits.");
        sessionStorage.setItem('fs_quota_toast_shown', 'true');
      }
    } else if (msg.includes('timed out')) {
      console.warn(`Fetch timed out for ${cacheKey}. Using fallback logic.`);
    } else {
      console.error(`Fetch failed for ${cacheKey}:`, error);
    }
    throw error;
  }
}

export function isQuotaExceededError(error: any): boolean {
  const msg = error?.message?.toLowerCase() || '';
  return msg.includes('quota') || msg.includes('limit exceeded');
}

// Hardcoded fallback data for maximum resilience (Quota exceeded or Offline)
const FALLBACK_DATA: Record<string, any[]> = {
  'thumbnails': [
    { id: 'fb_1', isFallback: true, title: "I Spent 100 Days in a Secret Bunker", description: "Extreme lighting and depth-focused gaming thumbnail.", category: "Gaming", imageUrl: "https://i.ibb.co/5Xd8rDDZ/image.png", stats: "14.2% CTR", createdAt: { seconds: Date.now()/1000 - 1000 } },
    { id: 'fb_2', isFallback: true, title: "The Crypto Crash: Real Analysis", description: "Clean data visualization for high-stakes finance.", category: "Finance", imageUrl: "https://i.ibb.co/V0nZTDcZ/image.png", stats: "12.8% CTR", createdAt: { seconds: Date.now()/1000 - 2000 } },
    { id: 'fb_3', isFallback: true, title: "AI Design Revolution 2026", description: "Futuristic tech aesthetic with sharp neon accents.", category: "Tech", imageUrl: "https://i.ibb.co/rKFrLL2S/image.png", stats: "10.5% CTR", createdAt: { seconds: Date.now()/1000 - 3000 } },
    { id: 'fb_4', isFallback: true, title: "Premium Visual Identity", description: "High-end brand showcase for luxury clients.", category: "Entertainment", imageUrl: "https://i.ibb.co/qXFY4XD/dposa-s.png", stats: "Premium", createdAt: { seconds: Date.now()/1000 - 4000 } },
    { id: 'fb_5', isFallback: true, title: "Digital Strategy Mastery", description: "Clean, impactful logo and text placement.", category: "Business", imageUrl: "https://i.ibb.co/QjQxzsHp/Z-SCORE-LOGO.png", stats: "Modern", createdAt: { seconds: Date.now()/1000 - 5000 } },
    { id: 'fb_6', isFallback: true, title: "Viral Fitness Transformation", description: "High-energy sports thumbnail with grit.", category: "Sports", imageUrl: "https://i.ibb.co/6J4CbdQf/image.png", stats: "400K+ Views", createdAt: { seconds: Date.now()/1000 - 6000 } },
    { id: 'fb_7', isFallback: true, title: "Global Adventure Vlog", description: "Lush travel photography with immersive hooks.", category: "Travel", imageUrl: "https://i.ibb.co/rR6LmpRm/image.png", stats: "15% Growth", createdAt: { seconds: Date.now()/1000 - 7000 } },
    { id: 'fb_8', isFallback: true, title: "Technical Setup Showcase", description: "Pro tech gear with sharp, industrial lighting.", category: "Tech", imageUrl: "https://i.ibb.co/NdXYBpM4/image.png", stats: "Elite", createdAt: { seconds: Date.now()/1000 - 8000 } },
    { id: 'fb_9', isFallback: true, title: "Creative Process Walkthrough", description: "Clean, educational layout for artists.", category: "Education", imageUrl: "https://i.ibb.co/ddJ5FDm/image.png", stats: "Viral Hit", createdAt: { seconds: Date.now()/1000 - 9000 } },
    { id: 'fb_10', isFallback: true, title: "Culinary Arts & Styling", description: "Appetizing textures and high-contrast food shots.", category: "Food", imageUrl: "https://picsum.photos/seed/food9/800/450", stats: "Delicious", createdAt: { seconds: Date.now()/1000 - 10000 } },
    { id: 'fb_11', isFallback: true, title: "Minimalist Music Visuals", description: "Soft, emotional tones for music producers.", category: "Music", imageUrl: "https://picsum.photos/seed/music2/800/450", stats: "Trending", createdAt: { seconds: Date.now()/1000 - 11000 } },
    { id: 'fb_12', isFallback: true, title: "Morning Routine Excellence", description: "Soft-lit vlog style for lifestyle creators.", category: "Vlog", imageUrl: "https://picsum.photos/seed/vlog3/800/450", stats: "Clean", createdAt: { seconds: Date.now()/1000 - 12000 } }
  ],
  'hero': [
    { id: 'fallback_h1', isFallback: true, url: "https://i.ibb.co/5Xd8rDDZ/image.png", rotate: -2, x: 0, y: 0, createdAt: { seconds: Date.now()/1000 } },
    { id: 'fallback_h2', isFallback: true, url: "https://i.ibb.co/V0nZTDcZ/image.png", rotate: 5, x: 20, y: 10, createdAt: { seconds: Date.now()/1000 } },
    { id: 'fallback_h3', isFallback: true, url: "https://i.ibb.co/rKFrLL2S/image.png", rotate: -4, x: -20, y: 5, createdAt: { seconds: Date.now()/1000 } }
  ],
  'bts': [
    { 
      id: 'fallback_bts1', 
      isFallback: true,
      title: "Psychology of the Scroll", 
      description: "How we achieved a 15% CTR for a major tech creator using psychological framing.",
      imageUrl: "https://i.ibb.co/5Xd8rDDZ/image.png",
      beforeImages: ["https://picsum.photos/seed/bts_b1/800/450"],
      afterImages: ["https://i.ibb.co/5Xd8rDDZ/image.png"],
      category: "Case Study",
      clientName: "Bunker Chronicles",
      clientPhoto: "https://i.ibb.co/qXFY4XD/dposa-s.png",
      layoutIdea: "Deep Extraction",
      designWorkflow: "Concept -> 3D Lighting -> Frame Polish",
      clientFeedback: "Absolutely game changing results.",
      whatsappChat: [{ role: 'client', text: "CTR is vertical right now!", time: "10:00 AM" }],
      createdAt: { seconds: Date.now()/1000 }
    },
    { 
      id: 'fallback_bts2', 
      isFallback: true,
      title: "Clean Finance Aesthetic", 
      description: "Establishing trust and authority through minimalist data visualization.",
      imageUrl: "https://i.ibb.co/V0nZTDcZ/image.png",
      beforeImages: ["https://picsum.photos/seed/bts_b2/800/450"],
      afterImages: ["https://i.ibb.co/V0nZTDcZ/image.png"],
      category: "Process",
      clientName: "Crypto Daily",
      clientPhoto: "https://i.ibb.co/qXFY4XD/dposa-s.png",
      createdAt: { seconds: Date.now()/1000 }
    }
  ],
  'random': [
    { id: 'fallback_r1', isFallback: true, title: "Creative Layout", desc: "Minimalist approach.", image: "https://i.ibb.co/5Xd8rDDZ/image.png", rotate: -5, y: 0, createdAt: { seconds: Date.now()/1000 } },
    { id: 'fallback_r2', isFallback: true, title: "Color Theory", desc: "Vibrant palettes.", image: "https://i.ibb.co/V0nZTDcZ/image.png", rotate: 3, y: 20, createdAt: { seconds: Date.now()/1000 } }
  ]
};

export async function getDocsCached(q: any, cacheKey: string, force = false) {
  const now = Date.now();
  
  if (!force) {
    const cached = firestoreCache.get(cacheKey);
    if (cached) {
      const age = now - cached.timestamp;
      const isFallback = cached.data.length > 0 && (cached.data[0].isFallback || String(cached.data[0].id).startsWith('fb') || String(cached.data[0].id).startsWith('fallback'));
      if (age < CACHE_TTL && !isFallback) {
        if (age > REFRESH_THRESHOLD) {
          fetchAndCache(q, cacheKey).catch(e => console.warn("BG Refresh failed", e));
        }
        return cached.data;
      }
    }

    let localData = null;
    try {
      const local = localStorage.getItem(`fs_cache_${cacheKey}`);
      if (local) {
        const parsed = JSON.parse(local);
        const age = now - parsed.timestamp;
        const isFallback = parsed.data.length > 0 && (parsed.data[0].isFallback || String(parsed.data[0].id).startsWith('fb') || String(parsed.data[0].id).startsWith('fallback'));
        if (age < CACHE_TTL && !isFallback) {
          if (age > REFRESH_THRESHOLD) {
            fetchAndCache(q, cacheKey).catch(err => console.warn("BG Refresh failed", err));
          }
          return parsed.data;
        }
        localData = parsed.data;
      }
    } catch (e) {}

    try {
      // Use local data ONLY if it's not a fallback
      const localIsFallback = localData && localData.length > 0 && (localData[0].isFallback || String(localData[0].id).startsWith('fb') || String(localData[0].id).startsWith('fallback'));
      if (localData && localData.length > 0 && !localIsFallback) {
        fetchAndCache(q, cacheKey).catch(err => console.warn("BG Refresh failed", err));
        return localData;
      }

      const data = await fetchAndCache(q, cacheKey);
      return data || [];
    } catch (error) {
      console.warn(`Initial fetch failed for ${cacheKey}, attempting fallback:`, (error as Error).message);
      if (localData && localData.length > 0) return localData;
      if (cached && cached.data.length > 0) return cached.data;
      
      const coll = cacheKey.split('_')[0]; 
      if (FALLBACK_DATA[coll]) return FALLBACK_DATA[coll];
      if (cacheKey.includes('thumbnails') && FALLBACK_DATA['thumbnails']) return FALLBACK_DATA['thumbnails'];
      
      // If we've reached here and it's a thumbnail query, return empty rather than crashing
      return [];
    }
  }

  try {
    const data = await fetchAndCache(q, cacheKey);
    return data || [];
  } catch (error) {
    console.warn(`Forced fetch failed for ${cacheKey}, using fallback:`, (error as Error).message);
    const coll = cacheKey.split('_')[0];
    if (FALLBACK_DATA[coll]) return FALLBACK_DATA[coll];
    if (cacheKey.includes('thumbnails') && FALLBACK_DATA['thumbnails']) return FALLBACK_DATA['thumbnails'];
    return [];
  }
}
