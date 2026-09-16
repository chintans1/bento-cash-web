import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach class merging about the named utilities in globals.css so callers can
// still override a component's layout and transitions through className.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      ease: ["expand"],
      tracking: ["eyebrow", "stat"],
    },
    classGroups: {
      transition: [
        {
          transition: [
            "control",
            "field",
            "progress",
            "link",
            "segmented",
            "surface",
            "dropzone",
            "selection",
            "card",
            "icon",
            "row",
            "editable",
            "category",
            "width",
          ],
        },
      ],
      "grid-cols": [
        {
          "grid-cols": [
            "settings",
            "transaction-search",
            "performance",
            "category",
            "icon-content",
            "transaction",
            "transaction-sm",
            "transaction-md",
            "transaction-lg",
          ],
        },
      ],
      "max-w": ["max-w-viewport-inset"],
      "min-h": ["min-h-app-content"],
      rounded: ["rounded-inherit"],
      shadow: ["category-chip-outline"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
