import { createSupabaseServerClient } from "@/libs/supabase";
import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);

  const { page: pageString, limit: limitString } = req.query;

  const page = parseInt((pageString as string) || "1", 10);
  const limit = parseInt((limitString as string) || "10", 10);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("name", `%${req.query}%`)
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}
