// __tests__/utils/exportChatToPDF.test.ts
import { Message } from "@/types";
import { exportChatToPDF } from "@/utils/export";

describe("exportChatToPDF", () => {
  it("runs without crashing", () => {
    const messages = [
      { role: "user", content: "Hello", created_at: new Date().toISOString() },
      { role: "assistant", content: "Hi there", created_at: new Date().toISOString() },
    ] as Message[];

    // mock jsPDF
    global.window = Object.create(window);
    const url = "blob:http://localhost/test";
    window.URL.createObjectURL = jest.fn(() => url);
    window.open = jest.fn();

    exportChatToPDF("Test Chat", messages);
    expect(window.open).toHaveBeenCalledWith(url);
  });
});
