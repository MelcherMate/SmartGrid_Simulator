import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

const root = resolve(__dirname, "src");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    root,
    publicDir: resolve(__dirname, "public"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@img": resolve(__dirname, "src/utils/img"),
        "@pdf": resolve(__dirname, "src/utils/pdf"),
      },
    },
    define: {
      "process.env": {
        VITE_PUBLIC_URL: env.VITE_PUBLIC_URL,
        VITE_SERVER_URL: env.VITE_SERVER_URL,
      },
    },
  };
});
