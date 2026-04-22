import '@testing-library/jest-dom';

// Type augmentation for Vitest expect
declare global {
  namespace Vi {
    interface Assertion<T> {
      toBeInTheDocument(): void;
    }
  }
}