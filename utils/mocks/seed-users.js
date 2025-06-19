import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const usersToCreate = [
  { email: "therapist1@example.com", password: "Test123!", role: "therapist" },
  { email: "therapist2@example.com", password: "Test123!", role: "therapist" },
  { email: "therapist3@example.com", password: "Test123!", role: "therapist" },
  { email: "user1@example.com", password: "Test123!", role: "user" },
  { email: "user2@example.com", password: "Test123!", role: "user" },
  { email: "user3@example.com", password: "Test123!", role: "user" },
  { email: "admin@example.com", password: "Test123!", role: "admin" },
];

async function seed() {
  for (const user of usersToCreate) {
    // Create in auth.users
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Failed to create ${user.email}:`, error.message);
      continue;
    }

    // Insert into public.users
    const { error: insertError } = await supabase.from("users").insert({
      id: authUser.user.id,
      email: user.email,
      role: user.role,
      full_name: user.email.split("@")[0],
    });

    if (insertError) {
      console.error(`Failed to insert user profile for ${user.email}:`, insertError.message);
    } else {
      console.log(`Seeded user: ${user.email}`);
    }
  }
}

seed();
