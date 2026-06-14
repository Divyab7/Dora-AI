import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "hedera-green": {
          DEFAULT: "#00FF9D",
          50: "#e6fff5",
          100: "#b3ffe4",
          200: "#80ffd3",
          300: "#4dffc2",
          400: "#1affb1",
          500: "#00FF9D",
          600: "#00cc7e",
          700: "#00995e",
          800: "#00663f",
          900: "#00331f",
        },
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
        },
        glass: {
          DEFAULT: "var(--glass-bg)",
          border: "var(--glass-border)",
          highlight: "var(--glass-highlight)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
        glass: "16px",
      },
      animation: {
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scan-ring": "scan-ring 1.5s ease-in-out infinite",
        "success-check": "success-check 0.5s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 255, 157, 0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(0, 255, 157, 0)" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scan-ring": {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        "success-check": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
