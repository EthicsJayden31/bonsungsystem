import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        muted: "#666666",
        line: "#E5E0DD",
        brand: "#680F12",
        "brand-dark": "#3C0608",
        "brand-soft": "#7F1518",
        canvas: "#F2F2F2",
        "surface-muted": "#F2F2F2",
        accent: "#B7791F",
        success: "#2F7D4F",
        danger: "#B42318"
      },
      boxShadow: {
        card: "0 18px 45px rgba(60, 6, 8, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
