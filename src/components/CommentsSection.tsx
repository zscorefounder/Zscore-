import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { Star, Send, User, MessageSquare, AlertCircle, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { ZSpinner } from './ZLoading';
import { useAdmin } from '../hooks/useAdmin';
import { toast } from 'sonner';

interface Comment {
  id: string;
  name: string;
  comment: string;
  rating: number;
  image?: string;
  createdAt: string;
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
      
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);
      while (result.length > 800000 && currentQuality > 0.1) {
        currentQuality -= 0.1;
        result = canvas.toDataURL('image/jpeg', currentQuality);
      }
      resolve(result);
    };
  });
};

export const CommentsSection = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdmin();
  
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 });

  useEffect(() => {
    fetchComments();
  }, [isInView]);

  const fetchComments = async () => {
    if (!isInView) return;
    try {
      const resp = await fetch('/api/comments');
      if (resp.ok) {
        const data = await resp.json();
        setComments(data);
      }
    } catch (e) {
      console.error("Fetch comments failed", e);
    } finally {
      setLoading(false);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        comment: comment.trim(),
        rating,
        image: image || undefined
      };

      const resp = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (resp.ok) {
        const result = await resp.json();
        setComments(prev => [result, ...prev]);
        setName('');
        setComment('');
        setImage(null);
        setRating(5);
        toast.success("Thanks for your feedback!");
      }
    } catch (e) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const resp = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        toast.success("Comment deleted");
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  return (
    <section ref={sectionRef} id="comments" className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mb-6 leading-tight uppercase tracking-tighter">
                CLIENT <span className="text-blue-600 block">FEEDBACK</span>
              </h2>
              <p className="text-zinc-600 text-lg leading-relaxed font-medium">
                Hear from creators who've elevated their YouTube presence with our professional designs.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="flex items-center gap-4 bg-zinc-50 p-6 rounded-2xl border border-zinc-100 shadow-sm"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center overflow-hidden">
                  <User size={20} className="text-zinc-400" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex text-amber-500 gap-0.5">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} fill="currentColor" />)}
              </div>
              <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-1">
                {comments.length}+ Happy Clients
              </p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              className="bg-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-600/20 transition-all duration-700" />
              
              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <MessageSquare className="text-blue-500" />
                Leave a Review
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`transition-all ${rating >= star ? 'text-amber-400 scale-110' : 'text-zinc-700 hover:text-zinc-500'}`}
                      >
                        <Star size={24} fill={rating >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl outline-none focus:border-blue-500 transition-all font-bold placeholder:text-zinc-600"
                  />

                  <textarea
                    placeholder="Your Feedback..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 text-white p-4 rounded-xl outline-none focus:border-blue-500 transition-all h-32 resize-none font-medium placeholder:text-zinc-600"
                  />

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group/upload">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover/upload:bg-zinc-700 transition-all">
                        {image ? <X size={20} className="text-red-400" onClick={(e) => { e.preventDefault(); setImage(null); }} /> : <ImageIcon size={20} />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover/upload:text-zinc-300">
                        {image ? 'Image Attached' : 'Attach Result'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {image && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-700">
                      <img src={image} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg backdrop-blur-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !name || !comment}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? <ZSpinner size={20} /> : (
                    <span className="flex items-center justify-center gap-2">
                      Send Review <Send size={14} />
                    </span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>

          {/* List */}
          <div className="lg:col-span-7">
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <ZSpinner size={40} />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading feedback...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="bg-zinc-50 rounded-3xl p-12 text-center border border-zinc-100">
                  <MessageSquare size={48} className="mx-auto text-zinc-200 mb-6" />
                  <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Be the first to leave a review!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {comments.map((cmt, idx) => (
                      <motion.div
                        key={cmt.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 bg-white border border-zinc-100 rounded-3xl group hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all relative"
                      >
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(cmt.id)}
                            className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-zinc-100 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-zinc-400 overflow-hidden">
                            {cmt.image ? <img src={cmt.image} className="w-full h-full object-cover" /> : cmt.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">{cmt.name}</h4>
                            <div className="flex text-amber-500 gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} fill={i <= cmt.rating ? "currentColor" : "none"} className={i > cmt.rating ? "text-zinc-200" : ""} />)}
                            </div>
                          </div>
                        </div>
                        <p className="text-zinc-600 text-sm leading-relaxed mb-4 italic">"{cmt.comment}"</p>
                        <div className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{new Date(cmt.createdAt).toLocaleDateString()}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
