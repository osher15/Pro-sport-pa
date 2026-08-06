/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./AIAppBuilder.jsx", "./main.jsx"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
        // David/Narkisim are Office fonts and unreliable in browsers — this is
        // the web-safe Hebrew stack used by every RTL preview.
        hebrew: ['"Noto Sans Hebrew"', '"Arial Hebrew"', 'Arial', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
