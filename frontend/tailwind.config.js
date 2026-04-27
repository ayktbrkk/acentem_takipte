import frappeUiPreset from "frappe-ui/tailwind";
import colors from "tailwindcss/colors";

const modernTailwindColors = {
  inherit: colors.inherit,
  current: colors.current,
  transparent: colors.transparent,
  black: colors.black,
  white: colors.white,
  slate: colors.slate,
  gray: colors.gray,
  zinc: colors.zinc,
  neutral: colors.neutral,
  stone: colors.stone,
  red: colors.red,
  orange: colors.orange,
  amber: colors.amber,
  yellow: colors.yellow,
  lime: colors.lime,
  green: colors.green,
  emerald: colors.emerald,
  teal: colors.teal,
  cyan: colors.cyan,
  sky: colors.sky,
  blue: colors.blue,
  indigo: colors.indigo,
  violet: colors.violet,
  purple: colors.purple,
  fuchsia: colors.fuchsia,
  pink: colors.pink,
  rose: colors.rose,
};

/** @type {import('tailwindcss').Config} */
export default {
  presets: [frappeUiPreset],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ...modernTailwindColors,
        brand: {
          50: "#EBF3FF",
          100: "#C8DFFE",
          200: "#96C0FC",
          400: "#4A8DE8",
          500: "#3B82F6",
          600: "#1B5DB8",
          700: "#1650A0",
          800: "#0E3C7A",
          900: "#082754"
        },
        "at-green": "#10B981",
        "at-amber": "#F59E0B",
        "at-red": "#EF4444",
        status: {
          "active-bg": "#ECFDF5",
          "active-text": "#065F46",
          "draft-bg": "#F8FAFC",
          "draft-text": "#475569",
          "waiting-bg": "#FFFBEB",
          "waiting-text": "#92400E",
          "open-bg": "#EFF6FF",
          "open-text": "#1E40AF",
          "cancel-bg": "#FEF2F2",
          "cancel-text": "#991B1B"
        }
      },
      fontSize: {
        "2xs": ["10.5px", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },
      borderWidth: {
        DEFAULT: "0.5px",
      },
    },
  },
  plugins: [],
};
