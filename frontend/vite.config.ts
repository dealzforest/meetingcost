import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  server: {
    port: 3000,
    allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(",") : undefined,
  },
  preview: {
    port: 3000,
    allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(",") : undefined,
  },
});
