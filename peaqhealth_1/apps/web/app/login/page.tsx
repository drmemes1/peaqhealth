import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const defaultTab = tab === "signup" ? "signup" : "signin"

  return (
    <Suspense>
      <LoginForm defaultTab={defaultTab} />
    </Suspense>
  );
}
