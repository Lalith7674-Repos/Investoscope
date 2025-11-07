"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselProps = {
  children: React.ReactNode;
  title?: string;
  autoScroll?: boolean;
  scrollSpeed?: number; // pixels per second
  showControls?: boolean;
};

export default function Carousel({ 
  children, 
  title, 
  autoScroll = true, 
  scrollSpeed = 30,
  showControls = true 
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoScrollRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Check scroll position
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll || isHovered || isDraggingRef.current || !scrollRef.current) {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    const scroll = () => {
      if (!scrollRef.current || isDraggingRef.current || isHovered) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      
      if (maxScroll <= 0) return; // No scrolling needed
      
      if (scrollLeft >= maxScroll - 5) {
        // Reset to start smoothly
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: scrollSpeed / 60, behavior: 'auto' });
      }
    };

    const interval = setInterval(scroll, 1000 / 60); // 60fps
    autoScrollRef.current = interval as any;

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [autoScroll, isHovered, scrollSpeed]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    const rect = scrollRef.current.getBoundingClientRect();
    startXRef.current = e.pageX - rect.left;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const rect = scrollRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left;
    const walk = (x - startXRef.current) * 2; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    isDraggingRef.current = false;
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = 'auto';
  };

  const handleMouseLeave = () => {
    if (!scrollRef.current) return;
    isDraggingRef.current = false;
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = 'auto';
  };

  // Scroll buttons
  const scrollLeft = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
  };

  // Check scroll on mount and resize
  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    const handleScroll = () => checkScroll();
    
    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [children]);

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {title && (
        <h3 className="text-2xl font-bold text-slate-100 mb-4">{title}</h3>
      )}
      
      <div className="relative">
        {/* Left Arrow */}
        {showControls && canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-600/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-slate-200" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {/* Right Arrow */}
        {showControls && canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-600/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-slate-200" />
          </button>
        )}

        {/* Gradient Fade on edges */}
        <div className="absolute left-0 top-0 bottom-4 w-20 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-20 bg-gradient-to-l from-slate-900 via-slate-900/50 to-transparent pointer-events-none" />
      </div>

    </div>
  );
}

