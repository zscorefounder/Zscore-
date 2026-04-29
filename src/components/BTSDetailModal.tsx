import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, MessageSquare, Video, Phone, Mic, CheckCheck, Star, Quote, Layout, Workflow, FileText, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  createdAt?: any;
  isFallback?: boolean;
}

const BeforeAfterSlider = ({ before, after }: { before: string, after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video rounded-[2.5rem] overflow-hidden cursor-ew-resize select-none border border-black/5 shadow-2xl group/slider"
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
      
      <div 
        className="absolute inset-y-0 w-1 bg-white/50 backdrop-blur-sm z-10 transition-colors group-hover/slider:bg-white"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center gap-1.5 border border-zinc-100">
          <ChevronLeft size={16} className="text-blue-600" />
          <ChevronRight size={16} className="text-blue-600" />
        </div>
      </div>

      <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 opacity-0 group-hover/slider:opacity-100 transition-opacity">Before (RAW)</div>
      <div className="absolute top-6 right-6 px-4 py-2 bg-blue-600/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 opacity-0 group-hover/slider:opacity-100 transition-opacity">After (Mastered)</div>
    </div>
  );
};

export const BTSDetailModal = ({ content, onClose }: { content: BTSContent | null, onClose: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(content?.beforeImageUrl ? true : false);

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

  const carouselImages = content ? getCarouselImages(content) : [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  return (
    <AnimatePresence>
      {content && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          >
            <button
              onClick={onClose}
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
                  {(content.beforeImageUrl || (content.beforeImages && content.afterImages)) && (
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
              
              {showComparison && (content.beforeImageUrl || (content.beforeImages && content.afterImages)) ? (
                <BeforeAfterSlider 
                  before={content.beforeImageUrl || (content.beforeImages?.[0] as string)} 
                  after={content.imageUrl || (content.afterImages?.[0] as string)} 
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

            {content.beforeImages && content.afterImages && (
              <div className="pt-12 border-t border-black/5 text-center sm:text-left">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-8">Side-by-Side Comparison</h4>
                <div className="grid grid-cols-1 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="px-4 py-2 bg-zinc-100 text-zinc-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-black/5">Before</span>
                      <div className="flex-grow h-[1px] bg-zinc-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      {content.beforeImages.map((img, idx) => (
                        <div key={idx} className="aspect-video rounded-[2.5rem] overflow-hidden border border-black/5 shadow-xl shadow-black/5">
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
                      {content.afterImages.map((img, idx) => (
                        <div key={idx} className="aspect-video rounded-[2.5rem] overflow-hidden border border-blue-600/10 shadow-2xl shadow-blue-600/5">
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
                    {content.createdAt ? (
                      (() => {
                        const rawDate = content.createdAt as any;
                        const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
                        return date.toLocaleDateString();
                      })()
                    ) : 'Recent Project'}
                  </span>
                </div>
                <h2 className="text-5xl font-black text-[#1A1A1A] leading-[0.9] tracking-tighter uppercase">
                  {content.title}
                </h2>
                {content.videoTitle && (
                  <p className="text-blue-600 font-bold flex items-center gap-2 text-sm">
                    <ExternalLink className="w-4 h-4" />
                    {content.videoTitle}
                  </p>
                )}
              </div>

              {content.description && (
                <div className="mb-12 relative">
                  <div className="absolute -left-6 top-0 w-1 h-full bg-blue-600/10 rounded-full" />
                  <p className="text-zinc-500 text-xl leading-relaxed font-medium italic">
                    "{content.description}"
                  </p>
                </div>
              )}

              {/* WhatsApp Chat simulation */}
              {content.whatsappChat && (
                <div className="mb-12 space-y-4">
                  <div className="flex items-center gap-3 text-green-600 mb-6">
                    <MessageSquare className="w-5 h-5" />
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Client Approval Chat</h4>
                  </div>
                  <div className="bg-[#E5DDD5] rounded-[2.5rem] overflow-hidden border border-black/5 shadow-xl relative">
                    <div className="bg-[#075E54] p-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                          <img 
                            src={content.clientPhoto || "https://i.ibb.co/qXFY4XD/dposa-s.png"} 
                            alt="Client" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{content.clientName || "Client"} (Verified)</div>
                          <div className="text-[10px] opacity-70 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            online
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 opacity-70">
                        <Video size={18} />
                        <Phone size={18} />
                      </div>
                    </div>
                    <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-[#e5ddd5] relative">
                      <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat mix-blend-multiply" />
                      
                      {content.whatsappChat.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'client' ? 'justify-start' : 'justify-end'} relative z-10`}
                        >
                          <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm relative ${
                            msg.role === 'client' 
                              ? 'bg-white text-zinc-800 rounded-tl-none' 
                              : 'bg-[#dcf8c6] text-zinc-800 rounded-tr-none'
                          }`}>
                             {msg.isVoice ? (
                               <div className="flex items-center gap-3 min-w-[200px] py-2">
                                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                                    <Mic size={18} />
                                  </div>
                                  <div className="flex-grow">
                                    <div className="flex items-end gap-0.5 h-4 mb-1">
                                      {[...Array(12)].map((_, i) => (
                                        <div key={i} className={`w-0.5 rounded-full bg-zinc-300 ${i < 4 ? 'h-3' : i < 8 ? 'h-4' : 'h-2'}`} />
                                      ))}
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400">{msg.duration || "0:15"}</span>
                                  </div>
                               </div>
                             ) : (
                               <p className="text-sm leading-relaxed pr-8">{msg.text}</p>
                             )}
                            <div className="absolute bottom-1 right-2 flex items-center gap-1">
                              <span className="text-[9px] text-zinc-400">{msg.time}</span>
                              {msg.role === 'designer' && <CheckCheck size={12} className="text-blue-500" />}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Final message always showing thumbnail */}
                      <div className="flex justify-end relative z-10">
                        <div className="max-w-[85%] p-2 bg-[#dcf8c6] rounded-2xl rounded-tr-none shadow-sm">
                          <div className="rounded-xl overflow-hidden border border-black/5 mb-1">
                            <img 
                              src={content.imageUrl} 
                              alt="Final Thumbnail" 
                              className="w-full h-auto max-h-40 object-cover"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          </div>
                          <div className="px-2 pb-1 flex items-center justify-between text-[8px] text-zinc-400">
                            <span>Image Sent</span>
                            <div className="flex items-center gap-1">
                               <span>Just now</span>
                               <CheckCheck size={10} className="text-blue-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {content.clientFeedback && (
                <div className="mb-12">
                  <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden">
                    <Quote className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
                    <p className="text-lg font-bold leading-relaxed mb-6 relative z-10">
                      "{content.clientFeedback}"
                    </p>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10">
                        {content.clientPhoto ? (
                          <img src={content.clientPhoto} alt={content.clientName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Star className="w-5 h-5 fill-white text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest">{content.clientName || "Verified Client"}</div>
                        <div className="text-[10px] opacity-70">Project Success</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-10">
                {content.layoutIdea && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Layout size={20} />
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">The Vision</h4>
                    </div>
                    <div className="text-zinc-600 leading-relaxed bg-zinc-50 p-6 rounded-3xl border border-black/5">
                      {content.layoutIdea}
                    </div>
                  </div>
                )}

                {content.designWorkflow && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Workflow size={20} />
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Process</h4>
                    </div>
                    <div className="text-zinc-600 leading-relaxed bg-blue-50/20 p-6 rounded-3xl border border-blue-600/5">
                      {content.designWorkflow}
                    </div>
                  </div>
                )}

                {content.caseStudy && (
                  <div className="space-y-6 pt-10 border-t border-black/5">
                    <div className="flex items-center gap-3 text-blue-600">
                      <FileText size={20} />
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Deep Dive</h4>
                    </div>
                    <div className="prose prose-zinc prose-sm max-w-none">
                      <ReactMarkdown>{content.caseStudy}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
