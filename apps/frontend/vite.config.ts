import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import solidSvg from 'vite-plugin-solid-svg'
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// set env variables -> https://github.com/vitejs/vite/issues/562#issuecomment-754971271
const viteEnv: any = {}
Object.keys(process.env).forEach((key) => {
  if (key.startsWith(`VITE_`)) {
    viteEnv[`import.meta.env.${key}`] = process.env[key]
  }
})
// For excalidraw
viteEnv['process.env'] = {}

export default defineConfig({
  plugins: [solid(), solidSvg({defaultAsComponent: true,})],
  server: {
    port: 4200
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src")
    }
  },
  define: viteEnv,
  build: {
    sourcemap: true,
  }
})
