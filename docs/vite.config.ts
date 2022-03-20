import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Components({
      include: [/\.vue/, /\.md/],
      dts: true,
    }),
  ],
  optimizeDeps: {
    include: [
      'vue',
    ],
  },
})
