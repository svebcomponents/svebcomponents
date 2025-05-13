/**
 * A utility to convert camelCase to kebab-case
 */
export const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );

/**
 * A utility to assert whether an input string conforms to kebab-case formatting
 * Example:
 * kebab-case → true
 * word -> true
 * --css-variable → false
 * camelCase → false
 */
export const isKebabCase = (str: string) => /^([a-z])+(-[a-z]+)*$/.test(str);

/**
 * A utility to convert kebab-case to camelCase
 */
export const camelizeKebabCase = (str: string) =>
  str.replace(/-./g, (x) => x[1]!.toUpperCase());

export const TODO = (description: string, ...args: unknown[]) => {
  console.log(`TODO: ${description}`, ...args);
};
