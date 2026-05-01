import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  rules: {
    'markdown/require-alt-text': 'off',
  },
})
