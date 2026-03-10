/**
 * Structured error thrown by decoders when decoding fails.
 * Contains path (breadcrumb trail in the decoded object), expected type, received value, and message.
 */
export class DecodeError extends Error {
  constructor(
    readonly message: string,
    readonly path: (string | number)[] = [],
    readonly expected?: string,
    readonly received?: unknown,
  ) {
    super(message);
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, DecodeError.prototype);
  }

  /**
   * Create a DecodeError with message and expected type (simple constructor for basic errors).
   */
  static simple(message: string, expected?: string): DecodeError {
    return new DecodeError(message, [], expected);
  }

  /**
   * Return the error message (called by String(error) or error.toString())
   */
  override toString(): string {
    return this.message;
  }

  /**
   * Add a path segment (key or index) to the error's path.
   * Returns a new DecodeError with updated path for bubbling up.
   */
  withPath(segment: string | number): DecodeError {
    return new DecodeError(
      this.message,
      [segment, ...this.path],
      this.expected,
      this.received,
    );
  }

  /**
   * Format the path as a JSON Pointer-like string.
   * E.g., ['user', 'address', 'zipcode'] => '/user/address/zipcode'
   */
  getPathString(): string {
    if (this.path.length === 0) return '';
    return '/' + this.path.map(String).join('/');
  }
}
