import type { Config } from "tailwindcss";

/**
 * Tailwind theme is a thin map over the CSS custom properties in
 * `app/globals.css`. Tokens stay in one place — change a var, the whole
 * app re-themes.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
          4: "var(--bg-4)",
          elev: "var(--bg-elev)",
        },
        // Borders
        line: {
          1: "var(--line-1)",
          2: "var(--line-2)",
          3: "var(--line-3)",
        },
        // Foreground
        fg: {
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        // Brand & semantic
        brand: {
          purple: "var(--acc-purple)",
          blue: "var(--acc-blue)",
        },
        success: "var(--success)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        verified: "var(--verified)",
      },
      backgroundImage: {
        "acc-gradient": "var(--acc-gradient)",
        "acc-gradient-soft": "var(--acc-gradient-soft)",
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "28px",
      },
      boxShadow: {
        "elev-1": "var(--sh-1)",
        "elev-2": "var(--sh-2)",
        acc: "var(--sh-acc)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter: "-0.02em",
        tightest: "-0.035em",
      },
      spacing: {
        "4.5": "1.125rem", // 18px — icon size that sits between 4 (16) and 5 (20)
      },
    },
  },
  plugins: [],
};

export default config;
