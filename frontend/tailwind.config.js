import frappeUiPreset from "frappe-ui/tailwind";
import colors from "tailwindcss/colors";

const {
  lightBlue: _lightBlue,
  warmGray: _warmGray,
  trueGray: _trueGray,
  coolGray: _coolGray,
  blueGray: _blueGray,
  ...tailwindColors
} = colors;

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
      colors: {
        ...tailwindColors,
        brand: {
          50: "#eef9ff",
          100: "#d8f1ff",
          500: "#0ea5e9",
          700: "#0369a1",
          900: "#0c4a6e"
        }
      }
    },
  },
  plugins: [],
};
