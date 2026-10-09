import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The design tokens add font-size utilities (text-h1 ... text-caption) and shape/color utilities that plain
// tailwind-merge would misread as colors and silently drop (e.g. "text-caption" next to "text-success").
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'body-sm', 'caption'] }],
      rounded: [{ rounded: ['control', 'card', 'sheet'] }],
      shadow: [{ shadow: ['float'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
