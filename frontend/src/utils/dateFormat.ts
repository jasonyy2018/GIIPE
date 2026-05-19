/**
 * Format date string without timezone conversion
 * This ensures dates remain consistent regardless of user's timezone
 * 
 * @param dateString - ISO date string (e.g., "2024-01-15" or "2024-01-15T00:00:00.000Z")
 * @param formatStr - Format string (currently supports 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDateFixed(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
  if (!dateString) return '';
  
  // Parse the date string to extract year, month, day
  // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    // Fallback: try to parse as Date and format
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      // Use UTC methods to avoid timezone conversion
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      
      if (formatStr === 'MMM dd, yyyy') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[month]} ${day.toString().padStart(2, '0')}, ${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  }
  
  // Extract year, month, day
  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
  const day = parseInt(dateMatch[3], 10);
  
  // Format based on format string
  if (formatStr === 'MMM dd, yyyy') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${day.toString().padStart(2, '0')}, ${year}`;
  }
  
  // For other formats, fallback to using Date with UTC
  const date = new Date(Date.UTC(year, month, day));
  // Use UTC methods to format
  if (formatStr.includes('MMM')) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return formatStr
      .replace('yyyy', year.toString())
      .replace('MMM', monthNames[month])
      .replace('dd', day.toString().padStart(2, '0'))
      .replace('MM', (month + 1).toString().padStart(2, '0'));
  }
  
  return dateString;
}

/**
 * Compare two date strings by date only (ignoring time and timezone)
 * @param dateString1 - First date string
 * @param dateString2 - Second date string
 * @returns true if dates are the same day
 */
export function isSameDate(dateString1: string, dateString2: string): boolean {
  if (!dateString1 || !dateString2) return false;
  
  // Extract date part (YYYY-MM-DD) from both strings
  const date1Match = dateString1.match(/^(\d{4}-\d{2}-\d{2})/);
  const date2Match = dateString2.match(/^(\d{4}-\d{2}-\d{2})/);
  
  if (!date1Match || !date2Match) return false;
  
  return date1Match[1] === date2Match[1];
}

