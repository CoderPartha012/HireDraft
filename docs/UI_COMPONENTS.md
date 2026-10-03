# UI components

HireDraft uses shadcn/ui (Radix Nova), installed with the official CLI, for its buttons, cards, inputs, labels, textareas, badges, and separators. Components live in `components/ui/`; configuration lives in `components.json`.

- shadcn/ui setup: https://ui.shadcn.com/docs/installation/next
- 21st.dev discovery: https://21st.dev/community/components/reui/accordion-1
- Accordion source: https://github.com/keenthemes/reui/blob/main/registry/bases/radix/ui/accordion.tsx

The 21st.dev registry required authentication. The FAQ accordion was instead adapted from the creator's public MIT-licensed source. Icon placeholders were replaced with Lucide icons, and layout classes were adapted to HireDraft's neutral theme. No registry credentials are needed to run the app.

## ReUI license

MIT License

Copyright (c) 2025 Keenthemes Inc

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## shadcn/ui license

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Typography and themes

Geist Sans is loaded from `@fontsource-variable/geist` with `next/font/local`, so font loading does not depend on Google requests at build time or in the browser. The font is licensed under the SIL Open Font License, included in the font package.

The sun/moon control uses `next-themes` with the shadcn class-based theme pattern. It starts in dark mode by default and saves explicit choices under `hiredraft.theme`. Shared semantic color tokens cover surfaces, text, forms, status messages, and Markdown content.

References: [Geist](https://vercel.com/font), [shadcn theme setup](https://ui.shadcn.com/docs/dark-mode/next).

## Material icons and headline motion

Site icons use the official `@mui/icons-material` outlined set, with individual imports in `components/ui/material-icons.tsx`. The shared adapter preserves the existing icon sizes and theme colors. Decorative icons are hidden from assistive technology; their controls retain text labels.

The landing headline has a one-time fade/slide reveal and underline animation. Both are disabled when the visitor requests reduced motion.

Reference: https://mui.com/material-ui/icons/

## Reference typography

Typography follows the hierarchy observed at https://ai-resume-tracker-rust.vercel.app/: locally loaded Geist, 600-weight primary headings, tight (-0.025em) heading tracking, 14px supporting text with relaxed leading, and 18px desktop hero copy. The mobile headline is 36px; desktop is 60px with 1.05 line height. Labels use restrained tracking rather than widely spaced uppercase lettering. Dark mode is the first-visit default; explicit light/dark choices persist.
