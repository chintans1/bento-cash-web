"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** A small rolling update for balances, inspired by Morph UI's Number Flip. */
export function NumberFlip({
  value,
  formatted,
  stagger = false,
}: {
  value: number;
  formatted: string;
  stagger?: boolean;
}) {
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState(1);
  if (value !== previous) {
    setPrevious(value);
    setDirection(value >= previous ? 1 : -1);
  }
  const reducedMotion = useReducedMotion();

  return (
    <span className="inline-flex max-w-full tabular-nums">
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="inline-flex max-w-full">
        {Array.from(formatted).map((char, index) => {
          const position = formatted.length - index;
          if (!/\d/.test(char)) {
            return <span key={`separator-${position}`}>{char}</span>;
          }

          const digitsAfter = formatted
            .slice(index + 1)
            .replace(/\D/g, "").length;
          const delay = stagger ? Math.min(digitsAfter, 2) * 0.04 : 0;

          return (
            <span
              key={`digit-${position}`}
              className="relative inline-grid h-[1lh] w-[1ch] overflow-hidden align-top"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={char}
                  className="col-start-1 row-start-1 block"
                  initial={reducedMotion ? false : { y: `${direction * 100}%` }}
                  animate={{ y: 0 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : { y: `${-direction * 100}%` }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 0.28, ease: [0.2, 0, 0, 1], delay }
                  }
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </span>
  );
}
