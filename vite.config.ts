import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import ElementPlus from 'unplugin-element-plus/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { chunkSplitPlugin } from 'vite-plugin-chunk-split'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    ElementPlus({
      defaultLocale: 'zh-cn',
    }),
    chunkSplitPlugin({
      strategy: 'single-vendor',
    }),
  ],
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'vuex',
      'axios',
      'vue-json-viewer',
    ],
  },
  build: {
    target: 'modules', // 默认值
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/api-test/': {
        target: 'https://ep.dev.sugarat.top',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-test/, 'api/'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
})
