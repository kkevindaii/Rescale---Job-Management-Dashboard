// PostCSS processes CSS files through a pipeline of plugins.
// Tailwind uses PostCSS to inject its utility classes, and autoprefixer
// adds vendor prefixes (-webkit-, -moz-, etc.) for browser compatibility.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
