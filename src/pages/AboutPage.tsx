import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft,
  ExternalLink,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  Smile,
  Star,
  Paperclip,
  Cpu,
  Layers,
  Video,
  Globe,
  ChevronRight,
  Quote,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Loader2,
  Zap,
  Sparkles,
  Target,
  Palette
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ZSpinner } from '../components/ZLoading';
import { useAdmin } from '../hooks/useAdmin';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'sonner';

// --- EDITABLE CONTENT START ---
const PERSONAL_INFO = {
  name: "Zeeshan",
  title: "Visual/Graphic Designer",
  roles: ["Creative Strategist", "Content Creator", "VFX Artist"],
  location: "Lahore, Pakistan",
  email: "zedscoreteam@gmail.com",
  phone: "+92 303 5408206",
  website: "zscore.pix",
  aboutText: "I am a Freelance Multimedia Artist who has been working since 2019. Alongside freelance work, I have contributed as a VFX Artist on high-performing content for top-tier creators. My practice extends across Motion Graphics, 2D Animation, and Photo Manipulation crafting Impactful Visuals that bring ideas and stories to life.",
  experience: [
    { role: "Graphic Designer", company: "Freelancing", date: "2019-2026" },
    { role: "Video Editor", company: "Z Score Agency", date: "2020-2026" },
    { role: "Graphic FX", company: "Creative Studio", date: "2020-2026" },
    { role: "VFX Artist", company: "Top Tier Creators", date: "2019-2025", highlighted: true },
    { role: "Motion Artist", company: "Freelancing", date: "2019-2026" },
  ],
  education: [
    { level: "Highschool", school: "Local High School", date: "2013-2016" },
    { level: "University", school: "Punjab University", date: "2021-2025", desc: "Visual Communication" },
  ],
  abilities: ["Motion Graphics", "Video Editing", "Photo Manipulation", "Graphic Designing", "Digital Painting", "Vector Illustration"],
  softSkills: ["Adaptability", "Communication", "Collaboration", "Problem-solving"],
  software: [
    { name: "Ae", color: "#cf96fd", label: "After Effects" },
    { name: "Ps", color: "#31a8ff", label: "Photoshop" },
    { name: "Pr", color: "#e781ff", label: "Premiere Pro" },
    { name: "Ai", color: "#ff9a00", label: "Illustrator" },
  ],
  milestones: [
    { year: "2019", title: "The First Click", desc: "Started freelancing on Upwork and Fiverr. Discovered the power of CTR." },
    { year: "2020", title: "Agency Birth", desc: "Founded Z-Score Agency to provide high-end visual solutions for creators." },
    { year: "2022", title: "VFX Mastery", desc: "Began working as a VFX artist for top-tier YouTube creators (10M+ subs)." },
    { year: "2024", title: "Global Reach", desc: "Collaborated with creators from 15+ countries, hitting 500M+ total views." },
    { year: "2026", title: "The Future", desc: "Integrating AI and psychological design to redefine visual storytelling." }
  ],
  philosophy: [
    { title: "Psychology First", desc: "Design isn't just about looking good; it's about how the human brain processes information in milliseconds." },
    { title: "Story in a Frame", desc: "Every thumbnail is a movie poster. It must tell a story, create a gap, and promise a reward." },
    { title: "Data Driven", desc: "Aesthetics are subjective. CTR is objective. I bridge the gap between art and performance." }
  ],
  stats: [
    { label: "Total Views Generated", value: 500, suffix: "M+" },
    { label: "Projects Completed", value: 450, suffix: "+" },
    { label: "Avg. CTR Increase", value: 15, suffix: "%" },
    { label: "Happy Clients", value: 200, suffix: "+" }
  ],
  workspace: []
};
// --- EDITABLE CONTENT END ---

const Tape = ({ className = "", rotation = 0 }: { className?: string; rotation?: number }) => (
  <div 
    className={`absolute h-8 w-24 bg-white/40 backdrop-blur-[4px] border border-white/20 shadow-sm z-30 pointer-events-none ${className}`}
    style={{ transform: `rotate(${rotation}deg)` }}
  />
);

const Highlighter = ({ children, color = "bg-yellow-200" }: { children: React.ReactNode; color?: string }) => (
  <span className={`relative inline-block px-1 z-10`}>
    <span className={`absolute inset-0 ${color} -rotate-1 z-[-1] opacity-70`} />
    {children}
  </span>
);

const HandwrittenAnnotation = ({ 
  text, 
  className = "", 
  arrow = "none" 
}: { 
  text: string; 
  className?: string; 
  arrow?: "none" | "up" | "down" | "left" | "right" 
}) => {
  const arrows = {
    none: "",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→"
  };
  
  return (
    <div className={`font-handwriting text-[#582f0e] opacity-80 flex items-center gap-2 ${className}`}>
      {arrow === "left" && <span>{arrows.left}</span>}
      {arrow === "up" && <span>{arrows.up}</span>}
      <span>{text}</span>
      {arrow === "right" && <span>{arrows.right}</span>}
      {arrow === "down" && <span>{arrows.down}</span>}
    </div>
  );
};

const ScrapPaper = ({ 
  children, 
  className = "", 
  rotation = 0,
  type = "plain" 
}: { 
  children: React.ReactNode; 
  className?: string; 
  rotation?: number;
  type?: "plain" | "crumpled" | "postit" | "torn"
}) => {
  const bgStyles = {
    plain: "bg-white shadow-md",
    crumpled: "bg-[#f9f9f9] shadow-lg [clip-path:polygon(2%_0%,98%_1%,100%_98%,1%_100%)]",
    postit: "bg-yellow-100 shadow-sm [clip-path:polygon(0%_0%,100%_0%,95%_100%,5%_98%)]",
    torn: "bg-white shadow-md [clip-path:polygon(0%_5%,10%_0%,20%_5%,30%_0%,40%_5%,50%_0%,60%_5%,70%_0%,80%_5%,90%_0%,100%_5%,100%_95%,90%_100%,80%_95%,70%_100%,60%_95%,50%_100%,40%_95%,30%_100%,20%_95%,10%_100%,0%_95%)]"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, rotate: rotation - 5 }}
      whileInView={{ opacity: 1, scale: 1, rotate: rotation }}
      viewport={{ once: true }}
      className={`p-8 relative ${bgStyles[type]} ${className}`}
    >
      {children}
    </motion.div>
  );
};

const AboutPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAdmin();
  const [workspaceImages, setWorkspaceImages] = useState(PERSONAL_INFO.workspace);
  const [isUploading, setIsUploading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCaption, setManualCaption] = useState('');
  const [manualImage, setManualImage] = useState<string | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const saved = localStorage.getItem('zscore_local_workspace');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Filter out any default placeholder images if they were saved to localStorage
      const filtered = parsed.filter((img: any) => !img.url.includes('picsum.photos'));
      setWorkspaceImages(filtered);
      if (filtered.length !== parsed.length) {
        localStorage.setItem('zscore_local_workspace', JSON.stringify(filtered));
      }
    } else {
      setWorkspaceImages(PERSONAL_INFO.workspace);
    }
  }, []);

  const handleManualImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCaption || !manualImage) return;

    setIsUploading(true);
    try {
      const newImage = {
        id: Date.now().toString(),
        url: manualImage,
        caption: manualCaption
      };

      const updatedImages = [newImage, ...workspaceImages];
      setWorkspaceImages(updatedImages);
      localStorage.setItem('zscore_local_workspace', JSON.stringify(updatedImages));

      setManualCaption('');
      setManualImage(null);
      setShowManualForm(false);
    } catch (err) {
      console.error('Error adding workspace image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Image?',
      message: 'Are you sure you want to delete this image?',
      isDestructive: true,
      onConfirm: () => {
        const updatedImages = workspaceImages.filter((img: any) => img.id !== id);
        setWorkspaceImages(updatedImages);
        localStorage.setItem('zscore_local_workspace', JSON.stringify(updatedImages));
        toast.success('Image deleted successfully');
      }
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#fdfdfd] text-[#1A1A1A] selection:bg-yellow-200 selection:text-black font-sans overflow-x-hidden relative">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <Helmet>
        <title>About | {PERSONAL_INFO.name}</title>
      </Helmet>

      {/* Graph Paper Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] z-0" />
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-yellow-400 z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-8 flex justify-between items-center">
        <Link to="/" className="group flex items-center gap-3 text-black/60 hover:text-black transition-all">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-[0.3em] text-[10px]">Return</span>
        </Link>
        <div className="flex items-center gap-8">
          <img src="https://i.ibb.co/QjQxzsHp/Z-SCORE-LOGO.png" alt="Logo" className="h-8 w-auto brightness-0 opacity-80" loading="lazy" />
        </div>
      </nav>

      <main className="pt-32 pb-40 px-6 max-w-6xl mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <div className="mb-32">
          <div className="flex flex-col md:flex-row gap-16 items-start">
            {/* Profile Photo with Tape */}
            <div className="relative">
              <ScrapPaper rotation={-2} className="p-2 bg-white" type="plain">
                <Tape className="-top-4 left-1/2 -translate-x-1/2" rotation={2} />
                <div className="w-64 h-80 bg-zinc-200 overflow-hidden">
                  <img 
                    src="https://i.ibb.co/qXFY4XD/dposa-s.png" 
                    alt="Profile" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </ScrapPaper>
              <HandwrittenAnnotation text="That's me!" className="absolute -bottom-12 -left-4 text-3xl -rotate-6" arrow="up" />
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center -rotate-12 shadow-lg border-4 border-white z-20">
                <span className="font-display font-black text-white text-xl">HI!</span>
              </div>
            </div>

            {/* Name and Title */}
            <div className="flex-1 space-y-8 pt-4">
              <div className="relative">
                <h1 className="text-7xl md:text-9xl font-display font-bold tracking-tighter leading-[0.8]">
                  {PERSONAL_INFO.name} <br /> 
                  <Highlighter color="bg-yellow-300">{PERSONAL_INFO.title.split('/')[0]}</Highlighter>
                </h1>
                <HandwrittenAnnotation text="Designer & Artist" className="absolute -top-10 right-0 text-2xl opacity-40" />
              </div>
              
              <div className="flex flex-wrap gap-6 items-center">
                <ScrapPaper type="postit" rotation={3} className="px-6 py-2">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <Phone size={16} className="text-yellow-600" /> {PERSONAL_INFO.phone}
                  </div>
                </ScrapPaper>
                <ScrapPaper type="postit" rotation={-2} className="px-6 py-2 bg-blue-50">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <Mail size={16} className="text-blue-600" /> {PERSONAL_INFO.email}
                  </div>
                </ScrapPaper>
              </div>

              <ScrapPaper type="torn" rotation={1} className="max-w-xl">
                <HandwrittenAnnotation text="A bit about me" className="absolute -top-10 left-0 text-xl" arrow="down" />
                <p className="text-xl leading-relaxed text-zinc-700 font-medium font-handwriting">
                  {PERSONAL_INFO.aboutText}
                </p>
                <div className="mt-6 flex gap-2">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                </div>
              </ScrapPaper>
            </div>
          </div>
        </div>

        {/* WORK EXPERIENCE & SKILLS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-32">
          {/* Work Experience */}
          <ScrapPaper type="plain" rotation={-1} className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-400 rotate-45" />
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Experience</h2>
            </div>
            <div className="space-y-8 relative">
              <HandwrittenAnnotation text="my journey" className="absolute -top-6 right-0 text-lg" arrow="left" />
              {PERSONAL_INFO.experience.map((exp, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-dashed border-zinc-200">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-yellow-400" />
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-base leading-tight">{exp.company}</h3>
                    <span className="text-[9px] font-bold bg-zinc-100 px-2 py-0.5 rounded-sm">{exp.date}</span>
                  </div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    <Highlighter color={exp.highlighted ? "bg-yellow-300" : "bg-yellow-100"}>
                      {exp.role}
                    </Highlighter>
                  </p>
                </div>
              ))}
            </div>
            <Tape className="-bottom-4 left-1/2 -translate-x-1/2 w-32" rotation={0} />
          </ScrapPaper>

          {/* Creative Skills */}
          <ScrapPaper type="crumpled" rotation={1} className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-400 rotate-45" />
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Skills</h2>
            </div>
            <div className="space-y-6 relative">
              <HandwrittenAnnotation text="what I've mastered" className="absolute -top-6 right-0 text-lg" arrow="left" />
              {PERSONAL_INFO.abilities.map((ability, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>{ability}</span>
                    <span className="text-yellow-600 italic">{85 + i * 2}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${85 + i * 2}%` }}
                      className="h-full bg-yellow-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrapPaper>

          {/* Creative Tools */}
          <div className="space-y-8">
            <ScrapPaper type="postit" rotation={-2} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-400 rotate-45" />
                <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Tools</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {PERSONAL_INFO.software.map((sw, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center border border-black/5 group-hover:border-yellow-400 transition-colors">
                      <span className="text-sm font-display font-black" style={{ color: sw.color }}>{sw.name}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{sw.label}</span>
                  </div>
                ))}
              </div>
            </ScrapPaper>

            <ScrapPaper type="plain" rotation={2} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-yellow-400 rotate-45" />
                <h2 className="text-xl font-display font-bold uppercase tracking-widest">Hobbies</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {['Mountain', 'Tea', 'Travel', 'Design', 'Story'].map((h, i) => (
                  <div key={i} className="px-3 py-1 bg-zinc-50 border border-black/5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Smile size={12} className="text-yellow-500" />
                    {h}
                  </div>
                ))}
              </div>
            </ScrapPaper>
          </div>
        </div>

        {/* MILESTONES TIMELINE */}
        <div className="mb-32 relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Milestones</h2>
          </div>
          
          <div className="space-y-12 relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-200 border-l-2 border-dashed border-zinc-300" />
            
            {PERSONAL_INFO.milestones.map((milestone, i) => (
              <div key={i} className="relative pl-24 group">
                <div className="absolute left-6 top-2 w-4 h-4 rounded-full bg-white border-4 border-yellow-400 z-10 group-hover:scale-125 transition-transform" />
                <ScrapPaper type={i % 2 === 0 ? "plain" : "torn"} rotation={i % 2 === 0 ? 1 : -1} className="p-6 max-w-2xl">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-2xl font-display font-black text-yellow-500">{milestone.year}</span>
                    <h3 className="text-xl font-bold uppercase tracking-tighter">{milestone.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed italic">
                    {milestone.desc}
                  </p>
                </ScrapPaper>
              </div>
            ))}
          </div>
          <HandwrittenAnnotation text="the journey continues..." className="absolute -bottom-12 right-0 text-2xl" arrow="right" />
        </div>

        {/* DESIGN PHILOSOPHY */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Philosophy</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PERSONAL_INFO.philosophy.map((phi, i) => (
              <ScrapPaper key={i} type="crumpled" rotation={i % 2 === 0 ? -2 : 2} className="p-8 space-y-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center border border-black/5 mb-4">
                  <Quote size={20} className="text-yellow-500" />
                </div>
                <h3 className="text-xl font-display font-bold uppercase tracking-tighter">{phi.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  {phi.desc}
                </p>
              </ScrapPaper>
            ))}
          </div>
        </div>

        {/* RANDOM FACTS */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Random Facts</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {PERSONAL_INFO.stats.map((stat, i) => (
              <ScrapPaper key={i} type="postit" rotation={i % 2 === 0 ? 2 : -2} className="p-6 flex flex-col items-center text-center">
                <div className="text-4xl font-display font-black tracking-tighter mb-2">
                  {stat.value}{stat.suffix}
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 leading-tight">
                  {stat.label}
                </p>
              </ScrapPaper>
            ))}
          </div>
        </div>

        {/* WORKSPACE IMAGES */}
        <div className="mb-32">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-400 rotate-45" />
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Workspace</h2>
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => setShowManualForm(!showManualForm)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${showManualForm ? 'bg-black text-white border-black' : 'bg-white border-black/10 hover:bg-zinc-50'}`}
              >
                <Plus size={14} className={showManualForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                {showManualForm ? 'Close' : 'Add Space'}
              </button>
            )}
          </div>

          <AnimatePresence>
            {showManualForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-12 overflow-hidden"
              >
                <form onSubmit={handleManualSubmit} className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl space-y-6 max-w-xl mx-auto">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 ml-4">Caption</label>
                    <input
                      type="text"
                      value={manualCaption}
                      onChange={(e) => setManualCaption(e.target.value)}
                      placeholder="e.g. Late night editing session"
                      className="w-full bg-zinc-50 border border-black/5 rounded-2xl py-3 px-5 focus:outline-none focus:border-black/20 transition-all text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
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
                        className="flex-grow flex items-center justify-center gap-2 py-4 bg-zinc-50 border border-dashed border-black/10 rounded-2xl hover:bg-zinc-100 transition-all"
                      >
                        {manualImage ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span className="text-xs font-bold">Ready to Upload</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Upload size={16} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-400">Select Image</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!manualCaption || !manualImage || isUploading}
                    className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? <ZSpinner size={16} /> : <><Zap size={14} /> Add to Workspace</>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {workspaceImages.map((img: any, i: number) => (
              <div key={img.id || i} className="relative group">
                <ScrapPaper rotation={i % 2 === 0 ? -3 : 3} className="p-2 bg-white" type="plain">
                  <Tape className="-top-4 left-1/2 -translate-x-1/2" rotation={i % 2 === 0 ? 5 : -5} />
                  <div className="bg-zinc-200 overflow-hidden rounded-sm relative">
                    <img 
                      src={img.url} 
                      alt={`Workspace ${i + 1}`} 
                      className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    {img.id && (
                      <button 
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <span className="font-handwriting text-lg text-zinc-500">{img.caption}</span>
                  </div>
                </ScrapPaper>
              </div>
            ))}
          </div>
          <HandwrittenAnnotation text="this is where I create" className="mt-8 text-2xl text-center w-full" arrow="up" />
        </div>

        {/* CREATIVE PROCESS (NEW SECTION FOR LONG SCROLL) */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">My Process</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-12">
              {[
                { step: "01", title: "Deep Research", desc: "I dive into the creator's niche, analyzing audience retention and click-through patterns.", icon: Target },
                { step: "02", title: "Visual Hooking", desc: "Crafting the 'Pattern Interrupt' that stops the scroll in less than 50ms.", icon: Sparkles },
                { step: "03", title: "Execution", desc: "High-end photo manipulation and VFX to create a cinematic movie-poster feel.", icon: Palette }
              ].map((p, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="flex gap-6"
                >
                  <div className="text-4xl font-display font-black text-yellow-400/30">{p.step}</div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-tighter">{p.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="relative">
              <ScrapPaper type="plain" rotation={2} className="p-4 bg-zinc-100">
                <div className="aspect-square bg-white rounded-xl border border-black/5 flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu size={80} className="text-yellow-400 opacity-20" />
                  </div>
                </div>
                <HandwrittenAnnotation text="always evolving" className="absolute -bottom-8 -right-4 text-2xl rotate-6" arrow="left" />
              </ScrapPaper>
            </div>
          </div>
        </div>

        {/* TESTIMONIALS (NEW SECTION FOR LONG SCROLL) */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Words from Clients</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { name: "Azul Welz", role: "357K Subs", text: "Zeeshan's thumbnails are a game changer. My CTR has never been this high." },
              { name: "Row Rhythm", role: "35K Subs", text: "Zeeshan's designs perfectly capture the rhythm of our content. A true creative partner!" }
            ].map((t, i) => (
              <ScrapPaper key={i} type="postit" rotation={i % 2 === 0 ? -1 : 1} className="p-8 space-y-4">
                <Quote size={20} className="text-yellow-500 opacity-40" />
                <p className="text-lg font-handwriting leading-relaxed">"{t.text}"</p>
                <div className="pt-4 border-t border-black/5">
                  <div className="font-bold text-sm uppercase tracking-widest">{t.name}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">{t.role}</div>
                </div>
              </ScrapPaper>
            ))}
          </div>
        </div>

        {/* FAQ SECTION (NEW SECTION FOR LONG SCROLL) */}
        <div className="mb-32">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-4 h-4 bg-yellow-400 rotate-45" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Common Queries</h2>
          </div>
          
          <div className="space-y-8">
            {[
              { q: "What is your typical turnaround time?", a: "For a single thumbnail, it's usually 24-48 hours. I prioritize quality over speed, but I never miss a deadline." },
              { q: "Do you offer bulk discounts?", a: "Yes, for long-term collaborations or bulk orders (5+ thumbnails), I offer custom packages that fit your budget." },
              { q: "What software do you use?", a: "Primarily Adobe Creative Suite (Photoshop, After Effects, Illustrator) and some AI tools for upscaling and texture generation." }
            ].map((faq, i) => (
              <ScrapPaper key={i} type="plain" rotation={i % 2 === 0 ? 0.5 : -0.5} className="p-8">
                <div className="flex gap-6 items-start">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 font-display font-black text-white">?</div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold uppercase tracking-tighter">{faq.q}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed italic">{faq.a}</p>
                  </div>
                </div>
              </ScrapPaper>
            ))}
          </div>
        </div>

        {/* TABLE OF CONTENT (JOURNAL ENTRY STYLE) */}
        <div className="mb-32">
          <ScrapPaper type="plain" className="bg-[#1a1a1a] text-white p-12 md:p-20 rounded-sm overflow-hidden relative" rotation={0}>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <Tape className="-top-4 left-1/2 -translate-x-1/2 w-48 opacity-50" rotation={0} />
            
            <div className="relative z-10">
              <div className="flex items-baseline gap-4 mb-16 border-b border-white/10 pb-8">
                <span className="text-4xl font-handwriting text-yellow-400 italic">Table of</span>
                <h2 className="text-6xl md:text-8xl font-display font-bold uppercase tracking-tighter leading-none">Content</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-12">
                {[
                  { num: "01", title: "Social Media", sub: "Creatives" },
                  { num: "02", title: "Creative", sub: "Prints" },
                  { num: "03", title: "Logo", sub: "Folio" },
                  { num: "04", title: "Video", sub: "Ads" }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ x: 10 }}
                    className="flex items-center gap-8 group cursor-pointer border-b border-white/5 pb-4"
                  >
                    <span className="text-5xl md:text-7xl font-display font-black opacity-20 group-hover:opacity-100 group-hover:text-yellow-400 transition-all duration-500">
                      {item.num}
                    </span>
                    <div className="space-y-0">
                      <h3 className="text-xl md:text-2xl font-display font-bold uppercase tracking-tighter">{item.title}</h3>
                      <span className="text-lg font-handwriting text-yellow-400/60 italic group-hover:text-yellow-400 transition-colors">{item.sub}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrapPaper>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
          <div className="flex items-center gap-4">
            <img src="https://i.ibb.co/QjQxzsHp/Z-SCORE-LOGO.png" alt="Logo" className="h-6 w-auto grayscale brightness-0" loading="lazy" />
            <span>© 2026 Z-Score Agency</span>
          </div>
          <div className="flex gap-12">
            <a href="https://www.instagram.com/zscore_pix/" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Instagram</a>
            <a href="https://www.behance.net/Zscore_pix" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Behance</a>
            <a href="https://x.com/zedscore_pix" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
