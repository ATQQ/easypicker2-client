import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import styleImport from 'vite-plugin-style-import'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // styleImport({
    //   libs: [{
    //     libraryName: 'element-plus',
    //     resolveStyle: (name) => `element-plus/lib/theme-chalk/${name}.css`,
    //     resolveComponent: (name) => `element-plus/lib/${name}`,
    //   }],
    // }),
  ],
  build: {
    target: 'modules', // 默认值
    sourcemap: true,
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
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
