import { DriveNoteFile, ReminderNote, DriveBackupFile, BackupPayload, DailyTaskItem, DayFolderInfo, UnifiedSaveResult, CalendarEventItem } from '../types';
import {
  ROOT_FOLDER_NAME,
  getDayFolderName,
  getDayFolderAlternativeNames,
  getUnifiedFileName,
  buildUnifiedDailyFileContent,
  parseUnifiedDailyFileContent,
} from '../utils/unifiedStorage';

let cachedFolderId: string | null = null;
let cachedBackupsFolderId: string | null = null;
const dayFolderCache = new Map<string, DayFolderInfo>();

const FOLDER_NAME = ROOT_FOLDER_NAME;
const BACKUPS_FOLDER_NAME = 'Backups';

export const getOrCreateDailyNotesFolder = async (token: string): Promise<string> => {
  if (cachedFolderId) return cachedFolderId;

  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)&spaces=drive`;

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to search Google Drive folders');
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    cachedFolderId = data.files[0].id;
    return cachedFolderId!;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Daily notes root folder created by Daily Notes & Calendar app',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Daily Notes folder in Google Drive');
  }

  const newFolder = await createRes.json();
  cachedFolderId = newFolder.id;
  return cachedFolderId!;
};

/**
 * Automatically creates or retrieves a dedicated subfolder for each day inside the main root folder.
 * Name includes day, month, and year (e.g. "22 September 2026").
 */
export const getOrCreateDayFolder = async (token: string, dateKey: string): Promise<DayFolderInfo> => {
  const cached = dayFolderCache.get(dateKey);
  if (cached) return cached;

  const rootFolderId = await getOrCreateDailyNotesFolder(token);
  const targetFolderName = getDayFolderName(dateKey);
  const alternativeNames = getDayFolderAlternativeNames(dateKey);

  // Search inside root folder for any existing day subfolder matching target or aliases
  const query = encodeURIComponent(`'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, webViewLink)&pageSize=100`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      // Find matching folder
      const matched = data.files.find((f: any) =>
        alternativeNames.some((alt) => f.name.toLowerCase().trim() === alt.toLowerCase().trim()) ||
        f.name.includes(dateKey) ||
        (f.name.includes(targetFolderName.split(' ')[0]) && f.name.includes(targetFolderName.split(' ')[2]))
      );

      if (matched) {
        const info: DayFolderInfo = {
          folderId: matched.id,
          folderName: matched.name,
          webViewLink: matched.webViewLink,
        };
        dayFolderCache.set(dateKey, info);
        return info;
      }
    }
  }

  // Create new day folder inside Daily Notes root folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: targetFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
      description: `Daily workspace folder for ${targetFolderName}`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create day folder "${targetFolderName}" in Google Drive`);
  }

  const created = await createRes.json();
  const info: DayFolderInfo = {
    folderId: created.id,
    folderName: created.name || targetFolderName,
    webViewLink: created.webViewLink,
  };
  dayFolderCache.set(dateKey, info);
  return info;
};

export const getNoteFilename = (dateKey: string) => getUnifiedFileName(dateKey);

/**
 * Stores EVERYTHING for that day in ONE file inside that day's dedicated folder.
 * Includes note content, daily tasks checklist, Google Calendar agenda, and reminders.
 */
export const saveUnifiedDailyRecordToDrive = async (
  token: string,
  dateKey: string,
  params: {
    noteContent: string;
    tasks: DailyTaskItem[];
    reminders: ReminderNote[];
    calendarEvents?: CalendarEventItem[];
  },
  existingFileId?: string
): Promise<UnifiedSaveResult> => {
  const dayFolder = await getOrCreateDayFolder(token, dateKey);
  const filename = getUnifiedFileName(dateKey);
  const fullContent = buildUnifiedDailyFileContent({
    dateKey,
    noteContent: params.noteContent,
    tasks: params.tasks,
    reminders: params.reminders,
    calendarEvents: params.calendarEvents,
  });

  // If existing file ID is provided or exists in the day folder
  let targetFileId = existingFileId;

  if (!targetFileId) {
    // Search if file already exists in day folder
    const query = encodeURIComponent(`'${dayFolder.folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, webViewLink)`;
    const checkRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.files && data.files.length > 0) {
        targetFileId = data.files[0].id;
      }
    }
  }

  if (targetFileId) {
    // Update existing unified single file
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/markdown; charset=UTF-8',
      },
      body: fullContent,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update unified daily record in Google Drive');
    }

    const updated = await res.json();
    return {
      fileId: updated.id || targetFileId,
      filename,
      dayFolderId: dayFolder.folderId,
      dayFolderName: dayFolder.folderName,
      folderWebViewLink: dayFolder.webViewLink,
      webViewLink: updated.webViewLink,
      modifiedTime: new Date().toISOString(),
    };
  } else {
    // Create new unified single file in that day's folder
    const metadata = {
      name: filename,
      parents: [dayFolder.folderId],
      mimeType: 'text/markdown',
      description: `Unified daily record for ${dayFolder.folderName} storing note, tasks, reminders, and calendar schedule in one file`,
    };

    const boundary = '-------UnifiedDailyBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
      fullContent +
      closeDelim;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to save unified daily record to Google Drive');
    }

    const created = await res.json();
    return {
      fileId: created.id,
      filename,
      dayFolderId: dayFolder.folderId,
      dayFolderName: dayFolder.folderName,
      folderWebViewLink: dayFolder.webViewLink,
      webViewLink: created.webViewLink,
      modifiedTime: created.modifiedTime || new Date().toISOString(),
    };
  }
};

/**
 * Fetches the unified record from the day's folder, parsing out the note content,
 * daily tasks, and reminders. Also provides backwards-compatibility for legacy single notes.
 */
export const fetchUnifiedDailyRecordFromDrive = async (
  token: string,
  dateKey: string
): Promise<{
  fileId: string;
  content: string;
  tasks?: DailyTaskItem[];
  reminders?: ReminderNote[];
  dayFolderId: string;
  dayFolderName: string;
  folderWebViewLink?: string;
  webViewLink?: string;
  modifiedTime: string;
  isUnifiedRecord: boolean;
} | null> => {
  const dayFolder = await getOrCreateDayFolder(token, dateKey);

  // 1. Look inside day folder for the unified file
  const query = encodeURIComponent(`'${dayFolder.folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime, webViewLink, size)&orderBy=modifiedTime desc`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (contentRes.ok) {
        const rawText = await contentRes.text();
        const parsed = parseUnifiedDailyFileContent(rawText);
        return {
          fileId: file.id,
          content: parsed.noteContent,
          tasks: parsed.tasks,
          reminders: parsed.reminders,
          dayFolderId: dayFolder.folderId,
          dayFolderName: dayFolder.folderName,
          folderWebViewLink: dayFolder.webViewLink,
          webViewLink: file.webViewLink,
          modifiedTime: file.modifiedTime,
          isUnifiedRecord: true,
        };
      }
    }
  }

  // 2. Backwards-compatibility: Check if legacy note exists directly in root folder
  const rootFolderId = await getOrCreateDailyNotesFolder(token);
  const legacyFilename = `${dateKey}_Daily_Note.md`;
  const legacyQuery = encodeURIComponent(`'${rootFolderId}' in parents and name = '${legacyFilename}' and trashed = false`);
  const legacySearchUrl = `https://www.googleapis.com/drive/v3/files?q=${legacyQuery}&fields=files(id, name, modifiedTime, webViewLink)`;

  const legacyRes = await fetch(legacySearchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (legacyRes.ok) {
    const legacyData = await legacyRes.json();
    if (legacyData.files && legacyData.files.length > 0) {
      const file = legacyData.files[0];
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contentRes.ok) {
        const rawContent = await contentRes.text();
        const parsed = parseUnifiedDailyFileContent(rawContent);
        return {
          fileId: file.id,
          content: parsed.noteContent,
          tasks: parsed.tasks,
          reminders: parsed.reminders,
          dayFolderId: dayFolder.folderId,
          dayFolderName: dayFolder.folderName,
          folderWebViewLink: dayFolder.webViewLink,
          webViewLink: file.webViewLink,
          modifiedTime: file.modifiedTime,
          isUnifiedRecord: false,
        };
      }
    }
  }

  return null;
};

export const fetchDailyNoteFromDrive = async (
  token: string,
  dateKey: string
): Promise<{ fileId: string; content: string; modifiedTime: string; webViewLink?: string; dayFolderName?: string; dayFolderId?: string; folderWebViewLink?: string } | null> => {
  const result = await fetchUnifiedDailyRecordFromDrive(token, dateKey);
  if (!result) return null;
  return {
    fileId: result.fileId,
    content: result.content,
    modifiedTime: result.modifiedTime,
    webViewLink: result.webViewLink,
    dayFolderName: result.dayFolderName,
    dayFolderId: result.dayFolderId,
    folderWebViewLink: result.folderWebViewLink,
  };
};

export const saveDailyNoteToDrive = async (
  token: string,
  dateKey: string,
  content: string,
  existingFileId?: string
): Promise<{ fileId: string; webViewLink?: string; modifiedTime: string; dayFolderName?: string; dayFolderId?: string; folderWebViewLink?: string }> => {
  // Route saving directly into the day folder
  const res = await saveUnifiedDailyRecordToDrive(
    token,
    dateKey,
    {
      noteContent: content,
      tasks: [],
      reminders: [],
    },
    existingFileId
  );

  return {
    fileId: res.fileId,
    webViewLink: res.webViewLink,
    modifiedTime: res.modifiedTime,
    dayFolderName: res.dayFolderName,
    dayFolderId: res.dayFolderId,
    folderWebViewLink: res.folderWebViewLink,
  };
};

export const listAllDriveDailyNotes = async (token: string): Promise<DriveNoteFile[]> => {
  const rootFolderId = await getOrCreateDailyNotesFolder(token);

  // 1. Get all items in root folder (both day subfolders and legacy root files)
  const rootQuery = encodeURIComponent(`'${rootFolderId}' in parents and trashed = false`);
  const rootUrl = `https://www.googleapis.com/drive/v3/files?q=${rootQuery}&orderBy=name desc&pageSize=100&fields=files(id, name, mimeType, modifiedTime, webViewLink, size)`;

  const rootRes = await fetch(rootUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!rootRes.ok) {
    throw new Error('Failed to list notes from Google Drive');
  }

  const rootData = await rootRes.json();
  const rootItems: any[] = rootData.files || [];

  const dayFolders = rootItems.filter((i) => i.mimeType === 'application/vnd.google-apps.folder' && i.name !== BACKUPS_FOLDER_NAME);
  const rootNotes = rootItems.filter((i) => i.mimeType !== 'application/vnd.google-apps.folder' && i.name.endsWith('.md'));

  const files: DriveNoteFile[] = [];

  // Parse legacy root notes
  for (const f of rootNotes) {
    const match = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateKey = match ? match[1] : '';
    files.push({
      id: f.id,
      name: f.name,
      dateKey,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      size: f.size,
      isUnifiedRecord: false,
    });
  }

  // Query each day folder for its unified file (parallelized)
  const folderPromises = dayFolders.map(async (folder) => {
    try {
      const q = encodeURIComponent(`'${folder.id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`);
      const u = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id, name, modifiedTime, webViewLink, size)`;
      const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const d = await res.json();
      return (d.files || []).map((file: any) => {
        // Extract dateKey from filename or folder name
        let dateKey = '';
        const isoMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          dateKey = isoMatch[1];
        } else {
          // Check folder name e.g. "22 September 2026"
          const dayMatch = folder.name.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
          if (dayMatch) {
            const day = String(dayMatch[1]).padStart(2, '0');
            const monthStr = dayMatch[2];
            const year = dayMatch[3];
            const monthNames = [
              'january', 'february', 'march', 'april', 'may', 'june',
              'july', 'august', 'september', 'october', 'november', 'december'
            ];
            const mIndex = monthNames.indexOf(monthStr.toLowerCase());
            if (mIndex >= 0) {
              const month = String(mIndex + 1).padStart(2, '0');
              dateKey = `${year}-${month}-${day}`;
            }
          }
        }

        return {
          id: file.id,
          name: file.name,
          dateKey,
          dayFolderName: folder.name,
          dayFolderId: folder.id,
          folderWebViewLink: folder.webViewLink,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          size: file.size,
          isUnifiedRecord: true,
        } as DriveNoteFile;
      });
    } catch {
      return [];
    }
  });

  const folderFilesArrays = await Promise.all(folderPromises);
  for (const arr of folderFilesArrays) {
    files.push(...arr);
  }

  // Sort by dateKey or modifiedTime descending
  files.sort((a, b) => (b.dateKey || '').localeCompare(a.dateKey || '') || b.modifiedTime.localeCompare(a.modifiedTime));

  return files;
};

export const deleteDailyNoteFromDrive = async (token: string, fileId: string): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete note from Google Drive');
  }
};

const REMINDERS_FILENAME = 'Reminders_SynologyNote.json';

export const fetchRemindersFromDrive = async (
  token: string
): Promise<{ fileId: string; reminders: ReminderNote[] } | null> => {
  try {
    const folderId = await getOrCreateDailyNotesFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and name = '${REMINDERS_FILENAME}' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      return null;
    }

    const file = data.files[0];
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!contentRes.ok) {
      return null;
    }

    const json = await contentRes.json();
    return {
      fileId: file.id,
      reminders: Array.isArray(json) ? json : json.reminders || [],
    };
  } catch (err) {
    console.warn('Failed to load reminders from Drive:', err);
    return null;
  }
};

export const saveRemindersToDrive = async (
  token: string,
  reminders: ReminderNote[],
  existingFileId?: string
): Promise<{ fileId: string }> => {
  const folderId = await getOrCreateDailyNotesFolder(token);
  const content = JSON.stringify(reminders, null, 2);

  if (existingFileId) {
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: content,
    });

    if (!res.ok) {
      throw new Error('Failed to update reminders in Google Drive');
    }

    const updated = await res.json();
    return { fileId: updated.id || existingFileId };
  } else {
    // Check if file already exists in folder
    const existing = await fetchRemindersFromDrive(token);
    if (existing) {
      return saveRemindersToDrive(token, reminders, existing.fileId);
    }

    const metadata = {
      name: REMINDERS_FILENAME,
      parents: [folderId],
      mimeType: 'application/json',
      description: 'Synology-style quick reminders and sticky notes',
    };

    const boundary = '-------RemindersBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      content +
      closeDelim;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      throw new Error('Failed to save reminders to Google Drive');
    }

    const created = await res.json();
    return { fileId: created.id };
  }
};

const DAILY_TASKS_FILENAME = 'DailyTasks_Store.json';

export const fetchDailyTasksFromDrive = async (
  token: string
): Promise<{ fileId: string; tasks: DailyTaskItem[] } | null> => {
  try {
    const folderId = await getOrCreateDailyNotesFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and name = '${DAILY_TASKS_FILENAME}' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.files || data.files.length === 0) return null;

    const file = data.files[0];
    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!contentRes.ok) return null;

    const json = await contentRes.json();
    return {
      fileId: file.id,
      tasks: Array.isArray(json) ? json : json.tasks || [],
    };
  } catch (err) {
    console.warn('Failed to load daily tasks from Drive:', err);
    return null;
  }
};

export const saveDailyTasksToDrive = async (
  token: string,
  tasks: DailyTaskItem[],
  existingFileId?: string
): Promise<{ fileId: string }> => {
  const folderId = await getOrCreateDailyNotesFolder(token);
  const content = JSON.stringify(tasks, null, 2);

  if (existingFileId) {
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: content,
    });

    if (!res.ok) {
      throw new Error('Failed to update daily tasks in Google Drive');
    }

    const updated = await res.json();
    return { fileId: updated.id || existingFileId };
  } else {
    const existing = await fetchDailyTasksFromDrive(token);
    if (existing) {
      return saveDailyTasksToDrive(token, tasks, existing.fileId);
    }

    const metadata = {
      name: DAILY_TASKS_FILENAME,
      parents: [folderId],
      mimeType: 'application/json',
      description: 'Daily tasks checklist and activities log',
    };

    const boundary = '-------DailyTasksBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      content +
      closeDelim;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      throw new Error('Failed to save daily tasks to Google Drive');
    }

    const created = await res.json();
    return { fileId: created.id };
  }
};

export const getOrCreateBackupsFolder = async (token: string): Promise<string> => {
  if (cachedBackupsFolderId) return cachedBackupsFolderId;

  const parentFolderId = await getOrCreateDailyNotesFolder(token);
  const query = encodeURIComponent(`'${parentFolderId}' in parents and name = '${BACKUPS_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)&spaces=drive`;

  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      cachedBackupsFolderId = data.files[0].id;
      return cachedBackupsFolderId!;
    }
  }

  // Create Backups subfolder inside Daily Notes
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUPS_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
      description: 'Automated daily backups for Daily Notes & Calendar',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Backups folder in Google Drive');
  }

  const newFolder = await createRes.json();
  cachedBackupsFolderId = newFolder.id;
  return cachedBackupsFolderId!;
};

export const getBackupsFolderInfo = async (
  token: string
): Promise<{ id: string; webViewLink?: string }> => {
  const folderId = await getOrCreateBackupsFolder(token);
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,webViewLink`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return { id: data.id, webViewLink: data.webViewLink };
    }
  } catch {
    // fallback
  }
  return { id: folderId };
};

/**
 * Creates or gets the dedicated daily subfolder ("map") inside the main Backups folder.
 * Example for 2026-09-22: "Daily Notes / Backups / 22 September 2026"
 */
export const getOrCreateDailyBackupFolder = async (
  token: string,
  dateKey: string
): Promise<DayFolderInfo> => {
  const cacheKey = `backup_day_${dateKey}`;
  if (dayFolderCache.has(cacheKey)) {
    return dayFolderCache.get(cacheKey)!;
  }

  const mainBackupsFolderId = await getOrCreateBackupsFolder(token);
  const dayFolderName = getDayFolderName(dateKey); // e.g., "22 September 2026"
  const altNames = getDayFolderAlternativeNames(dateKey);

  // Search if this day's backup folder already exists in the main Backups folder
  const nameChecks = altNames.map((n) => `name = '${n}'`).join(' or ');
  const query = encodeURIComponent(
    `'${mainBackupsFolderId}' in parents and (${nameChecks}) and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const found = data.files[0];
      const folderInfo: DayFolderInfo = {
        folderId: found.id,
        folderName: found.name,
        webViewLink: found.webViewLink,
      };
      dayFolderCache.set(cacheKey, folderInfo);
      return folderInfo;
    }
  }

  // Create new day folder (map) inside the main Backups folder
  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: dayFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [mainBackupsFolderId],
        description: `Daily backup map for ${dayFolderName} (${dateKey})`,
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create daily backup folder for ${dayFolderName}`);
  }

  const created = await createRes.json();
  const folderInfo: DayFolderInfo = {
    folderId: created.id,
    folderName: created.name,
    webViewLink: created.webViewLink,
  };
  dayFolderCache.set(cacheKey, folderInfo);
  return folderInfo;
};

export const saveDailyBackupToDrive = async (
  token: string,
  payload: BackupPayload,
  isTimestamped = false
): Promise<{
  fileId: string;
  filename: string;
  webViewLink?: string;
  dayFolderName: string;
  dayFolderId: string;
  dayFolderWebViewLink?: string;
}> => {
  const dateStr = payload.backupDate;
  // Get or create dedicated day folder (map) inside the main Backups folder
  const dayFolder = await getOrCreateDailyBackupFolder(token, dateStr);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const filename = isTimestamped
    ? `Backup_DailyNotes_${dateStr}_${timeStr}.json`
    : `Backup_DailyNotes_${dateStr}.json`;

  const content = JSON.stringify(payload, null, 2);

  // Check if a backup with this filename already exists inside this day folder
  const query = encodeURIComponent(`'${dayFolder.folderId}' in parents and name = '${filename}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, webViewLink)`;
  const checkRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (checkRes.ok) {
    const data = await checkRes.json();
    if (data.files && data.files.length > 0) {
      const existingId = data.files[0].id;
      const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: content,
      });

      if (!patchRes.ok) {
        throw new Error('Failed to update existing daily backup in Google Drive');
      }

      return {
        fileId: existingId,
        filename,
        webViewLink: data.files[0].webViewLink,
        dayFolderName: dayFolder.folderName,
        dayFolderId: dayFolder.folderId,
        dayFolderWebViewLink: dayFolder.webViewLink,
      };
    }
  }

  // Create new backup file inside day's folder (map)
  const metadata = {
    name: filename,
    parents: [dayFolder.folderId],
    mimeType: 'application/json',
    description: `Daily snapshot backup for ${dateStr} organized in map ${dayFolder.folderName}`,
  };

  const boundary = '-------DailyBackupBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    content +
    closeDelim;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to save daily backup to Google Drive');
  }

  const created = await createRes.json();
  return {
    fileId: created.id,
    filename: created.name,
    webViewLink: created.webViewLink,
    dayFolderName: dayFolder.folderName,
    dayFolderId: dayFolder.folderId,
    dayFolderWebViewLink: dayFolder.webViewLink,
  };
};

export const listDriveBackups = async (token: string): Promise<DriveBackupFile[]> => {
  const backupsFolderId = await getOrCreateBackupsFolder(token);
  const files: DriveBackupFile[] = [];

  // 1. Fetch direct legacy backup files in the root Backups folder
  try {
    const directQuery = encodeURIComponent(
      `'${backupsFolderId}' in parents and (name contains 'Backup' or mimeType = 'application/json') and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
    );
    const directUrl = `https://www.googleapis.com/drive/v3/files?q=${directQuery}&fields=files(id, name, createdTime, modifiedTime, size, webViewLink)&orderBy=createdTime desc&pageSize=50`;
    const directRes = await fetch(directUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (directRes.ok) {
      const data = await directRes.json();
      for (const file of data.files || []) {
        const match = file.name.match(/Backup_DailyNotes_(\d{4}-\d{2}-\d{2})/);
        files.push({
          id: file.id,
          name: file.name,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          size: file.size,
          webViewLink: file.webViewLink,
          backupDate: match ? match[1] : undefined,
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching direct backup files:', err);
  }

  // 2. Fetch daily subfolders (maps) inside main Backups folder
  try {
    const subfoldersQuery = encodeURIComponent(
      `'${backupsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const subfoldersUrl = `https://www.googleapis.com/drive/v3/files?q=${subfoldersQuery}&fields=files(id, name, webViewLink)&pageSize=100`;
    const subfoldersRes = await fetch(subfoldersUrl, { headers: { Authorization: `Bearer ${token}` } });

    if (subfoldersRes.ok) {
      const subfoldersData = await subfoldersRes.json();
      const dailyFolders = subfoldersData.files || [];

      // For each day subfolder, list backup files inside it
      const folderPromises = dailyFolders.map(async (folder: any) => {
        try {
          const filesInFolderQuery = encodeURIComponent(
            `'${folder.id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
          );
          const filesInFolderUrl = `https://www.googleapis.com/drive/v3/files?q=${filesInFolderQuery}&fields=files(id, name, createdTime, modifiedTime, size, webViewLink)&orderBy=createdTime desc&pageSize=20`;
          const res = await fetch(filesInFolderUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return [];

          const data = await res.json();
          return (data.files || []).map((file: any) => {
            const match = file.name.match(/Backup_DailyNotes_(\d{4}-\d{2}-\d{2})/);
            let backupDate = match ? match[1] : undefined;

            if (!backupDate) {
              const dayMatch = folder.name.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
              if (dayMatch) {
                const day = String(dayMatch[1]).padStart(2, '0');
                const monthStr = dayMatch[2];
                const year = dayMatch[3];
                const monthNames = [
                  'january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'
                ];
                const mIndex = monthNames.indexOf(monthStr.toLowerCase());
                if (mIndex >= 0) {
                  const month = String(mIndex + 1).padStart(2, '0');
                  backupDate = `${year}-${month}-${day}`;
                }
              }
            }

            return {
              id: file.id,
              name: file.name,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime,
              size: file.size,
              webViewLink: file.webViewLink,
              backupDate,
              dayFolderName: folder.name,
              dayFolderId: folder.id,
              dayFolderWebViewLink: folder.webViewLink,
            } as DriveBackupFile;
          });
        } catch {
          return [];
        }
      });

      const nestedFilesArrays = await Promise.all(folderPromises);
      for (const arr of nestedFilesArrays) {
        files.push(...arr);
      }
    }
  } catch (err) {
    console.warn('Error fetching daily backup subfolders:', err);
  }

  // Sort descending by createdTime or modifiedTime
  files.sort((a, b) => {
    const timeA = a.createdTime || a.modifiedTime || '';
    const timeB = b.createdTime || b.modifiedTime || '';
    return timeB.localeCompare(timeA);
  });

  return files;
};

export const fetchBackupContentFromDrive = async (
  token: string,
  fileId: string
): Promise<BackupPayload> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download backup content from Google Drive');
  }

  return await res.json();
};

export const deleteDriveBackup = async (token: string, fileId: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error('Failed to delete backup from Google Drive');
  }
};

// ---------------------------------------------------------------------------
// Google NotebookLM Integration
// ---------------------------------------------------------------------------
export const NOTEBOOKLM_DIGEST_FILENAME = 'NotebookLM_DailyNotes_Digest.md';

export interface NotebookLMDigestInfo {
  fileId: string;
  filename: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export const getNotebookLMDigestInfo = async (
  token: string
): Promise<NotebookLMDigestInfo | null> => {
  const folderId = await getOrCreateDailyNotesFolder(token);
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${NOTEBOOKLM_DIGEST_FILENAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime, webViewLink, size)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (!data.files || data.files.length === 0) {
    return null;
  }

  const file = data.files[0];
  return {
    fileId: file.id,
    filename: file.name,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    size: file.size,
  };
};

export const saveNotebookLMDigestToDrive = async (
  token: string,
  content: string
): Promise<NotebookLMDigestInfo> => {
  const folderId = await getOrCreateDailyNotesFolder(token);
  const existing = await getNotebookLMDigestInfo(token);

  if (existing) {
    // Update existing file
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/markdown; charset=UTF-8',
      },
      body: content,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update NotebookLM Digest in Google Drive');
    }

    const updated = await res.json();
    return {
      fileId: updated.id || existing.fileId,
      filename: NOTEBOOKLM_DIGEST_FILENAME,
      webViewLink: updated.webViewLink || existing.webViewLink,
      modifiedTime: new Date().toISOString(),
    };
  }

  // Create new file via multipart upload
  const metadata = {
    name: NOTEBOOKLM_DIGEST_FILENAME,
    parents: [folderId],
    mimeType: 'text/markdown',
    description: 'Consolidated knowledge digest optimized for Google NotebookLM source ingestion',
  };

  const boundary = '-------NotebookLMBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    content +
    closeDelim;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink';
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload NotebookLM Digest to Google Drive');
  }

  const created = await res.json();
  return {
    fileId: created.id,
    filename: created.name,
    webViewLink: created.webViewLink,
    modifiedTime: created.modifiedTime || new Date().toISOString(),
  };
};

export const generateNotebookLMMarkdown = ({
  userEmail,
  activeDate,
  activeContent,
  archiveNotes,
  reminders,
  calendarEvents,
}: {
  userEmail?: string | null;
  activeDate: string;
  activeContent: string;
  archiveNotes: Array<{ dateKey: string; content?: string; name: string }>;
  reminders: ReminderNote[];
  calendarEvents?: Array<{ summary: string; start?: { dateTime?: string; date?: string } }>;
}): string => {
  const generatedTimestamp = new Date().toLocaleString();
  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const completedReminders = reminders.filter((r) => r.isCompleted);

  const lines: string[] = [];

  lines.push(`# Google NotebookLM Knowledge Source: Daily Notes & Tasks Vault`);
  lines.push(``);
  lines.push(`> **Source Metadata**:`);
  lines.push(`> - **User Account**: ${userEmail || 'Local User'}`);
  lines.push(`> - **Exported / Synced At**: ${generatedTimestamp}`);
  lines.push(`> - **Active Focus Day**: ${activeDate}`);
  lines.push(`> - **Total Reminders / Tasks**: ${reminders.length} (${activeReminders.length} active, ${completedReminders.length} completed)`);
  lines.push(`> - **Total Archive Files Tracked**: ${archiveNotes.length}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## Table of Contents & Structure`);
  lines.push(`1. [Active Focus Day (${activeDate})](#active-focus-day-${activeDate.replace(/[^a-zA-Z0-9]/g, '-')})`);
  lines.push(`2. [Quick Reminders & Action Items](#quick-reminders--action-items)`);
  lines.push(`3. [Archived Daily Notes](#archived-daily-notes)`);
  if (calendarEvents && calendarEvents.length > 0) {
    lines.push(`4. [Scheduled Calendar Events & Meetings](#scheduled-calendar-events--meetings)`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Active Daily Note
  lines.push(`## Active Focus Day (${activeDate})`);
  if (activeContent.trim()) {
    lines.push(activeContent);
  } else {
    lines.push(`*(No content written yet for ${activeDate})*`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Reminders & Sticky Notes
  lines.push(`## Quick Reminders & Action Items`);
  lines.push(``);
  if (activeReminders.length > 0) {
    lines.push(`### Active Tasks & Sticky Notes`);
    for (const r of activeReminders) {
      const priorityLabel = r.priority ? `[Priority: ${r.priority.toUpperCase()}]` : '';
      const dueLabel = r.dueDate ? `(Due: ${r.dueDate})` : '';
      const pinLabel = r.isPinned ? '📌 [Pinned]' : '';
      lines.push(`#### - [ ] ${r.title || 'Untitled Note'} ${priorityLabel} ${dueLabel} ${pinLabel}`);
      if (r.content.trim()) {
        lines.push(``);
        lines.push(r.content);
        lines.push(``);
      }
    }
  } else {
    lines.push(`*(No active reminders)*`);
  }
  lines.push(``);

  if (completedReminders.length > 0) {
    lines.push(`### Completed Tasks`);
    for (const r of completedReminders) {
      lines.push(`- [x] **${r.title || 'Completed Task'}**`);
      if (r.content.trim()) {
        lines.push(`  > ${r.content.replace(/\n/g, ' ')}`);
      }
    }
    lines.push(``);
  }
  lines.push(`---`);
  lines.push(``);

  // Archive Notes
  lines.push(`## Archived Daily Notes`);
  if (archiveNotes.length > 0) {
    for (const note of archiveNotes) {
      if (note.dateKey === activeDate) continue; // already shown above
      lines.push(`### Daily Note for ${note.dateKey}`);
      if (note.content && note.content.trim()) {
        lines.push(note.content);
      } else {
        lines.push(`*(File saved in Google Drive: ${note.name})*`);
      }
      lines.push(``);
    }
  } else {
    lines.push(`*(No other historical notes)*`);
  }
  lines.push(``);

  // Calendar Events
  if (calendarEvents && calendarEvents.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## Scheduled Calendar Events & Meetings`);
    for (const ev of calendarEvents) {
      const timeStr = ev.start?.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : ev.start?.date || 'All Day';
      lines.push(`- **${timeStr}**: ${ev.summary}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
};

