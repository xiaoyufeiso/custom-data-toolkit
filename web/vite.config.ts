/// <reference types="vitest/config" />
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isAnalyze = env.ANALYZE === 'true';
  return {
    base: './',
    plugins: [
      react(),
      ViteImageOptimizer({
        png: { quality: 80 },
        jpeg: { quality: 75 },
        webp: { quality: 80 },
      }),
      isAnalyze
        && visualizer({
          open: true,
          gzipSize: true,
          brotliSize: true,
          filename: 'dist/stats.html',
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {},
        },
      },
    },

    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames(assetInfo) {
            const name = assetInfo.names?.[0] ?? '';
            if (/\.css$/i.test(name)) return 'css/[name]-[hash][extname]';
            if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(name)) return 'images/[name]-[hash][extname]';
            if (/\.(woff2?|ttf|eot|otf)$/i.test(name)) return 'fonts/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
          experimentalMinChunkSize: 10 * 1024,
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
                return 'vendor-react';
              }
              // if (/[\\/](antd-v5|@ant-design|rc-[a-z])[\\/]/.test(id)) {
              //   return 'vendor-antd';
              // }
              if (/[\\/](axios|dayjs)[\\/]/.test(id)) {
                return 'vendor-utils';
              }
            }
            return undefined;
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },

    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
        },
      },
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      restoreMocks: true,
      clearMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.d.ts',
          'src/main.tsx',
          'src/pages/**',
          'src/test/**',
        ],
      },
    },
  };
});
