// __tests__/api/summarize-title.test.ts
import handler from "@/pages/api/summarize-title";
import { createMocks } from "node-mocks-http";

describe("/api/summarize-title", () => {
  it("rejects non-POST requests", async () => {
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns 400 on invalid body", async () => {
    const { req, res } = createMocks({ method: "POST", body: {} });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it("calls OpenAI and returns summary", async () => {
    process.env.OPENAI_API_KEY = "test";

    const { req, res } = createMocks({
      method: "POST",
      body: {
        messages: [
          { role: "user", content: "Hello", created_at: new Date().toISOString() },
        ],
      },
    });

    // mock OpenAI client
    jest.mock("openai", () => ({
      default: function () {
        return {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [{ message: { content: "Mock summary" } }],
              }),
            },
          },
        };
      },
    }));

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData()).toContain("Mock summary");
  });
});
