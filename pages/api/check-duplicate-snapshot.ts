import { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase"; // Ensure this imports your Supabase client

// This is the handler for checking for duplicates based on filter_hash
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { filterHash } = req.body; // Assuming the body contains the filterHash to check

  if (!filterHash) {
    return res.status(400).json({ error: "filterHash is required" });
  }

  try {
    const supabase = createSupabaseServerClient(req, res);

    // Query the database for a snapshot with the same filter_hash
    const { data, error } = await supabase
      .from("fine_tune_snapshots")
      .select("id")
      .eq("filter_hash", filterHash)
      .single(); // Use .single() to return only one record if it exists

    if (error) {
      console.error("Error fetching snapshot:", error.message);
      return res.status(500).json({ error: "Database query failed" });
    }

    // If data is returned, that means the filter_hash already exists
    if (data) {
      return res.status(200).json({ duplicate: true }); // Found a duplicate
    }

    // If no data is returned, no duplicate exists
    return res.status(200).json({ duplicate: false }); // No duplicate found
  } catch (err) {
    console.error("Error processing the request:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
