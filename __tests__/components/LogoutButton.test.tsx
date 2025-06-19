// __tests__/components/LogoutButton.test.tsx
import { render, screen } from "@testing-library/react";
import LogoutButton from "@/components/auth/LogoutButton";
import { SessionContext } from "@/context/SessionContext";
import { mockSession } from "../utils/mockSession";

jest.mock("next/router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("LogoutButton", () => {
  it("does not render when no session", () => {
    render(
      <SessionContext.Provider value={null}>
        <LogoutButton />
      </SessionContext.Provider>
    );
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("renders and is clickable when logged in", () => {
    render(
      <SessionContext.Provider value={mockSession}>
        <LogoutButton />
      </SessionContext.Provider>
    );
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
