import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: mode === "production" ? "/minecraft-log-visualizer/" : "/",
    plugins: [react()],
  };
});
