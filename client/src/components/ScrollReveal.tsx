import React from 'react';
import { motion } from 'framer-motion';

export interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  amount?: number | 'some' | 'all';
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.8,
  distance = 32,
  className = '',
  amount = 0.05,
  once = true,
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance, x: 0, scale: 1 };
      case 'down':
        return { opacity: 0, y: -distance, x: 0, scale: 1 };
      case 'left':
        return { opacity: 0, x: distance, y: 0, scale: 1 };
      case 'right':
        return { opacity: 0, x: -distance, y: 0, scale: 1 };
      case 'scale':
        return { opacity: 0, scale: 0.95, x: 0, y: 0 };
      case 'fade':
      default:
        return { opacity: 0, x: 0, y: 0, scale: 1 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // Luxury cubic-bezier for natural smooth inertia
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export interface ScrollRevealGroupProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
  amount?: number | 'some' | 'all';
  once?: boolean;
}

export const ScrollRevealGroup: React.FC<ScrollRevealGroupProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export const ScrollRevealItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({
  children,
  className = '',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
