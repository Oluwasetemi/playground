import setemiojo from '@setemiojo/eslint-config'

export default setemiojo({
  typescript: {
    overrides: {
      'ts/ban-ts-comment': 'off',
      'ts/prefer-ts-expect-error': 'off',
    },
  },
  markdown: true,
})
