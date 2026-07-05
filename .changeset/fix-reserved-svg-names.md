---
"@svebcomponents/ssr": patch
---

Fix the Vite transform mistakenly wrapping spec-reserved SVG/MathML tag names (`font-face`, `font-face-src`, `font-face-uri`, `font-face-format`, `font-face-name`, `annotation-xml`, `color-profile`, `missing-glyph`) as custom elements just because they contain a dash. These names are explicitly excluded from valid custom element names by the HTML spec, and wrapping them corrupted otherwise-valid SVG/MathML markup.
