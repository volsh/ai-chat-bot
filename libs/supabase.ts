// libs/supabase.ts

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const createSupabaseBrowserClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

export const createSupabaseServerClient = (req: NextApiRequest, res: NextApiResponse) =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => req.cookies[name],
      set: (name: string, value: string, options: any) => {
        const serialized = serialize(name, value, options);
        res.setHeader("Set-Cookie", serialized);
      },
      remove: (name: string, options: any) => {
        const serialized = serialize(name, "", { ...options, maxAge: 0 });
        res.setHeader("Set-Cookie", serialized);
      },
    },
  });

export const createSupabaseServerClientRoleKey = (req: NextApiRequest, res: NextApiResponse) =>
  createServerClient(supabaseUrl, supabaseRoleKey, {
    cookies: {
      get: (name: string) => req.cookies[name],
      set: (name: string, value: string, options: any) => {
        const serialized = serialize(name, value, options);
        res.setHeader("Set-Cookie", serialized);
      },
      remove: (name: string, options: any) => {
        const serialized = serialize(name, "", { ...options, maxAge: 0 });
        res.setHeader("Set-Cookie", serialized);
      },
    },
  });

export const supabaseBrowserClient = createSupabaseBrowserClient();
