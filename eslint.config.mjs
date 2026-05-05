import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  rules: {
    'markdown/require-alt-text': 'off',
    'node/prefer-global/process': 'off',
    'no-console': 'off',
    'no-unused-vars': 'off',
  },
})
