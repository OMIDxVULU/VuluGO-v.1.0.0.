import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  message: string;
  submessage?: string;
  type: 'loading' | 'success' | 'error';
}

export interface AuthLoadingHook {
  loadingState: LoadingState;
  setLoading: (message: string, submessage?: string) => void;
  setSuccess: (message: string, submessage?: string) => void;
  setError: (message: string, submessage?: string) => void;
  clearLoading: () => void;
  isLoading: boolean;
}

const defaultState: LoadingState = {
  isLoading: false,
  message: '',
  type: 'loading',
};

export const useAuthLoading = (): AuthLoadingHook => {
  const [loadingState, setLoadingState] = useState<LoadingState>(defaultState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setLoading = useCallback((message: string, submessage?: string) => {
    setLoadingState({
      isLoading: true,
      message,
      submessage,
      type: 'loading',
    });
  }, []);

  const setSuccess = useCallback((message: string, submessage?: string) => {
    setLoadingState({
      isLoading: true,
      message,
      submessage,
      type: 'success',
    });

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-clear success state after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setLoadingState(defaultState);
    }, 2000);
  }, []);

  const setError = useCallback((message: string, submessage?: string) => {
    setLoadingState({
      isLoading: true,
      message,
      submessage,
      type: 'error',
    });

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-clear error state after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setLoadingState(defaultState);
    }, 3000);
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingState(defaultState);
  }, []);

  return {
    loadingState,
    setLoading,
    setSuccess,
    setError,
    clearLoading,
    isLoading: loadingState.isLoading,
  };
};

// Predefined loading messages for common auth operations
export const AuthLoadingMessages = {
  SIGNING_IN: {
    message: 'Signing you in...',
    submessage: 'Please wait while we authenticate your account',
  },
  SIGNING_UP: {
    message: 'Creating your account...',
    submessage: 'Setting up your VuluGO profile',
  },
  SENDING_RESET_EMAIL: {
    message: 'Sending reset email...',
    submessage: 'Check your inbox in a moment',
  },
  SENDING_VERIFICATION: {
    message: 'Sending verification email...',
    submessage: 'This will help secure your account',
  },
  VERIFYING_EMAIL: {
    message: 'Verifying your email...',
    submessage: 'Checking verification status',
  },
  UPDATING_PASSWORD: {
    message: 'Updating password...',
    submessage: 'Securing your account with new password',
  },
  SIGNING_OUT: {
    message: 'Signing you out...',
    submessage: 'Clearing your session securely',
  },
  SUCCESS_SIGNED_IN: {
    message: 'Welcome back!',
    submessage: 'Successfully signed in to your account',
  },
  SUCCESS_SIGNED_UP: {
    message: 'Account created!',
    submessage: 'Welcome to VuluGO',
  },
  SUCCESS_EMAIL_SENT: {
    message: 'Email sent!',
    submessage: 'Check your inbox for further instructions',
  },
  SUCCESS_EMAIL_VERIFIED: {
    message: 'Email verified!',
    submessage: 'Your account is now fully verified',
  },
  SUCCESS_PASSWORD_UPDATED: {
    message: 'Password updated!',
    submessage: 'Your account is now more secure',
  },
  ERROR_NETWORK: {
    message: 'Connection error',
    submessage: 'Please check your internet connection and try again',
  },
  ERROR_INVALID_CREDENTIALS: {
    message: 'Invalid credentials',
    submessage: 'Please check your email and password',
  },
  ERROR_EMAIL_IN_USE: {
    message: 'Email already in use',
    submessage: 'Try signing in instead or use a different email',
  },
  ERROR_WEAK_PASSWORD: {
    message: 'Password too weak',
    submessage: 'Please choose a stronger password',
  },
  ERROR_USER_NOT_FOUND: {
    message: 'Account not found',
    submessage: 'No account exists with this email address',
  },
  ERROR_TOO_MANY_REQUESTS: {
    message: 'Too many attempts',
    submessage: 'Please wait a moment before trying again',
  },
  ERROR_GENERIC: {
    message: 'Something went wrong',
    submessage: 'Please try again in a moment',
  },
};
