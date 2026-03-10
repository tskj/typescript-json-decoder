/**
 * Structured error thrown by decoders when decoding fails.
 * Contains path (breadcrumb trail in the decoded object), expected type, received value, and message.
 */
export class DecodeError extends Error {
  readonly children: DecodeError[];

  constructor(
    readonly message: string,
    readonly path: (string | number)[] = [],
    readonly expected?: string,
    readonly received?: unknown,
    children?: DecodeError[],
  ) {
    super(message);
    Object.setPrototypeOf(this, DecodeError.prototype);
    this.children = children ?? [];
  }

  /**
   * Create a DecodeError with message, expected type, and optionally received value.
   */
  static simple(message: string, expected?: string, received?: unknown): DecodeError {
    return new DecodeError(message, [], expected, received);
  }

  /**
   * Create a compound DecodeError from multiple child errors (e.g. union, intersection).
   */
  static compound(message: string, children: DecodeError[], received?: unknown): DecodeError {
    return new DecodeError(message, [], undefined, received, children);
  }

  /**
   * Format the error for display: includes path prefix and child errors.
   */
  override toString(): string {
    const pathStr = this.getPathString();
    const prefix = pathStr ? `at ${pathStr}: ` : '';
    if (this.children.length > 0) {
      const childMessages = this.children.map(c => '  - ' + c.toString()).join('\n');
      return `${prefix}${this.message}:\n${childMessages}`;
    }
    return `${prefix}${this.message}`;
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
      this.children,
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

/**
 * Normalize any caught value to a DecodeError.
 */
export const asDecodeError = (error: unknown): DecodeError =>
  error instanceof DecodeError ? error : DecodeError.simple(String(error));
