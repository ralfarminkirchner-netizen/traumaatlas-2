import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  preview: {
    // Railway-Domain + weitere Railway-Hosts zulassen (vite preview prüft Host-Header)
    allowedHosts: ["traumaatlas-3-production.up.railway.app", ".up.railway.app"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
