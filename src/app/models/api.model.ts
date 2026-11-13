export interface ProblemDetailsError {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly message?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export type ResultEnvelope<T> =
  | { readonly isSuccess: true; readonly value: T }
  | { readonly isSuccess: false; readonly error?: string; readonly errorCode?: string };

export type AsyncState<T> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly data: T }
  | { readonly kind: 'error'; readonly message: string };

export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union variant: ${JSON.stringify(value)}`);
}

export function isResultEnvelope<T>(payload: unknown): payload is ResultEnvelope<T> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'isSuccess' in payload &&
    typeof (payload as { isSuccess: unknown }).isSuccess === 'boolean'
  );
}

export function unwrapResult<T>(payload: T | ResultEnvelope<T>): T {
  if (isResultEnvelope<T>(payload)) {
    if (payload.isSuccess) {
      return payload.value;
    }
    throw new Error(payload.error || 'Operation failed');
  }
  return payload;
}

export function extractProblemDetailsMessage(errorPayload: unknown, fallback = 'An unexpected error occurred.'): string {
  if (!errorPayload) {
    return fallback;
  }

  if (typeof errorPayload === 'string') {
    return errorPayload;
  }

  if (typeof errorPayload === 'object') {
    const details = errorPayload as ProblemDetailsError;
    if (details.errors && typeof details.errors === 'object') {
      const firstKey = Object.keys(details.errors)[0];
      if (firstKey) {
        const list = details.errors[firstKey];
        if (Array.isArray(list) && list.length > 0 && list[0]) {
          return list[0];
        }
      }
    }
    if (details.detail) {
      return details.detail;
    }
    if (details.title) {
      return details.title;
    }
    if (details.message) {
      return details.message;
    }
  }

  return fallback;
}

