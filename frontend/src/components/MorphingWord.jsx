import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Cycles through a list of words with a smooth slide+fade transition.
 * Width is fixed to the longest word so layout doesn't reflow on every change.
 */
export default function MorphingWord({
  words = [],
  intervalMs = 2200,
  className = '',
  emphasisClassName = 'text-clay italic',
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!words.length) return undefined;
    const id = setInterval(() => setI((prev) => (prev + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, words]);

  if (!words.length) return null;

  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b));

  return (
    <span className={`relative inline-block align-baseline ${className}`}>
      {/* Invisible sizer keeps layout stable */}
      <span aria-hidden="true" className="invisible">
        {longest}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ y: '0.45em', opacity: 0, filter: 'blur(2px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-0.45em', opacity: 0, filter: 'blur(2px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 ${emphasisClassName}`}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
