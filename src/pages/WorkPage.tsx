import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  MousePointer2, 
  ArrowLeft, 
  ExternalLink, 
  Star, 
  Quote, 
  Loader2, 
  Sparkles, 
  Users, 
  Zap, 
  Trophy, 
  Globe, 
  Gamepad2,
  Monitor,
  PlayCircle,
  Layout,
  ChevronDown,
  ArrowRight,
  Target,
  Leaf,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ZSpinner } from '../components/ZLoading';
import { useAdmin } from '../hooks/useAdmin';
import { ThumbnailGallery } from '../components/ThumbnailGallery';
import { BehindTheScenes } from '../components/BehindTheScenes';
import { PushPin } from '../components/PushPin';
import { 
  db, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  OperationType,
  handleFirestoreError,
  limit,
  getDocsCached,
  clearCache,
  clearAllCache
} from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';

const REVIEWS = [
  { id: 1, name: "Azul Welz", handle: "357K subscribers", review: "Zeeshan's thumbnails are a game changer. My CTR has never been this high. Absolute professional!", rating: 5, image: "https://i.ibb.co/ddJ5FDm/image.png", color: "text-blue-600", result: "+18.4% CTR" },
  { id: 2, name: "Hustle Ninjas", handle: "301K subscribers", review: "The attention to detail and psychological triggers Zeeshan uses are unmatched. Highly recommended for any serious creator.", rating: 5, image: "https://i.ibb.co/NdXYBpM4/image.png", color: "text-orange-600", result: "400K+ Views" },
  { id: 3, name: "Rob Lipsett", handle: "491K subscribers", review: "Fast, reliable, and incredibly creative. Zeeshan understands the fitness niche perfectly.", rating: 5, image: "https://i.ibb.co/6J4CbdQf/image.png", color: "text-purple-600", result: "Viral Hit" },
  { id: 4, name: "Kristen & Siya", handle: "329K subscribers", review: "Our travel vlogs finally have the visual hooks they deserve. Zeeshan is a master of his craft.", rating: 5, image: "https://i.ibb.co/rR6LmpRm/image.png", color: "text-emerald-600", result: "15% Growth" },
  { id: 5, name: "Enablers", handle: "592K subscribers", review: "Zeeshan's ability to simplify complex concepts into a single visual hook is incredible. He's our go-to for high-impact thumbnails.", rating: 5, image: "https://image2url.com/r2/default/images/1774670864556-c1f9664f-9c57-4938-9b23-2eaa0371cdf4.png", color: "text-blue-700", result: "592K+ Impact" },
  { id: 6, name: "Russian Rock", handle: "690K subscribers", review: "The energy and visual storytelling Z Score brings to our rock content is phenomenal. Truly a master of the craft.", rating: 5, image: "https://image2url.com/r2/default/images/1774670662268-7fe3deea-41b2-4c6f-af8c-454ec4daffa6.png", color: "text-red-600", result: "690K+ Reach" },
  { id: 7, name: "Row Rhythm", handle: "35K subscribers", review: "Zeeshan's designs perfectly capture the rhythm of our content. A true creative partner!", rating: 5, image: "https://image2url.com/r2/default/images/1774860421994-990bce61-ed25-44f2-9291-004db964e791.png", color: "text-zinc-600", result: "35K+ Subs" },
];

const CLIENTS = [
  { id: 1, name: "Azul Welz", handle: "357K subscribers", image: "https://i.ibb.co/ddJ5FDm/image.png", color: "text-blue-600" },
  { id: 2, name: "Hustle Ninjas", handle: "301K subscribers", image: "https://i.ibb.co/NdXYBpM4/image.png", color: "text-orange-600" },
  { id: 3, name: "Rob Lipsett", handle: "491K subscribers", image: "https://i.ibb.co/6J4CbdQf/image.png", color: "text-purple-600" },
  { id: 4, name: "Kristen & Siya", handle: "329K subscribers", image: "https://i.ibb.co/rR6LmpRm/image.png", color: "text-emerald-600" },
  { id: 5, name: "Enablers", handle: "592K subscribers", image: "https://image2url.com/r2/default/images/1774670864556-c1f9664f-9c57-4938-9b23-2eaa0371cdf4.png", color: "text-blue-700" },
  { id: 6, name: "Russian Rock", handle: "690K subscribers", image: "https://image2url.com/r2/default/images/1774670662268-7fe3deea-41b2-4c6f-af8c-454ec4daffa6.png", color: "text-red-600" },
  { id: 7, name: "Row Rhythm", handle: "35K subscribers", image: "https://image2url.com/r2/default/images/1774860421994-990bce61-ed25-44f2-9291-004db964e791.png", color: "text-zinc-600" },
];

const BackgroundFog = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent_50%)]" />
    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.03),transparent_50%)]" />
  </div>
);

const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 340, quality = 0.4): Promise<string> => {
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
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);
      
      // Target a smaller size for faster loading (under 80KB)
      while (result.length > 80000 && currentQuality > 0.1) {
        currentQuality -= 0.05;
        result = canvas.toDataURL('image/jpeg', currentQuality);
      }
      
      resolve(result);
    };
  });
};

const Reviews = () => (
  <section id="reviews" className="py-32 px-6 bg-[#F5F5F5] relative overflow-hidden">
    {/* Background Grid */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
      style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
    />

    <div className="max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-black/5 shadow-sm mb-6"
        >
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Client Success Stories</span>
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">What Creators Say</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm">Real results from creators who scaled their channels with high-CTR thumbnails.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-12">
        {REVIEWS.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, scale: 0.9, rotate: Math.random() * 10 - 5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: Math.random() * 6 - 3 }}
            whileHover={{ rotate: 0, zIndex: 20 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative group max-w-sm"
          >
            <PushPin color={['#FF6321', '#3B82F6', '#10B981', '#F59E0B'][i % 4]} />
            <div className="bg-white p-8 shadow-xl border border-black/5 transform transition-all duration-500 group-hover:shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 border-2 border-white shadow-sm">
                  <img 
                    src={review.image} 
                    alt={review.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm leading-tight">{review.name}</h4>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{review.handle}</p>
                </div>
              </div>
              <div className="relative">
                <Quote className="absolute -top-2 -left-2 text-zinc-100 w-8 h-8 -z-10" />
                <p className="text-zinc-600 text-sm leading-relaxed italic relative z-10">"{review.review}"</p>
              </div>
              <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={10} className="text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${review.color}`}>
                  {review.result}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const TrustedClients = () => (
  <section className="py-32 px-6 bg-[#F5F5F5] relative overflow-hidden">
    {/* Background Grid */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
      style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
    />

    <div className="max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-black/5 shadow-sm mb-6"
        >
          <Users size={14} className="text-blue-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Trusted By The Best</span>
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Channel Partners</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm">Working with creators who are shaping the future of digital content.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-12">
        {CLIENTS.map((client, i) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, scale: 0.9, rotate: Math.random() * 10 - 5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: Math.random() * 6 - 3 }}
            whileHover={{ rotate: 0, zIndex: 20 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="relative group"
          >
            <PushPin color={['#FF6321', '#3B82F6', '#10B981', '#F59E0B'][i % 4]} />
            <div className="bg-white p-4 pb-8 shadow-xl border border-black/5 transform transition-all duration-500 group-hover:shadow-2xl">
              <div className="w-48 h-48 overflow-hidden bg-zinc-100 mb-4">
                <img 
                  src={client.image} 
                  alt={client.name}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-zinc-900">{client.name}</h3>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{client.handle}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const HeroSection = () => {
  const { isAdmin } = useAdmin();
  const [thumbnails, setThumbnails] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dynamicTexts = [
    "grab attention",
    "stop scrolling",
    "drive clicks",
    "scale channels",
    "tell stories",
    "boost CTR",
    "hook viewers",
    "win the click",
    "explode growth"
  ];

  const [isInitialLoad, setIsInitialLoad] = useState(true);
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

  const HeroSkeleton = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex gap-8">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="w-40 md:w-64 aspect-video bg-zinc-200 rounded-3xl animate-pulse"
            style={{ 
              transform: `translateY(${Math.sin(i) * 20}px) rotate(${i * 5 - 10}deg)`,
              opacity: 0.5 - (i * 0.1)
            }}
          />
        ))}
      </div>
    </div>
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % dynamicTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const fetchHeroThumbnails = async () => {
      try {
        setQuotaExceeded(false);
        const q = query(
          collection(db, 'hero_thumbnails'), 
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const data = await getDocsCached(q, 'hero_thumbnails_limit_10');
        setThumbnails(data);
      } catch (error) {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('quota-exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
            setQuotaExceeded(true);
          }
        }
        handleFirestoreError(error, OperationType.LIST, 'hero_thumbnails');
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchHeroThumbnails();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading thumbnail...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64, 1200, 800, 0.7);
        
        const count = thumbnails.length;
        const angle = (count * 137.5) * (Math.PI / 180);
        const radius = 30 + (Math.sqrt(count) * 8);
        const x = Math.cos(angle) * Math.min(radius, 65);
        const y = Math.sin(angle) * Math.min(radius, 65);

        const newDoc = {
          url: compressed,
          rotate: Math.random() * 30 - 15,
          x,
          y,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'hero_thumbnails'), newDoc);
        
        // Update local state
        setThumbnails(prev => [{
          id: docRef.id,
          ...newDoc,
          createdAt: new Date()
        }, ...prev]);
        
        // Clear cache
        clearCache('hero_thumbnails_limit_10');
        
        toast.success('Hero thumbnail uploaded!', { id: toastId });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload thumbnail', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'hero_thumbnails');
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Hero Thumbnail?',
      message: 'Are you sure you want to delete this hero thumbnail?',
      isDestructive: true,
      onConfirm: async () => {
        const toastId = toast.loading('Deleting thumbnail...');
        try {
          await deleteDoc(doc(db, 'hero_thumbnails', id));
          
          // Update local state
          setThumbnails(prev => prev.filter(t => t.id !== id));
          
          // Clear cache
          clearCache('hero_thumbnails_limit_10');
          
          toast.success('Thumbnail deleted', { id: toastId });
        } catch (error) {
          toast.error('Failed to delete thumbnail', { id: toastId });
          handleFirestoreError(error, OperationType.DELETE, 'hero_thumbnails');
        }
      }
    });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-32 pb-20 bg-[#FAF9F6]">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      {/* Central Content */}
      <div className="relative z-20 text-center max-w-5xl px-6 flex flex-col items-center mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter leading-none text-[#1A1A1A]">
            Thumbnails that <br />
            <AnimatePresence mode="wait">
              <motion.span 
                key={textIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-blue-600 inline-block"
              >
                {dynamicTexts[textIndex]}
              </motion.span>
            </AnimatePresence>
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed">
            I don't just design. I reverse-engineer why people click. <br className="hidden md:block" />
            No fluff. No templates. Just ideas that get noticed.
          </p>
          
          <div className="pt-4 flex flex-col items-center gap-4">
            <button className="px-10 py-4 bg-black text-white rounded-full text-sm font-bold flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl group">
              Get Started for Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Note: Thumbnails may take a moment to load.
            </p>

            {/* Quota Exceeded Overlay */}
            <AnimatePresence>
              {quotaExceeded && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-amber-800 max-w-2xl mx-auto"
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
          </div>
        </motion.div>

        {isAdmin && (
          <div className="mt-12">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUpload} 
              className="hidden" 
              accept="image/*" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-3 bg-white border border-black/10 text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2 mx-auto shadow-sm"
            >
              {isUploading ? <ZSpinner size={14} /> : <Plus size={14} />}
              Add Hero Thumbnail
            </button>

            {thumbnails.length === 0 && (
              <button 
                onClick={async () => {
                  const toastId = toast.loading('Seeding hero thumbnails...');
                  try {
                    const samples = [
                      { url: `https://picsum.photos/seed/${Math.random()}/1200/800` },
                      { url: `https://picsum.photos/seed/${Math.random()}/1200/800` },
                      { url: `https://picsum.photos/seed/${Math.random()}/1200/800` }
                    ];
                    
                    for (const sample of samples) {
                      await addDoc(collection(db, 'hero_thumbnails'), {
                        ...sample,
                        createdAt: serverTimestamp()
                      });
                    }
                    
                    clearCache('hero_thumbnails_limit_10');
                    window.location.reload();
                    toast.success('Hero thumbnails seeded!', { id: toastId });
                  } catch (error) {
                    toast.error('Failed to seed thumbnails', { id: toastId });
                    handleFirestoreError(error, OperationType.CREATE, 'hero_thumbnails');
                  }
                }}
                className="group flex items-center gap-2 px-6 py-3 bg-zinc-100 border border-black/5 rounded-full hover:bg-zinc-200 transition-all shadow-sm"
              >
                <Sparkles size={16} className="text-orange-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Seed Samples</span>
              </button>
            )}
            
            <button 
              onClick={() => {
                clearAllCache();
                window.location.reload();
              }}
              className="group flex items-center gap-2 px-6 py-3 bg-zinc-100 border border-black/5 rounded-full hover:bg-zinc-200 transition-all shadow-sm"
              title="Clear All Cache"
            >
              <Trash2 size={16} className="text-red-500" />
              <span className="text-xs font-bold uppercase tracking-widest">Clear Cache</span>
            </button>
          </div>
        )}
      </div>

      {/* Arc Thumbnails - Matching Provided Image Style */}
      <div className="relative w-full max-w-[1400px] h-[400px] md:h-[500px] mt-12">
        <div className="absolute inset-0 flex items-center justify-center">
          {isInitialLoad && <HeroSkeleton />}
          <AnimatePresence>
            {!isInitialLoad && thumbnails.map((thumb, i) => {
              const total = thumbnails.length;
              const angleRange = 120; // Arc spread in degrees
              const startAngle = -angleRange / 2;
              const angle = total > 1 ? startAngle + (i * (angleRange / (total - 1))) : 0;
              const radian = (angle - 90) * (Math.PI / 180);
              const radius = 800; // Large radius for subtle curve
              
              const x = Math.cos(radian) * radius;
              const y = Math.sin(radian) * radius + radius; // Offset to put center at bottom

              return (
                <motion.div
                  key={thumb.id}
                  initial={{ opacity: 0, y: 100, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: x * 0.8, // Scale down X for better fit
                    y: y * 0.15, // Flatten the curve
                    rotate: angle * 0.3, // Subtle tilt based on position
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  style={{
                    position: 'absolute',
                    zIndex: 10 + i,
                  }}
                  className="w-48 md:w-80 group"
                >
                  <div className="relative overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 transform transition-all duration-700 hover:scale-110 hover:-translate-y-12 hover:z-50 hover:shadow-[0_40px_80px_rgba(0,0,0,0.25)]">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(thumb.id);
                        }}
                        className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[60] shadow-lg hover:bg-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="aspect-video bg-zinc-100">
                      <img 
                        src={thumb.url} 
                        alt="Hero Thumbnail" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

const HangingSection = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualImage, setManualImage] = useState<string | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAdmin();

  const dynamicTexts = [
    "grab attention",
    "stop scrolling",
    "drive clicks",
    "scale channels",
    "win the click",
    "hook viewers"
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % dynamicTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const HangingSkeleton = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex gap-8">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="w-48 h-64 bg-zinc-200 shadow-lg animate-pulse"
            style={{ 
              transform: `rotate(${i * 10 - 15}deg) translateY(${Math.random() * 20}px)`,
              opacity: 0.4
            }}
          />
        ))}
      </div>
    </div>
  );

  // Fetch posts from Firestore
  const fetchRandomPosts = async () => {
    try {
      setQuotaExceeded(false);
      setError(null);
      const q = query(
        collection(db, 'random_posts'), 
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const posts = await getDocsCached(q, 'random_posts_limit_10');
      setCards(posts);
    } catch (error) {
      console.error("Error fetching random posts:", error);
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('quota-exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
          setQuotaExceeded(true);
        } else if (msg.includes('permission-denied')) {
          setError("Permission denied.");
        } else {
          setError("Failed to load posts.");
        }
      }
      handleFirestoreError(error, OperationType.GET, 'random_posts');
    } finally {
      setIsInitialLoad(false);
    }
  };

  React.useEffect(() => {
    fetchRandomPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    const toastId = toast.loading('Deleting post...');
    try {
      await deleteDoc(doc(db, 'random_posts', id));
      
      // Update local state
      setCards(prev => prev.filter(c => c.id !== id));
      
      // Clear cache
      clearCache('random_posts_limit_10');
      
      toast.success('Post deleted', { id: toastId });
    } catch (error) {
      toast.error('Failed to delete post', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, 'random_posts');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Analyzing and uploading...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalBase64 = event.target?.result as string;
        const base64Data = await compressImage(originalBase64);
        const base64Content = base64Data.split(',')[1];

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          toast.error('API Key missing', { id: toastId });
          throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
        }
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: "Analyze this image and provide a short, catchy, high-conversion title (1-3 words) and a very brief, punchy description (under 10 words) suitable for a polaroid-style project card. The tone should be professional yet creative. Return in JSON format with 'title' and 'desc' keys." },
                { inlineData: { data: base64Content, mimeType: file.type } }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                desc: { type: Type.STRING }
              },
              required: ["title", "desc"]
            }
          }
        });

        const result = JSON.parse(response.text);
        
        const newCardData = {
          title: result.title,
          desc: result.desc,
          image: base64Data,
          rotate: Math.random() * 20 - 10,
          y: Math.random() * 30,
          createdAt: serverTimestamp()
        };

        try {
          const docRef = await addDoc(collection(db, 'random_posts'), newCardData);
          
          // Update local state
          setCards(prev => [{
            id: docRef.id,
            ...newCardData,
            createdAt: new Date()
          }, ...prev]);
          
          // Clear cache
          clearCache('random_posts_limit_10');
          
          toast.success('Post added!', { id: toastId });
        } catch (error) {
          toast.error('Failed to save post', { id: toastId });
          handleFirestoreError(error, OperationType.CREATE, 'random_posts');
        }
        
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("AI Upload Error:", error);
      toast.error('AI analysis failed', { id: toastId });
      setIsUploading(false);
    }
  };

  const handleManualImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressImage(base64);
      setManualImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualDesc || !manualImage || isUploading) return;

    setIsUploading(true);
    const toastId = toast.loading('Adding post...');
    try {
      const newCardData = {
        title: manualTitle,
        desc: manualDesc,
        image: manualImage,
        rotate: Math.random() * 20 - 10,
        y: Math.random() * 30,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'random_posts'), newCardData);
      
      // Update local state
      setCards(prev => [{
        id: docRef.id,
        ...newCardData,
        createdAt: new Date()
      }, ...prev]);
      
      // Clear cache
      clearCache('random_posts_limit_10');
      
      setManualTitle('');
      setManualDesc('');
      setManualImage(null);
      setShowManualForm(false);
      toast.success('Post added!', { id: toastId });
    } catch (error) {
      toast.error('Failed to add post', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'random_posts');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="py-32 px-6 bg-[#F5F5F5] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-black/5 shadow-sm mb-6"
          >
            <Sparkles size={14} className="text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Thumbnail that stop scrolling</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Thumbnail that <br />
            <AnimatePresence mode="wait">
              <motion.span 
                key={textIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-orange-500 inline-block"
              >
                {dynamicTexts[textIndex]}
              </motion.span>
            </AnimatePresence>
          </h2>
          <p className="text-zinc-500 max-w-2xl mx-auto text-sm mb-2">A collection of visuals designed to break the pattern and drive engagement.</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-8">
            Note: Thumbnails may take a moment to load.
          </p>

          {/* Quota Exceeded Overlay */}
          <AnimatePresence>
            {quotaExceeded && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-amber-800 max-w-2xl mx-auto"
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

          {/* Error State */}
          {error && !isInitialLoad && (
            <div className="bg-red-50 border border-red-100 rounded-3xl p-12 text-center mb-12 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-red-900 mb-2">{error}</h3>
              <p className="text-red-600/70 mb-8 max-w-md mx-auto">There was an issue connecting to the database. Please check your connection or try again later.</p>
              <button 
                onClick={() => fetchRandomPosts()}
                className="px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Try Again
              </button>
            </div>
          )}
          
          {isAdmin && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex justify-center gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="group flex items-center gap-2 px-6 py-3 bg-white border border-black/10 rounded-full hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
                >
                  {isUploading ? (
                    <ZSpinner size={16} />
                  ) : (
                    <Zap size={16} />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {isUploading ? 'AI Analyzing...' : 'AI Upload'}
                  </span>
                </button>

                <button 
                  onClick={() => setShowManualForm(!showManualForm)}
                  className={`group flex items-center gap-2 px-6 py-3 border rounded-full transition-all shadow-sm ${showManualForm ? 'bg-black text-white border-black' : 'bg-white border-black/10 hover:bg-zinc-50'}`}
                >
                  <Plus size={16} className={showManualForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                  <span className="text-xs font-bold uppercase tracking-widest">Manual Add</span>
                </button>

                {isAdmin && cards.length === 0 && (
                  <button 
                    onClick={async () => {
                      const toastId = toast.loading('Seeding sample posts...');
                      try {
                        const samples = [
                          { title: "Gaming Setup", desc: "Minimalist aesthetic for pro gamers" },
                          { title: "Tech Review", desc: "Deep dive into the latest gadgets" },
                          { title: "Vlog Style", desc: "Dynamic storytelling for creators" }
                        ];
                        
                        for (const sample of samples) {
                          const newCardData = {
                            ...sample,
                            image: `https://picsum.photos/seed/${Math.random()}/800/450`,
                            rotate: Math.random() * 20 - 10,
                            y: Math.random() * 30,
                            createdAt: serverTimestamp()
                          };
                          await addDoc(collection(db, 'random_posts'), newCardData);
                        }
                        
                        clearCache('random_posts_limit_10');
                        fetchRandomPosts();
                        toast.success('Sample posts seeded!', { id: toastId });
                      } catch (error) {
                        toast.error('Failed to seed posts', { id: toastId });
                        handleFirestoreError(error, OperationType.CREATE, 'random_posts');
                      }
                    }}
                    className="group flex items-center gap-2 px-6 py-3 bg-zinc-100 border border-black/5 rounded-full hover:bg-zinc-200 transition-all shadow-sm"
                  >
                    <Sparkles size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">Seed Samples</span>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showManualForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full max-w-md overflow-hidden"
                  >
                    <form onSubmit={handleManualSubmit} className="bg-white p-6 rounded-3xl border border-black/5 shadow-xl mt-6 space-y-4">
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Title</label>
                        <input
                          type="text"
                          value={manualTitle}
                          onChange={(e) => setManualTitle(e.target.value)}
                          placeholder="Short catchy title"
                          className="w-full bg-zinc-50 border border-black/5 rounded-2xl py-3 px-5 focus:outline-none focus:border-black/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Description</label>
                        <input
                          type="text"
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
                          placeholder="Brief description"
                          className="w-full bg-zinc-50 border border-black/5 rounded-2xl py-3 px-5 focus:outline-none focus:border-black/20 transition-all text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Image</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="file" 
                            ref={manualFileInputRef} 
                            onChange={handleManualImageSelect} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          <button 
                            type="button"
                            onClick={() => manualFileInputRef.current?.click()}
                            className="flex-grow flex items-center justify-center gap-2 py-3 px-5 bg-zinc-50 border border-dashed border-black/10 rounded-2xl hover:bg-zinc-100 transition-all"
                          >
                            {manualImage ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-500" />
                                <span className="text-xs font-medium">Image Selected</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Upload size={14} className="text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-400">Select Image</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={!manualTitle || !manualDesc || !manualImage || isUploading}
                        className="w-full py-3 bg-black text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
                      >
                        {isUploading ? <ZSpinner size={16} className="mx-auto" /> : 'Post to Workspace'}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center mt-12 overflow-visible">
          <div className="relative w-full max-w-[1400px] h-full flex items-center justify-center">
            {isInitialLoad ? (
              <HangingSkeleton />
            ) : !error && cards.length === 0 ? (
              <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-black/10 w-full max-w-2xl">
                <div className="w-16 h-16 bg-white shadow-sm text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No posts yet</h3>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto text-sm">This section is currently empty. If you are an admin, you can add new posts using the buttons above.</p>
                {isAdmin && (
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={() => setShowManualForm(true)}
                      className="px-8 py-3 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                    >
                      Add First Post
                    </button>
                    <button 
                      onClick={async () => {
                        const toastId = toast.loading('Seeding sample posts...');
                        try {
                          const samples = [
                            { title: "Creative Layout", desc: "Exploring new visual hierarchies for modern interfaces.", image: `https://picsum.photos/seed/${Math.random()}/800/600`, rotate: -5, y: 0 },
                            { title: "Color Theory", desc: "How vibrant palettes drive user engagement and brand recall.", image: `https://picsum.photos/seed/${Math.random()}/800/600`, rotate: 3, y: 20 },
                            { title: "Typography Study", desc: "The impact of variable fonts on responsive design systems.", image: `https://picsum.photos/seed/${Math.random()}/800/600`, rotate: -2, y: -10 }
                          ];
                          for (const sample of samples) {
                            await addDoc(collection(db, 'random_posts'), {
                              ...sample,
                              createdAt: serverTimestamp()
                            });
                          }
                          clearCache('random_posts_limit_10');
                          window.location.reload(); // Refresh to show new posts
                          toast.success('Sample posts seeded!', { id: toastId });
                        } catch (error) {
                          toast.error('Failed to seed posts', { id: toastId });
                          handleFirestoreError(error, OperationType.CREATE, 'random_posts');
                        }
                      }}
                      className="px-8 py-3 bg-white border border-black/10 text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Sparkles size={14} className="text-orange-500" />
                      Seed Sample Data
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {cards.map((card, i) => {
                const total = cards.length;
                const angleRange = 100; // Arc spread
                const startAngle = -angleRange / 2;
                const angle = total > 1 ? startAngle + (i * (angleRange / (total - 1))) : 0;
                const radian = (angle - 90) * (Math.PI / 180);
                const radius = 900;
                
                const x = Math.cos(radian) * radius;
                const y = Math.sin(radian) * radius + radius;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: x * 0.7,
                      y: y * 0.12 + (card.y || 0),
                      rotate: angle * 0.25,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute group"
                    style={{ zIndex: 10 + i }}
                  >
                    {/* Green Clip */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-10 bg-green-500 rounded-sm shadow-md z-20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                    </div>

                    {/* Polaroid Card */}
                    <div className="bg-white p-3 pb-8 shadow-xl border border-black/5 w-40 md:w-48 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-12 group-hover:rotate-0 group-hover:z-50 group-hover:shadow-2xl">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(card.id);
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[60] shadow-lg hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className="overflow-hidden bg-zinc-100 mb-3 aspect-video">
                        <img 
                          src={card.image} 
                          alt={card.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-zinc-900 text-xs truncate">{card.title}</h3>
                        <p className="text-[9px] text-zinc-400 font-medium leading-tight line-clamp-2">{card.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          </div>
        </div>
      </div>
    </section>
  );
};

const WorkPage = () => {
  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#1A1A1A] selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
      <Helmet>
        <title>Work | Z Score - Premium Portfolio</title>
      </Helmet>

      {/* Subtle Grain Overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />

      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-black/5">
        <Link to="/" className="group flex items-center gap-3 text-zinc-500 hover:text-black transition-all">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Back to Home</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Visual/Graphic Designer</span>
          <img src="https://i.ibb.co/QjQxzsHp/Z-SCORE-LOGO.png" alt="Z Score Logo" className="h-6 w-auto brightness-0" referrerPolicy="no-referrer" loading="lazy" />
        </div>
      </nav>

      <HeroSection />

      <main className="pb-20 px-6 max-w-6xl mx-auto relative z-10">
        {/* Bento Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          {/* About Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-4 p-10 rounded-[2.5rem] bg-white shadow-sm border border-black/5 flex flex-col justify-between group hover:shadow-xl hover:shadow-black/5 transition-all duration-500"
          >
            <div>
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-8 border border-black/5 group-hover:bg-black group-hover:text-white transition-all duration-500">
                <Target size={24} />
              </div>
              <h2 className="text-3xl font-black mb-6 tracking-tight">The <span className="text-blue-600">Vision</span></h2>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                A graphic designer hailing from Pakistan with <span className="font-bold text-black underline decoration-blue-500/30 decoration-4 underline-offset-4">+4 years of experience</span>. I don't just create visuals; I build identities that command attention and drive results.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {['Strategy', 'Execution', 'Results'].map((skill) => (
                <span key={skill} className="px-4 py-2 bg-zinc-50 border border-black/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:border-blue-500/20 group-hover:text-blue-600 transition-all duration-500">
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-5 relative rounded-[2.5rem] bg-zinc-200 overflow-hidden min-h-[400px] group shadow-xl shadow-black/5"
          >
            <motion.img 
              src="https://i.ibb.co/qXFY4XD/dposa-s.png" 
              alt="Profile" 
              className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
            <div className="absolute bottom-8 left-8 right-8 text-white transform transition-transform duration-700 group-hover:translate-y-[-10px]">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 mb-2"
              >
                <div className="w-8 h-[1px] bg-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">The Architect</span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter">Zeeshan <br />Ali</h1>
              <p className="text-white/80 text-sm mt-3 font-medium flex items-center gap-2">
                <Zap size={14} className="text-blue-400" />
                Thumbnail Architect & Visual Strategist
              </p>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-3 p-10 rounded-[2.5rem] bg-black text-white shadow-xl shadow-black/10 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all duration-500"
          >
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-white/10"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={364}
                  initial={{ strokeDashoffset: 364 }}
                  animate={{ strokeDashoffset: 364 * 0.15 }}
                  transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                  className="text-blue-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black tracking-tighter">17</span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Years Old</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">Experience</p>
              <p className="text-sm font-medium text-white/60">Young & Driven</p>
            </div>
          </motion.div>
        </div>

        {/* Bento Middle Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          {/* Education & Skills */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-8 p-10 rounded-[2.5rem] bg-white shadow-sm border border-black/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-blue-600 font-bold text-2xl mb-8 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  Education
                </h3>
                <div className="space-y-8">
                  {[
                    { year: "2018-2021", title: "Visual Arts Foundation", loc: "Lahore, Pakistan" },
                    { year: "2021-2024", title: "Digital Media Design", loc: "Remote Academy" }
                  ].map((edu, i) => (
                    <div key={i} className="flex gap-6">
                      <span className="text-xs font-bold text-zinc-400 mt-1">{edu.year}</span>
                      <div>
                        <h4 className="font-bold text-sm">{edu.title}</h4>
                        <p className="text-xs text-zinc-500 mt-1">{edu.loc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-purple-600 font-bold text-2xl mb-8 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full" />
                  Software Skills
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: "Ps" },
                    { name: "Ai" },
                    { name: "Pr" },
                    { name: "Ae" },
                    { name: "Fi" },
                    { name: "Xd" },
                    { name: "Id" },
                    { name: "Cp" },
                  ].map((skill, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-zinc-50 text-zinc-900 flex items-center justify-center font-bold text-sm border border-black/5 hover:border-black/20 transition-all cursor-default">
                      {skill.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-4 p-8 rounded-[2.5rem] bg-white shadow-sm border border-black/5 flex flex-col justify-between"
          >
            <h3 className="text-zinc-900 font-bold text-2xl mb-8 flex items-center gap-2">
              <div className="w-2 h-2 bg-zinc-900 rounded-full" />
              Contact
            </h3>
            <div className="space-y-3">
              <a href="mailto:infozedscoreteam@gmail.com" className="flex items-center gap-4 p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group border border-black/5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-105 transition-transform">
                  <Globe size={14} className="text-zinc-900" />
                </div>
                <span className="text-xs font-bold truncate">infozedscoreteam@gmail.com</span>
              </a>
              <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-xl border border-black/5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-black/5">
                  <Users size={14} className="text-zinc-900" />
                </div>
                <span className="text-xs font-bold">zscore_pix</span>
              </div>
            </div>
            <button className="w-full mt-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group">
              Let's Talk
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Live Thumbnails Section */}
        <ThumbnailGallery />

        {/* Behind The Scenes Section */}
        <BehindTheScenes />

        <Reviews />
        <TrustedClients />

        {/* Behance Redirect Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-24 p-12 rounded-[3rem] bg-white border border-black/5 text-center relative overflow-hidden group shadow-sm"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000 text-blue-600">
            <ExternalLink size={200} />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-[#1A1A1A]">Full Portfolio</h2>
          <p className="text-zinc-500 text-lg mb-10 max-w-xl mx-auto font-medium">
            Explore 200+ thumbnails and psychological case studies hosted exclusively on Behance.
          </p>
          <a 
            href="https://www.behance.net/gallery/242444841/Thumbnail-portfolio-2026-ZefuryZ-score"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-black text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl"
          >
            Explore on Behance
            <ExternalLink size={18} />
          </a>
        </motion.div>
      </main>

      <footer className="py-12 px-6 text-center">
        <p className="text-zinc-400 text-[10px] uppercase tracking-[0.3em] font-bold">
          © 2026 Z Score Design. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default WorkPage;
