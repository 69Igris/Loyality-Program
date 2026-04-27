import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Subtle magnetic-pull effect on hover — the button slightly leans toward the cursor.
 * Renders an inline button by default; pass `as="span"` or any tag for non-button use.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 14, // max px translation
  type = 'button',
  ...rest
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const tx = useTransform(sx, (v) => `${v}px`);
  const ty = useTransform(sy, (v) => `${v}px`);

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(relX * strength * 2);
    y.set(relY * strength * 2);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: tx, y: ty }}
      className={className}
      whileTap={{ scale: 0.98 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
