import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          "vendor-mapbox": ["mapbox-gl"],
          "vendor-motion": ["motion"],
          "vendor-react": ["react", "react-dom", "react/jsx-runtime"],
        },
      },
    },
  },
});
