import { defineConfig } from "vite";

// The web app lives in web/ and imports the compiled engine from dist/.
// Run `npm run build` first (or `npm run dev:web` which builds then serves).
//
// base: on `vite build` (production/GitHub Pages) assets must resolve under the
// project-page path /saju/; in dev we keep root "/" so http://localhost:5173 works.
export default defineConfig(({ command }) => ({
  root: "web",
  base: command === "build" ? "/saju/" : "/",
  build: { outDir: "../web-dist", emptyOutDir: true },
  server: { port: 5173, open: false },
}));
