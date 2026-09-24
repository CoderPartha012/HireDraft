export const HISTORY_KEY = "hiredraft.saved-emails.v1";
export const HISTORY_LIMIT = 30;
export function readHistory(storage) {
  const parsed = JSON.parse(storage.getItem(HISTORY_KEY) || "[]");
  if (!Array.isArray(parsed)) throw new Error("Invalid history");
  return parsed
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.subject === "string" &&
        item.subject.length <= 250 &&
        typeof item.body === "string" &&
        item.body.length <= 10000 &&
        typeof item.savedAt === "string",
    )
    .slice(0, HISTORY_LIMIT)
    .map((item) => ({
      id: item.id,
      subject: item.subject,
      body: item.body,
      bodyFormat: item.bodyFormat === "markdown" ? "markdown" : "plain",
      savedAt: Number.isFinite(Date.parse(item.savedAt))
        ? item.savedAt
        : new Date(0).toISOString(),
      edited: item.edited === true,
      metadata: {
        generation:
          Number.isSafeInteger(item.metadata?.generation) &&
          item.metadata.generation > 0
            ? item.metadata.generation
            : 1,
      },
    }));
}
export function saveHistory(storage, email, edited) {
  const items = readHistory(storage);
  if (
    items.some(
      (item) =>
        item.subject === email.subject &&
        item.body === email.body &&
        item.bodyFormat === (email.bodyFormat || "plain"),
    )
  )
    return items;
  if (items.length >= HISTORY_LIMIT)
    throw new Error(
      "History is full. Delete an older saved draft before saving another.",
    );
  const entry = {
    id: crypto.randomUUID(),
    subject: email.subject,
    body: email.body,
    bodyFormat: email.bodyFormat === "markdown" ? "markdown" : "plain",
    savedAt: new Date().toISOString(),
    edited,
    metadata: { generation: email.metadata?.generation || 1 },
  };
  const next = [entry, ...items];
  storage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
