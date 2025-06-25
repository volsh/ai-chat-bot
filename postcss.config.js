// postcss.config.js
module.exports = {
  plugins: {
    'postcss-nested': {}, // 👈 must be before tailwindcss
    tailwindcss: {},
    autoprefixer: {},
  },
};
