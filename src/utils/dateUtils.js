/**
 * Get current date in PST timezone
 * Returns date string in YYYY-MM-DD format
 */
export const getPSTDate = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get PST date (handles DST automatically)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
};

/**
 * Get current date and time in PST timezone
 * Returns datetime string in YYYY-MM-DD HH:mm:ss format
 */
export const getPSTDateTime = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get PST datetime (handles DST automatically)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * Format date string - displays as-is from database
 * Only formats for display, doesn't convert timezone
 * Removes time portion if present (everything after 'T') using regex
 */
export const formatPSTDate = (dateStr, options = {}) => {
  if (!dateStr) return '';
  try {
    // Remove everything after 'T' using regex (handles ISO format dates with time)
    const dateOnly = dateStr.replace(/T.*$/, '');
    
    // Parse the date string as-is (YYYY-MM-DD format from database)
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return dateOnly; // Return as-is if can't parse
    }
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      return dateOnly; // Return as-is if invalid date
    }
    return date.toLocaleDateString('en-US', {
      month: options.month || 'short',
      day: options.day || 'numeric',
      year: options.year || 'numeric',
      ...options
    });
  } catch (e) {
    // If error, try to return just the date part (before 'T') using regex
    return dateStr.replace(/T.*$/, '') || dateStr;
  }
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHour12From24(h, mi) {
  const hour12 = h % 12 || 12;
  const dayPeriod = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(mi).padStart(2, '0')} ${dayPeriod}`;
}

function formatDbDatetimeParts({ y, mo, d, h, mi }) {
  return `${MONTH_SHORT[mo - 1]} ${d}, ${y} at ${formatHour12From24(h, mi)}`;
}

/**
 * Normalize MySQL DATETIME from API: use stored digits only (no timezone conversion).
 * Strips trailing Z from JSON so "11:18" in DB is not shifted to 4:18 AM.
 */
function normalizeDbDatetime(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim();
  if (value instanceof Date && !isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    s = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  } else {
    s = s.replace('T', ' ').replace(/\.(\d+)?Z?$/i, '').replace(/Z$/i, '').trim();
  }
  return s;
}

/** Parse YYYY-MM-DD + HH:mm:ss from DB — display those numbers as-is (12h clock). */
function parseDbDatetimeParts(dateStr, timeStr) {
  const build = (datePart, timePart) => {
    const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return null;
    timePart = (timePart || '00:00:00').replace(/\.\d+/, '').slice(0, 8);
    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!timeMatch) return null;
    return {
      y: Number(dateMatch[1]),
      mo: Number(dateMatch[2]),
      d: Number(dateMatch[3]),
      h: Number(timeMatch[1]),
      mi: Number(timeMatch[2]),
      se: Number(timeMatch[3] || 0)
    };
  };

  if (dateStr && timeStr) {
    const dateOnly = normalizeDbDatetime(dateStr).slice(0, 10);
    const timeOnly = normalizeDbDatetime(timeStr).replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && /^\d{1,2}:\d{2}/.test(timeOnly)) {
      const fromSplit = build(dateOnly, timeOnly);
      if (fromSplit) return fromSplit;
    }
  }

  const combined = normalizeDbDatetime(timeStr || dateStr);
  if (!combined) return null;

  const spaceParts = combined.split(/\s+/);
  const datePart = (dateStr ? normalizeDbDatetime(dateStr).slice(0, 10) : spaceParts[0]) || '';
  const timePart = spaceParts[1] || (dateStr ? normalizeDbDatetime(timeStr) : '00:00:00');
  return build(datePart, timePart);
}

/**
 * Format a DB datetime for display (submitted_at, created_at, etc.).
 * Shows the hour/minute stored in MySQL — no UTC or Pacific offset math.
 */
export const formatPSTDateTime = (dateStr, timeStr) => {
  if (!dateStr && !timeStr) return '';
  if (timeStr) timeStr = normalizeDbDatetime(timeStr);
  if (dateStr) dateStr = normalizeDbDatetime(dateStr);
  if (!dateStr && timeStr) {
    if (timeStr.includes(' ')) {
      const parts = timeStr.split(/\s+/);
      dateStr = parts[0];
      timeStr = parts.slice(1).join(' ');
    }
  }
  if (!dateStr) return '';

  const parsed = parseDbDatetimeParts(dateStr, timeStr);
  if (parsed) return formatDbDatetimeParts(parsed);

  return formatPSTDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric' })
    + (timeStr ? ` at ${timeStr}` : '');
};

/** Time portion only from a DB datetime string (e.g. "11:18 AM"). */
export const formatTimePST = (datetimeStr) => {
  if (!datetimeStr) return '';
  const parsed = parseDbDatetimeParts(null, normalizeDbDatetime(datetimeStr));
  if (parsed) return formatHour12From24(parsed.h, parsed.mi);
  return '';
};

/**
 * Business date (date column) + time from a DB timestamp — no timezone conversion.
 */
export const formatPSTDateWithTime = (selectedDateStr, timestampStr) => {
  if (!selectedDateStr) return timestampStr ? formatTimePST(timestampStr) : '';
  const datePart = formatPSTDate(selectedDateStr, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!timestampStr) return datePart;
  const timePart = formatTimePST(timestampStr);
  if (!timePart) return datePart;
  return `${datePart} at ${timePart}`;
};

/**
 * Get yesterday's date in PST (YYYY-MM-DD)
 */
export const getPSTYesterday = () => {
  const today = getPSTDate();
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Return true if dateStr (YYYY-MM-DD) is the current day or the previous day in PST.
 * Used to restrict cash drop submit/save to only today or yesterday.
 */
export const isAllowedCashDropDate = (dateStr) => {
  if (!dateStr) return false;
  const today = getPSTDate();
  const yesterday = getPSTYesterday();
  return dateStr === today || dateStr === yesterday;
};

/**
 * Get start of week (Monday) in PST
 */
export const getPSTWeekStart = () => {
  const now = new Date();
  // Get current PST date string
  const currentPST = getPSTDate();
  const [year, month, day] = currentPST.split('-').map(Number);
  
  // Create a date object for the current PST date (treat as UTC to avoid timezone conversion)
  // Then find the Monday of that week
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to subtract to get to Monday
  
  date.setUTCDate(date.getUTCDate() + diff);
  
  // Format the result
  const yearStr = date.getUTCFullYear();
  const monthStr = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getUTCDate()).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}`;
};

/**
 * Get start of month in PST
 */
export const getPSTMonthStart = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  return `${year}-${month}-01`;
};

/**
 * Get last day of current month in PST (YYYY-MM-DD).
 * Useful so dashboard default range includes all days in the month (e.g. seeded future dates).
 */
export const getPSTMonthEnd = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(lastDay).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Get start of year in PST
 */
export const getPSTYearStart = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  return `${year}-01-01`;
};
