// __tests__/utils/mockSession.ts
import { Session } from "@supabase/supabase-js";

export const mockSession: Session = {
  access_token: "test-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "test-refresh",
  user: {
    id: "test-user",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    role: "authenticated",
    aud: "authenticated",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  provider_token: null,
  provider_refresh_token: null,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
