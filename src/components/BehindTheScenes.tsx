import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Upload, Loader2, Image as ImageIcon, Send, Sparkles, ChevronRight, ChevronLeft, Layout, Workflow, FileText, ExternalLink, Wand2, MessageSquare, User, Quote, Star, CheckCircle2, CheckCheck, Video, Phone, Mic, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ZSpinner, ZSkeleton } from './ZLoading';
import { useAdmin } from '../hooks/useAdmin';
import { BTSDetailModal } from './BTSDetailModal';
import { PushPin } from './PushPin';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';

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
  beforeImageUrl?: string;
  clientName?: string;
  clientPhoto?: string;
  beforeImages?: string[];
  afterImages?: string[];
  createdAt: string;
}

const compressImage = async (base64Str: string, maxWidth = 1920, maxHeight = 1080, quality = 0.7): Promise<string> => {
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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

export const BehindTheScenes = () => {
  const [contents, setContents] = useState<BTSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdmin();
  const [selectedBTS, setSelectedBTS] = useState<BTSContent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [videoTitle, setVideoTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [layoutIdea, setLayoutIdea] = useState('');
  const [designWorkflow, setDesignWorkflow] = useState('');
  const [caseStudy, setCaseStudy] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');

  useEffect(() => {
    fetchBTS();
  }, []);

  const fetchBTS = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/bts');
      if (resp.ok) {
        const data = await resp.json();
        setContents(data);
      }
    } catch (e) {
      toast.error("Failed to load BTS data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after' = 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        if (type === 'after') {
          setImage(compressed);
          analyzeImage(compressed);
        } else {
          setBeforeImage(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("No API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { text: "Analyze this YouTube thumbnail creation. Provide a comprehensive professional design case study in JSON format. The JSON must include: 'title' (catchy project name), 'category', 'description' (short overview), 'layoutIdea', 'designWorkflow', 'caseStudy' (Markdown), 'clientName' (a realistic fake name), and 'clientFeedback' (a short raving testimonial). Make it sound professional." },
            { inlineData: { mimeType: "image/jpeg", data: base64.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              layoutIdea: { type: Type.STRING },
              designWorkflow: { type: Type.STRING },
              caseStudy: { type: Type.STRING },
              clientName: { type: Type.STRING },
              clientFeedback: { type: Type.STRING }
            }
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.title) setTitle(result.title);
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      if (result.layoutIdea) setLayoutIdea(result.layoutIdea);
      if (result.designWorkflow) setDesignWorkflow(result.designWorkflow);
      if (result.caseStudy) setCaseStudy(result.caseStudy);
      if (result.clientName) setClientName(result.clientName);
      if (result.clientFeedback) setClientFeedback(result.clientFeedback);
      
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !image || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = {
        title,
        category,
        videoTitle,
        description,
        imageUrl: image,
        beforeImageUrl: beforeImage,
        layoutIdea,
        designWorkflow,
        caseStudy,
        clientName,
        clientFeedback,
        id: `bts-${Date.now()}`
      };

      const resp = await fetch('/api/bts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (resp.ok) {
        const saved = await resp.json();
        setContents(prev => [saved, ...prev]);
        setShowForm(false);
        setTitle('');
        setImage(null);
        toast.success("BTS Project added successfully!");
      }
    } catch (e) {
      toast.error("Failed to save BTS");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete BTS Project?',
      message: 'This will permanently remove this case study from your records.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const resp = await fetch(`/api/bts/${id}`, { method: 'DELETE' });
          if (resp.ok) {
            setContents(prev => prev.filter(c => c.id !== id));
            toast.success("BTS Project deleted");
          }
        } catch (e) {
          toast.error("Failed to delete");
        }
      }
    });
  };

  return (
    <section id="process" className="py-24 px-6 bg-zinc-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter uppercase">
              BEHIND THE <span className="text-blue-600">SCENES</span>
            </h2>
            <p className="text-zinc-600 max-w-xl font-medium">
              A deep dive into my creative workflow and design thinking for each project.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-600/20"
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? 'Cancel' : 'New Project'}
              </button>
            )}
            <button 
              onClick={fetchBTS}
              className="p-3 bg-white border border-black/5 text-zinc-500 rounded-full hover:bg-zinc-100 transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-16 bg-white p-8 rounded-[2rem] border border-black/5 shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-video bg-zinc-100 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center relative overflow-hidden group">
                      {beforeImage ? (
                        <img src={beforeImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="mx-auto text-zinc-300 mb-2" size={24} />
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Before Image (RAW)</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>

                    <div className="aspect-video bg-zinc-100 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center relative overflow-hidden group">
                      {image ? (
                        <img src={image} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="mx-auto text-zinc-300 mb-2" size={24} />
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">After Image (Final)</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 p-4">
                          <ZSpinner size={24} />
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] animate-pulse text-center leading-relaxed">AI Analysis in Progress...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-zinc-50 p-4 rounded-xl outline-none focus:ring-2 ring-blue-500/20 transition-all font-bold text-sm" />
                    <select value={category} onChange={e => setCategory(e.target.value)} className="bg-zinc-50 p-4 rounded-xl outline-none font-bold text-xs uppercase tracking-widest">
                      {['Gaming', 'Finance', 'Tech', 'Vlog', 'Lifestyle', 'Entertainment', 'Education', 'Music', 'Travel', 'Food', 'Sports'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input type="text" placeholder="Video Title" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full bg-zinc-50 p-4 rounded-xl font-bold text-sm" />
                  <textarea placeholder="Brief Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-zinc-50 p-4 rounded-xl h-24 resize-none font-medium text-sm" />
                </div>

                <div className="space-y-6">
                  <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">The Layout Idea</h4>
                      <textarea value={layoutIdea} onChange={e => setLayoutIdea(e.target.value)} className="w-full bg-transparent outline-none text-sm font-medium h-20 resize-none" />
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">Design Workflow</h4>
                      <textarea value={designWorkflow} onChange={e => setDesignWorkflow(e.target.value)} className="w-full bg-transparent outline-none text-sm font-medium h-20 resize-none" />
                    </div>
                    <div className="p-4 bg-zinc-900 border border-black/5 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Full Case Study (Markdown Supported)</h4>
                      <textarea value={caseStudy} onChange={e => setCaseStudy(e.target.value)} className="w-full bg-transparent outline-none text-white text-sm font-medium h-40 resize-none" />
                    </div>
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Client Testimonial (AI Generated)</h4>
                      <input type="text" placeholder="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold mb-2" />
                      <textarea value={clientFeedback} onChange={e => setClientFeedback(e.target.value)} className="w-full bg-transparent outline-none text-sm font-medium h-20 resize-none italic" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting || !title || !image} className="w-full py-4 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">
                    {isSubmitting ? <ZSpinner size={20} /> : 'Save BTS Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <ZSkeleton key={i} className="aspect-video rounded-3xl" />)}
          </div>
        ) : contents.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-[3rem]">
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No BTS projects published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contents.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: i * 0.1, 
                  duration: 0.6, 
                  ease: "easeOut" 
                }}
                onClick={() => setSelectedBTS(item)}
                className="group relative bg-white p-5 rounded-[2.8rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_rgba(0,102,255,0.08)] transition-all duration-500 cursor-pointer border border-black/5 hover:-translate-y-2"
              >
                <div className="aspect-[4/3] rounded-[2.2rem] overflow-hidden mb-6 relative shadow-lg">
                  <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500 shadow-xl">
                      <ChevronRight className="text-black" size={20} />
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="absolute top-4 right-4 p-3 bg-white text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="px-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-blue-100">
                      {item.category || 'Case Study'}
                    </span>
                    {item.beforeImageUrl && (
                      <span className="px-2 py-0.5 bg-zinc-900 text-white text-[7px] font-black uppercase tracking-widest rounded transition-transform group-hover:scale-110">
                        Before & After
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Read Study</span>
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 group-hover:text-blue-600 transition-colors leading-tight tracking-tight uppercase">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-zinc-500 font-medium line-clamp-2 leading-relaxed opacity-80">{item.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedBTS && <BTSDetailModal content={selectedBTS} onClose={() => setSelectedBTS(null)} />}
      
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
