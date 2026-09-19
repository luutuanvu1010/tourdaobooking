// Đọc Google Sheet công khai (chế độ "Anyone with the link – Viewer") dưới dạng CSV. CHỈ ĐỌC — app không bao giờ ghi ngược vào Sheet.

export type SheetErrorCode = "sheet_unreachable" | "sheet_no_access" | "sheet_bad_format";

export class SheetError extends Error {
  constructor(
    public code: SheetErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const SHEET_ID_RE = /^[A-Za-z0-9_-]{20,80}$/;

export async function fetchSheetCsv(sheetId: string, gid?: string): Promise<string> {
  if (!SHEET_ID_RE.test(sheetId)) throw new SheetError("sheet_bad_format", "ID Google Sheet cấu hình không hợp lệ.");
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${encodeURIComponent(gid)}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
  } catch {
    throw new SheetError("sheet_unreachable", "Không kết nối được tới Google Sheet, thử lại sau.");
  }
  // Khi Sheet bị thu hồi quyền chia sẻ, Google có thể trả trang đăng nhập HTML với mã 200 → phải kiểm nội dung, không chỉ res.ok.
  const type = res.headers.get("content-type") ?? "";
  if (res.status === 401 || res.status === 403 || res.status === 404 || (res.ok && type.includes("text/html"))) {
    throw new SheetError("sheet_no_access", "Sheet không còn cho đọc công khai (hãy bật chia sẻ “Bất kỳ ai có đường liên kết – Người xem”).");
  }
  if (!res.ok) throw new SheetError("sheet_unreachable", `Google Sheet trả lỗi ${res.status}.`);
  if (!type.includes("text/csv")) throw new SheetError("sheet_bad_format", `Sheet trả về dạng không mong đợi (${type || "không rõ"}).`);
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) throw new SheetError("sheet_no_access", "Sheet trả về trang web thay vì dữ liệu; kiểm tra quyền chia sẻ.");
  return text;
}
