/**
 * Stream Status Circuit Breaker
 * Prevents infinite loops in stream status checking
 */

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: number;
}

class StreamStatusCircuitBreaker {
  private static instance: StreamStatusCircuitBreaker;
  private circuits = new Map<string, CircuitBreakerState>();
  
  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly RESET_TIMEOUT_MS = 60000; // 1 minute

  private constructor() {}

  static getInstance(): StreamStatusCircuitBreaker {
    if (!StreamStatusCircuitBreaker.instance) {
      StreamStatusCircuitBreaker.instance = new StreamStatusCircuitBreaker();
    }
    return StreamStatusCircuitBreaker.instance;
  }

  /**
   * Check if operation should be allowed
   */
  canExecute(streamId: string): boolean {
    const circuit = this.getCircuit(streamId);
    const now = Date.now();

    switch (circuit.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= circuit.nextAttempt) {
          circuit.state = 'HALF_OPEN';
          console.log(`🔄 [CIRCUIT_BREAKER] Stream ${streamId} circuit moving to HALF_OPEN`);
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return true;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(streamId: string): void {
    const circuit = this.getCircuit(streamId);
    
    if (circuit.state === 'HALF_OPEN') {
      console.log(`✅ [CIRCUIT_BREAKER] Stream ${streamId} circuit closing after success`);
      circuit.state = 'CLOSED';
    }
    
    circuit.failures = 0;
  }

  /**
   * Record failed operation
   */
  recordFailure(streamId: string, error?: string): void {
    const circuit = this.getCircuit(streamId);
    const now = Date.now();
    
    circuit.failures++;
    circuit.lastFailure = now;

    if (circuit.failures >= this.FAILURE_THRESHOLD) {
      circuit.state = 'OPEN';
      circuit.nextAttempt = now + this.RESET_TIMEOUT_MS;
      
      console.warn(`⚠️ [CIRCUIT_BREAKER] Stream ${streamId} circuit opened after ${circuit.failures} failures`);
      if (error) {
        console.warn(`   Last error: ${error}`);
      }
    }
  }

  /**
   * Get circuit state for a stream
   */
  getCircuitState(streamId: string): string {
    return this.getCircuit(streamId).state;
  }

  /**
   * Force reset a circuit
   */
  resetCircuit(streamId: string): void {
    const circuit = this.getCircuit(streamId);
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.lastFailure = 0;
    circuit.nextAttempt = 0;
    
    console.log(`🔄 [CIRCUIT_BREAKER] Stream ${streamId} circuit manually reset`);
  }

  /**
   * Get or create circuit for stream
   */
  private getCircuit(streamId: string): CircuitBreakerState {
    if (!this.circuits.has(streamId)) {
      this.circuits.set(streamId, {
        failures: 0,
        lastFailure: 0,
        state: 'CLOSED',
        nextAttempt: 0
      });
    }
    return this.circuits.get(streamId)!;
  }

  /**
   * Clean up old circuits
   */
  cleanup(): void {
    const now = Date.now();
    const CLEANUP_AGE = 5 * 60 * 1000; // 5 minutes
    
    for (const [streamId, circuit] of this.circuits.entries()) {
      if (now - circuit.lastFailure > CLEANUP_AGE && circuit.failures === 0) {
        this.circuits.delete(streamId);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
  } {
    let open = 0, halfOpen = 0, closed = 0;
    
    for (const circuit of this.circuits.values()) {
      switch (circuit.state) {
        case 'OPEN': open++; break;
        case 'HALF_OPEN': halfOpen++; break;
        case 'CLOSED': closed++; break;
      }
    }
    
    return {
      totalCircuits: this.circuits.size,
      openCircuits: open,
      halfOpenCircuits: halfOpen,
      closedCircuits: closed
    };
  }
}

// Export singleton instance
export const streamStatusCircuitBreaker = StreamStatusCircuitBreaker.getInstance();

// Convenience wrapper for stream validation with circuit breaker
export const validateStreamWithCircuitBreaker = async (
  streamId: string,
  validationFn: () => Promise<any>
): Promise<any> => {
  if (!streamStatusCircuitBreaker.canExecute(streamId)) {
    const state = streamStatusCircuitBreaker.getCircuitState(streamId);
    throw new Error(`Stream validation circuit breaker is ${state} for stream ${streamId}`);
  }

  try {
    const result = await validationFn();
    streamStatusCircuitBreaker.recordSuccess(streamId);
    return result;
  } catch (error) {
    streamStatusCircuitBreaker.recordFailure(streamId, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export default streamStatusCircuitBreaker;
