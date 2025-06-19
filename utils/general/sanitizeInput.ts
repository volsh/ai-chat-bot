const sanitizeInput = (s?: string) => s?.replace(/\r?\n|\r/g, " ").trim();
export default sanitizeInput;
