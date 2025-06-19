// __tests__/components/ChatBox.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import ChatBox from "@/components/chat/ChatBox";
import { SessionContext } from "@/context/SessionContext";
import { mockSession } from "../utils/mockSession";

describe("ChatBox", () => {
  it("renders input and accepts message", () => {
    render(
      <SessionContext.Provider value={mockSession}>
        <ChatBox />
      </SessionContext.Provider>
    );

    const input = screen.getByPlaceholderText("Ask something…");
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(input).toHaveValue("Hello");
  });
});
