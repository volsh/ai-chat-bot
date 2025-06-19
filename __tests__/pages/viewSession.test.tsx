// __tests__/pages/ReviewSessionPage.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import ReviewSessionPage from "@/pages/review/[sessionId]";
import { SessionContext } from "@/context/SessionContext";
import { mockSession } from "../utils/mockSession";
import { Message } from "@/types";

const mockMessages = [
  { role: "user", content: "Hi", created_at: new Date().toISOString() },
  { role: "assistant", content: "Hello!", created_at: new Date().toISOString() },
] as Message[];

describe("ReviewSessionPage", () => {
  it("shows summary and messages", () => {
    render(
      <SessionContext.Provider value={mockSession}>
        <ReviewSessionPage
          sessionId="abc"
          messages={mockMessages}
          summary="AI thinks this was great"
        />
      </SessionContext.Provider>
    );

    expect(screen.getByText(/AI thinks this was great/)).toBeInTheDocument();
    expect(screen.getByText(/Hi/)).toBeInTheDocument();
    expect(screen.getByText(/Hello!/)).toBeInTheDocument();
  });

  it("toggles summary editor", () => {
    render(
      <SessionContext.Provider value={mockSession}>
        <ReviewSessionPage
          sessionId="abc"
          messages={mockMessages}
          summary="Initial summary"
        />
      </SessionContext.Provider>
    );

    const toggle = screen.getByText("Edit Summary");
    fireEvent.click(toggle);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
