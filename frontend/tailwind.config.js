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
        status: {
          "active-bg": "#E4F5EB",
          "active-text": "#145E2F",
          "draft-bg": "#F1EFE8",
          "draft-text": "#5F5E5A",
          "waiting-bg": "#FEF3DC",
          "waiting-text": "#7A4A00",
          "open-bg": "#EBF3FF",
          "open-text": "#1B5DB8",
          "cancel-bg": "#FEE9E8",
          "cancel-text": "#8B1C1C"
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
