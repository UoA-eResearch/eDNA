/**
 * Simple helper to wrap contents in strong tags followed by a line break.
 */
const strongLine = (s: string) => {
  return `<strong>${s}</strong><br />`;
};

/**
 * Returns html that contains a strong field label with a value.
 * @param {*} header Header text
 * @param {*} text Regular text
 */
const strongHeader = (header:string, text: string) => {
  return `<strong>${header}: </strong>${text}<br />`;
};

/**
 * Adds multiple classes to an element delimited by single spaces.
 * @param {*} elem Dom element
 * @param {*} classes String of classes to add delimited with spaces
 */
const addClasses = (elem, classes: string) => {
  classes.split(" ").forEach(clas => {
    elem.classList.add(clas);
  });
};

export { strongLine, strongHeader, addClasses };
