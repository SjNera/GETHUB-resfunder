import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // our semantic colour tokens, so text-muted vs text-fg resolves correctly
      "text-color": [{ text: ["fg", "muted", "subtle", "brand", "brand-fg", "brand-ink", "inverse-fg", "pay", "review", "dontpay", "stage-fg"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
