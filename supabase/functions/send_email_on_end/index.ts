import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SERVICE_ROLE_KEY")
);
serve(async (req) => {
  try {
    const payload = await req.json();
    const { record } = payload;
    const { session_id, ended_at, link } = record;
    if (!ended_at) {
      return new Response("No ended_at found, skipping.", {
        status: 200,
      });
    }
    const sessionId = session_id;
    // 1️⃣ Get treatment ID
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("treatment_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !sessionData?.treatment_id) {
      console.error("Session error:", sessionError);
      return new Response("Session not found or missing treatment_id", {
        status: 404,
      });
    }
    const treatmentId = sessionData.treatment_id;
    // 2️⃣ Get treatment data (shared_with, team_id)
    const { data: treatmentData, error: treatmentError } = await supabase
      .from("treatments")
      .select("shared_with, team_id")
      .eq("id", treatmentId)
      .single();
    if (treatmentError || !treatmentData) {
      console.error("Treatment error:", treatmentError);
      return new Response("Treatment not found", {
        status: 404,
      });
    }
    // 3️⃣ Gather therapist ids
    let therapistIds = treatmentData.shared_with || [];
    if (treatmentData.team_id) {
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", treatmentData.team_id)
        .eq("role", "therapist");
      if (!teamError && teamMembers) {
        therapistIds = [...new Set([...therapistIds, ...teamMembers.map((tm) => tm.user_id)])];
      }
    }
    if (!therapistIds.length) {
      console.log("No therapists found for this treatment.");
      return new Response("No therapists found.", {
        status: 200,
      });
    }
    // 4️⃣ Get therapist emails
    const { data: therapists, error: therapistError } = await supabase
      .from("users")
      .select("email, full_name")
      .in("id", therapistIds);
    if (therapistError || !therapists) {
      console.error("Error retrieving therapist emails:", therapistError);
      return new Response("Error retrieving therapist emails", {
        status: 500,
      });
    }
    // 5️⃣ Send email
    const subject = "Session Ended Notification";
    const content = `
      <p>Hello,</p>
      <p>A session has just been marked as finished. You can review it here:</p>
      <p><a href="${link}">View Session</a></p>
    `;
    for (const therapist of therapists) {
      const { error } = await supabase.functions.invoke("send-grid", {
        body: {
          personalizations: [
            {
              to: [
                {
                  email: therapist.email,
                },
              ],
            },
          ],
          from: {
            email: "liorvolsh@gmail.com",
            name: "AI Monitoring System",
          },
          subject,
          content: [
            {
              type: "text/html",
              value: content,
            },
          ],
        },
      });
      if (error) {
        console.error("Email error:", error);
      }
    }
    return new Response("Session ended notifications sent.", {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", {
      status: 500,
    });
  }
});
