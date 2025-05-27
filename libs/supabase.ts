import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { NextApiRequest, NextApiResponse } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createSupabaseBrowserClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

export const createSupabaseServerClient = (req: NextApiRequest, res: NextApiResponse) =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => req.cookies[name],
      set: (name: string, value: string, options: any) => {
        res.setHeader("Set-Cookie", `${name}=${value}`);
      },
      remove: (name: string, options: any) => {
        res.setHeader("Set-Cookie", `${name}=; Max-Age=0`);
      },
    },
  });

export const supabaseBrowserClient = createSupabaseBrowserClient();
