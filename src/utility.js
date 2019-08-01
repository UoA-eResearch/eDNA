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

const addClasses = (elem, classes) => {
  classes.split(" ").forEach(clas => {
    elem.classList.add(clas);
  });
};

export { strongLine, strongHeader, Utility, addClasses };
