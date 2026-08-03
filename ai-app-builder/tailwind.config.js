/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./AIAppBuilder.jsx", "./main.jsx"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
