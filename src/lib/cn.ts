/**
 * Joins class names, skipping falsy values. It does not resolve conflicts: a className that repeats a
 * property the component already sets (e.g. w-16 on Input, which has w-full) loses to whichever rule
 * Tailwind emits later. Use a component variant, or force it with the ! suffix (w-16!).
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
