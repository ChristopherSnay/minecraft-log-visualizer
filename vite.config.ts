import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: mode === "production" ? "/minecraft-log-visualizer/" : "/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
                return "chartjs";
              }
              if (id.includes("@mui") || id.includes("@emotion")) {
                return "mui";
              }
            }
          },
        },
      },
    },
  };
});
