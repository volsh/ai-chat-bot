"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAppStore } from "@/state";
import TherapistLayout from "./TherapistLayout";
import UserLayout from "./UserLayout";
import AuthLayout from "./AuthLayout";
import { useShallow } from "zustand/react/shallow";

export default function MainNavigator({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, userProfile, loadingProfile } = useAppStore(
    useShallow((s) => ({
      session: s.session,
      userProfile: s.userProfile,
      loadingProfile: s.loadingProfile,
    }))
  );
  useEffect(() => {
    const unauthenticated =
      !loadingProfile && !session && !router.pathname.startsWith("/auth/login");

    if (unauthenticated) {
      router.replace("/auth/login");
    }
  }, [session, userProfile, loadingProfile, router]);

  if (router.pathname.startsWith("/auth")) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  if (!userProfile) {
    return <p className="mt-20 text-center text-gray-500">Loading...</p>;
  }

  return userProfile.role === "therapist" ? (
    <TherapistLayout>{children}</TherapistLayout>
  ) : (
    <UserLayout>{children}</UserLayout>
  );
}
