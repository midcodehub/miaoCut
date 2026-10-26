// Inherit the existing site's font, emerald palette and dark-mode convention.
const shared = require("../tailwind.config.js");
module.exports = { presets: [shared], content: ["./src/**/*.{ts,tsx}"], darkMode: "class" };
