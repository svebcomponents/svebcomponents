// Regenerates the social card at public/og.png.
// Run from apps/docs with `pnpm generate:og` after changing the logo or tagline.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const logo = readFileSync("src/assets/svebcomponents_logo.svg");
const logoPng = await sharp(logo).resize({ height: 300 }).png().toBuffer();

const W = 1200,
  H = 630;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#2980c2"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="#c7e23b"/>
  <text x="80" y="290" font-family="Helvetica, Arial, sans-serif" font-size="86" font-weight="700" fill="#111111" letter-spacing="-3">svebcomponents</text>
  <text x="80" y="366" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#2980c2">Boilerplate-free, type-safe, server-rendered</text>
  <text x="80" y="410" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#2980c2">web components \u2014 with Svelte.</text>
  <text x="80" y="486" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#555555">Packaging, types for your consumers, and server rendering:</text>
  <text x="80" y="524" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#555555">everything Svelte&#8217;s customElement: true leaves to you.</text>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([{ input: logoPng, top: 60, left: 860 }])
  .png()
  .toFile("public/og.png");
console.log("wrote public/og.png");
