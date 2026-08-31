import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
        server: {
            host: "0.0.0.0",
            port: 5173,
            proxy: {
                "/api/v1": {
                    target: env.PROXY_TARGET || "http://localhost:8000",
                    changeOrigin: true,
                },
                "/static": {
                    target: env.PROXY_TARGET || "http://localhost:8000",
                    changeOrigin: true,
                },
            },
        },
    };
});
