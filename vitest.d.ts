/// <reference types="vitest/globals" />
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = unknown>
    extends jest.Matchers<void, T>,
      TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<unknown, void> {}
}
