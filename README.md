# TabulaRasa — Cosmic Orange Chemistry Explorer

An interactive periodic table with all 118 chemical elements, real-world specimen imagery, a Bohr shell visualizer, temperature-state simulation, property heatmaps, and a new Cosmic Chemistry Lab.

## Features

- All 118 elements with searchable element metadata.
- Cosmic Orange space-inspired glassmorphic theme.
- Animated Bohr electron-shell visualizer.
- Temperature simulation from 0 K to 6000 K.
- Heatmaps for atomic mass, density, electronegativity, melting point and boiling point.
- Element of the Day.
- Browser-local saved elements/favorites.
- Pairwise element comparison.
- Property Trend Explorer with period filtering.
- Curated human-use history for key elements plus a dataset-driven fallback for every element.
- Data-driven chemistry challenge.
- Keyboard navigation and zero-build static hosting.

## Data basis

The original application uses IUPAC/NIST-oriented scientific data and Wikimedia Commons specimen imagery. The new historical-use panels are explicitly educational context layered over the existing discovery and uses fields; they are not intended to replace primary historical sources.

## GitHub Pages

The site is configured for GitHub Pages through a GitHub Actions workflow in `.github/workflows/deploy.yml`. On GitHub.com, the project-site URL follows the pattern:

`https://theraghavraman.github.io/periodic_tabularasa/`

GitHub Pages still requires the repository's Pages publishing source to be enabled in Settings → Pages; GitHub's documentation specifies selecting **GitHub Actions** when using a custom Pages workflow.

## Local use

Open `index.html` in a modern browser or serve the directory with any static HTTP server.

No npm install or build step is required.
