import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);
serve(async (req) => {
  try {
    const { emotion, intensity, tone, messageId, link } = await req.json();
    console.log(emotion, intensity, tone, messageId, link);
    // Validate the body
    if (!emotion || !intensity || !tone || !messageId || !link) {
      return new Response("Missing required parameters", {
        status: 400,
      });
    }
    // Validate tone to ensure it's one of the allowed values
    const validTones = ["positive", "negative", "neutral"];
    if (!validTones.includes(tone)) {
      return new Response(
        'Invalid tone value. Allowed values are "positive", "negative", or "neutral".',
        {
          status: 400,
        }
      );
    }
    // Check if emotion has high intensity and negative tone
    if (intensity >= 0.8 && tone === "negative") {
      // Find the sessionId from the messageId
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("session_id")
        .eq("id", messageId)
        .single();
      if (messageError || !messageData) {
        console.error(messageError, messageData);
        return new Response("Message not found", {
          status: 404,
        });
      }
      const sessionId = messageData.session_id;
      console.log("sessionId", sessionId);
      // Fetch the therapists from the sharedWith field in the session table
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("shared_with")
        .eq("id", sessionId)
        .single();
      if (sessionError || !sessionData) {
        console.error(sessionError, sessionData);
        return new Response("Session not found", {
          status: 404,
        });
      }
      // Fetch all therapists based on shared_with array
      const { data: therapists, error: therapistError } = await supabase
        .from("users")
        .select("email, full_name")
        .in("id", sessionData.shared_with)
        .eq("role", "therapist");
      if (therapistError || !therapists) {
        console.log(therapistError, therapists);
        return new Response("No therapists found", {
          status: 404,
        });
      }
      const inviteLink = `${link}/${sessionId}?messageId=${messageId}`;
      // Construct the email content
      const subject = "Urgent: High Intensity Negative Emotion Detected";
      const content = `
        Hello Therapist,
        
        A session has triggered a high intensity negative emotion (${emotion} with intensity ${intensity}).
        Please review the details and take necessary actions.

        You can view the session here: <a href="${inviteLink}">View Session</a>

        Best regards,
        Your AI Monitoring System
      `;
      console.log("therapists", therapists);
      // Send email using Supabase Edge Function invoking SendGrid
      for (const therapist of therapists) {
        console.log("therapist", therapist);
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
          console.error("send error", error);
          return new Response("Failed to send email", {
            status: 500,
          });
        }
      }
      return new Response("Emails sent to therapists", {
        status: 200,
      });
    }
    return new Response("No action needed", {
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", {
      status: 500,
    });
  }
});
