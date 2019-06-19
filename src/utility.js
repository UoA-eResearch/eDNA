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

class Utility {
  static allFalsey(arr, fn = Boolean) {
    arr.every(fn);
  }
}

export { strongLine, strongHeader, Utility };
