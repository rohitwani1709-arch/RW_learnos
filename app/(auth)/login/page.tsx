import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/lib/auth/actions";
import { envOk } from "@/lib/env";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (!envOk) return <p className="p-8">Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your project URL and key.</p>;
  return <AuthForm action={signIn} mode="login" next={next} />;
}
