import { redirect } from "next/navigation";

/**
 * Public self-signup is disabled — Sanctum is internal-use. New teammates are
 * added via invite (Team → Invite), so /signup just sends you to sign in.
 */
export default function SignupPage() {
  redirect("/login");
}
