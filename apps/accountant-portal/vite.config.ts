import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
    proxy: {
      "/api/accountant": {
        target: "http://localhost:4055",
        changeOrigin: true,
      },
    },
  },
});
