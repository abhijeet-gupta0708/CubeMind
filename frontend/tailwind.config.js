/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0c0f",
          900: "#101114",
          850: "#14161a",
          800: "#191b20",
          750: "#1e2127",
          700: "#252932",
          600: "#333845",
          500: "#4b5160",
        },
        violet: {
          300: "#bcb4ff",
          400: "#a193ff",
          500: "#8b7cff",
          600: "#7362f0",
        },
        cyan: {
          300: "#9be8f2",
          400: "#57d6e8",
          500: "#33bdd1",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono Variable",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 24px 60px -32px rgba(0,0,0,0.8)",
        lift: "0 18px 50px -24px rgba(0,0,0,0.9)",
        glow: "0 0 0 1px rgba(139,124,255,0.35), 0 12px 40px -12px rgba(139,124,255,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
