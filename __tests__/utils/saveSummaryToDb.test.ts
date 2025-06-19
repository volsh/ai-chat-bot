// __tests__/utils/saveSummaryToDb.test.ts
import { saveSummaryToDb } from "@/utils/chat/saveSummaryToDb";
import { vi } from "vitest";

global.fetch = vi.fn();

describe("saveSummaryToDb", () => {
  it("sends a valid POST request", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await saveSummaryToDb("session-123", "This is a test summary");
    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith(
      "/api/save-summary",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("throws if request fails", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed" }),
    });

    await expect(
      saveSummaryToDb("bad-session", "bad summary")
    ).rejects.toThrow("Failed");
  });
});
