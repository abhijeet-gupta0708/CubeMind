/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b0a",
          900: "#0c1210",
          850: "#0e1512",
          800: "#121a17",
          750: "#17211d",
          700: "#223028",
          600: "#33473c",
          500: "#4b6355",
        },
        // Legacy names are kept as aliases so existing utility classes resolve
        // to the new cube-inspired palette: violet = blue sticker, cyan = green.
        violet: {
          300: "#9fd4f2",
          400: "#61b7e8",
          500: "#2e86c1",
          600: "#1f6ea8",
        },
        cyan: {
          300: "#a9e6c6",
          400: "#5bcc8e",
          500: "#27935d",
        },
        emerald: {
          200: "#9fe4bf",
          300: "#7dd6a2",
          400: "#5bcc8e",
          500: "#27935d",
        },
        accent: {
          DEFAULT: "#f5cc45",
          deep: "#d8ab1d",
          ink: "#161704",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Arial Narrow", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 18px 48px -38px rgba(0,0,0,0.95)",
        lift: "0 24px 60px -34px rgba(0,0,0,0.9)",
        glow: "0 0 0 1px rgba(245,204,69,0.35), 0 12px 40px -12px rgba(245,204,69,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.32s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
