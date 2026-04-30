"use client";

import { useRef } from "react";

interface SwipeNavigationOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Minimum horizontal distance in px to trigger (default 60) */
  threshold?: number;
}

/**
 * Returns touch event handlers for horizontal swipe navigation.
 * Only fires when the gesture is predominantly horizontal (dx > dy * 1.5),
 * so normal vertical scrolling is never accidentally triggered.
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: SwipeNavigationOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(e: React.TouchEvent) {
      startRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    },
    onTouchEnd(e: React.TouchEvent) {
      if (!startRef.current) return;
      const dx = e.changedTouches[0].clientX - startRef.current.x;
      const dy = e.changedTouches[0].clientY - startRef.current.y;
      startRef.current = null;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > threshold) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
    },
  };
}
