import { Readable } from "node:stream";
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
    // Broad "drive" scope (not drive.file) for the same reason resume-core
    // uses it: files/folders here were shared with the service account via
    // the ordinary Drive "Share" dialog, not created by this app, and
    // drive.file only ever sees files the app itself created/opened.
    scopes: ["https://www.googleapis.com/auth/drive"],
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

export async function uploadImageToFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveFile> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, name, mimeType, webViewLink, thumbnailLink",
  });
  const f = res.data;
  if (!f.id || !f.name || !f.mimeType) {
    throw new Error("Drive upload succeeded but returned an incomplete file record.");
  }
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink ?? undefined,
    thumbnailLink: f.thumbnailLink ?? undefined,
  };
}

export async function renameFile(fileId: string, name: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.update({ fileId, requestBody: { name } });
}

// Moves to Drive's Bin rather than permanently erasing — matches what a
// "Delete" click does in Drive's own UI, and stays recoverable from there
// if this was a mistake.
export async function trashFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.update({ fileId, requestBody: { trashed: true } });
}
