import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("API client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the /api prefix when no VITE_API_URL is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./api");
    await api.health();
    await api.scramble(20);

    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/scramble",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ length: 20 }) }),
    );
  });
});
