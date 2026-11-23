export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ["U", "D", "L", "R", "F", "B"], description: "Turn that face clockwise" },
  { keys: ["Shift", "+", "U"], description: "Turn counter-clockwise (prime)" },
  { keys: ["M", "E", "S"], description: "Slice turns" },
  { keys: ["X", "Y", "Z"], description: "Whole-cube rotations" },
  { keys: ["←", "→"], description: "Previous / next solution move" },
  { keys: ["Space"], description: "Play or pause the solution" },
  { keys: ["Ctrl", "Z"], description: "Undo the last manual move" },
  { keys: ["Shift", "Ctrl", "Z"], description: "Redo the last undone move" },
  { keys: ["?"], description: "Open the shortcut sheet" },
];
