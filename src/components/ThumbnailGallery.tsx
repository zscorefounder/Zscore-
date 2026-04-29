import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'motion/react';
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
  Check,
  RefreshCw
} from 'lucide-react';
import { PushPin } from './PushPin';
import { ZSpinner, ZSkeleton } from './ZLoading';
import { GoogleGenAI, Type } from "@google/genai";
import { ConfirmModal } from './ConfirmModal';
import { useAdmin } from '../hooks/useAdmin';
import { toast } from 'sonner';

export interface Thumbnail {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  stats?: string;
  createdAt: string;
  variantImageUrl?: string;
  variantStats?: string;
  abTestActive?: boolean;
}

const compressImage = async (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1280;
      const MAX_HEIGHT = 720;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

export const ThumbnailItem = ({ thumb, i, isAdmin, refiningId, handleRefine, handleDelete }: { 
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
  const [showVariant, setShowVariant] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const pinColors = ["#FF6321", "#3B82F6", "#8B5CF6", "#10B981"];

  const hasVariant = !!thumb.variantImageUrl;

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 5000); // 5s fallback
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(thumb.imageUrl);
    setIsCopied(true);
    toast.success('Image link copied!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0
      }}
      whileHover={{ 
        y: -10,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      transition={{ 
        delay: (i % 6) * 0.05, 
        duration: 0.6, 
        ease: "easeOut"
      }}
      className="relative p-4 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_rgba(0,102,255,0.1)] rounded-[2.5rem] w-full mx-auto group transition-all duration-500 cursor-default border border-zinc-100 hover:border-blue-500/30"
    >
      <div className="space-y-4">
        {/* Clean Thumbnail Container */}
        <div className="aspect-video overflow-hidden relative bg-zinc-900 rounded-[1.8rem] border border-black/5 transition-all duration-500 shadow-sm">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-zinc-800 animate-pulse flex items-center justify-center">
              <ImageIcon className="text-zinc-700" size={32} />
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-4 text-center">
              <ImageIcon className="text-zinc-800 mb-2" size={24} />
              <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Image failed to load</p>
            </div>
          )}
          
          <AnimatePresence mode="wait">
            <motion.img 
              ref={imgRef}
              key={showVariant ? (thumb.variantImageUrl || thumb.id) : (thumb.id || thumb.imageUrl)}
              src={showVariant ? thumb.variantImageUrl : thumb.imageUrl} 
              alt={thumb.title} 
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setHasError(true);
                setIsLoaded(true);
              }}
              className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading={i < 4 ? "eager" : "lazy"}
            />
          </AnimatePresence>
        </div>

        {/* Content & Metadata Below Image */}
        <div className="space-y-4 px-2 pb-2">
          {/* Top Metadata Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[8px] font-black tracking-widest rounded-md uppercase border border-blue-100">
                {thumb.category || 'Portfolio'}
              </span>
              {thumb.stats && (
                <span className="px-2 py-1 bg-zinc-50 text-zinc-600 text-[8px] font-black tracking-widest rounded-md uppercase border border-zinc-100">
                  {thumb.stats}
                </span>
              )}
              <span className="px-2 py-1 bg-green-50 text-green-600 text-[8px] font-black tracking-widest rounded-md uppercase border border-green-100 flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>

            {/* Quick Actions (Admin or General) */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={handleCopy}
                className="p-2 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                title="Copy Link"
              >
                {isCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={3} />}
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h4 className="text-xl font-black text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight uppercase">
              {thumb.title}
            </h4>
            {thumb.description && (
              <p className="text-xs text-zinc-500 leading-relaxed font-medium line-clamp-2">
                {thumb.description}
              </p>
            )}
          </div>

          {/* Admin Controls Area */}
          {isAdmin && (
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefine(thumb.id, thumb.imageUrl);
                  }}
                  disabled={refiningId === thumb.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 disabled:opacity-50 group/refine"
                >
                  {refiningId === thumb.id ? <ZSpinner size={12} /> : <Sparkles size={12} />}
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI Refine</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(thumb.id);
                  }}
                  className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {hasVariant && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVariant(!showVariant);
                  }}
                  className={`px-3 py-2 ${showVariant ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'} rounded-xl text-[9px] font-black uppercase tracking-widest transition-all`}
                >
                  {showVariant ? 'Show Original' : 'Show Variant B'}
                </button>
              )}
            </div>
          )}

          {/* A/B Test Status (Non-Admin View) */}
          {!isAdmin && hasVariant && (
            <div className="flex items-center gap-2 pt-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <RefreshCw size={12} className="text-indigo-600" />
              </div>
              <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">A/B Testing Variant Live</p>
            </div>
          )}
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [stats, setStats] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isABTest, setIsABTest] = useState(false);
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [variantImageUrlInput, setVariantImageUrlInput] = useState('');
  const [variantStats, setVariantStats] = useState('');

  useEffect(() => {
    fetchThumbnails();
  }, []);

  const fetchThumbnails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/thumbnails');
      if (response.ok) {
        const data = await response.json();
        setThumbnails(data);
      }
    } catch (e) {
      console.error("Failed to fetch thumbnails", e);
      toast.error("Failed to load thumbnails");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (id: string, imageUrl: string) => {
    setRefiningId(id);
    try {
      const result = await analyzeImage(imageUrl, true);
      if (result) {
        const response = await fetch(`/api/thumbnails/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: result.title || '',
            description: result.description || '',
            category: result.category || 'Portfolio'
          })
        });
        if (response.ok) {
          const updated = await response.json();
          setThumbnails(prev => prev.map(t => t.id === id ? updated : t));
          toast.success("AI refined thumbnail successfully!");
        }
      }
    } catch (e) {
      console.error("Refine error", e);
      toast.error("Failed to refine thumbnail");
    } finally {
      setRefiningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this thumbnail? This will permanently remove it from your local database.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/thumbnails/${id}`, { method: 'DELETE' });
          if (response.ok) {
            setThumbnails(prev => prev.filter(t => t.id !== id));
            toast.success("Thumbnail deleted");
          }
        } catch (e) {
          toast.error("Failed to delete");
        }
      }
    });
  };

  const handleRefineAll = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Refine All with AI?',
      message: 'This will process all thumbnails through AI to improve titles and categories. Continue?',
      onConfirm: async () => {
        setIsRefiningAll(true);
        try {
          for (const t of thumbnails) {
            setRefiningId(t.id);
            const result = await analyzeImage(t.imageUrl, true);
            if (result) {
              await fetch(`/api/thumbnails/${t.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: result.title,
                  description: result.description,
                  category: result.category
                })
              });
            }
            await new Promise(r => setTimeout(r, 1000));
          }
          await fetchThumbnails();
          toast.success("All thumbnails refined!");
        } catch (e) {
          toast.error("Failed to refine all");
        } finally {
          setIsRefiningAll(false);
          setRefiningId(null);
        }
      }
    });
  };

  const analyzeImage = async (base64: string, isRefining = false) => {
    if (!isRefining) setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("No API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { text: "Analyze this YouTube thumbnail image. Provide a high-conversion, catchy title (1-3 words), a brief engaging description (under 12 words), the most fitting category from the list, and an estimated realistic CTR (e.g., 12.4%) based on its visual appeal and niche. Return in JSON format with 'title', 'description', 'category', and 'stats' (e.g. 14.2% CTR). Categories: Gaming, Finance, Tech, Vlog, Lifestyle, Entertainment, Education, Music, Travel, Food, Sports." },
            { inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              stats: { type: Type.STRING }
            }
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (isRefining) return result;
      
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.category) setCategory(result.category);
      if (result.stats) setStats(result.stats);
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      if (!isRefining) setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'variant') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        if (target === 'main') {
          setImage(compressed);
          analyzeImage(compressed);
        } else {
          setVariantImage(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !image || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        category,
        stats: stats.trim() || 'NEW',
        imageUrl: image,
        variantImageUrl: isABTest ? variantImage : undefined,
        variantStats: isABTest ? variantStats : undefined,
        abTestActive: isABTest,
        id: `thumb-${Date.now()}`
      };

      const response = await fetch('/api/thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const saved = await response.json();
        setThumbnails(prev => [saved, ...prev]);
        setShowForm(false);
        setTitle('');
        setDescription('');
        setImage(null);
        toast.success("Thumbnail uploaded successfully!");
      }
    } catch (e) {
      toast.error("Failed to upload");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredThumbnails = useMemo(() => {
    let filtered = thumbnails;
    if (activeFilter !== 'All') filtered = filtered.filter(t => t.category === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
    }
    return filtered;
  }, [thumbnails, activeFilter, searchQuery]);

  return (
    <section className="mt-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-bold tracking-tight">Main <span className="text-blue-600">Gallery</span></h2>
            <p className="text-zinc-500 text-sm mt-1">High-performance designs for top-tier creators.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button 
                  onClick={() => setShowForm(!showForm)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl"
                >
                  {showForm ? <X size={16} /> : <Plus size={16} />}
                  {showForm ? 'Close Form' : 'Add New'}
                </button>
                <button 
                  onClick={handleRefineAll}
                  disabled={isRefiningAll || thumbnails.length === 0}
                  className="p-3 bg-white border border-black/5 text-blue-600 rounded-full hover:bg-blue-50 transition-all shadow-sm"
                  title="Refine All with AI"
                >
                  {isRefiningAll ? <ZSpinner size={16} /> : <Sparkles size={16} />}
                </button>
              </>
            )}
            <button 
              onClick={fetchThumbnails}
              className="p-3 bg-white border border-black/5 text-zinc-500 rounded-full hover:bg-zinc-50 transition-all shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          {['All', 'Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-black/5 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Upload Form */}
        <AnimatePresence>
          {showForm && isAdmin && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <form onSubmit={handleSubmit} className="bg-zinc-50 rounded-3xl p-8 border border-black/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="aspect-video bg-white border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                      {image ? (
                        <img src={image} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <ImageIcon size={32} />
                          <p className="text-[10px] uppercase font-bold tracking-widest">Select Main Thumbnail</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'main')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white gap-3">
                          <ZSpinner size={24} />
                          <span className="text-xs font-bold uppercase tracking-widest">AI Analyzing...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="abtest" 
                        checked={isABTest} 
                        onChange={(e) => setIsABTest(e.target.checked)} 
                        className="w-4 h-4 accent-blue-600"
                      />
                      <label htmlFor="abtest" className="text-xs font-bold uppercase tracking-widest text-zinc-600 cursor-pointer select-none">Enable A/B Test Variant</label>
                    </div>

                    {isABTest && (
                      <div className="aspect-video bg-white border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                        {variantImage ? (
                          <img src={variantImage} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-zinc-400">
                            <Plus size={32} />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Select Variant B Image</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload(e, 'variant')}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      className="w-full bg-white px-6 py-4 rounded-xl border border-black/5 outline-none focus:border-blue-500 transition-all font-bold text-sm"
                    />
                    <textarea 
                      placeholder="Description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white px-6 py-4 rounded-xl border border-black/5 outline-none focus:border-blue-500 transition-all font-medium text-sm h-32 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-white px-6 py-4 rounded-xl border border-black/5 outline-none focus:border-blue-500 transition-all font-bold text-xs uppercase tracking-widest"
                      >
                        {['Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Stats (e.g. 15.4% CTR)" 
                        value={stats} 
                        onChange={(e) => setStats(e.target.value)}
                        className="bg-white px-6 py-4 rounded-xl border border-black/5 outline-none focus:border-blue-500 transition-all font-bold text-xs"
                      />
                    </div>
                    {isABTest && (
                      <input 
                        type="text" 
                        placeholder="Variant B Stats (e.g. 20.1% CTR)" 
                        value={variantStats} 
                        onChange={(e) => setVariantStats(e.target.value)}
                        className="w-full bg-white px-6 py-4 rounded-xl border border-black/5 outline-none focus:border-blue-500 transition-all font-bold text-xs text-blue-600"
                      />
                    )}
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !title || !image}
                      className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50"
                    >
                      {isSubmitting ? <ZSpinner size={20} /> : 'Publish to Portfolio'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(n => <ZSkeleton key={n} className="aspect-video rounded-3xl" />)}
          </div>
        ) : filteredThumbnails.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
            <ImageIcon className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No thumbnails found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
        isDestructive={confirmModal.isDestructive}
      />
    </section>
  );
};
