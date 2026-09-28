# LIVN CO. landing page

The landing page for LIVN CO., a clothing brand (Drop 01: hoodie, two crewnecks, two tees). A dark, glassmorphic page with a 3D hero (Three.js), smooth scrolling (Lenis) and scroll-triggered animations (GSAP ScrollTrigger + SplitText).

## Run it

The page is `index.html` plus the product cut-outs in `images/`. Keep them together; there is nothing to install or build:

- **Locally:** double-click `index.html` to open it in your browser.
- **Online:** upload `index.html` and the `images/` folder to any static host (GitHub Pages, Netlify, Vercel, S3). For GitHub Pages, enable Pages on this repo and point it at the branch root.

The libraries (Three.js, GSAP, Lenis) and the Inter font load from public CDNs (jsDelivr and Google Fonts), so an internet connection is needed for the full experience. Offline, the page falls back to a static version of the same content after a few seconds.

## Editing

- Styles live in the `<style>` block in the `<head>`.
- The page script is the `<script type="module">` at the end of `<body>`, in three parts: particle mesh background, 3D hero, and page animations.
- `prefers-reduced-motion` disables smooth scrolling, entrance animations and the animated backgrounds; all content renders statically.
- Product photos live in `images/` as transparent WebP cut-outs. To add a product, copy one of the `.product` cards in the collection grid.
- The "Shop the drop" buttons point at the collection section. Change their `href` to your store URL.
- The customer review, `hello@livnco.com` and the product descriptions are placeholders to check and replace.
