import { defineConfig } from 'tsup'

export default defineConfig({
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  entryPoints: ['src/index.ts'],
})
