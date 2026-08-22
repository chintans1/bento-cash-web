"use client";

import { AnimatePresence, motion } from "motion/react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Height transition for expanding content, with whatever follows it in the
 * document flowing along.
 *
 * Height and opacity are deliberately on different clocks: the box opens on
 * the full duration while the content fades in over the back half, so the
 * content arrives in an open container instead of appearing stretched. On
 * close the fade runs first and fast, so the box looks empty before it
 * collapses.
 */
export function AnimatedCollapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: { duration: DURATION.expand, ease: EASE },
              opacity: {
                duration: DURATION.expand * 0.6,
                delay: DURATION.expand * 0.35,
                ease: "linear",
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: DURATION.collapse, ease: EASE },
              opacity: { duration: DURATION.collapse * 0.5, ease: "linear" },
            },
          }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
