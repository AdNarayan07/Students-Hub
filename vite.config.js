import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  }, 
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/');
            if (parts.length > 1) {
              const modulePath = parts[1];
              const moduleParts = modulePath.split('/');
              const moduleName = moduleParts[0];
              const subPath = moduleParts.slice(1).join('/');

              if (moduleName === 'refractor') {
                if (subPath.startsWith('lang/')) {
                  // Extract the first letter of the file or directory name
                  const langPath = subPath.split('lang/')[1];
                  if (langPath) {
                    const firstLetter = langPath[0].toLowerCase(); // Get the first letter
                    // Create a chunk name based on the first letter
                    return `vendor-refractor-lang-${firstLetter}`;
                  }
                }
                return `vendor-refractor-${moduleName}`;
              }
              return `vendor-${moduleName}`;
            }
          }
        }
      }
    }
  }
}));
