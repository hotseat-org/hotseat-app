const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  mode: 'jit',
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      128: '32rem',
    },
  },
  plugins: [],
})
