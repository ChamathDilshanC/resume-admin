import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "./SignInButton";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Resume Admin</h1>
      <p className="max-w-sm text-center text-sm text-gray-600">
        Private editor for resume.json. Access is restricted to a single GitHub account.
      </p>
      <SignInButton />
    </main>
  );
}
