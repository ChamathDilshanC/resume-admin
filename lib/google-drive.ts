import { google } from "googleapis";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

// Same set resume-core's sync accepts — keep in sync with
// resume-core/scripts/lib/google-drive.js's SUPPORTED_MIME_TYPES.
const SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function getDriveClient() {
  const credentialsJson = process.env.GDRIVE_CREDENTIALS;
  if (!credentialsJson) {
    throw new Error("GDRIVE_CREDENTIALS is not configured on resume-admin.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    // Read-only here — folder/file creation stays resume-core's job, using
    // its own copy of the same service account with the broader "drive"
    // scope. resume-admin only ever needs to look, never write.
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

// Live, on-demand listing — no sync step, no wait. Used by the Project
// Drive gallery so a file dropped into Drive shows up the moment the page
// is opened/refreshed, instead of only after resume-core's background sync
// workflow has run and committed resume.json.
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, thumbnailLink)",
      spaces: "drive",
      pageToken,
    });
    for (const f of res.data.files || []) {
      if (f.id && f.name && f.mimeType && SUPPORTED_MIME_TYPES.has(f.mimeType)) {
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          webViewLink: f.webViewLink ?? undefined,
          thumbnailLink: f.thumbnailLink ?? undefined,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}
