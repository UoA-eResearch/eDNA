function round(x, dp) {
  var factor = Math.pow(10, dp);
  var tmp = x * factor;
  tmp = Math.round(tmp);
  return tmp / factor;
}

/**
 * Simple helper to wrap contents in strong tags followed by a line break.
 */
const strongLine = s => {
  return "<strong>" + s + "</strong>" + "<br />";
};

/**
 * Helper function to make a strong field label with a value.
 */
const strongHeader = (header, text) => {
  return "<strong>" + header + ": </strong> " + text + "<br />";
};

export { strongLine, strongHeader };
