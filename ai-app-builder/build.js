#!/usr/bin/env node
/**
 * Builds a single, fully offline HTML file (index.html) from
 * AIAppBuilder.jsx + main.jsx + styles.css.
 *
 *   npm install && node build.js
 *
 * React, lucide-react and the compiled Tailwind stylesheet are all inlined,
 * so the result runs by double-clicking it — no server, no CDN, no network.
 */
const { execFileSync } = require("child_process");
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const out = path.join(root, ".build");
fs.mkdirSync(out, { recursive: true });

/* 1. Tailwind → plain CSS (only the classes actually used). */
const tailwindBin = path.join(root, "node_modules", ".bin", "tailwindcss");
execFileSync(tailwindBin, ["-c", path.join(root, "tailwind.config.js"), "-i", path.join(root, "styles.css"), "-o", path.join(out, "app.css"), "--minify"], {
  stdio: ["ignore", "ignore", "inherit"],
});

/* 2. JSX → one minified bundle. */
esbuild.buildSync({
  entryPoints: [path.join(root, "main.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  jsx: "automatic",
  loader: { ".js": "jsx", ".jsx": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: path.join(out, "app.js"),
});

const css = fs.readFileSync(path.join(out, "app.css"), "utf8");
const js = fs.readFileSync(path.join(out, "app.js"), "utf8");

const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0b1130">
<title>Madaf · מדף — ready-made business tools</title>
<meta name="description" content="Nine finished business tools in eight languages — booking, quotes, landing pages and more — working in seconds.">
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "index.html"), html);
console.log(`built index.html — ${(html.length / 1024).toFixed(0)}KB (css ${(css.length / 1024).toFixed(0)}KB, js ${(js.length / 1024).toFixed(0)}KB)`);
