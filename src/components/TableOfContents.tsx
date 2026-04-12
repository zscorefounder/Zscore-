import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X, ChevronRight } from 'lucide-react';

interface TOCItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -35% 0%' }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-[60] hidden xl:block">
      <div className="relative">
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
            isOpen ? 'bg-black text-white' : 'bg-white text-black border border-black/5'
          }`}
        >
          {isOpen ? <X size={20} /> : <List size={20} />}
        </motion.button>

        {/* Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className="absolute left-16 top-0 w-64 bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl p-6 shadow-2xl"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 ml-2">Navigation</p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                      activeId === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'hover:bg-black/5 text-zinc-600'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                    <ChevronRight 
                      size={14} 
                      className={`transition-transform duration-300 ${
                        activeId === item.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vertical Labels (When closed) */}
        {!isOpen && (
          <div className="absolute left-0 top-16 flex flex-col gap-8 py-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="group relative flex items-center"
              >
                <div className={`w-1 h-4 rounded-full transition-all duration-500 ${
                  activeId === item.id ? 'bg-blue-600 h-8' : 'bg-zinc-200 group-hover:bg-zinc-400'
                }`} />
                <span className={`absolute left-6 text-[8px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 ${
                  activeId === item.id ? 'text-blue-600 opacity-100 translate-x-0' : 'text-zinc-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                }`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
