
export const HIGHLIGHT_COLORS = {
  red: 'bg-red-300',
  green: 'bg-green-300',
  blue: 'bg-blue-300',
  yellow: 'bg-yellow-300',
  purple: 'bg-purple-300',
  orange: 'bg-orange-300',
};

export const HIGHLIGHT_CLASSES: Record<keyof typeof HIGHLIGHT_COLORS, string> = {
  red: 'bg-red-400/50 dark:bg-red-500/40',
  green: 'bg-green-400/50 dark:bg-green-500/40',
  blue: 'bg-blue-400/50 dark:bg-blue-500/40',
  yellow: 'bg-yellow-400/50 dark:bg-yellow-500/40',
  purple: 'bg-purple-400/50 dark:bg-purple-500/40',
  orange: 'bg-orange-400/50 dark:bg-orange-500/40',
};

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS;
