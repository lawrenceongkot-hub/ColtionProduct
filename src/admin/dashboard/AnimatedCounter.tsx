import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = React.memo(({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  format = true,
}) => {
  // Initialize with the actual value so it shows immediately, not 0
  const [displayValue, setDisplayValue] = useState(value);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);
  const raf = useRef<number | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    // If value hasn't changed, skip animation
    if (value === prevValue.current) return;
    
    // Start animation from previous value to new value
    startValue.current = prevValue.current;
    prevValue.current = value;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const current = startValue.current + (value - startValue.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  const formatted = format
    ? displayValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : displayValue.toFixed(decimals);

  return <>{prefix}{formatted}{suffix}</>;
});

AnimatedCounter.displayName = 'AnimatedCounter';