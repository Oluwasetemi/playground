import setemiojo from '@setemiojo/eslint-config'

export default setemiojo(
  {
    typescript: {
      overrides: {
        'ts/ban-ts-comment': 'off',
        'ts/prefer-ts-expect-error': 'off',
      },
    },
    markdown: true,
  },
  {
    ignores: [
      'README.md',
      'examples/README.md',
      'docs/superpowers/plans/',
    ],
  },
)
