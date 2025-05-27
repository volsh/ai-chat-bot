import type { AppProps } from "next/app";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SessionProvider } from "@/context/SessionContext";

import "@/styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider initialSession={pageProps.session}>
      <header className="flex items-center justify-between border-b p-4 dark:border-zinc-800">
        <h1 className="text-lg font-bold">AI Chat App</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="p-4">
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}

export default MyApp;
