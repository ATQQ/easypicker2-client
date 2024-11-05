import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    // ElementPlus({
    //   defaultLocale: 'zh-cn'
    // })
  ],
  optimizeDeps: {
    include: ['vue', 'vue-router', 'vuex', 'axios', 'vue-json-viewer'],
  },
  build: {
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ''),
      },
      '/api-test/': {
        target: 'https://ep.test.sugarat.top',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api-test/, 'api/'),
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
