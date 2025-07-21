// libs/supabase.ts

import { createPagesServerClient, createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

const supabaseUrl = `https://${process.env.NEXT_PUBLIC_PROJECT_REF}.supabase.co`;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const createSupabaseBrowserClient = () =>
  createPagesBrowserClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });

export const createSupabaseServerClient = (req: NextApiRequest, res: NextApiResponse) =>
  createPagesServerClient(
    {
      req,
      res,
    },
    { supabaseUrl, supabaseKey: supabaseAnonKey }
  );

export const supabaseBrowserClient = createSupabaseBrowserClient();
