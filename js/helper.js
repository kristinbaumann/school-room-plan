export function parseCSV(text, delimiter = ",") {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      // Handle CRLF
      if (ch === "\r" && next === "\n") {
        // consume the \n as well
        row.push(cur);
        cur = "";
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }
  // push last field/row if any
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  // Remove a possible trailing empty row
  if (
    rows.length > 0 &&
    rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0] === ""
  ) {
    rows.pop();
  }
  // Trim values (but keep internal whitespace/newlines intact)
  return rows.map((r) => r.map((v) => (typeof v === "string" ? v.trim() : v)));
}
