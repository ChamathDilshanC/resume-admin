import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CHAMATH DILSHAN - Resume",
};

export default async function ResumeViewerPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:min-h-[calc(100vh-2.5rem)]">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">CHAMATH DILSHAN - Resume</h1>
            <p className="text-xs text-gray-500">Browser viewer — the original PDF remains ATS-safe.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
            Back to editor
          </Link>
        </header>
        <iframe
          src="/api/resume/view"
          title="CHAMATH DILSHAN - Resume PDF"
          className="min-h-0 flex-1 border-0"
        />
      </div>
    </main>
  );
}
