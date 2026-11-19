import { createClient } from "@supabase/supabase-js";
const url = process.env["SUPABASE_URL"],
  key = process.env["SUPABASE_SERVICE_ROLE_KEY"],
  origin = process.env["APP_ORIGIN"],
  email = process.argv[2];
if (!url || !key || !origin || !email)
  throw new Error(
    "Set server-only SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and APP_ORIGIN, then pass the owner email.",
  );
if (!/^https:\/\//.test(origin) || !/^https:\/\//.test(url))
  throw new Error("Use the authorized HTTPS staging origin.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: members, error: check } = await client
  .from("platform_members")
  .select("user_id")
  .eq("role", "owner")
  .limit(1);
if (check) throw check;
if (members?.length)
  throw new Error(
    "An owner already exists. Use the authorized account management procedure; no changes made.",
  );
// Official Auth invitation. This sends an email only when this explicit operator command is run.
const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
  redirectTo: origin.replace(/\/$/, "") + "/auth/callback",
});
if (error || !data.user)
  throw new Error("Invitation failed. Check the Auth provider and delivery logs.");
const { error: roleError } = await client
  .from("platform_members")
  .insert({ user_id: data.user.id, role: "owner", active: true });
if (roleError)
  throw new Error(
    "Invitation created, but role assignment failed. Assign membership through the authorized SQL console.",
  );
console.log(
  "Invitation requested and owner membership assigned. Verify email delivery and complete account recovery. No password was generated or logged.",
);
