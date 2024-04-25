import typography from "@tailwindcss/typography";
import daisyui from "daisyui";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  plugins: [typography, daisyui],
  daisyui: {
    themes: ["cyberpunk"],
  },
};
