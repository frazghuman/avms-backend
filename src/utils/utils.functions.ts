export function formatDate(dateString: string): string {
    // Create a new date object from the given string
    const dateObj = new Date(dateString);
    // Check if the date object is invalid by calling isNaN on its time value
    if (isNaN(dateObj.getTime())) {
      // Return the original string if it's not a valid date
      return dateString;
    }
    // Extract the day, month, and year components of the date
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    // Format the date components into a string in the desired format of DD/MM/YYYY
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year.toString()}`;
}
  