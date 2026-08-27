import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { fetchResumeJson } from "@/lib/github";
import { ProjectDriveGallery } from "./ProjectDriveGallery";

interface SessionWithToken {
  accessToken?: string;
  googleDriveConnected?: boolean;
  googleDriveError?: boolean;
}

export default async function DrivePage() {
  const session = await getServerSession(authOptions);
  const s = session as unknown as SessionWithToken | null;

  if (!session || !s?.accessToken) {
    redirect("/signin");
  }

  const { data } = await fetchResumeJson(s.accessToken);

  return (
    <ProjectDriveGallery
      projects={data.projects}
      googleDriveConnected={Boolean(s.googleDriveConnected)}
      googleDriveError={Boolean(s.googleDriveError)}
    />
  );
}
