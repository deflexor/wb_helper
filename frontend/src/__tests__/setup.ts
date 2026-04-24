// Vitest setup file - loaded before tests run
// Mock ResizeObserver for @radix-ui components
if (typeof global !== 'undefined') {
  (global as unknown as { ResizeObserver?: unknown }).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
