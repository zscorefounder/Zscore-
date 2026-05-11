
import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;

let driveClient: any = null;

export async function getDriveClient() {
  if (driveClient) return driveClient;

  if (!SERVICE_ACCOUNT_JSON || !DRIVE_FOLDER_ID) {
    console.warn("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or GOOGLE_DRIVE_FOLDER_ID is missing.");
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
  } catch (error) {
    console.error("Failed to initialize Google Drive Client:", error);
    return null;
  }
}

async function findFileId(name: string) {
  const drive = await getDriveClient();
  if (!drive) return null;

  const response = await drive.files.list({
    q: `name = '${name}' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  return response.data.files?.[0]?.id || null;
}

export async function readDriveFile(fileName: string) {
  const drive = await getDriveClient();
  if (!drive) return [];

  try {
    const fileId = await findFileId(fileName);
    if (!fileId) return [];

    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'stream' });

    return new Promise((resolve, reject) => {
      let data = '';
      response.data
        .on('data', (chunk: any) => { data += chunk; })
        .on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : []);
          } catch (e) {
            resolve([]);
          }
        })
        .on('error', (err: any) => reject(err));
    });
  } catch (error) {
    console.error(`Error reading ${fileName} from Drive:`, error);
    return [];
  }
}

export async function writeDriveFile(fileName: string, data: any) {
  const drive = await getDriveClient();
  if (!drive) return false;

  try {
    const fileId = await findFileId(fileName);
    const content = JSON.stringify(data, null, 2);
    const contentStream = new Readable();
    contentStream.push(content);
    contentStream.push(null);

    if (fileId) {
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: contentStream,
        },
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [DRIVE_FOLDER_ID],
          mimeType: 'application/json',
        },
        media: {
          mimeType: 'application/json',
          body: contentStream,
        },
      });
    }
    return true;
  } catch (error) {
    console.error(`Error writing ${fileName} to Drive:`, error);
    return false;
  }
}
