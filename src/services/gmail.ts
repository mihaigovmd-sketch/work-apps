import { GmailNotificationItem, GmailCategory, GmailScanFilter, DetectedMeetingInfo } from '../types';

/**
 * Safely decodes base64url encoded string from Gmail API
 */
const decodeBase64Url = (base64url: string): string => {
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    try {
      return atob(base64url.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
};

/**
 * Extracts plain text, html, and ICS calendar invites from Gmail payload parts recursively
 */
const extractMessageBody = (payload: any): { text?: string; html?: string; ics?: string } => {
  if (!payload) return {};

  let text = '';
  let html = '';
  let ics = '';

  const walk = (part: any) => {
    if (!part) return;

    const mime = (part.mimeType || '').toLowerCase();
    const filename = (part.filename || '').toLowerCase();

    if (mime === 'text/plain' && part.body?.data) {
      text += decodeBase64Url(part.body.data) + '\n';
    } else if (mime === 'text/html' && part.body?.data) {
      html += decodeBase64Url(part.body.data) + '\n';
    } else if (
      (mime === 'text/calendar' || mime === 'application/ics' || filename.endsWith('.ics')) &&
      part.body?.data
    ) {
      ics += decodeBase64Url(part.body.data) + '\n';
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        walk(subPart);
      }
    }
  };

  walk(payload);

  return {
    text: text.trim(),
    html: html.trim(),
    ics: ics.trim() || undefined,
  };
};

/**
 * Parse standard RFC 2822 From header into display name and email address
 */
const parseSender = (rawFrom: string): { name: string; email: string } => {
  if (!rawFrom) return { name: 'Unknown Sender', email: '' };

  const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, '').trim();
    const email = match[2].trim();
    return {
      name: name || email.split('@')[0],
      email,
    };
  }

  // Raw email only or simple text
  if (rawFrom.includes('@')) {
    return {
      name: rawFrom.split('@')[0],
      email: rawFrom.trim(),
    };
  }

  return {
    name: rawFrom.trim(),
    email: '',
  };
};

/**
 * Format Date object to local YYYY-MM-DD
 */
const toLocalDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Format Date object to local HH:mm
 */
const toLocalTimeStr = (d: Date): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Add minutes to a HH:mm string safely
 */
const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const [hStr, mStr] = timeStr.split(':');
  const totalMins = (parseInt(hStr, 10) || 10) * 60 + (parseInt(mStr, 10) || 0) + minutesToAdd;
  const clamped = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Clean subject line into a tidy Calendar event title
 */
const cleanMeetingTitle = (subject: string): string => {
  let title = (subject || 'Meeting')
    .replace(/^(re|fwd|fw):\s*/gi, '')
    .replace(/^(updated\s+)?invitation(\s+with\s+note)?:\s*/gi, '')
    .replace(/\s*@\s*(mon|tue|wed|thu|fri|sat|sun)\s+[a-z]{3}\s+\d{1,2}.*$/i, '')
    .trim();
  return title || subject || 'Scheduled Meeting';
};

/**
 * Extract video conferencing link (Google Meet, Zoom, MS Teams, Webex)
 */
const extractMeetingLink = (text: string): string | undefined => {
  if (!text) return undefined;
  const patterns = [
    /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
    /https:\/\/[a-z0-9.-]*zoom\.us\/j\/[^\s<>)"']+/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>)"']+/i,
    /https:\/\/[a-z0-9.-]*webex\.com\/[^\s<>)"']+/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (match) return match[0];
  }
  return undefined;
};

/**
 * Parse iCalendar (.ics) datetime value into local Date
 */
const parseIcsDateTime = (rawVal: string): { date?: Date; isAllDay?: boolean } => {
  if (!rawVal) return {};
  const val = rawVal.trim();
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const dtMatch = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (dtMatch) {
    const [, y, mo, d, h, mi, s, isUtc] = dtMatch;
    if (isUtc) {
      return {
        date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)),
        isAllDay: false,
      };
    }
    return {
      date: new Date(+y, +mo - 1, +d, +h, +mi, +s),
      isAllDay: false,
    };
  }
  // YYYYMMDD
  const dMatch = val.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dMatch) {
    const [, y, mo, d] = dMatch;
    return {
      date: new Date(+y, +mo - 1, +d, 10, 0, 0),
      isAllDay: true,
    };
  }
  return {};
};

/**
 * Parse meeting from raw .ics attachment/part
 */
const parseMeetingFromIcs = (icsText: string, fallbackSubject: string): DetectedMeetingInfo | null => {
  if (!icsText || !icsText.includes('BEGIN:VEVENT')) return null;

  // Unfold RFC 5545 folded lines
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let summary = '';
  let dtStartRaw = '';
  let dtEndRaw = '';
  let location = '';
  let description = '';
  let conference = '';
  const attendees: string[] = [];

  let inEvent = false;
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      break;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx).toUpperCase();
    const keyName = keyPart.split(';')[0];
    const value = line
      .slice(colonIdx + 1)
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .trim();

    if (keyName === 'SUMMARY' && !summary) summary = value;
    else if (keyName === 'DTSTART' && !dtStartRaw) dtStartRaw = value;
    else if (keyName === 'DTEND' && !dtEndRaw) dtEndRaw = value;
    else if (keyName === 'LOCATION' && !location) location = value;
    else if (keyName === 'DESCRIPTION' && !description) description = value;
    else if (keyName === 'X-GOOGLE-CONFERENCE' && !conference) conference = value;
    else if (keyName === 'ATTENDEE') {
      const mailMatch = value.match(/mailto:([^\s;]+)/i);
      if (mailMatch && mailMatch[1] && !attendees.includes(mailMatch[1])) {
        attendees.push(mailMatch[1]);
      }
    }
  }

  const parsedStart = parseIcsDateTime(dtStartRaw);
  const parsedEnd = parseIcsDateTime(dtEndRaw);
  const startDateObj = parsedStart.date || new Date();
  const startTime = parsedStart.isAllDay ? '10:00' : toLocalTimeStr(startDateObj);
  const endTime =
    parsedEnd.date && !parsedEnd.isAllDay
      ? toLocalTimeStr(parsedEnd.date)
      : addMinutesToTime(startTime, 30);

  const meetingLink =
    conference ||
    extractMeetingLink(location) ||
    extractMeetingLink(description);

  return {
    title: cleanMeetingTitle(summary || fallbackSubject),
    date: toLocalDateKey(startDateObj),
    startTime,
    endTime,
    location: location || meetingLink || undefined,
    meetingLink,
    attendeesEmails: attendees.length > 0 ? attendees : undefined,
    description: description ? description.slice(0, 600) : undefined,
    confidence: 'high',
    source: 'ics',
    rawWhenText: `${toLocalDateKey(startDateObj)} ${startTime}–${endTime}`,
  };
};

/**
 * Normalize 12h/24h time match to HH:mm
 */
const normalizeTime = (hourStr: string, minStr: string | undefined, ampm?: string): string => {
  let h = parseInt(hourStr, 10);
  const m = parseInt(minStr || '0', 10);
  if (ampm) {
    const lower = ampm.toLowerCase();
    if (lower === 'pm' && h < 12) h += 12;
    if (lower === 'am' && h === 12) h = 0;
  }
  h = Math.max(0, Math.min(23, h));
  const clampedMin = Math.max(0, Math.min(59, m));
  return `${String(h).padStart(2, '0')}:${String(clampedMin).padStart(2, '0')}`;
};

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Detect & extract meeting details from email subject & body text
 */
export const detectMeetingFromEmail = (params: {
  subject: string;
  bodyText: string;
  senderEmail?: string;
  senderName?: string;
  timestamp: number;
  icsText?: string;
}): DetectedMeetingInfo | undefined => {
  const { subject, bodyText, senderEmail, timestamp, icsText } = params;

  // 1. Highest priority: actual ICS calendar attachment/part
  if (icsText) {
    const fromIcs = parseMeetingFromIcs(icsText, subject);
    if (fromIcs) return fromIcs;
  }

  const combined = `${subject}\n${bodyText}`.trim();
  const lower = combined.toLowerCase();
  const meetingLink = extractMeetingLink(combined);

  // Determine whether this email actually represents a meeting / appointment arrangement
  const strongKeywords = [
    'invitation:',
    'invited you',
    'calendar invitation',
    'meeting invite',
    'google meet',
    'zoom meeting',
    'teams meeting',
    'join zoom',
    'video call',
    'appointment',
    'schedule a meeting',
    'schedule a call',
    'reschedule',
    'sprint sync',
    'standup',
    '1:1',
    'one-on-one',
    'conference call',
    'interview',
    'let\'s meet',
    'let us meet',
    'meet at',
    'call at',
    'meeting on',
    'meeting tomorrow',
    'meeting today',
  ];

  const hasMeetingWord = /\b(meeting|sync|standup|appointment|call|zoom|webinar|interview|invitation|agenda|calendar)\b/i.test(
    combined
  );
  const hasStrongSignal = Boolean(meetingLink) || strongKeywords.some((kw) => lower.includes(kw));

  // Ignore pure automated backup digests / promotional spam unless a video link or strong invite exists
  const isDigestOrBackup =
    lower.includes('backup') ||
    lower.includes('digest') ||
    lower.includes('security alert') ||
    lower.includes('unsubscribe');
  if (isDigestOrBackup && !meetingLink && !lower.includes('invitation')) {
    return undefined;
  }

  // Time extraction (range first, then single time)
  let startTime: string | undefined;
  let endTime: string | undefined;
  let rawTimeMatch = '';

  const rangeMatch = combined.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  );
  if (rangeMatch && (rangeMatch[3] || rangeMatch[6] || rangeMatch[2])) {
    const inferredAmPm1 = rangeMatch[3] || rangeMatch[6];
    const inferredAmPm2 = rangeMatch[6] || rangeMatch[3];
    startTime = normalizeTime(rangeMatch[1], rangeMatch[2], inferredAmPm1);
    endTime = normalizeTime(rangeMatch[4], rangeMatch[5], inferredAmPm2);
    rawTimeMatch = rangeMatch[0];
  } else {
    const singleTimeMatch =
      combined.match(/(?:@|at|time:)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i) ||
      combined.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i) ||
      combined.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (singleTimeMatch) {
      const h = singleTimeMatch[1];
      const m = singleTimeMatch[2] && /^\d{2}$/.test(singleTimeMatch[2]) ? singleTimeMatch[2] : '00';
      const ampm =
        singleTimeMatch[3] ||
        (singleTimeMatch[2] && /^(am|pm)$/i.test(singleTimeMatch[2]) ? singleTimeMatch[2] : undefined);
      startTime = normalizeTime(h, m, ampm);
      endTime = addMinutesToTime(startTime, 30);
      rawTimeMatch = singleTimeMatch[0];
    }
  }

  // Must have either strong meeting signal OR (meeting word + explicit time)
  if (!hasStrongSignal && !(hasMeetingWord && startTime)) {
    return undefined;
  }

  // Date extraction relative to email date (or current date if email timestamp is missing)
  const baseDate = new Date(timestamp || Date.now());
  let resolvedDate: Date | null = null;
  let rawDateMatch = '';

  const isoDateMatch = combined.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoDateMatch) {
    const [y, m, d] = isoDateMatch[1].split('-').map(Number);
    resolvedDate = new Date(y, m - 1, d);
    rawDateMatch = isoDateMatch[1];
  } else if (/\btomorrow\b/i.test(combined)) {
    resolvedDate = new Date(baseDate);
    resolvedDate.setDate(resolvedDate.getDate() + 1);
    rawDateMatch = 'Tomorrow';
  } else if (/\btoday\b/i.test(combined)) {
    resolvedDate = new Date(baseDate);
    rawDateMatch = 'Today';
  } else {
    const monthFirst = combined.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(202\d))?\b/i
    );
    const dayFirst = combined.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s*(202\d))?\b/i
    );
    if (monthFirst) {
      const monthIdx = MONTH_NAMES[monthFirst[1].toLowerCase()];
      const dayNum = parseInt(monthFirst[2], 10);
      const yearNum = monthFirst[3] ? parseInt(monthFirst[3], 10) : baseDate.getFullYear();
      resolvedDate = new Date(yearNum, monthIdx, dayNum);
      rawDateMatch = monthFirst[0];
    } else if (dayFirst) {
      const dayNum = parseInt(dayFirst[1], 10);
      const monthIdx = MONTH_NAMES[dayFirst[2].toLowerCase()];
      const yearNum = dayFirst[3] ? parseInt(dayFirst[3], 10) : baseDate.getFullYear();
      resolvedDate = new Date(yearNum, monthIdx, dayNum);
      rawDateMatch = dayFirst[0];
    } else {
      const weekdayMatch = combined.match(
        /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
      );
      if (weekdayMatch) {
        const targetDow = WEEKDAY_NAMES[weekdayMatch[2].toLowerCase()];
        const candidate = new Date(baseDate);
        const diff = (targetDow - candidate.getDay() + 7) % 7 || 7;
        candidate.setDate(candidate.getDate() + diff);
        resolvedDate = candidate;
        rawDateMatch = weekdayMatch[0];
      }
    }
  }

  const finalDate = resolvedDate ? toLocalDateKey(resolvedDate) : toLocalDateKey(baseDate);
  const finalStart = startTime || '10:00';
  const finalEnd = endTime || addMinutesToTime(finalStart, 30);

  // Location extraction
  const whereMatch = combined.match(/^(?:where|location):\s*(.+)$/im);
  const location = whereMatch?.[1]?.trim() || meetingLink || undefined;

  // Include human sender email as potential attendee
  const isAutomatedSender =
    !senderEmail ||
    /no-?reply|calendar-notification|notifications?@|mailer-daemon|updates@/i.test(senderEmail);
  const attendeesEmails = !isAutomatedSender && senderEmail ? [senderEmail] : undefined;

  const rawWhenParts = [rawDateMatch, rawTimeMatch].filter(Boolean);

  return {
    title: cleanMeetingTitle(subject),
    date: finalDate,
    startTime: finalStart,
    endTime: finalEnd,
    location,
    meetingLink,
    attendeesEmails,
    confidence: startTime && (rawDateMatch || meetingLink) ? 'high' : 'medium',
    source: 'text',
    rawWhenText: rawWhenParts.length > 0 ? rawWhenParts.join(' • ') : undefined,
  };
};

/**
 * Categorize email into notifications bucket
 */
const determineCategory = (
  labels: string[] = [],
  subject = '',
  from = '',
  hasMeeting = false
): GmailCategory => {
  const lowerSub = subject.toLowerCase();
  const lowerFrom = from.toLowerCase();

  if (
    hasMeeting ||
    lowerSub.includes('invitation') ||
    lowerSub.includes('invited you') ||
    lowerSub.includes('calendar') ||
    lowerSub.includes('meeting') ||
    lowerFrom.includes('calendar-notification@google.com')
  ) {
    return 'calendar';
  }

  if (
    lowerSub.includes('security') ||
    lowerSub.includes('alert') ||
    lowerSub.includes('sign-in') ||
    lowerSub.includes('warning') ||
    lowerSub.includes('urgent') ||
    lowerFrom.includes('security')
  ) {
    return 'alerts';
  }

  if (
    labels.includes('CATEGORY_UPDATES') ||
    lowerSub.includes('update') ||
    lowerSub.includes('notification') ||
    lowerSub.includes('digest') ||
    lowerSub.includes('status') ||
    lowerSub.includes('backup')
  ) {
    return 'updates';
  }

  if (labels.includes('CATEGORY_PROMOTIONS')) {
    return 'promotions';
  }

  if (labels.includes('CATEGORY_FORUMS')) {
    return 'forums';
  }

  return 'direct';
};

/**
 * Query Gmail messages list with automatic filter formulation
 */
export const fetchGmailNotifications = async (
  accessToken: string,
  filter: GmailScanFilter = 'unread',
  maxResults = 12
): Promise<GmailNotificationItem[]> => {
  let query = 'is:unread';
  if (filter === 'all') {
    query = 'in:inbox';
  } else if (filter === 'unread') {
    query = 'is:unread';
  } else if (filter === 'updates') {
    query = 'category:updates OR label:updates OR "notification"';
  } else if (filter === 'alerts') {
    query = 'label:IMPORTANT OR "security alert" OR "critical" OR "warning" OR "alert"';
  } else if (filter === 'calendar') {
    query = 'filename:invite.ics OR "calendar" OR "invitation" OR "meeting"';
  }

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=${maxResults}`;

  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorMsg =
      errorBody?.error?.message ||
      `Gmail API returned HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch details concurrently with Promise.all
  const details = await Promise.all(
    rawList.map(async (item) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (!msgRes.ok) return null;
        const msg = await msgRes.json();

        const headers: Record<string, string> = {};
        if (msg.payload?.headers) {
          for (const h of msg.payload.headers) {
            headers[h.name.toLowerCase()] = h.value;
          }
        }

        const rawFrom = headers['from'] || 'Unknown Sender';
        const subject = headers['subject'] || '(No Subject)';
        const dateHeader = headers['date'] || '';
        const parsedSender = parseSender(rawFrom);
        const labels: string[] = msg.labelIds || [];
        const isUnread = labels.includes('UNREAD');
        const isImportant = labels.includes('IMPORTANT');

        const { text: bodyText, ics: icsText } = extractMessageBody(msg.payload);
        const snippet = msg.snippet || bodyText?.slice(0, 160) || '';

        let timestamp = Number(msg.internalDate) || Date.now();
        if (isNaN(timestamp) && dateHeader) {
          const parsed = Date.parse(dateHeader);
          if (!isNaN(parsed)) timestamp = parsed;
        }

        const dateStr = new Date(timestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const detectedMeeting = detectMeetingFromEmail({
          subject,
          bodyText: bodyText || snippet,
          senderEmail: parsedSender.email,
          senderName: parsedSender.name,
          timestamp,
          icsText,
        });

        const category = determineCategory(labels, subject, rawFrom, Boolean(detectedMeeting));

        return {
          id: msg.id,
          threadId: msg.threadId,
          sender: rawFrom,
          senderName: parsedSender.name,
          senderEmail: parsedSender.email,
          subject,
          snippet,
          dateStr,
          timestamp,
          isUnread,
          isImportant,
          labels,
          category,
          bodyPreview: bodyText || snippet,
          detectedMeeting,
        } as GmailNotificationItem;
      } catch (err) {
        console.warn('Failed to parse Gmail message detail for', item.id, err);
        return null;
      }
    })
  );

  return details
    .filter((item): item is GmailNotificationItem => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Fetch complete message details (including body and headers)
 */
export const fetchGmailMessageDetail = async (
  accessToken: string,
  messageId: string
): Promise<{
  id: string;
  subject: string;
  sender: string;
  senderName: string;
  senderEmail: string;
  dateStr: string;
  bodyText: string;
  bodyHtml?: string;
  snippet: string;
  labels: string[];
  gmailLink: string;
}> => {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message || `Failed to fetch message details (HTTP ${res.status})`
    );
  }

  const msg = await res.json();
  const headers: Record<string, string> = {};
  if (msg.payload?.headers) {
    for (const h of msg.payload.headers) {
      headers[h.name.toLowerCase()] = h.value;
    }
  }

  const rawFrom = headers['from'] || 'Unknown Sender';
  const subject = headers['subject'] || '(No Subject)';
  const dateHeader = headers['date'] || '';
  const parsedSender = parseSender(rawFrom);
  const labels: string[] = msg.labelIds || [];

  const { text, html } = extractMessageBody(msg.payload);

  let timestamp = Number(msg.internalDate) || Date.now();
  if (isNaN(timestamp) && dateHeader) {
    const parsed = Date.parse(dateHeader);
    if (!isNaN(parsed)) timestamp = parsed;
  }

  const dateStr = new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: msg.id,
    subject,
    sender: rawFrom,
    senderName: parsedSender.name,
    senderEmail: parsedSender.email,
    dateStr,
    bodyText: text || msg.snippet || '',
    bodyHtml: html,
    snippet: msg.snippet || '',
    labels,
    gmailLink: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
  };
};

/**
 * Mark a message as read in Gmail
 */
export const markGmailAsRead = async (
  accessToken: string,
  messageId: string
): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD'],
        }),
      }
    );
    return res.ok;
  } catch (err) {
    console.error('Failed to mark message as read:', err);
    return false;
  }
};

/**
 * Offline / Guest Sample Notifications for instantaneous testing
 */
export const getOfflineSampleNotifications = (): GmailNotificationItem[] => {
  const now = Date.now();
  const todayDate = new Date(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const todayKey = toLocalDateKey(todayDate);
  const tomorrowKey = toLocalDateKey(tomorrowDate);

  return [
    {
      id: 'sample-msg-1',
      threadId: 'sample-thread-1',
      sender: 'Google Security <no-reply@accounts.google.com>',
      senderName: 'Google Security Alert',
      senderEmail: 'no-reply@accounts.google.com',
      subject: 'Security Alert: New device connected to your Google Workspace account',
      snippet:
        'Your Google Account was recently accessed from a new browser. If this was you, you can safely disregard this alert.',
      dateStr: 'Just now',
      timestamp: now,
      isUnread: true,
      isImportant: true,
      labels: ['UNREAD', 'IMPORTANT', 'CATEGORY_UPDATES'],
      category: 'alerts',
      bodyPreview:
        'A new sign-in was detected on your Google Account.\nDevice: Linux Chrome\nLocation: Dev Container / AI Studio\nDate: Today\n\nIf you performed this sign-in, no action is required.',
    },
    {
      id: 'sample-msg-2',
      threadId: 'sample-thread-2',
      sender: 'Google Calendar <calendar-notification@google.com>',
      senderName: 'Google Calendar',
      senderEmail: 'calendar-notification@google.com',
      subject: 'Invitation: Daily Standup & Sprint Sync @ 10:00 AM',
      snippet:
        'You have been invited to Daily Standup & Sprint Sync. Location: Google Meet. Attendees: Team leads.',
      dateStr: '15m ago',
      timestamp: now - 15 * 60 * 1000,
      isUnread: true,
      isImportant: true,
      labels: ['UNREAD', 'CATEGORY_UPDATES'],
      category: 'calendar',
      bodyPreview:
        'Event: Daily Standup & Sprint Sync\nWhen: Today at 10:00 AM – 10:30 AM\nWhere: https://meet.google.com/abc-defg-hij\nOrganized via Google Calendar',
      detectedMeeting: {
        title: 'Daily Standup & Sprint Sync',
        date: todayKey,
        startTime: '10:00',
        endTime: '10:30',
        location: 'https://meet.google.com/abc-defg-hij',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        confidence: 'high',
        source: 'ics',
        rawWhenText: 'Today at 10:00 AM – 10:30 AM',
      },
    },
    {
      id: 'sample-msg-4',
      threadId: 'sample-thread-4',
      sender: 'Elena Vance <elena.vance@partner-studio.com>',
      senderName: 'Elena Vance',
      senderEmail: 'elena.vance@partner-studio.com',
      subject: 'Meeting Request: Q4 Project Review Tomorrow at 2:00 PM',
      snippet:
        'Hi! Can we meet tomorrow at 2:00 PM - 2:45 PM to review the Q4 deliverables and timeline?',
      dateStr: '42m ago',
      timestamp: now - 42 * 60 * 1000,
      isUnread: true,
      isImportant: true,
      labels: ['UNREAD', 'IMPORTANT'],
      category: 'calendar',
      bodyPreview:
        'Hi,\n\nCan we schedule a video call tomorrow from 2:00 PM - 2:45 PM to walk through the Q4 roadmap?\nWhere: Conference Room B / Online Meet\n\nBest,\nElena',
      detectedMeeting: {
        title: 'Meeting Request: Q4 Project Review',
        date: tomorrowKey,
        startTime: '14:00',
        endTime: '14:45',
        location: 'Conference Room B / Online Meet',
        attendeesEmails: ['elena.vance@partner-studio.com'],
        confidence: 'high',
        source: 'text',
        rawWhenText: 'Tomorrow • 2:00 PM - 2:45 PM',
      },
    },
    {
      id: 'sample-msg-3',
      threadId: 'sample-thread-3',
      sender: 'Google Workspace Updates <workspace-updates@google.com>',
      senderName: 'Google Workspace Updates',
      senderEmail: 'workspace-updates@google.com',
      subject: 'Weekly Digest: Drive daily backups and notes synchronized successfully',
      snippet:
        'Your daily folders and snapshots for November 2026 have been synchronized to Google Drive root folder.',
      dateStr: '2h ago',
      timestamp: now - 2 * 3600 * 1000,
      isUnread: false,
      isImportant: false,
      labels: ['CATEGORY_UPDATES'],
      category: 'updates',
      bodyPreview:
        'All your daily notes, Synology-style sticky notes, and calendar events for today were backed up in the dedicated day folder.',
    },
  ];
};
