import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0C0B",
        "ink-2": "#111614",
        "ink-3": "#1A211E",
        teal: {
          deep: "#0F3D3A",
          DEFAULT: "#1F6F64",
        },
        mint: "#7DFFC2",
        coral: "#E07A6A",
        cream: "#F4EDE1",
        gold: "#F5B942",
        lake: {
          blue: {
            900: "#0a2540",
            800: "#0d3a5c",
            700: "#105078",
            600: "#136694",
          },
        },
        "lake-blue": {
          900: "#0a2540",
          800: "#0d3a5c",
          700: "#105078",
          600: "#136694",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        marker: ["var(--font-marker)", "cursive"],
      },
      boxShadow: {
        sticker: "4px 4px 0 0 #7DFFC2",
        "sticker-gold": "4px 4px 0 0 #F5B942",
        "sticker-coral": "4px 4px 0 0 #E07A6A",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
export default config;
