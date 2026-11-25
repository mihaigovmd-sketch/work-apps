/**
 * Date formatting and Fresh Morning Note template generator
 * Designed to strictly adhere to Day, Month, Year format.
 */

export interface FormattedDateInfo {
  weekday: string;
  day: number;
  monthName: string;
  monthNumber: number;
  year: number;
  formattedLong: string;      // e.g. "Monday, 22 September 2026"
  formattedNumeric: string;   // e.g. "22/09/2026" (Day/Month/Year)
  formattedHeader: string;    // e.g. "Monday, 22 September 2026 (22/09/2026)"
  dateKey: string;            // YYYY-MM-DD
}

export function formatDateDayMonthYear(dateStr: string): FormattedDateInfo {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  // Noon to avoid timezone boundary issues
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);

  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const day = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const monthNumber = m;
  const year = dateObj.getFullYear();

  // Day, Month, Year format
  const formattedLong = `${weekday}, ${day} ${monthName} ${year}`;
  const formattedNumeric = `${String(day).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}/${year}`;
  const formattedHeader = `${weekday}, ${day} ${monthName} ${year} • ${formattedNumeric}`;

  return {
    weekday,
    day,
    monthName,
    monthNumber,
    year,
    formattedLong,
    formattedNumeric,
    formattedHeader,
    dateKey: dateStr,
  };
}

/**
 * Generates a fresh morning daily note template with the Day, Month, Year date
 */
export function createFreshMorningNoteContent(
  dateStr: string,
  carryOverTasks?: string[]
): string {
  const dateInfo = formatDateDayMonthYear(dateStr);

  let tasksSnippet = '';
  if (carryOverTasks && carryOverTasks.length > 0) {
    tasksSnippet = carryOverTasks.map((t) => `- [ ] ${t} *(Carried over)*`).join('\n');
  } else {
    tasksSnippet = `- [ ] Priority 1: \n- [ ] Priority 2: \n- [ ] Priority 3: `;
  }

  return `# ☀️ ${dateInfo.formattedLong}
> 📅 **Date**: ${dateInfo.formattedNumeric} (Day/Month/Year) • 🌅 **Fresh Morning Note**

## 🎯 Daily Tasks & What I Need to Do Today
${tasksSnippet}

## 📝 What I Did Today / Daily Activity Log
- 

## 💡 Notes, Ideas & Reflections
- 

---
*Auto-synced & backed up to Google Drive (Synology style)*
`;
}

/**
 * Extracts checklist task items from a markdown note
 */
export function extractChecklistTasks(content: string): Array<{ text: string; completed: boolean }> {
  const lines = content.split('\n');
  const tasks: Array<{ text: string; completed: boolean }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
      const text = trimmed.substring(6).trim();
      if (text) tasks.push({ text, completed: false });
    } else if (
      trimmed.startsWith('- [x] ') ||
      trimmed.startsWith('- [X] ') ||
      trimmed.startsWith('* [x] ') ||
      trimmed.startsWith('* [X] ')
    ) {
      const text = trimmed.substring(6).trim();
      if (text) tasks.push({ text, completed: true });
    }
  }

  return tasks;
}
