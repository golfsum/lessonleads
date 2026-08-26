import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: "#f2f7f1",
          100: "#e2eee0",
          200: "#c2dac0",
          300: "#8fbc8d",
          400: "#579457",
          500: "#2f743d",
          600: "#1b552c",
          700: "#164724",
          800: "#102e24",
          900: "#0b241d",
        },
        ink: {
          900: "#101814",
          800: "#17231d",
          700: "#27352e",
          600: "#435047",
          500: "#5e6861",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        finder: "0 18px 48px rgba(17, 38, 29, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
