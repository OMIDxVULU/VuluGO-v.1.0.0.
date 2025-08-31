/**
 * Global type definitions for React Native compatibility
 */

// React Native ErrorUtils type definitions
export type ErrorHandlerCallback = (error: any, isFatal?: boolean) => void;

export interface ErrorUtils {
  setGlobalHandler(callback: ErrorHandlerCallback): void;
  getGlobalHandler(): ErrorHandlerCallback | null;
}

// Global ErrorUtils declaration for React Native
declare global {
  var ErrorUtils: ErrorUtils;
}

export {};
