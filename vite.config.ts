import { defineConfig } from "vite";

// The web app lives in web/ and imports the compiled engine from dist/.
// Run `npm run build` first (or `npm run dev:web` which builds then serves).
export default defineConfig({
  root: "web",
  build: { outDir: "../web-dist", emptyOutDir: true },
  server: { port: 5173, open: false },
});
