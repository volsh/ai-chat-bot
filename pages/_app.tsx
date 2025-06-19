import type { AppProps } from "next/app";
import LogoutButton from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SessionProvider } from "@/context/SessionContext";
import { Toaster } from "react-hot-toast";
import MainNavigator from "@/components/navigation/MainNavigator";
import { ThemeProvider } from "@/context/themeContext";
import { useAppStore } from "@/state/useAppStore";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumb from "@/components/navigation/Breadcrumb";

import "../styles/global.css";
import { useShallow } from "zustand/react/shallow";
import { useUserProfileSubscription } from "@/hooks/useUserProfileSubscription";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [fadeClass, setFadeClass] = useState("fade-in");

  useUserProfileSubscription();

  useEffect(() => {
    const handleStart = () => setFadeClass("fade-out");
    const handleEnd = () => setFadeClass("fade-in");

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleEnd);
    router.events.on("routeChangeError", handleEnd);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleEnd);
      router.events.off("routeChangeError", handleEnd);
    };
  }, [router]);

  const hideBreadcrumb = ["/", "/auth/login"].includes(router.pathname);

  return (
    <SessionProvider initialSession={pageProps.session}>
      <ThemeProvider>
        <MainNavigator>
          <Toaster position="top-right" />
          <header className="flex items-center justify-between border-b p-4 text-zinc-700 transition-all dark:border-zinc-800 dark:text-white">
            <h1 className="text-lg font-bold">AI Chat App</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </header>
          <main className={`p-4 transition-opacity duration-300 ${fadeClass}`}>
            {!hideBreadcrumb && <Breadcrumb />}
            <Component {...pageProps} />
          </main>
        </MainNavigator>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;
