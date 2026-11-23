import { normalizeFacelets } from "./cube/orientation";

export interface ApiErrorBody {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
  detail?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: string[];

  constructor(message: string, status = 0, code = "network_error", details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  solver: string;
  tablesCached: boolean;
  tablesLoaded: boolean;
  scanning: boolean;
}

export interface SolveResponse {
  solution: string[];
  moveCount: number;
  notation: string;
  verified: boolean;
  normalized: boolean;
  elapsedMs: number;
  nodes: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  counts: Record<string, number>;
  normalizedCube: string;
  normalized: boolean;
}

export interface ScrambleResponse {
  moves: string[];
  notation: string;
  length: number;
}

export interface ScanResponse {
  stickers: Array<string | null>;
  confidences: number[];
  warnings: string[];
  quadDetected: boolean;
  averageColor: string | null;
  face: string | null;
}

const RAW_BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_BASE = RAW_BASE;

function endpoint(path: string): string {
  // Same-origin deployments (and Vite's dev proxy) serve the API under /api.
  return RAW_BASE ? `${RAW_BASE}${path}` : `/api${path}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Ignore non-JSON error bodies.
  }
  if (body?.error) {
    const details = Array.isArray(body.error.details)
      ? body.error.details.map((item) => String(item))
      : [];
    return new ApiError(
      body.error.message ?? "The solver request failed.",
      response.status,
      body.error.code ?? "api_error",
      details,
    );
  }
  if (typeof body?.detail === "string") {
    return new ApiError(body.detail, response.status, "api_error");
  }
  return new ApiError(
    `The solver API returned ${response.status}.`,
    response.status,
    "api_error",
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the solver API. Check that the backend is running and VITE_API_URL is set.",
      0,
      "network_error",
    );
  }
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  solve(cube: string): Promise<SolveResponse> {
    const normalized = normalizeFacelets(cube);
    return request<SolveResponse>("/solve", {
      method: "POST",
      body: JSON.stringify({ cube: normalized.facelets }),
    });
  },

  validate(cube: string): Promise<ValidationResponse> {
    return request<ValidationResponse>("/validate", {
      method: "POST",
      body: JSON.stringify({ cube }),
    });
  },

  scramble(length = 20): Promise<ScrambleResponse> {
    return request<ScrambleResponse>("/scramble", {
      method: "POST",
      body: JSON.stringify({ length }),
    });
  },

  scan(image: string, face?: string): Promise<ScanResponse> {
    return request<ScanResponse>("/scan/detect", {
      method: "POST",
      body: JSON.stringify({ image, face }),
    });
  },
};
