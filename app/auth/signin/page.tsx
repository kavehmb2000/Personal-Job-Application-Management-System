import { SignInButton } from "@/components/auth/sign-in-button";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section
        aria-labelledby="sign-in-title"
        className="w-full max-w-md space-y-6 rounded-lg border p-8"
      >
        <div className="space-y-2">
          <h1 id="sign-in-title" className="text-2xl font-semibold">
            Personal Job Application Management
          </h1>

          <p className="text-sm text-muted-foreground">
            Sign in with your authorized Google account to continue.
          </p>
        </div>

        <SignInButton />
      </section>
    </main>
  );
}
