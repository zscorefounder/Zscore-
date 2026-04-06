import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Send, 
  Trash2, 
  LogIn,
  LogOut,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Star,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { PushPin } from './PushPin';
import { ZSpinner, ZSkeleton } from './ZLoading';
import { 
  db, 
  auth, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType,
  getDocsCached,
  clearCache,
  clearAllCache,
  where
} from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { deleteDoc, doc, updateDoc, limit, startAfter, getDocs, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { ConfirmModal } from './ConfirmModal';
import { useAdmin } from '../hooks/useAdmin';
import { toast } from 'sonner';

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  category?: string;
  stats?: string;
  createdAt: any;
}

const CATEGORIES = ['All', 'Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'];
const PAGE_SIZE = 6;

const ThumbnailSkeleton = () => (
  <div className="w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] max-w-sm bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-6 border border-black/[0.02]">
    <ZSkeleton className="aspect-video rounded-2xl" />
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ZSkeleton className="h-6 w-8 rounded-lg" />
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <ZSkeleton key={i} className="w-3 h-3 rounded-full" />
          ))}
        </div>
      </div>
      <ZSkeleton className="h-6 w-3/4 rounded-lg" />
      <div className="flex items-center justify-between pt-2">
        <ZSkeleton className="h-3 w-1/4 rounded-full" />
        <ZSkeleton className="h-3 w-1/6 rounded-full" />
      </div>
    </div>
  </div>
);

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 450, quality = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Try to get a size under 150KB for faster loading and to avoid proxy limits
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);
      
      while (result.length > 150000 && currentQuality > 0.1) {
        currentQuality -= 0.05;
        result = canvas.toDataURL('image/jpeg', currentQuality);
      }
      
      resolve(result);
    };
  });
};

const ThumbnailItem = ({ thumb, i, isAdmin, refiningId, handleRefine, handleDelete }: { 
  thumb: Thumbnail, 
  i: number, 
  isAdmin: boolean, 
  refiningId: string | null, 
  handleRefine: (id: string, url: string) => void, 
  handleDelete: (id: string) => void 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const pinColors = ["#FF6321", "#3B82F6", "#8B5CF6", "#10B981"];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(thumb.imageUrl);
    setIsCopied(true);
    toast.success('Image link copied!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: 0, y: 50 }}
      whileInView={{ 
        opacity: 1, 
        scale: 1, 
        rotate: [-2, 2, -1, 1][i % 4],
        y: 0
      }}
      whileHover={{ 
        scale: 1.05, 
        rotate: 0, 
        zIndex: 30,
        y: -10,
        transition: { duration: 0.3 }
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
      className="relative p-8 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-xl w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] max-w-sm mx-auto group hover:z-30 transition-all cursor-default"
    >
      <PushPin color={pinColors[i % pinColors.length]} />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: i * 0.1 + 0.5 }}
            className="font-mono text-2xl font-bold text-zinc-100 group-hover:text-zinc-200 transition-colors"
          >
            0{i + 1}
          </motion.span>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, starI) => (
              <Star key={starI} size={10} className="fill-orange-500 text-orange-500" />
            ))}
          </div>
        </div>

        <div className="aspect-video overflow-hidden relative bg-zinc-100 rounded-2xl border border-black/[0.03]">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-zinc-200 animate-pulse flex items-center justify-center">
              <ImageIcon className="text-zinc-300" size={24} />
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 bg-zinc-100 flex flex-col items-center justify-center p-4 text-center">
              <ImageIcon className="text-zinc-300 mb-2" size={24} />
              <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Image failed to load</p>
            </div>
          )}
          <motion.img 
            src={thumb.imageUrl} 
            alt={thumb.title} 
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-30">
            <button 
              onClick={handleCopy}
              className="p-2.5 bg-white/90 backdrop-blur-md text-zinc-600 rounded-xl hover:bg-white transition-all shadow-lg"
              title="Copy Image Link"
            >
              {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            {isAdmin && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefine(thumb.id, thumb.imageUrl);
                  }}
                  disabled={refiningId === thumb.id}
                  className="p-2.5 bg-white/90 backdrop-blur-md text-blue-600 rounded-xl hover:bg-white transition-all shadow-lg disabled:opacity-50"
                  title="Refine with AI"
                >
                  {refiningId === thumb.id ? <ZSpinner size={16} /> : <Sparkles size={16} />}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(thumb.id);
                  }}
                  className="p-2.5 bg-white/90 backdrop-blur-md text-red-500 rounded-xl hover:bg-white transition-all shadow-lg"
                  title="Delete Thumbnail"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xl font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
            {thumb.title}
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {thumb.category || 'Portfolio'}
            </p>
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
            >
              {thumb.stats || 'Premium'}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ThumbnailGallery = () => {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const { isAdmin } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefiningAll, setIsRefiningAll] = useState(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [stats, setStats] = useState('');
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    fetchThumbnails(true, true);
  }, [activeFilter]);

  const [error, setError] = useState<string | null>(null);

  const fetchThumbnails = async (isInitial = false, force = false) => {
    if (isInitial) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      let q = query(
        collection(db, 'thumbnails'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      setQuotaExceeded(false);

      // Add category filter to the query itself to reduce reads
      if (activeFilter !== 'All') {
        q = query(
          collection(db, 'thumbnails'),
          where('category', '==', activeFilter),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      let newThumbnails: Thumbnail[];
      
      if (isInitial) {
        // Cache the first page of thumbnails for each category
        const cacheKey = `thumbnails_v3_${activeFilter}_initial`;
        newThumbnails = await getDocsCached(q, cacheKey, force) as Thumbnail[];
        
        setHasMore(newThumbnails.length >= PAGE_SIZE);
      } else {
        const snapshot = await getDocs(q);
        newThumbnails = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Thumbnail[];
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      }

      if (isInitial) {
        setThumbnails(newThumbnails);
      } else {
        setThumbnails(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNew = newThumbnails.filter(t => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (err) {
      console.error("Error fetching thumbnails:", err);
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('quota-exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
          setQuotaExceeded(true);
          toast.error("Daily limit reached. Some thumbnails might be missing.");
        } else if (msg.includes('index') || msg.includes('composite')) {
          setError("Database index required. Please contact admin.");
          console.error("Firestore Index Error. You may need to create a composite index for category + createdAt.");
        } else if (msg.includes('permission-denied')) {
          setError("Permission denied. Please check security rules.");
        } else {
          setError("Failed to load thumbnails. Please try again.");
        }
      }
      try {
        handleFirestoreError(err, OperationType.LIST, 'thumbnails');
      } catch (e) {
        // Error already handled
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const analyzeImage = async (base64: string, isRefining = false) => {
    if (!isRefining) setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: `Analyze this YouTube thumbnail image. 
              1. Generate a highly engaging, click-worthy title (max 60 chars).
              2. Assign the most accurate category from this specific list: Gaming, Finance, Tech, Vlog, Lifestyle, Entertainment, Education, Music, Travel, Food, Sports.
              
              Context for categories:
              - Gaming: Video games, esports, walkthroughs.
              - Finance: Money, crypto, investing, business.
              - Tech: Gadgets, software, AI, hardware.
              - Vlog: Personal stories, daily life, challenges.
              - Lifestyle: Health, fitness, fashion, home.
              - Entertainment: Movies, comedy, reactions, celebrity.
              - Education: Tutorials, science, history, learning.
              - Music: Music videos, covers, production.
              - Travel: Adventure, destination guides, exploration.
              - Food: Cooking, reviews, eating.
              - Sports: Athletics, highlights, training.

              Return ONLY a JSON object with 'title' and 'category' fields.`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64.split(',')[1],
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A highly engaging, click-worthy title (max 60 chars)." },
              category: { 
                type: Type.STRING, 
                enum: ['Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'],
                description: "The most accurate category from the provided list."
              }
            },
            required: ["title", "category"]
          }
        },
      });

      const result = JSON.parse(response.text || '{}');
      
      // Normalize category
      if (result.category) {
        const validCategories = ['Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'];
        const matched = validCategories.find(c => 
          c.toLowerCase() === result.category.toLowerCase() || 
          result.category.toLowerCase().includes(c.toLowerCase())
        );
        if (matched) result.category = matched;
        else result.category = 'Portfolio'; // Fallback
      }

      if (isRefining) return result;
      if (result.title) setTitle(result.title);
      if (result.category) setCategory(result.category);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      return null;
    } finally {
      if (!isRefining) setIsAnalyzing(false);
    }
  };

  const handleRefineAll = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Refine All Thumbnails?',
      message: 'This will automatically update titles and categories for ALL thumbnails using AI. This might take a while and use significant AI resources. Continue?',
      isDestructive: false,
      onConfirm: async () => {
        setIsRefiningAll(true);
        try {
          for (const thumb of thumbnails) {
            setRefiningId(thumb.id);
            const result = await analyzeImage(thumb.imageUrl, true);
            if (result && (result.title || result.category)) {
              await updateDoc(doc(db, 'thumbnails', thumb.id), {
                title: result.title || thumb.title,
                category: result.category || thumb.category || 'Portfolio'
              });
            }
            // Small delay to prevent rate limits
            await new Promise(r => setTimeout(r, 1000));
          }
          toast.success('All thumbnails refined successfully!');
        } catch (err) {
          console.error("Refine All failed:", err);
          toast.error('Failed to refine all thumbnails');
        } finally {
          setRefiningId(null);
          setIsRefiningAll(false);
        }
      }
    });
  };

  const handleRefine = async (id: string, imageUrl: string) => {
    setRefiningId(id);
    try {
      const result = await analyzeImage(imageUrl, true);
      if (result && (result.title || result.category)) {
        await updateDoc(doc(db, 'thumbnails', id), {
          title: result.title || '',
          category: result.category || 'Portfolio'
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `thumbnails/${id}`);
    } finally {
      setRefiningId(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setImage(compressed);
        analyzeImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !image || isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Adding thumbnail...');
    try {
      const docRef = await addDoc(collection(db, 'thumbnails'), {
        title: title.trim(),
        category,
        stats: stats.trim() || '0 views',
        imageUrl: image,
        createdAt: serverTimestamp()
      });
      
      // Update local state immediately for better UX
      const newThumb: Thumbnail = {
        id: docRef.id,
        title: title.trim(),
        category,
        stats: stats.trim() || '0 views',
        imageUrl: image,
        createdAt: new Date()
      };
      setThumbnails(prev => [newThumb, ...prev]);
      
      // Clear cache so next fetch gets fresh data
      clearCache('thumbnails_v2_');
      
      setTitle('');
      setStats('');
      setImage(null);
      setShowForm(false);
      toast.success('Thumbnail added to portfolio!', { id: toastId });
    } catch (err) {
      toast.error('Failed to add thumbnail', { id: toastId });
      handleFirestoreError(err, OperationType.CREATE, 'thumbnails');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Thumbnail?',
      message: 'Are you sure you want to delete this thumbnail? This action cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        const toastId = toast.loading('Deleting thumbnail...');
        try {
          await deleteDoc(doc(db, 'thumbnails', id));
          
          // Update local state immediately
          setThumbnails(prev => prev.filter(t => t.id !== id));
          
          // Clear cache
          clearCache('thumbnails_v2_');
          
          toast.success('Thumbnail deleted', { id: toastId });
        } catch (err) {
          toast.error('Failed to delete thumbnail', { id: toastId });
          handleFirestoreError(err, OperationType.DELETE, 'thumbnails');
        }
      }
    });
  };

  const filteredThumbnails = useMemo(() => {
    let filtered = thumbnails;
    if (activeFilter !== 'All') {
      filtered = filtered.filter(t => t.category === activeFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.category?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [thumbnails, activeFilter, searchQuery]);

  return (
    <section className="mt-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Live <span className="text-blue-600">Thumbnails</span></h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchThumbnails(true, true)}
                className="p-2 bg-zinc-100 text-zinc-600 rounded-full hover:bg-zinc-200 transition-all"
                title="Refresh Gallery"
              >
                <ZSpinner size={16} />
              </button>
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setShowForm(!showForm)}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
                    title="Add New Thumbnail"
                  >
                    {showForm ? <X size={20} /> : <Plus size={20} />}
                  </button>
                  <button 
                    onClick={handleRefineAll}
                    disabled={isRefiningAll}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-all border border-blue-200 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    title="Refine All with AI"
                  >
                    {isRefiningAll ? <ZSpinner size={14} /> : <Sparkles size={14} />}
                    {isRefiningAll ? 'Refining...' : 'Refine All'}
                  </button>
                  <button 
                    onClick={() => {
                      clearAllCache();
                      fetchThumbnails(true, true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full hover:bg-zinc-200 transition-all border border-zinc-200 text-[10px] font-bold uppercase tracking-widest"
                    title="Clear All Cache"
                  >
                    <Trash2 size={14} />
                    Clear Cache
                  </button>
                  <button 
                    onClick={async () => {
                      const toastId = toast.loading('Adding placeholder...');
                      try {
                        const docRef = await addDoc(collection(db, 'thumbnails'), {
                          title: "Sample Placeholder " + Math.floor(Math.random() * 1000),
                          category: "Gaming",
                          stats: "10K views",
                          imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450`,
                          createdAt: serverTimestamp()
                        });
                        
                        // Update local state
                        const newThumb: Thumbnail = {
                          id: docRef.id,
                          title: "Sample Placeholder",
                          category: "Gaming",
                          stats: "10K views",
                          imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450`,
                          createdAt: new Date()
                        };
                        setThumbnails(prev => [newThumb, ...prev]);
                        
                        clearCache('thumbnails_v2_');
                        toast.success('Placeholder added!', { id: toastId });
                      } catch (e) {
                        toast.error('Failed to add placeholder', { id: toastId });
                        handleFirestoreError(e, OperationType.CREATE, 'thumbnails');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-600 rounded-full hover:bg-zinc-100 transition-all border border-zinc-200 text-[10px] font-bold uppercase tracking-widest"
                    title="Add Placeholder Thumbnail"
                  >
                    <ImageIcon size={14} />
                    Add Placeholder
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Note: Thumbnails thora loading main time lete hain.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {!auth.currentUser ? (
            <button 
              onClick={handleLogin}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-blue-600 flex items-center gap-2"
            >
              <LogIn size={14} />
              Admin Login
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Logged in as {auth.currentUser.displayName}
              </span>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 flex items-center gap-2"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="glass-card p-8 rounded-[2.5rem] border border-blue-600/10 shadow-xl max-w-2xl mx-auto relative">
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[2.5rem]">
                  <ZSpinner size={32} className="mb-4" />
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-widest animate-pulse">AI is analyzing thumbnail...</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Project Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. MrBeast Challenge"
                      className="w-full bg-black/[0.02] border border-black/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-600/50 transition-all text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-600/50 transition-all text-sm appearance-none"
                    >
                      {['Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Stats (e.g. 150K views)</label>
                    <input
                      type="text"
                      value={stats}
                      onChange={(e) => setStats(e.target.value)}
                      placeholder="e.g. 150K views"
                      className="w-full bg-black/[0.02] border border-black/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-600/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Thumbnail Image</label>
                  <div className="flex items-center gap-6">
                    <label className="flex-1 flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-black/5 rounded-3xl hover:border-blue-600/30 transition-all cursor-pointer bg-black/[0.01]">
                      <ImageIcon size={32} className="text-zinc-300" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Select Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {image && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border border-black/5 relative group">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setImage(null)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <ZSpinner size={18} />
                  ) : (
                    <>
                      Add to Portfolio
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-12 text-center mb-12">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">{error}</h3>
          <p className="text-red-600/70 mb-8 max-w-md mx-auto">There was an issue connecting to the database. Please check your connection or try again later.</p>
          <button 
            onClick={() => fetchThumbnails(true)}
            className="px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Quota Exceeded Overlay */}
      <AnimatePresence>
        {quotaExceeded && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-amber-800"
          >
            <div className="p-3 bg-amber-100 rounded-full">
              <Sparkles className="text-amber-600" size={24} />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h4 className="font-bold text-lg">Daily Limit Reached</h4>
              <p className="text-sm opacity-90">
                Wow, Z-Score is popular today! We've reached our daily free database limit. 
                Some thumbnails might not load, but you can still browse the rest of the site.
              </p>
            </div>
            <button 
              onClick={() => setQuotaExceeded(false)}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-xl text-sm font-bold transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all relative ${
                activeFilter === cat 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'bg-white text-zinc-500 hover:bg-zinc-100 border border-black/5'
              }`}
            >
              {cat}
              {activeFilter === cat && (
                <motion.div 
                  layoutId="activeFilter"
                  className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white"
                />
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-white border border-black/5 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-blue-600/30 transition-all text-xs font-bold uppercase tracking-widest placeholder:text-zinc-300 shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading && thumbnails.length === 0 ? (
        <div className="flex flex-wrap justify-center gap-12">
          {[...Array(PAGE_SIZE)].map((_, i) => (
            <ThumbnailSkeleton key={i} />
          ))}
        </div>
      ) : filteredThumbnails.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-20 text-center mb-12">
          <div className="w-20 h-20 bg-white shadow-sm text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-8">
            <ImageIcon size={40} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-3">No thumbnails found</h3>
          <p className="text-zinc-500 mb-10 max-w-md mx-auto">The gallery is currently empty or no thumbnails match this category. {isAdmin && "Start adding some using the plus button above!"}</p>
          {isAdmin && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setShowForm(true)}
                className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
              >
                <Plus size={20} />
                Add First Thumbnail
              </button>
              <button 
                onClick={async () => {
                  const toastId = toast.loading('Seeding sample thumbnails...');
                  try {
                    const samples = [
                      { title: "Gaming Thumbnail 1", category: "Gaming", stats: "10K views", imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450` },
                      { title: "Finance Thumbnail 1", category: "Finance", stats: "5K views", imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450` },
                      { title: "Tech Thumbnail 1", category: "Tech", stats: "20K views", imageUrl: `https://picsum.photos/seed/${Math.random()}/800/450` }
                    ];
                    for (const sample of samples) {
                      await addDoc(collection(db, 'thumbnails'), {
                        ...sample,
                        createdAt: serverTimestamp()
                      });
                    }
                    clearCache('thumbnails_v3_All_initial');
                    fetchThumbnails(true, true);
                    toast.success('Sample thumbnails seeded!', { id: toastId });
                  } catch (error) {
                    toast.error('Failed to seed thumbnails', { id: toastId });
                    handleFirestoreError(error, OperationType.CREATE, 'thumbnails');
                  }
                }}
                className="px-10 py-4 bg-white border border-black/10 text-black rounded-full font-bold hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
              >
                <Sparkles size={20} className="text-orange-500" />
                Seed Sample Data
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-40 flex items-center justify-center rounded-3xl">
              <ZSpinner size={60} />
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-12">
            {filteredThumbnails.map((thumb, i) => (
              <ThumbnailItem 
                key={thumb.id}
                thumb={thumb}
                i={i}
                isAdmin={isAdmin}
                refiningId={refiningId}
                handleRefine={handleRefine}
                handleDelete={handleDelete}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => fetchThumbnails(false)}
                disabled={loadingMore}
                className="group flex items-center gap-3 px-10 py-4 bg-white border border-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-500 shadow-sm hover:shadow-xl disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    Loading...
                    <ZSpinner size={16} />
                  </>
                ) : (
                  <>
                    Load More Projects
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
