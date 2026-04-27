/**
 * Standardizes error message parsing from Frappe responses.
 */
export function parseActionError(error) {
  const direct = error?.message || error?.exc_type;
  if (direct) return String(direct);
  
  const serverMessage =
    error?._server_messages ||
    error?.messages?.[0] ||
    error?.response?._server_messages ||
    error?.response?.message;
    
  if (!serverMessage) return "";
  
  try {
    const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
    if (Array.isArray(parsed) && parsed.length) {
      // Frappe server messages are often JSON strings of arrays
      try {
        const nested = JSON.parse(parsed[0]);
        if (nested?.message) return String(nested.message).replace(/<[^>]*>/g, "").trim();
      } catch {
        return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
      }
    }
    if (parsed?.message) return String(parsed.message).replace(/<[^>]*>/g, "").trim();
  } catch {
    return String(serverMessage).replace(/<[^>]*>/g, "").trim();
  }
  
  return "";
}
