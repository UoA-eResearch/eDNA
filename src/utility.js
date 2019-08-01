/**
 * Simple helper to wrap contents in strong tags followed by a line break.
 */
const strongLine = s => {
  return `<strong>${s}</strong><br />`;
};

/**
 * Returns html that contains a strong field label with a value.
 * @param {*} header Header text
 * @param {*} text Regular text
 */
const strongHeader = (header, text) => {
  return `<strong>${header}: </strong>${text}<br />`;
};

/**
 * Adds multiple classes to an element delimited by single spaces.
 * @param {*} elem Dom element
 * @param {*} classes String of classes to add
 */
const addClasses = (elem, classes) => {
  classes.split(" ").forEach(clas => {
    elem.classList.add(clas);
  });
};

export { strongLine, strongHeader, Utility, addClasses };
