import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const PROJECTS = [
  { 
    id: 1, 
    title: "The $1,000,000 Survival Challenge", 
    category: "Gaming", 
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80",
    stats: "4.2M Views • 14% CTR"
  },
  { 
    id: 2, 
    title: "Why The Housing Market is Crashing", 
    category: "Finance", 
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
    stats: "1.8M Views • 11% CTR"
  },
  { 
    id: 3, 
    title: "I Lived on $0 for 30 Days", 
    category: "Vlog", 
    image: "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200&q=80",
    stats: "8.5M Views • 16% CTR"
  },
  { 
    id: 4, 
    title: "The Future of Artificial Intelligence", 
    category: "Tech", 
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
    stats: "2.1M Views • 12% CTR"
  },
  { 
    id: 5, 
    title: "Ultimate 10-Minute Morning Routine", 
    category: "Lifestyle", 
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
    stats: "950K Views • 13% CTR"
  }
];

export const FeaturedCarousel = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      setScrollProgress((scrollLeft / (scrollWidth - clientWidth)) * 100);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      checkScroll();
    }
    return () => container?.removeEventListener('scroll', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientWidth * 0.8;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="mt-32 relative">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-[0.3em] text-[10px]">
            <Sparkles size={14} />
            <span>Featured Showcase</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-[#1A1A1A] tracking-tighter">
            High-Impact <br />
            <span className="text-blue-600">Visual Hooks.</span>
          </h2>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-4 rounded-full border border-black/5 transition-all ${
              canScrollLeft ? 'bg-white text-black hover:bg-zinc-50 shadow-lg' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-4 rounded-full border border-black/5 transition-all ${
              canScrollRight ? 'bg-white text-black hover:bg-zinc-50 shadow-lg' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
            }`}
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex gap-8 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-12 -mx-6 px-6"
      >
        {PROJECTS.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-[85vw] md:w-[600px] snap-center group relative"
          >
            <div className="relative aspect-video rounded-[2.5rem] rounded-tr-none overflow-hidden border border-black/5 bg-zinc-100 shadow-xl group-hover:shadow-2xl transition-all duration-700">
              {/* Paper Fold Effect */}
              <div className="absolute top-0 right-0 w-16 h-16 z-30">
                <div className="absolute top-0 right-0 w-full h-full bg-zinc-100 group-hover:bg-blue-50 transition-colors duration-500 rounded-bl-3xl shadow-[-5px_5px_10px_rgba(0,0,0,0.05)]" />
                <div className="absolute top-0 right-0 w-full h-full bg-white -z-10" />
              </div>

              <motion.img 
                key={project.image}
                src={project.image} 
                alt={project.title} 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
              
              <div className="absolute bottom-0 left-0 right-0 p-10 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {project.category}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {project.stats}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold leading-tight max-w-md">
                  {project.title}
                </h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scroll Progress Bar */}
      <div className="mt-8 h-1 w-full bg-black/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-blue-600"
          animate={{ width: `${scrollProgress}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Background Decorative Element */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)] pointer-events-none" />
    </section>
  );
};
