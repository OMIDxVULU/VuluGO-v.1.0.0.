/**
 * Circuit Breaker utility to prevent cascading failures and infinite retry loops
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  maxRetries: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
}

class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitBreakerStats;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      maxRetries: 3,
      ...config
    };

    this.stats = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      nextAttemptTime: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.shouldReject()) {
      throw new Error(`Circuit breaker ${this.name} is OPEN. Service temporarily unavailable.`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldReject(): boolean {
    const now = Date.now();

    // If circuit is closed, allow operation
    if (this.stats.state === CircuitState.CLOSED) {
      return false;
    }

    // If circuit is open, check if we should try again
    if (this.stats.state === CircuitState.OPEN) {
      if (now >= this.stats.nextAttemptTime) {
        this.stats.state = CircuitState.HALF_OPEN;
        return false;
      }
      return true;
    }

    // If half-open, allow one attempt
    return false;
  }

  private onSuccess(): void {
    this.stats.successCount++;
    this.stats.lastSuccessTime = Date.now();

    if (this.stats.state === CircuitState.HALF_OPEN) {
      this.stats.state = CircuitState.CLOSED;
      this.stats.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.stats.failureCount++;
    this.stats.lastFailureTime = Date.now();

    if (this.stats.failureCount >= this.config.failureThreshold) {
      this.stats.state = CircuitState.OPEN;
      this.stats.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  getStats(): CircuitBreakerStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      nextAttemptTime: 0
    };
  }

  isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastFailure = now - this.stats.lastFailureTime;
    
    return this.stats.state === CircuitState.CLOSED && 
           (this.stats.failureCount === 0 || timeSinceLastFailure > this.config.monitoringPeriod);
  }
}

// Global circuit breakers for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

export const getCircuitBreaker = (name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker => {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, config));
  }
  return circuitBreakers.get(name)!;
};

// Predefined circuit breakers for common operations
export const FirebaseCircuitBreakers = {
  AUTH: getCircuitBreaker('firebase-auth', {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    maxRetries: 2
  }),
  
  FIRESTORE: getCircuitBreaker('firebase-firestore', {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    maxRetries: 3
  }),
  
  USERNAME_CHECK: getCircuitBreaker('username-check', {
    failureThreshold: 2,
    resetTimeout: 15000, // 15 seconds
    maxRetries: 1
  }),
  
  STORAGE: getCircuitBreaker('firebase-storage', {
    failureThreshold: 3,
    resetTimeout: 45000, // 45 seconds
    maxRetries: 2
  })
};

// Utility function to execute with retry and circuit breaker
export const executeWithCircuitBreaker = async <T>(
  circuitBreaker: CircuitBreaker,
  operation: () => Promise<T>,
  retryConfig: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2
  } = retryConfig;

  let lastError: Error;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      lastError = error as Error;
      
      // If circuit breaker is open, don't retry
      if (error instanceof Error && error.message.includes('Circuit breaker') && error.message.includes('OPEN')) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError!;
};

// Health check utility
export const getCircuitBreakerHealth = (): Record<string, CircuitBreakerStats> => {
  const health: Record<string, CircuitBreakerStats> = {};
  
  circuitBreakers.forEach((breaker, name) => {
    health[name] = breaker.getStats();
  });
  
  return health;
};

// Reset all circuit breakers (useful for testing or manual recovery)
export const resetAllCircuitBreakers = (): void => {
  circuitBreakers.forEach(breaker => breaker.reset());
};
