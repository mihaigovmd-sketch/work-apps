import { CalendarEventItem } from '../types';

export const fetchCalendarEvents = async (
  token: string,
  startDateISO: string,
  endDateISO: string
): Promise<CalendarEventItem[]> => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    startDateISO
  )}&timeMax=${encodeURIComponent(endDateISO)}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch Google Calendar events');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Untitled Event)',
    description: item.description,
    location: item.location,
    htmlLink: item.htmlLink,
    hangoutLink: item.hangoutLink,
    start: item.start || {},
    end: item.end || {},
    attendees: item.attendees || [],
  }));
};

export interface NewEventPayload {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendeesEmails?: string[];
  addGoogleMeet?: boolean;
}

export const createCalendarEvent = async (
  token: string,
  payload: NewEventPayload
): Promise<CalendarEventItem> => {
  const body: any = {
    summary: payload.summary,
    description: payload.description,
    location: payload.location,
    start: {
      dateTime: payload.startDateTime,
    },
    end: {
      dateTime: payload.endDateTime,
    },
  };

  if (payload.attendeesEmails && payload.attendeesEmails.length > 0) {
    body.attendees = payload.attendeesEmails.map((email) => ({ email: email.trim() }));
  }

  if (payload.addGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: 'sample-' + Date.now(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const queryParams = payload.addGoogleMeet ? '?conferenceDataVersion=1' : '';
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${queryParams}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to schedule event in Google Calendar');
  }

  const created = await res.json();
  return {
    id: created.id,
    summary: created.summary || payload.summary,
    description: created.description,
    location: created.location,
    htmlLink: created.htmlLink,
    hangoutLink: created.hangoutLink,
    start: created.start || { dateTime: payload.startDateTime },
    end: created.end || { dateTime: payload.endDateTime },
    attendees: created.attendees || [],
  };
};

export const deleteCalendarEvent = async (token: string, eventId: string): Promise<void> => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete event from Google Calendar');
  }
};
