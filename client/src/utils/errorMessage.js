export function toErrorMessage(value, fallback = "Something went wrong.") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value && typeof value === "object") {
    if (typeof value.message === "string" && value.message.trim()) {
      return value.message.trim();
    }
    if (typeof value.error === "string" && value.error.trim()) {
      return value.error.trim();
    }
    if (value.error && typeof value.error === "object" && typeof value.error.message === "string" && value.error.message.trim()) {
      return value.error.message.trim();
    }
    return fallback;
  }

  if (value == null) return fallback;
  return String(value);
}
