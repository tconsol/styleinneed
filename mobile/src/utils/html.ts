// Lightweight HTML → readable plain text (no extra deps). Headings/paragraphs
// become line breaks; tags stripped; entities decoded. Upgrade to
// react-native-render-html later if rich formatting is needed.
export const htmlToText = (html: string): string =>
  (html || '')
    .replace(/<\/(p|h[1-6]|li|div|br)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
