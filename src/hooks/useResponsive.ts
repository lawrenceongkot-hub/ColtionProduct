import { useState, useEffect, useCallback } from 'react';
import { breakpoints } from '../theme';
import type { ScreenSize, ResponsiveConfig } from '../types';

function getScreenSize(width: number): ScreenSize {
  if (width <= breakpoints.xs) return 'xs';
  if (width <= breakpoints.sm) return 'sm';
  if (width <= breakpoints.md) return 'md';
  if (width <= breakpoints.lg) return 'lg';
  if (width <= breakpoints.xl) return 'xl';
  if (width <= breakpoints.xxl) return 'xxl';
  return 'ultra';
}

function getScaleFactor(width: number): number {
  if (width <= 480) return 0.85;
  if (width <= 768) return 0.9;
  if (width <= 1024) return 0.95;
  if (width >= 1920) return 1.1;
  if (width >= 1440) return 1.05;
  return 1;
}

export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const h = typeof window !== 'undefined' ? window.innerHeight : 768;
    return {
      screenSize: getScreenSize(w),
      width: w,
      height: h,
      isLandscape: w > h,
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      scaleFactor: getScaleFactor(w),
    };
  });

  const handleResize = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setConfig({
      screenSize: getScreenSize(w),
      width: w,
      height: h,
      isLandscape: w > h,
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      scaleFactor: getScaleFactor(w),
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return config;
}

export function getResponsiveValue<T>(
  config: ResponsiveConfig,
  values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; xxl?: T; ultra?: T; default: T }
): T {
  const { screenSize } = config;
  return values[screenSize] ?? values.default;
}