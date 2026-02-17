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

/**
 * Parse a datetime string as UTC (GMT) and return a Date object.
 * Handles: "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm:ss.000Z", or date + time parts.
 */
function parseAsUTC(dateStr, timeStr) {
  let iso = null;
  if (timeStr && (timeStr.includes('T') || timeStr.includes('Z'))) {
    iso = timeStr.includes('Z') ? timeStr : timeStr.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})(\.\d+)?/, '$1') + 'Z';
  } else if (dateStr && timeStr) {
    const datePart = dateStr.replace(/T.*$/, '');
    const timePart = (timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr).replace(/\.\d+Z?$/, '');
    iso = `${datePart}T${timePart}Z`;
  } else if (dateStr) {
    iso = dateStr.replace(/T.*$/, '') + 'T00:00:00Z';
  }
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format datetime string for display in PST.
 * Backend datetimes are treated as GMT/UTC; they are converted to PST for display (PST = GMT - 8).
 */
export const formatPSTDateTime = (dateStr, timeStr, options = {}) => {
  if (!dateStr && !timeStr) return '';
  if (!dateStr && timeStr) {
    if (timeStr.includes(' ')) {
      const parts = timeStr.split(' ');
      dateStr = parts[0];
      timeStr = parts[1] || timeStr;
    } else if (timeStr.includes('T')) {
      dateStr = timeStr.split('T')[0];
    }
  }
  if (!dateStr) return '';

  try {
    const date = parseAsUTC(dateStr, timeStr);
    if (!date) {
      return formatPSTDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric' }) + (timeStr ? ` at ${timeStr}` : '');
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(date);
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const year = parts.find(p => p.type === 'year').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const dayPeriod = parts.find(p => p.type === 'dayPeriod').value;
    return `${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod}`;
  } catch (e) {
    if (timeStr) {
      if (timeStr.includes(' ')) return `${dateStr} at ${timeStr.split(' ')[1]}`;
      return `${dateStr} at ${timeStr}`;
    }
    return dateStr;
  }
};

/**
 * Format a datetime string as time only in PST (e.g. "10:30 AM").
 * Input is treated as GMT/UTC.
 */
export const formatTimePST = (datetimeStr) => {
  if (!datetimeStr) return '';
  let date = null;
  if (datetimeStr.includes(' ') || datetimeStr.includes('T')) {
    const d = datetimeStr.includes('T') ? datetimeStr.split('T')[0] : datetimeStr.split(' ')[0];
    const t = datetimeStr.includes('T') ? datetimeStr.split('T')[1] : datetimeStr.split(' ')[1];
    date = parseAsUTC(d, t || datetimeStr);
  } else {
    date = parseAsUTC(null, datetimeStr);
  }
  if (!date || isNaN(date.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(date);
};

/**
 * Format for display using the selected/finalization date (not from timestamp).
 * Use this so the date shown is always the one selected at cash drop submission, with time from the timestamp in PST.
 */
export const formatPSTDateWithTime = (selectedDateStr, timestampStr, options = {}) => {
  if (!selectedDateStr) return timestampStr ? formatTimePST(timestampStr) : '';
  const datePart = formatPSTDate(selectedDateStr, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!timestampStr) return datePart;
  return `${datePart} at ${formatTimePST(timestampStr)}`;
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
