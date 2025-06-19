// __tests__/components/SessionSidebar.test.tsx
import { render, screen } from "@testing-library/react";
import SessionSidebar from "@/components/chat/SessionSidebar";
import { SessionContext } from "@/context/SessionContext";
import { mockSession } from "../utils/mockSession";

const mockSessions = [
  { id: "1", title: "Therapy 1", shared: false },
  { id: "2", title: "Shared Session", shared: true },
];

jest.mock("@/hooks/useSessions", () => ({
  useSessions: () => ({
    sessions: mockSessions,
    loading: false,
  }),
}));

describe("SessionSidebar", () => {
  it("renders sessions with shared tag", () => {
    render(
      <SessionContext.Provider value={mockSession}>
        <SessionSidebar />
      </SessionContext.Provider>
    );

    expect(screen.getByText("Therapy 1")).toBeInTheDocument();
    expect(screen.getByText("Shared Session")).toBeInTheDocument();
  });
});
