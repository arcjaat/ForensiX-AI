/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#09090b", // zinc-950
          raised: "#18181b",  // zinc-900
          card: "#121215",
          border: "#27272a",  // zinc-800
        },
        accent: {
          DEFAULT: "#6366f1", // indigo-500
          foreground: "#ffffff",
        },
        scan: "#6366f1",
        verdict: {
          genuine: "#10b981",    // emerald-500
          "genuine-dim": "#064e3b",
          suspicious: "#f59e0b", // amber-500
          "suspicious-dim": "#78350f",
          fake: "#ef4444",       // rose-500
          "fake-dim": "#7f1d1d",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(300%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "scan-sweep": "scan-sweep 2s ease-in-out 1",
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
