// Bộ đọc CSV tối giản (RFC 4180: ô đặt trong ngoặc kép, dấu phẩy/xuống dòng/ngoặc kép kép trong ô). Logic thuần, không I/O.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // bỏ BOM
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Chuẩn hoá tiêu đề cột để so khớp: NFC, bỏ khoảng trắng thừa, chữ thường. */
export const normHeader = (s: string): string => s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

/** Vị trí cột đầu tiên có tiêu đề khớp một trong các tên (đã chuẩn hoá); -1 nếu không có. */
export const findColumn = (header: string[], ...names: string[]): number => header.findIndex((h) => names.includes(normHeader(h)));
