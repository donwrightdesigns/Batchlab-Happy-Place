
let driveToken: string | null = null;
let folderId: string | null = null;

export function setDriveToken(token: string) {
  driveToken = token;
}

export function getDriveToken() {
  return driveToken;
}

async function getOrCreateFolder(token: string): Promise<string> {
  if (folderId) return folderId;

  // Search for the folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='REBE Enhancements' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();

  if (data.files && data.files.length > 0) {
    folderId = data.files[0].id;
    return folderId!;
  }

  // Create the folder
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'REBE Enhancements',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const folderData = await createResponse.json();
  folderId = folderData.id;
  return folderId!;
}

export function getFolderId() {
  return folderId;
}

export async function uploadToDrive(base64: string, filename: string): Promise<string | null> {
  if (!driveToken) return null;

  try {
    const parentId = await getOrCreateFolder(driveToken);
    
    // Convert base64 to Blob
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });

    // Multipart upload
    const metadata = {
      name: filename,
      parents: [parentId]
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveToken}` },
      body: formData
    });

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error('Drive upload failed:', error);
    return null;
  }
}

export function getDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
