/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#38BDF8",
          dark: "#0EA5E9",
          deep: "#0369A1",
          soft: "#E0F2FE",
        },
        background: "#F8FCFF",
        surface: "#FFFFFF",
        text: {
          DEFAULT: "#0F172A",
          secondary: "#64748B",
        },
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15, 23, 42, 0.05)",
        md: "0 4px 16px rgba(15, 23, 42, 0.04)",
        lg: "0 8px 24px rgba(15, 23, 42, 0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
