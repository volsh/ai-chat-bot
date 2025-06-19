// __tests__/utils/summarizeSession.test.ts
import { summarizeSession } from "@/utils/chat/summarizeSession";
import { Message } from "@/types";
import { vi } from "vitest";

const mockMessages: Message[] = [
  { role: "user", content: "What is ADHD?", created_at: new Date().toISOString() },
  {
    role: "assistant",
    content: "ADHD is a neurodevelopmental disorder...",
    created_at: new Date().toISOString(),
  },
];

describe("summarizeSession", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a valid summary string", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: "Summary of the chat" }),
    } as Response);

    const summary = await summarizeSession(mockMessages);
    expect(summary).toBe("Summary of the chat");
  });

  it("throws on API error", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed" }),
    } as Response);

    await expect(summarizeSession(mockMessages)).rejects.toThrow("Failed");
  });
});
