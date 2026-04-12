import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Sparkles, Zap, Target, Cpu, Trophy, Star, MessageSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PushPin } from '../components/PushPin';
import { FogEffect } from '../components/FogEffect';

interface JourneyItem {
  year: string;
  title: string;
  desc: string;
  detail: string;
  icon: React.ReactNode;
}

const JOURNEY: JourneyItem[] = [
  { 
    year: "2023", 
    title: "The Genesis", 
    desc: "Launched Z Score with a singular focus: mastering the psychological triggers that force a click. Started by helping small creators break through the noise in competitive gaming and finance niches.", 
    detail: "Developed the initial 'Pattern Interrupt' framework, focusing on high-contrast lighting and exaggerated visual hierarchy to stop the scroll.",
    icon: <Zap className="text-blue-600" />
  },
  { 
    year: "2024", 
    title: "Scaling Impact", 
    desc: "Partnered with mid-tier creators to deliver consistent CTR growth. Achieved my first 100K+ view milestone for a client, proving that data-driven design beats random aesthetics every time.", 
    detail: "Refined the design process to include deep-dive audience research and competitor analysis, ensuring every thumbnail fills a specific 'gap' in the viewer's feed.",
    icon: <Target className="text-orange-600" />
  },
  { 
    year: "2025", 
    title: "Z Score Evolution", 
    desc: "Transitioned from a solo designer to a strategic partner for premium YouTubers. Mastered the art of 'Visual Storytelling' where the thumbnail tells a story before the video even starts.", 
    detail: "Integrated advanced color theory and psychological framing techniques that resulted in a consistent 3%+ CTR increase across diverse niches like Tech and Vlogs.",
    icon: <Cpu className="text-purple-600" />
  },
  { 
    year: "2026", 
    title: "The Future of Attention", 
    desc: "Integrating AI-driven rendering with human-centric psychological design to stay ahead of the evolving YouTube algorithm. Pushing the boundaries of what a 'Visual Hook' can be.", 
    detail: "Leveraging cutting-edge tools to create hyper-realistic environments while maintaining the emotional core that drives human curiosity and engagement.",
    icon: <Sparkles className="text-blue-600" />
  },
];

const JourneyPage = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] selection:bg-blue-600 selection:text-white">
      <Helmet>
        <title>The Journey | Z Score Portfolio</title>
        <meta name="description" content="The evolution of Z Score - From genesis to the future of attention." />
      </Helmet>

      {/* Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-black/5">
        <Link to="/" className="flex items-center gap-2 group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Home</span>
        </Link>
        <div className="flex items-center gap-4">
          <a 
            href="https://wa.me/923035408206"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-blue-600 transition-all shadow-xl"
          >
            <Phone size={12} />
            Start Your Journey
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <FogEffect />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-8 border border-blue-100"
          >
            <Trophy size={14} />
            The Evolution of Z Score
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-[8rem] font-display font-black tracking-tighter leading-[0.85] mb-8"
          >
            FOLLOW THE <br />
            <span className="text-blue-600">JOURNEY.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
          >
            A timeline of growth, impact, and the relentless pursuit of the perfect click. 
            From a solo designer to a strategic partner for the world's top creators.
          </motion.p>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50/30 blur-[150px] rounded-full -z-10" />
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[1px] bg-zinc-200 md:-translate-x-1/2">
              <motion.div 
                className="absolute top-0 left-0 w-full bg-blue-600 origin-top"
                style={{ height: "100%", scaleY: scrollYProgress }}
              />
            </div>

            <div className="space-y-40">
              {JOURNEY.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`relative flex flex-col md:flex-row items-start md:items-center gap-12 ${
                    i % 2 !== 0 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-white border-4 border-blue-600 rounded-full -translate-x-1/2 z-10 shadow-lg" />

                  {/* Content */}
                  <div className={`flex-1 w-full ${i % 2 !== 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="space-y-6 group">
                      <div className={`flex items-center gap-4 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-white rounded-2xl shadow-xl border border-black/5 group-hover:scale-110 transition-transform duration-500">
                          {item.icon}
                        </div>
                        <div>
                          <span className="text-4xl md:text-6xl font-display font-black text-zinc-200 group-hover:text-blue-600/20 transition-colors">
                            {item.year}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-3xl md:text-4xl font-display font-bold text-zinc-900">
                          {item.title}
                        </h3>
                        <p className="text-zinc-500 text-lg font-medium leading-relaxed">
                          {item.desc}
                        </p>
                        <div className={`p-6 bg-white rounded-3xl border border-black/5 shadow-xl relative overflow-hidden group-hover:border-blue-600/20 transition-all duration-500`}>
                          <PushPin className="absolute -top-2 right-4 rotate-12" color={i % 2 === 0 ? "#ef4444" : "#3b82f6"} />
                          <p className="text-sm text-zinc-600 italic leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spacer for Desktop */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-40 px-6 text-center bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-10">
          <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter">
            READY TO START YOUR <br />
            <span className="text-blue-600">SUCCESS STORY?</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            Join the ranks of top creators who have exploded their growth with Z Score. 
            Let's build your legacy together.
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-6">
            <a 
              href="https://wa.me/923035408206"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 bg-blue-600 text-white font-bold rounded-full hover:bg-white hover:text-blue-600 transition-all shadow-2xl flex items-center gap-3"
            >
              Contact Zeeshan Now
              <MessageSquare size={20} />
            </a>
            <Link 
              to="/work"
              className="px-10 py-5 bg-white/10 backdrop-blur-md text-white font-bold rounded-full hover:bg-white/20 transition-all border border-white/20"
            >
              View Portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JourneyPage;
