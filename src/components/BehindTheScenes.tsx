import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Upload, Loader2, Image as ImageIcon, Send, Sparkles, ChevronRight, ChevronLeft, Layout, Workflow, FileText, ExternalLink, Wand2, MessageSquare, User, Quote, Star, CheckCircle2, CheckCheck, Video, Phone, Mic, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ZSpinner, ZSkeleton } from './ZLoading';
import { useAdmin } from '../hooks/useAdmin';
import { useFirestoreStatus } from '../hooks/useFirestoreStatus';
import { db, auth, handleFirestoreError, OperationType, getDocsCached, clearCache } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ConfirmModal } from './ConfirmModal';

import { PushPin } from './PushPin';

import { toast } from 'sonner';

interface BTSContent {
  id: string;
  title: string;
  category?: string;
  videoTitle?: string;
  description?: string;
  layoutIdea?: string;
  designWorkflow?: string;
  caseStudy?: string;
  clientFeedback?: string;
  whatsappChat?: { role: 'client' | 'designer'; text: string; time: string; isVoice?: boolean; duration?: string }[];
  imageUrl: string;
  clientName?: string;
  clientPhoto?: string;
  beforeImages?: string[];
  afterImages?: string[];
  createdAt: Timestamp;
}

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<string> => {
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
      
      // Try to get a size under 80KB to avoid Firestore 1MB document limit when multiple images are present
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);
      
      // If still too large, reduce quality further
      while (result.length > 80000 && currentQuality > 0.1) {
        currentQuality -= 0.05;
        result = canvas.toDataURL('image/jpeg', currentQuality);
      }
      
      resolve(result);
    };
  });
};

const BeforeAfterSlider = ({ before, after }: { before: string, after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video rounded-[2.5rem] overflow-hidden cursor-ew-resize select-none border border-black/5 shadow-2xl"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img src={after} className="absolute inset-0 w-full h-full object-cover" alt="After" referrerPolicy="no-referrer" />
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img src={before} className="absolute inset-0 w-full h-full object-cover" alt="Before" referrerPolicy="no-referrer" />
      </div>
      
      {/* Slider Line */}
      <div 
        className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center">
          <ChevronLeft size={14} className="text-zinc-400" />
          <ChevronRight size={14} className="text-zinc-400" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-widest rounded-full">Before</div>
      <div className="absolute bottom-6 right-6 px-3 py-1 bg-blue-600/80 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-widest rounded-full">After</div>
    </div>
  );
};

const BTSItem = ({ content, i, isAdmin, handleDelete, setSelectedContent, setCurrentImageIndex }: { 
  content: BTSContent, 
  i: number, 
  isAdmin: boolean, 
  handleDelete: (id: string) => void,
  setSelectedContent: (content: BTSContent) => void,
  setCurrentImageIndex: (index: number) => void
}) => {
  const pinColors = ["#FF6321", "#3B82F6", "#8B5CF6", "#10B981"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, rotate: 0, y: 50 }}
      whileInView={{ 
        opacity: 1, 
        scale: 1, 
        rotate: [2, -2, 1, -1][i % 4],
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
      onClick={() => {
        setSelectedContent(content);
        setCurrentImageIndex(0);
      }}
      className="relative p-8 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-xl w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] max-w-sm mx-auto group hover:z-30 transition-all cursor-pointer border border-black/[0.02] hover:border-blue-600/20"
    >
      <PushPin color={pinColors[i % pinColors.length]} />
      <div className="absolute inset-0 noise-bg rounded-xl opacity-[0.03]" />
      
      <div className="space-y-6 relative z-10">
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

        <div className="aspect-video relative overflow-hidden bg-zinc-100 rounded-2xl border border-black/[0.03]">
          <AnimatePresence mode="wait">
            <motion.img
              key={content.imageUrl}
              src={content.imageUrl}
              alt={content.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full h-full object-cover transition-transform duration-1000"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </AnimatePresence>
          
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(content.id);
              }}
              className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-xl font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate">
            {content.title}
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {content.category || 'Case Study'}
            </p>
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
            >
              Process
            </motion.span>
          </div>
        </div>

        {/* Before/After Preview */}
        {(content.beforeImages || content.afterImages) && (
          <div className="grid grid-cols-2 gap-3 pt-2 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center z-10 border border-black/5">
              <Sparkles size={10} className="text-blue-600" />
            </div>
            {content.beforeImages && content.beforeImages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Before</span>
                <div className="aspect-video rounded-lg overflow-hidden border border-black/5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
                  <img 
                    src={content.beforeImages[0]} 
                    className="w-full h-full object-cover" 
                    alt="Before" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {content.afterImages && content.afterImages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-blue-600">After</span>
                <div className="aspect-video rounded-lg overflow-hidden border border-blue-600/20 shadow-lg shadow-blue-600/5">
                  <img 
                    src={content.afterImages[0]} 
                    className="w-full h-full object-cover" 
                    alt="After" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const BehindTheScenes = () => {
  const isConnected = useFirestoreStatus();
  const [contents, setContents] = useState<BTSContent[]>([]);
  const { isAdmin } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<BTSContent | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [description, setDescription] = useState('');
  const [layoutIdea, setLayoutIdea] = useState('');
  const [designWorkflow, setDesignWorkflow] = useState('');
  const [caseStudy, setCaseStudy] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhoto, setClientPhoto] = useState<string | null>(null);
  const [whatsappChat, setWhatsappChat] = useState<{ role: 'client' | 'designer'; text: string; time: string; isVoice?: boolean; duration?: string }[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({});
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

  const seedBTS = async () => {
    if (!isAdmin) return;
    const toastId = toast.loading('Seeding sample case studies...');
    try {
      const sampleData = [
        {
          title: "Gaming Channel Rebrand 2024",
          description: "Complete visual overhaul for a top-tier gaming channel, focusing on high-energy aesthetics and brand consistency.",
          mainImage: "https://picsum.photos/seed/game1/1200/800",
          beforeImages: ["https://picsum.photos/seed/game_old/800/600"],
          afterImages: ["https://picsum.photos/seed/game_new/800/600"],
          clientName: "Alex 'ProGamer' Rivers",
          clientPhoto: "https://picsum.photos/seed/alex/200/200",
          layout: "Dynamic & Bold",
          workflow: "Concept Art -> 3D Modeling -> UI Integration -> Final Polish",
          feedback: "The new look has completely changed how my audience perceives the brand. Engagement is up 30%!",
          whatsappChat: [
            { role: 'client', text: "Yo! The new channel art is insane. Everyone is loving it!", time: "11:20 AM" },
            { role: 'designer', text: "That's awesome to hear, Alex! We really wanted to capture that high-energy vibe.", time: "11:25 AM" },
            { role: 'client', isVoice: true, duration: "0:18", time: "11:30 AM" },
            { role: 'designer', text: "Haha, glad you're hyped! Let's get those thumbnails started next.", time: "11:35 AM" }
          ],
          createdAt: serverTimestamp()
        },
        {
          title: "Minimalist Tech Review Aesthetic",
          description: "Clean, minimalist aesthetic for high-end tech reviews, emphasizing product details and clarity.",
          mainImage: "https://picsum.photos/seed/tech1/1200/800",
          beforeImages: ["https://picsum.photos/seed/tech_old/800/600"],
          afterImages: ["https://picsum.photos/seed/tech_new/800/600"],
          clientName: "TechFocus Reviews",
          clientPhoto: "https://picsum.photos/seed/techfocus/200/200",
          layout: "Clean & Structured",
          workflow: "Style Guide -> Layout Design -> Color Grading -> Final Export",
          feedback: "The minimalism really lets the products shine. Exactly what we were looking for.",
          whatsappChat: [
            { role: 'client', text: "The new layout is perfect. Very clean.", time: "2:00 PM" },
            { role: 'designer', text: "Great! We kept the white space intentional to focus on the product shots.", time: "2:05 PM" },
            { role: 'client', text: "Exactly. It feels much more premium now.", time: "2:10 PM" }
          ],
          createdAt: serverTimestamp()
        }
      ];

      for (const data of sampleData) {
        await addDoc(collection(db, 'behind_the_scenes'), data);
      }

      clearCache('bts_limit_10');
      await fetchBTS(true);
      toast.success('Detailed sample data seeded!', { id: toastId });
    } catch (err) {
      toast.error('Failed to seed data', { id: toastId });
      handleFirestoreError(err, OperationType.CREATE, 'behind_the_scenes');
    }
  };

  const fetchBTS = async (force = false) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'behind_the_scenes'), 
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const data = await getDocsCached(q, 'bts_limit_10', force);
      setContents(data as BTSContent[]);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'behind_the_scenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBTS();
  }, []);

  const handleImageUpload = async (files: FileList | null, type: 'main' | 'before' | 'after') => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const compressedImages: string[] = [];

    for (const file of fileArray) {
      const reader = new FileReader();
      const compressed = await new Promise<string>((resolve) => {
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const comp = await compressImage(base64);
          resolve(comp);
        };
        reader.readAsDataURL(file);
      });
      compressedImages.push(compressed);
    }

    if (type === 'main') setImage(compressedImages[0]);
    if (type === 'before') setBeforeImages(prev => [...prev, ...compressedImages]);
    if (type === 'after') {
      setAfterImages(prev => [...prev, ...compressedImages]);
      if (!image && compressedImages.length > 0) setImage(compressedImages[0]);
    }
  };

  const handleDrag = (e: React.DragEvent, type: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: active }));
  };

  const handleDrop = (e: React.DragEvent, type: 'main' | 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files, type);
    }
  };

  const generateCaseStudy = async () => {
    if (beforeImages.length === 0 && afterImages.length === 0 && !image) {
      setError('Please upload at least one image first.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [
        { text: `
          Analyze the provided images (Before/After/Main) and generate a complete, high-quality design case study for a YouTube thumbnail portfolio.
          
          Return the response in JSON format with the following fields:
          - title: A short, catchy, high-conversion project title (max 40 chars).
          - videoTitle: A realistic YouTube video title that this thumbnail would be for.
          - description: A compelling 1-2 sentence summary of the project goals and results.
          - layoutIdea: Explain the psychological triggers used in the layout (e.g., rule of thirds, focal points, color contrast).
          - designWorkflow: A detailed 4-5 step breakdown of the technical process (e.g., color grading, masking, typography selection).
          - caseStudy: A comprehensive case study in Markdown. Use headings (###), bold text, and bullet points. Include sections for "The Challenge", "The Solution", and "The Result".
          - clientFeedback: A realistic, enthusiastic testimonial from a content creator.
          - clientName: A realistic name for the client (e.g., "Alex Rivers", "TechVibe Studio").
          - whatsappChat: An array of 5-6 messages simulating a real WhatsApp conversation. 
            - Use natural language, emojis, and professional yet friendly tone.
            - Include a message where the client asks for a small revision and the designer handles it perfectly.
            - The last message must be the designer sending the final file.
            - Randomly include one voice message (isVoice: true, duration: "0:15") from either client or designer.
          
          Tone: Professional, expert, and results-oriented.
          
          If only one image is provided, assume it's the final result and imagine the process.
          If before/after are provided, focus on the dramatic transformation.
        `}
      ];

      if (beforeImages.length > 0) {
        parts.push({
          inlineData: {
            data: beforeImages[0].split(',')[1],
            mimeType: "image/jpeg"
          }
        });
        parts.push({ text: "This is a 'Before' image." });
      }

      if (afterImages.length > 0) {
        parts.push({
          inlineData: {
            data: afterImages[0].split(',')[1],
            mimeType: "image/jpeg"
          }
        });
        parts.push({ text: "This is an 'After' image." });
      }

      if (image && afterImages.length === 0) {
        parts.push({
          inlineData: {
            data: image.split(',')[1],
            mimeType: "image/jpeg"
          }
        });
        parts.push({ text: "This is the main project image." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              videoTitle: { type: Type.STRING },
              description: { type: Type.STRING },
              layoutIdea: { type: Type.STRING },
              designWorkflow: { type: Type.STRING },
              caseStudy: { type: Type.STRING },
              clientFeedback: { type: Type.STRING },
              clientName: { type: Type.STRING },
              whatsappChat: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING, enum: ['client', 'designer'] },
                    text: { type: Type.STRING },
                    time: { type: Type.STRING },
                    isVoice: { type: Type.BOOLEAN },
                    duration: { type: Type.STRING }
                  },
                  required: ["role", "text", "time"]
                }
              }
            },
            required: ["title", "videoTitle", "description", "layoutIdea", "designWorkflow", "caseStudy", "clientFeedback", "whatsappChat", "clientName"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      if (result.title) setTitle(result.title);
      if (result.videoTitle) setVideoTitle(result.videoTitle);
      if (result.description) setDescription(result.description);
      if (result.layoutIdea) setLayoutIdea(result.layoutIdea);
      if (result.designWorkflow) setDesignWorkflow(result.designWorkflow);
      if (result.caseStudy) setCaseStudy(result.caseStudy);
      if (result.clientFeedback) setClientFeedback(result.clientFeedback);
      if (result.clientName) setClientName(result.clientName);
      if (result.whatsappChat) setWhatsappChat(result.whatsappChat);
      
    } catch (err) {
      console.error('Error generating case study:', err);
      setError('AI generation failed. Please try again or fill manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !title) return;

    // Check total size of images to avoid Firestore 1MB limit
    const totalSize = (image?.length || 0) + 
                     (beforeImages.reduce((acc, img) => acc + img.length, 0)) + 
                     (afterImages.reduce((acc, img) => acc + img.length, 0));
    
    // Base64 is ~33% larger than binary. 1MB binary is ~1.33MB base64.
    // We'll be conservative and limit to 1.2MB total base64.
    if (totalSize > 1200000) {
      setError('Total image size is too large. Please remove some images or use smaller ones.');
      toast.error('Total image size exceeds limit');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const toastId = toast.loading('Uploading case study...');
    try {
      const docRef = await addDoc(collection(db, 'behind_the_scenes'), {
        title,
        videoTitle: videoTitle || null,
        description: description || null,
        layoutIdea: layoutIdea || null,
        designWorkflow: designWorkflow || null,
        caseStudy: caseStudy || null,
        clientFeedback: clientFeedback || null,
        clientName: clientName || null,
        clientPhoto: clientPhoto || null,
        whatsappChat: whatsappChat.length > 0 ? whatsappChat : null,
        imageUrl: image,
        beforeImages: beforeImages.length > 0 ? beforeImages : null,
        afterImages: afterImages.length > 0 ? afterImages : null,
        createdAt: serverTimestamp(),
      });
      
      // Update local state immediately
      const newBTS: BTSContent = {
        id: docRef.id,
        title,
        videoTitle: videoTitle || undefined,
        description: description || undefined,
        layoutIdea: layoutIdea || undefined,
        designWorkflow: designWorkflow || undefined,
        caseStudy: caseStudy || undefined,
        clientFeedback: clientFeedback || undefined,
        clientName: clientName || undefined,
        clientPhoto: clientPhoto || undefined,
        whatsappChat: whatsappChat.length > 0 ? whatsappChat : undefined,
        imageUrl: image,
        beforeImages: beforeImages.length > 0 ? beforeImages : undefined,
        afterImages: afterImages.length > 0 ? afterImages : undefined,
        createdAt: Timestamp.now(),
      };
      setContents(prev => [newBTS, ...prev]);
      
      // Clear cache
      clearCache('bts_limit_10');
      
      setTitle('');
      setVideoTitle('');
      setDescription('');
      setLayoutIdea('');
      setDesignWorkflow('');
      setCaseStudy('');
      setClientFeedback('');
      setClientName('');
      setClientPhoto(null);
      setWhatsappChat([]);
      setImage(null);
      setBeforeImages([]);
      setAfterImages([]);
      setShowForm(false);
      toast.success('Case study uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Error adding BTS content:', err);
      toast.error('Failed to upload case study', { id: toastId });
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('insufficient permissions')) {
        setError('Permission denied. Please make sure you are logged in as admin.');
      } else if (msg.includes('quota')) {
        setError('Daily limit reached. Please try again tomorrow.');
      } else {
        setError('Failed to add content. The images might still be too large (max 1MB total) or there was a connection issue.');
      }
      handleFirestoreError(err, OperationType.CREATE, 'behind_the_scenes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Case Study?',
      message: 'Are you sure you want to delete this case study? This action cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        const toastId = toast.loading('Deleting case study...');
        try {
          await deleteDoc(doc(db, 'behind_the_scenes', id));
          
          // Update local state
          setContents(prev => prev.filter(c => c.id !== id));
          
          // Clear cache
          clearCache('bts_limit_10');
          
          toast.success('Case study deleted', { id: toastId });
        } catch (err) {
          console.error('Error deleting BTS content:', err);
          toast.error('Failed to delete case study', { id: toastId });
          handleFirestoreError(err, OperationType.DELETE, `behind_the_scenes/${id}`);
        }
      }
    });
  };

  const getCarouselImages = (content: BTSContent) => {
    const images = [{ url: content.imageUrl, label: 'Final Result' }];
    if (content.beforeImages) {
      content.beforeImages.forEach((url, i) => images.push({ url, label: `Before ${i + 1}` }));
    }
    if (content.afterImages) {
      content.afterImages.forEach((url, i) => images.push({ url, label: `After ${i + 1}` }));
    }
    return images;
  };

  const carouselImages = selectedContent ? getCarouselImages(selectedContent) : [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <ZSpinner size={32} />
      </div>
    );
  }

  return (
    <section className="mt-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-[1px] bg-blue-600" />
            <span className="text-blue-600 font-bold text-xs uppercase tracking-[0.3em]">Behind The Scenes</span>
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter">
            Case <span className="text-blue-600">Studies.</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchBTS(true)}
            className="p-4 bg-white border border-black/5 rounded-2xl hover:bg-zinc-50 transition-all shadow-sm group"
            title="Refresh Content"
          >
            {loading ? <ZSpinner size={20} /> : <Loader2 size={20} className="text-zinc-400 group-hover:text-blue-600 transition-colors" />}
          </button>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-3 px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                Add Case Study
              </button>
              {showForm && (
                <button 
                  onClick={() => {
                    setTitle('');
                    setVideoTitle('');
                    setDescription('');
                    setLayoutIdea('');
                    setDesignWorkflow('');
                    setCaseStudy('');
                    setClientFeedback('');
                    setWhatsappChat([]);
                    setImage(null);
                    setBeforeImages([]);
                    setAfterImages([]);
                    setError(null);
                  }}
                  className="p-4 bg-white border border-red-100 rounded-2xl hover:bg-red-50 transition-all shadow-sm group text-red-400 hover:text-red-600"
                  title="Clear Form"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* BTS Grid */}
      {/* Offline Warning */}
      {!isConnected && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 text-orange-700 max-w-5xl mx-auto"
        >
          <AlertCircle size={20} />
          <div className="text-xs font-bold uppercase tracking-widest">
            Database is currently offline. Showing cached data if available.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="ml-auto px-4 py-2 bg-orange-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-orange-700 transition-all"
          >
            Reconnect
          </button>
        </motion.div>
      )}

      <div className="flex flex-wrap justify-center gap-12">
        {loading && contents.length === 0 ? (
          <div className="flex flex-wrap justify-center gap-12 w-full">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] max-w-sm bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-6 border border-black/[0.02]">
                <ZSkeleton className="aspect-video rounded-2xl" />
                <div className="space-y-3">
                  <ZSkeleton className="h-6 w-3/4 rounded-lg" />
                  <div className="flex items-center justify-between pt-2">
                    <ZSkeleton className="h-3 w-1/4 rounded-full" />
                    <ZSkeleton className="h-3 w-1/6 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contents.length === 0 && !loading ? (
          <div className="w-full py-20 bg-zinc-50 border border-dashed border-zinc-200 rounded-[3rem] text-center">
            <div className="w-16 h-16 bg-white shadow-sm text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No case studies yet</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8">This section is currently empty. If you are an admin, you can add new content using the button above.</p>
            {isAdmin && (
              <button 
                onClick={seedBTS}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Sparkles size={18} />
                Seed Sample Data
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {contents.map((content, i) => (
              <BTSItem 
                key={content.id}
                content={content}
                i={i}
                isAdmin={isAdmin}
                handleDelete={handleDelete}
                setSelectedContent={setSelectedContent}
                setCurrentImageIndex={setCurrentImageIndex}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Content Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <AnimatePresence>
        {selectedContent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContent(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedContent(null)}
                className="absolute top-6 right-6 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-black transition-colors shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Left Side: Visuals */}
              <div className="w-full md:w-1/2 bg-zinc-50 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-8 relative">
                <div className="absolute inset-0 noise-bg opacity-[0.02] pointer-events-none" />
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowComparison(false)}
                        className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${!showComparison ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-zinc-400 hover:text-zinc-600'}`}
                      >
                        Gallery
                      </button>
                      {selectedContent.beforeImages && selectedContent.afterImages && (
                        <button 
                          onClick={() => setShowComparison(true)}
                          className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${showComparison ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-zinc-400 hover:text-zinc-600'}`}
                        >
                          Comparison
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {showComparison ? 'Interactive Slider' : `${currentImageIndex + 1} / ${carouselImages.length}`}
                    </span>
                  </div>
                  
                  {showComparison && selectedContent.beforeImages && selectedContent.afterImages ? (
                    <BeforeAfterSlider 
                      before={selectedContent.beforeImages[0]} 
                      after={selectedContent.afterImages[0]} 
                    />
                  ) : (
                    <div className="relative group/carousel aspect-video rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-600/10 border border-black/5 bg-black">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentImageIndex}
                          src={carouselImages[currentImageIndex]?.url}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="w-full h-full object-contain"
                          alt={carouselImages[currentImageIndex]?.label}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      </AnimatePresence>

                      {carouselImages.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/carousel:opacity-100"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/carousel:opacity-100"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Carousel Thumbnails */}
                  {!showComparison && carouselImages.length > 1 && (
                    <div className="flex gap-3 justify-center">
                      {carouselImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                            currentImageIndex === idx ? 'border-blue-600 scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" alt={img.label} referrerPolicy="no-referrer" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Before/After Comparison Grid (Keep as secondary view) */}
                {selectedContent.beforeImages && selectedContent.afterImages && (
                  <div className="pt-12 border-t border-black/5">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Side-by-Side Comparison</h4>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-200" />
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="px-4 py-2 bg-zinc-100 text-zinc-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-black/5">Before</span>
                          <div className="flex-grow h-[1px] bg-zinc-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          {selectedContent.beforeImages.map((img, idx) => (
                            <div key={idx} className="aspect-video rounded-[2.5rem] overflow-hidden border border-black/5 shadow-xl shadow-black/5 hover:scale-[1.02] transition-transform duration-500">
                              <img src={img} className="w-full h-full object-cover" alt={`Before ${idx + 1}`} referrerPolicy="no-referrer" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="px-4 py-2 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest rounded-full border border-blue-100">After</span>
                          <div className="flex-grow h-[1px] bg-blue-50" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          {selectedContent.afterImages.map((img, idx) => (
                            <div key={idx} className="aspect-video rounded-[2.5rem] overflow-hidden border border-blue-600/10 shadow-2xl shadow-blue-600/5 hover:scale-[1.02] transition-transform duration-500">
                              <img src={img} className="w-full h-full object-cover" alt={`After ${idx + 1}`} referrerPolicy="no-referrer" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Content */}
              <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar p-8 md:p-12 bg-white flex flex-col">
                <div className="max-w-xl flex-grow">
                  <div className="space-y-4 mb-10">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg shadow-blue-600/20">
                        Case Study
                      </span>
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                        {selectedContent.createdAt ? (
                          (() => {
                            const rawDate = selectedContent.createdAt as any;
                            const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
                            return date.toLocaleDateString();
                          })()
                        ) : 'Recent Project'}
                      </span>
                    </div>
                    <h2 className="text-5xl font-black text-[#1A1A1A] leading-[0.9] tracking-tighter uppercase">
                      {selectedContent.title}
                    </h2>
                    {selectedContent.videoTitle && (
                      <p className="text-blue-600 font-bold flex items-center gap-2 text-sm">
                        <ExternalLink className="w-4 h-4" />
                        {selectedContent.videoTitle}
                      </p>
                    )}
                  </div>

                  {selectedContent.description && (
                    <div className="mb-12 relative">
                      <div className="absolute -left-6 top-0 w-1 h-full bg-blue-600/10 rounded-full" />
                      <p className="text-zinc-500 text-xl leading-relaxed font-medium italic">
                        "{selectedContent.description}"
                      </p>
                    </div>
                  )}

                  {/* WhatsApp Chat Simulation */}
                  {selectedContent.whatsappChat && (
                    <div className="mb-12 space-y-4">
                      <div className="flex items-center gap-3 text-green-600 mb-6">
                        <MessageSquare className="w-5 h-5" />
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Client Approval Chat</h4>
                      </div>
                      <div className="bg-[#E5DDD5] rounded-[2.5rem] overflow-hidden border border-black/5 shadow-xl relative">
                        {/* WhatsApp Header */}
                        <div className="bg-[#075E54] p-4 flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                              <img 
                                src={selectedContent.clientPhoto || "https://i.ibb.co/qXFY4XD/dposa-s.png"} 
                                alt="Client" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-bold">{selectedContent.clientName || "Client"} (Verified)</div>
                              <div className="text-[10px] opacity-70 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                online
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 opacity-70">
                            <Video size={18} />
                            <Phone size={18} />
                            <X className="w-5 h-5 cursor-pointer" onClick={() => setSelectedContent(null)} />
                          </div>
                        </div>
                        {/* Chat Area */}
                        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar bg-[#e5ddd5] relative">
                          <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat mix-blend-multiply" />
                          
                          {selectedContent.whatsappChat.map((msg, idx) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              whileInView={{ opacity: 1, y: 0, scale: 1 }}
                              key={idx}
                              className={`flex ${msg.role === 'client' ? 'justify-start' : 'justify-end'} relative z-10`}
                            >
                              <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm relative ${
                                msg.role === 'client' 
                                  ? 'bg-white text-zinc-800 rounded-tl-none' 
                                  : 'bg-[#dcf8c6] text-zinc-800 rounded-tr-none'
                              }`}>
                                {/* Tail */}
                                <div className={`absolute top-0 w-4 h-4 ${
                                  msg.role === 'client' 
                                    ? 'left-[-8px] bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]' 
                                    : 'right-[-8px] bg-[#dcf8c6] [clip-path:polygon(0_0,100%_0,0_100%)]'
                                }`} />
                                
                                {msg.isVoice ? (
                                  <div className="flex items-center gap-3 min-w-[220px] py-2">
                                    <div className="relative">
                                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-black/5">
                                        <Mic size={20} />
                                      </div>
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                      </div>
                                    </div>
                                    <div className="flex-grow space-y-2">
                                      <div className="flex items-end gap-0.5 h-6">
                                        {[...Array(18)].map((_, i) => (
                                          <motion.div 
                                            key={i} 
                                            animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                                            transition={{ repeat: Infinity, duration: 1 + Math.random(), delay: i * 0.05 }}
                                            className={`w-0.5 rounded-full ${i < 6 ? 'bg-blue-500' : 'bg-zinc-300'}`} 
                                          />
                                        ))}
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-zinc-400 tracking-tighter">{msg.duration || "0:15"}</span>
                                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Voice Note</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm leading-relaxed pr-12">{msg.text}</p>
                                )}
                                <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                  <span className="text-[9px] text-zinc-400">{msg.time}</span>
                                  {msg.role === 'designer' && <CheckCheck size={12} className="text-blue-500" />}
                                </div>
                              </div>
                            </motion.div>
                          ))}

                          {/* Final Thumbnail Message */}
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-end relative z-10"
                          >
                            <div className="max-w-[85%] p-2 bg-[#dcf8c6] rounded-2xl rounded-tr-none shadow-sm relative">
                              <div className="absolute top-0 right-[-8px] bg-[#dcf8c6] w-4 h-4 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                              <div className="rounded-xl overflow-hidden border border-black/5 mb-1">
                                <img 
                                  src={selectedContent.imageUrl} 
                                  alt="Final Thumbnail" 
                                  className="w-full h-auto max-h-60 object-cover"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              </div>
                              <div className="px-2 pb-1 flex items-center justify-between gap-4">
                                <span className="text-[10px] font-medium text-zinc-500">Final_Thumbnail_v1.jpg</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-zinc-400">
                                    {selectedContent.whatsappChat[selectedContent.whatsappChat.length - 1]?.time || "Just now"}
                                  </span>
                                  <CheckCheck size={12} className="text-blue-500" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Client Feedback Card */}
                  {selectedContent.clientFeedback && (
                    <div className="mb-12 group">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden">
                        <Quote className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <p className="text-lg font-bold leading-relaxed mb-6">
                            "{selectedContent.clientFeedback}"
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                              {selectedContent.clientPhoto ? (
                                <img src={selectedContent.clientPhoto} alt={selectedContent.clientName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <CheckCircle2 className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-widest">{selectedContent.clientName || "Verified Client"}</div>
                              <div className="text-[10px] opacity-70">Project Success</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-10">
                    {selectedContent.layoutIdea && (
                      <div className="space-y-4 group">
                        <div className="flex items-center gap-3 text-blue-600">
                          <Layout className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">The Vision</h4>
                        </div>
                        <div className="text-zinc-600 leading-relaxed bg-zinc-50 p-8 rounded-[2.5rem] border border-black/5 shadow-inner">
                          {selectedContent.layoutIdea}
                        </div>
                      </div>
                    )}

                    {selectedContent.designWorkflow && (
                      <div className="space-y-4 group">
                        <div className="flex items-center gap-3 text-blue-600">
                          <Workflow className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Process</h4>
                        </div>
                        <div className="text-zinc-600 leading-relaxed bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-600/5">
                          {selectedContent.designWorkflow}
                        </div>
                      </div>
                    )}

                    {selectedContent.caseStudy && (
                      <div className="space-y-8 pt-10 border-t border-black/5">
                        <div className="flex items-center gap-3 text-blue-600">
                          <FileText className="w-5 h-5" />
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Deep Dive</h4>
                        </div>
                        <div className="prose prose-zinc prose-sm max-w-none prose-headings:text-[#1A1A1A] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-zinc-600 prose-p:leading-relaxed prose-strong:text-blue-600 bg-white p-10 rounded-[3rem] border border-black/5 shadow-xl">
                          <ReactMarkdown>{selectedContent.caseStudy}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-black/5 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Zefury Creative Studio</span>
                  <span>© 2026</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 border border-black/5 shadow-2xl"
            >
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-8 right-8 text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-3xl font-bold mb-8 text-[#1A1A1A]">Add BTS Content</h3>

              <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">AI Magic Mode</h4>
                      <p className="text-[10px] text-blue-600 font-medium">Upload images first, then click generate!</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generateCaseStudy}
                    disabled={isGenerating || (beforeImages.length === 0 && afterImages.length === 0 && !image)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? <ZSpinner size={12} /> : <Sparkles className="w-3 h-3" />}
                    Generate All
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Project Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium"
                      placeholder="e.g. Cinematic Vlog Setup"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Video Title
                    </label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium"
                      placeholder="e.g. My Day in Tokyo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium"
                      placeholder="e.g. Alex Rivers"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Client Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex-grow flex items-center justify-center gap-2 py-4 px-6 bg-zinc-50 border border-dashed border-black/10 rounded-2xl hover:bg-zinc-100 transition-all cursor-pointer">
                        <Upload size={14} className="text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-400">{clientPhoto ? 'Photo Selected' : 'Upload Client Photo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const base64 = reader.result as string;
                                const compressed = await compressImage(base64, 200, 200, 0.7);
                                setClientPhoto(compressed);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                          className="hidden" 
                        />
                      </label>
                      {clientPhoto && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-black/5 relative group">
                          <img src={clientPhoto} alt="Client" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setClientPhoto(null)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium min-h-[100px]"
                    placeholder="Tell us more about this project..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Layout Idea
                    </label>
                    <textarea
                      value={layoutIdea}
                      onChange={(e) => setLayoutIdea(e.target.value)}
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium min-h-[80px]"
                      placeholder="The initial concept..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Design Workflow / Process
                    </label>
                    <textarea
                      value={designWorkflow}
                      onChange={(e) => setDesignWorkflow(e.target.value)}
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium min-h-[80px]"
                      placeholder="Step by step process..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Case Study
                    </label>
                  </div>
                  <textarea
                    value={caseStudy}
                    onChange={(e) => setCaseStudy(e.target.value)}
                    className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium min-h-[150px]"
                    placeholder="The full case study will appear here..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                    Client Feedback (Testimonial)
                  </label>
                  <textarea
                    value={clientFeedback}
                    onChange={(e) => setClientFeedback(e.target.value)}
                    className="w-full bg-zinc-50 border border-black/5 rounded-2xl px-6 py-4 text-[#1A1A1A] focus:outline-none focus:border-blue-600 transition-colors font-medium min-h-[80px]"
                    placeholder="Client's testimonial..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    WhatsApp Chat Simulation
                  </label>
                  <div className="space-y-3 bg-zinc-50 p-6 rounded-[2rem] border border-black/5">
                    {whatsappChat.map((msg, idx) => (
                      <div key={idx} className="flex gap-3 items-start group/msg">
                        <select 
                          value={msg.role}
                          onChange={(e) => {
                            const newChat = [...whatsappChat];
                            newChat[idx].role = e.target.value as 'client' | 'designer';
                            setWhatsappChat(newChat);
                          }}
                          className="bg-white border border-black/5 rounded-lg px-2 py-1 text-[10px] font-bold"
                        >
                          <option value="client">Client</option>
                          <option value="designer">Designer</option>
                        </select>
                        <input 
                          type="text"
                          value={msg.text}
                          onChange={(e) => {
                            const newChat = [...whatsappChat];
                            newChat[idx].text = e.target.value;
                            setWhatsappChat(newChat);
                          }}
                          className="flex-grow bg-white border border-black/5 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-blue-600"
                          placeholder={msg.isVoice ? "Voice message duration (e.g. 0:15)" : "Message text..."}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newChat = [...whatsappChat];
                            newChat[idx].isVoice = !newChat[idx].isVoice;
                            if (newChat[idx].isVoice) {
                              newChat[idx].duration = newChat[idx].text || "0:15";
                            }
                            setWhatsappChat(newChat);
                          }}
                          className={`p-2 rounded-xl transition-all ${msg.isVoice ? 'bg-blue-600 text-white' : 'bg-white text-zinc-400 border border-black/5'}`}
                          title="Toggle Voice Message"
                        >
                          <Mic size={14} />
                        </button>
                        <input 
                          type="text"
                          value={msg.time}
                          onChange={(e) => {
                            const newChat = [...whatsappChat];
                            newChat[idx].time = e.target.value;
                            setWhatsappChat(newChat);
                          }}
                          className="w-20 bg-white border border-black/5 rounded-xl px-2 py-2 text-[10px] font-mono"
                          placeholder="10:00 AM"
                        />
                        <button 
                          type="button"
                          onClick={() => setWhatsappChat(prev => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setWhatsappChat(prev => [...prev, { role: 'client', text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])}
                      className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      Add Message
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      Before Images (Bulk)
                    </label>
                    <div 
                      onDragEnter={(e) => handleDrag(e, 'before', true)}
                      onDragLeave={(e) => handleDrag(e, 'before', false)}
                      onDragOver={(e) => handleDrag(e, 'before', true)}
                      onDrop={(e) => handleDrop(e, 'before')}
                      className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all overflow-hidden bg-zinc-50 ${
                        dragActive['before'] ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-200 hover:border-blue-600/50'
                      }`}
                    >
                      {beforeImages.length > 0 ? (
                        <div className="p-4 grid grid-cols-3 gap-2 h-full overflow-y-auto custom-scrollbar">
                          {beforeImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-black/5 group/img">
                              <img src={img} className="w-full h-full object-cover" alt={`Before ${idx}`} referrerPolicy="no-referrer" loading="lazy" />
                              <button 
                                type="button" 
                                onClick={() => setBeforeImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-square rounded-lg border border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                            <Plus className="w-4 h-4 text-zinc-300" />
                            <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e.target.files, 'before')} className="hidden" />
                          </label>
                        </div>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                          <Upload className="w-4 h-4 text-zinc-300 mb-2" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Drag & Drop Before Images</span>
                          <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e.target.files, 'before')} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                      After Images (Bulk)
                    </label>
                    <div 
                      onDragEnter={(e) => handleDrag(e, 'after', true)}
                      onDragLeave={(e) => handleDrag(e, 'after', false)}
                      onDragOver={(e) => handleDrag(e, 'after', true)}
                      onDrop={(e) => handleDrop(e, 'after')}
                      className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all overflow-hidden bg-zinc-50 ${
                        dragActive['after'] ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-200 hover:border-blue-600/50'
                      }`}
                    >
                      {afterImages.length > 0 ? (
                        <div className="p-4 grid grid-cols-3 gap-2 h-full overflow-y-auto custom-scrollbar">
                          {afterImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-black/5 group/img">
                              <img src={img} className="w-full h-full object-cover" alt={`After ${idx}`} referrerPolicy="no-referrer" loading="lazy" />
                              <button 
                                type="button" 
                                onClick={() => setAfterImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-square rounded-lg border border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                            <Plus className="w-4 h-4 text-zinc-300" />
                            <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e.target.files, 'after')} className="hidden" />
                          </label>
                        </div>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                          <Upload className="w-4 h-4 text-zinc-300 mb-2" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Drag & Drop After Images</span>
                          <input type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e.target.files, 'after')} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                    Main Display Image (Required)
                  </label>
                  <div 
                    onDragEnter={(e) => handleDrag(e, 'main', true)}
                    onDragLeave={(e) => handleDrag(e, 'main', false)}
                    onDragOver={(e) => handleDrag(e, 'main', true)}
                    onDrop={(e) => handleDrop(e, 'main')}
                    className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden bg-zinc-50 ${
                      dragActive['main'] ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-200 hover:border-blue-600/50'
                    }`}
                  >
                    {image ? (
                      <>
                        <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                        <button
                          type="button"
                          onClick={() => setImage(null)}
                          className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Drag & Drop Main Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e.target.files, 'main')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !image || !title}
                  className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <ZSpinner size={20} />
                      Adding...
                    </>
                  ) : (
                    <>
                      Add Content
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
