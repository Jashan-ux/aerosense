import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        emptyOutDir: true,
        sourcemap: false,
    },
    css: {
        postcss: './postcss.config.js'
    },
    server: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/ws': {
                target: 'ws://127.0.0.1:8000',
                ws: true
            }
        }
    },
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: '@',
                replacement: fileURLToPath(new URL('./src', import.meta.url))
            }
        ]
    }
});
