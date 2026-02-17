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
 * Format datetime string - displays as-is from database
 * Only formats for display, doesn't convert timezone
 * Accepts dateStr (YYYY-MM-DD) and timeStr (HH:mm:ss or full datetime string)
 */
export const formatPSTDateTime = (dateStr, timeStr, options = {}) => {
  // If dateStr is empty but timeStr contains a full datetime, extract date from timeStr
  if (!dateStr && timeStr) {
    if (timeStr.includes(' ')) {
      const parts = timeStr.split(' ');
      dateStr = parts[0]; // Extract date part
      timeStr = parts[1]; // Keep time part
    } else if (timeStr.includes('T')) {
      const parts = timeStr.split('T');
      dateStr = parts[0]; // Extract date part
      timeStr = parts[1] ? parts[1].split('.')[0] : null; // Extract time, remove milliseconds
    }
  }
  
  if (!dateStr) return '';
  
  try {
    // If timeStr is a full datetime string (YYYY-MM-DD HH:mm:ss), extract time part
    let timePart = null;
    if (timeStr) {
      if (timeStr.includes(' ')) {
        // Full datetime string - extract time part
        const parts = timeStr.split(' ');
        if (parts.length >= 2) {
          timePart = parts[1]; // Get HH:mm:ss part
        } else {
          timePart = timeStr;
        }
      } else if (timeStr.includes('T')) {
        // ISO format datetime - extract time part
        const parts = timeStr.split('T');
        if (parts.length >= 2) {
          timePart = parts[1].split('.')[0]; // Get HH:mm:ss, remove milliseconds
        }
      } else {
        timePart = timeStr; // Assume it's already just time
      }
    }
    
    let formatted = formatPSTDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
    if (timePart) {
      // Parse time string (HH:mm:ss or HH:mm format)
      const timeParts = timePart.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        formatted += ` at ${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
      } else {
        formatted += ` at ${timePart}`;
      }
    }
    return formatted;
  } catch (e) {
    // If formatting fails, return simple date string
    if (timeStr) {
      // Try to format as simple string
      if (timeStr.includes(' ')) {
        return `${dateStr} at ${timeStr.split(' ')[1]}`;
      }
      return `${dateStr} at ${timeStr}`;
    }
    return dateStr;
  }
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
