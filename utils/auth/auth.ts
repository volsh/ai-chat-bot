import { UserProfile } from "@/types";

export const isTherapist = (user: UserProfile | null): boolean =>
  !!user?.role && user.role === "therapist";

export const isAdmin = (user: UserProfile | null): boolean => !!user?.role && user.role === "admin";
