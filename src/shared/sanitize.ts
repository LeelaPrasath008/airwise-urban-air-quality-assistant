/**
 * Zero-dependency plain-text sanitizer shared across backend schemas and client forms.
 * Strips control characters and HTML angle brackets to prevent log/prompt injection and unsafe markup.
 */
export function sanitizePlainText(input: string, maxLength = 500): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}
