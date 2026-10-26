import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/lib/auth/actions";
import { envOk } from "@/lib/env";

export default function RegisterPage() {
  if (!envOk) return <p className="p-8">Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your project URL and key.</p>;
  return <AuthForm action={signUp} mode="register" />;
}
