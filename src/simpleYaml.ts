/**
 * Tiny YAML subset for bdd_options.yaml: `key: value`, `key: [a, b]` and
 * `- item` lists of plain strings. ponytail: no yaml dependency; the
 * options file is flat key/value.
 */
export function parseSimpleYaml(
  text: string,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const noComment = stripComment(rawLine);
    if (noComment.trim() === "") continue;
    const listItem = /^\s*-\s*(.+)$/.exec(noComment);
    if (listItem && currentListKey) {
      const existing = result[currentListKey];
      const value = unquote(listItem[1].trim());
      if (Array.isArray(existing)) existing.push(value);
      else result[currentListKey] = [value];
      continue;
    }
    const kv = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(noComment);
    if (kv) {
      const key = kv[1];
      const value = kv[2].trim();
      if (value === "") {
        result[key] = [];
        currentListKey = key;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        result[key] =
          inner === "" ? [] : inner.split(",").map((v) => unquote(v.trim()));
        currentListKey = null;
      } else {
        result[key] = unquote(value);
        currentListKey = null;
      }
    }
  }
  return result;
}

function stripComment(line: string): string {
  // A # outside quotes starts a comment.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

function unquote(v: string): string {
  if (
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2) ||
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  return v;
}
