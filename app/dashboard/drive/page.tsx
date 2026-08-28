import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchResumeJson } from "@/lib/github";
import { getGoogleDriveConnectionStatus } from "../actions";
import { ProjectDriveGallery } from "./ProjectDriveGallery";

interface SessionWithToken {
  accessToken?: string;
}

export default async function DrivePage() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as SessionWithToken | null)?.accessToken;

  if (!session || !accessToken) {
    redirect("/signin");
  }

  const [{ data }, { connected }] = await Promise.all([
    fetchResumeJson(accessToken),
    getGoogleDriveConnectionStatus(),
  ]);

  return (
    <Suspense>
      <ProjectDriveGallery projects={data.projects} googleDriveConnected={connected} />
    </Suspense>
  );
}
