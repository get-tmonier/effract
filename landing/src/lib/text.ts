const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Render copy with `[[key phrases]]` emphasized (brighter). Everything else is
 * HTML-escaped, so inline code like `<Component />` renders literally.
 */
export const emphasize = (text: string): string =>
  escapeHtml(text).replace(/\[\[(.+?)\]\]/g, '<strong class="font-medium text-ink">$1</strong>');

/**
 * Colour the words "React" (teal) and "Effect" (violet) in a title so they map
 * to the two woven fibers — the elegant, label-free way to name them.
 */
export const colorizeTitle = (text: string): string =>
  escapeHtml(text)
    .replace(/\bReact\b/g, '<span style="color:var(--react)">React</span>')
    .replace(/\bEffect\b/g, '<span style="color:var(--effect)">Effect</span>');
