import { createSupabaseServerClient } from "@/libs/supabase";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);

  const { page: pageString, limit: limitString } = req.query;

  const page = parseInt((pageString as string) || "1", 10);
  const limit = parseInt((limitString as string) || "10", 10);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = String(req.query.query || "").trim();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    .range(from, to);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ users: data });
}
