// __tests__/api/save-summary.test.ts
import handler from "@/pages/api/save-summary";
import { createMocks } from "node-mocks-http";

jest.mock("@/libs/supabase", () => ({
  createSupabaseServerClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
  }),
}));

describe("/api/save-summary", () => {
  it("rejects non-POST requests", async () => {
    const { req, res } = createMocks({ method: "GET" });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it("returns 400 on missing fields", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: {},
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it("saves valid summary", async () => {
    const { req, res } = createMocks({
      method: "POST",
      body: { sessionId: "abc", summary: "test summary" },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData()).toContain("success");
  });
});
