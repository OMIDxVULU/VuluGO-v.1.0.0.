// E2E Jest setup for jsdom environment
// Extend expect with @testing-library/jest-native if available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jestNative = require('@testing-library/jest-native');
  // eslint-disable-next-line no-undef
  expect.extend(jestNative.matchers);
} catch (_) {
  // Optional dependency not present in all environments
}

// Silence noisy console warnings in CI if needed
if (process.env.CI) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && /deprecated|Warning:/.test(args[0])) return;
    originalWarn(...args);
  };
}

