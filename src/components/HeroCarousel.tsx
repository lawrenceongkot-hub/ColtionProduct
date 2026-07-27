import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { HERO_SLIDES } from '../constants';
import { Button } from './Button';

export const HeroCarousel: React.FC = React.memo(() => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(next, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next]);

  const slide = HERO_SLIDES[current];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '30%' : '-30%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-30%' : '30%',
      opacity: 0,
    }),
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'clamp(320px, 60vh, 600px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: borderRadius.xl,
        background: slide.gradient,
      }}
    >
      {/* Animated background orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          right: '-20%',
          width: 'clamp(200px, 50vw, 500px)',
          height: 'clamp(200px, 50vw, 500px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,102,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-15%',
          width: 'clamp(150px, 40vw, 400px)',
          height: 'clamp(150px, 40vw, 400px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Slide Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 'clamp(300px, 85vw, 700px)',
          padding: 'clamp(24px, 4vw, 48px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(16px, 2.5vh, 28px)',
          textAlign: 'center',
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(12px, 2vh, 20px)',
              width: '100%',
            }}
          >
            {/* Illustration */}
            <motion.div
              style={{
                width: 'clamp(60px, 12vw, 100px)',
                height: 'clamp(60px, 12vw, 100px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {slide.illustration === 'chart-up' && (
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect width="80" height="80" rx="20" fill="rgba(255,255,255,0.08)" />
                  <path d="M20 60L35 40L45 50L60 25" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="60" cy="25" r="4" fill="#00D4FF" />
                  <path d="M20 60L20 20" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20 60L60 60" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {slide.illustration === 'growth' && (
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect width="80" height="80" rx="20" fill="rgba(255,255,255,0.08)" />
                  <path d="M15 65C15 65 30 40 40 50C50 60 65 20 65 20" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="65" cy="20" r="4" fill="#00D4FF" />
                  <path d="M15 65L65 65" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {slide.illustration === 'security' && (
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect width="80" height="80" rx="20" fill="rgba(255,255,255,0.08)" />
                  <path d="M40 10C40 10 15 20 15 35V50L40 70L65 50V35C65 20 40 10 40 10Z" fill="rgba(0,102,255,0.2)" stroke="#0066FF" strokeWidth="2" />
                  <path d="M30 40L37 47L50 33" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.div>

            <h2 style={{
              fontSize: typography.xxl,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
              lineHeight: typography.tight,
            }}>
              {slide.title}
            </h2>
            <p style={{
              fontSize: typography.base,
              color: colors.textSecondary,
              fontFamily: typography.fontFamily,
              lineHeight: typography.relaxed,
              maxWidth: 'clamp(260px, 70vw, 500px)',
            }}>
              {slide.subtitle}
            </p>
            <Button variant="primary" size="md">
              {slide.buttonText}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div
        style={{
          position: 'absolute',
          bottom: 'clamp(16px, 3vh, 24px)',
          display: 'flex',
          gap: '8px',
          zIndex: 2,
        }}
      >
        {HERO_SLIDES.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? 'clamp(24px, 3vw, 32px)' : 'clamp(8px, 1vw, 10px)',
              height: 'clamp(8px, 1vw, 10px)',
              borderRadius: borderRadius.full,
              background: i === current ? colors.primary : colors.borderDefault,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    </div>
  );
});

HeroCarousel.displayName = 'HeroCarousel';