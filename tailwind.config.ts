import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        camp: {
          cream: "#FDF8F3",
          warm: "#FAF5EF",
          sand: "#F5EBE0",
          terracotta: "#E85D04",
          "terracotta-dark": "#C44D03",
          forest: "#2D6A4F",
          "forest-light": "#40916C",
          pine: "#1B4332",
          sun: "#FACC15",
          "sun-light": "#FDE68A",
          bark: "#6B4423",
          ember: "#DC2626",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        camp: "0 4px 20px -4px rgba(107, 68, 35, 0.15)",
        "camp-lg": "0 12px 40px -8px rgba(107, 68, 35, 0.2)",
        "camp-glow": "0 0 40px rgba(232, 93, 4, 0.15)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "bounce-slow": "bounceSlow 2s ease-in-out infinite",
        "sway": "sway 3s ease-in-out infinite",
        "drift": "drift 8s linear infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "wiggle": "wiggle 0.5s ease-in-out infinite",
        "progress": "progress 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        drift: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        shimmer: {
          "0%": { opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
        pulseGlow: {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(250, 204, 21, 0.4))" },
          "50%": { filter: "drop-shadow(0 0 20px rgba(250, 204, 21, 0.8))" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-5deg)" },
          "50%": { transform: "rotate(5deg)" },
        },
        progress: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
