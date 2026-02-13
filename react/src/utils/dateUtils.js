/**
 * Date formatting utilities
 */

/**
 * Formats a date string or object to DD/MM/YYYY
 * @param {string|Date} dateSource 
 * @returns {string}Formatted date
 */
export const formatDate = (dateSource) => {
    if (!dateSource) return "N/A";

    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return "Invalid Date";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Formats a date string or object to DD/MM/YYYY HH:MM
 * @param {string|Date} dateSource 
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (dateSource) => {
    if (!dateSource) return "N/A";

    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return "Invalid Date";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
};
