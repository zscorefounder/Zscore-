import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { Star, Send, User, MessageSquare, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { ZSpinner } from './ZLoading';
import { db, collection, addDoc, query, orderBy, serverTimestamp, handleFirestoreError, OperationType, limit, getDocsCached, isQuotaExceededError } from '../firebase';
import { useRef } from 'react';

interface Comment {
  id: string;
  name: string;
  comment: string;
  rating: number;
  image?: string;
  createdAt: any;
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
      
      // Try to get a size under 800KB (to account for base64 overhead)
      let currentQuality = quality;
      let result = canvas.toDataURL('image/jpeg', currentQuality);
      
      // If still too large, reduce quality further
      while (result.length > 1000000 && currentQuality > 0.1) {
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
  const [error, setError] = useState<string | null>(null);
  
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 });

  useEffect(() => {
    if (!isInView) return;

    const fetchComments = async () => {
      try {
        const q = query(
          collection(db, 'comments'), 
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const docs = await getDocsCached(q, 'comments_limit_20') as Comment[];
        setComments(docs);
      } catch (err) {
        if (isQuotaExceededError(err)) {
          console.warn("CommentsSection: Quota exceeded, using fallback via getDocsCached");
          return;
        }
        handleFirestoreError(err, OperationType.LIST, 'comments');
      }
    };

    fetchComments();
  }, [isInView]);

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
    setError(null);

    try {
      await addDoc(collection(db, 'comments'), {
        name: name.trim(),
        comment: comment.trim(),
        rating,
        image,
        createdAt: serverTimestamp()
      });
      setName('');
      setComment('');
      setRating(5);
      setImage(null);
    } catch (err) {
      setError('Failed to post comment. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="comments" ref={sectionRef} className="section-padding px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h3 className="text-neon-blue font-bold uppercase tracking-widest text-sm">Community</h3>
        <h2 className="text-4xl md:text-5xl font-display font-bold">Drop a <span className="text-gradient">Comment.</span></h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm">Share your thoughts or feedback with the Z Score community.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Comment Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 md:p-12 rounded-[2.5rem] border border-black/5 shadow-xl h-fit"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Your Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivers"
                  className="w-full bg-black/[0.02] border border-black/5 rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-neon-blue/50 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Rating</label>
              <div className="flex gap-2 ml-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={24}
                      className={`${star <= rating ? 'text-neon-blue fill-current' : 'text-zinc-200'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Your Comment</label>
              <div className="relative">
                <MessageSquare className="absolute left-5 top-6 text-zinc-400" size={18} />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full bg-black/[0.02] border border-black/5 rounded-2xl py-6 pl-14 pr-6 focus:outline-none focus:border-neon-blue/50 transition-all text-sm resize-none"
                  required
                />
              </div>
            </div>

            {image && (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-black/5">
                <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                <button 
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-4">
              <label className="flex items-center gap-2 text-zinc-500 hover:text-neon-blue cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest">
                <ImageIcon size={18} />
                <span>Add Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs ml-4">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-zinc-900 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <ZSpinner size={18} />
                  Posting...
                </>
              ) : (
                <>
                  Post Comment
                  <Send size={18} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Comments List */}
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {comments.length === 0 ? (
              <div className="text-center py-20 text-zinc-400 italic text-sm">
                No comments yet. Be the first to drop one!
              </div>
            ) : (
              comments.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative p-6 bg-white rounded-2xl rounded-tr-none border border-black/5 hover:border-neon-blue/20 transition-all overflow-hidden"
                >
                  {/* Paper Fold Effect */}
                  <div className="absolute top-0 right-0 w-8 h-8 z-20">
                    <div className="absolute top-0 right-0 w-full h-full bg-zinc-50 group-hover:bg-blue-50 transition-colors duration-500 rounded-bl-lg shadow-[-1px_1px_3px_rgba(0,0,0,0.02)]" />
                    <div className="absolute top-0 right-0 w-full h-full bg-white -z-10" />
                  </div>

                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue font-bold">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{c.name}</div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              className={`${i < c.rating ? 'text-neon-blue fill-current' : 'text-zinc-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {c.createdAt ? (
                        (() => {
                          const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                          const now = new Date();
                          const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60) || 1}m ago`;
                          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                          if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        })()
                      ) : 'Recently'}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                    "{c.comment}"
                  </p>
                  {c.image && (
                    <div className="rounded-2xl overflow-hidden border border-black/5 mb-4 max-w-full">
                      <img src={c.image} alt="Comment attachment" className="w-full h-auto" referrerPolicy="no-referrer" loading="lazy" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
