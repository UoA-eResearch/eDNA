/**
 * Simple helper to wrap contents in strong tags followed by a line break.
 */
const strongLine = s => {
  return `<strong>${s}</strong><br />`;
};

/**
 * Helper function to make a strong field label with a value.
 */
const strongHeader = (header, text) => {
  return `<strong>${header}: </strong>${text}<br />`;
};

export { strongLine, strongHeader, Utility };
