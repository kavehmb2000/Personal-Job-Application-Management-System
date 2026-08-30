"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/opportunities" })}
      className="w-full rounded-md border px-4 py-2 text-sm font-medium"
    >
      Continue with Google
    </button>
  );
}
