import { getToken, sessionStore } from './session';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

interface FieldError {
  field: string;
  message: string;
}

/** An error response from the API: `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level messages from a 400 validation error, keyed by field name. */
  get fieldErrors(): Record<string, string> {
    if (this.status !== 400 || !Array.isArray(this.details)) return {};
    return Object.fromEntries((this.details as FieldError[]).map(({ field, message }) => [field, message]));
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON, unless it is a FormData (file upload). */
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const queryString = params.toString();
  return `${API_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

async function send(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new ApiError(
      response.status,
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      payload?.error?.details,
    );
    // A rejected token means the session is over: drop it, and the route guard
    // sends the user to the login page on the next navigation.
    if (response.status === 401 && token) sessionStore.clear();
    throw error;
  }
  return response;
}

/** Calls the API and returns the full body: `{ data, meta? }`. */
export async function apiRequest<TData, TMeta = undefined>(
  path: string,
  options?: RequestOptions,
): Promise<{ data: TData; meta: TMeta }> {
  const response = await send(path, options);
  return response.json();
}

/** Calls the API and returns just `data`. */
export async function api<TData>(path: string, options?: RequestOptions): Promise<TData> {
  return (await apiRequest<TData>(path, options)).data;
}

/**
 * Downloads a protected file. Documents are not served from public URLs, so a
 * plain link cannot open them; the file is fetched with the token and handed
 * to the browser as a temporary object URL.
 */
export async function fetchFileUrl(fileId: string): Promise<string> {
  const response = await send(`/files/${fileId}`);
  return URL.createObjectURL(await response.blob());
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';
