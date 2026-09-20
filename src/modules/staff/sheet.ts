// Đọc danh sách nhân viên từ CSV của Google Sheet thành các ĐỀ XUẤT tạo tài khoản (logic thuần, dùng chung cho Worker và script).
// Sheet không bao giờ cấp quyền: mọi đề xuất đều là vai trò `sales`; cột Vai trò/Trạng thái (nếu có) bị bỏ qua.
import { findColumn, parseCsv } from "../../shared/csv.ts";
import { normalizePhone } from "./phone.ts";

export interface StaffCandidate {
  row: number;
  name: string;
  phone: string;
}

export type StaffSheetParse =
  | { ok: true; candidates: StaffCandidate[]; problems: { row: number; message: string }[] }
  | { ok: false; reason: "missing_columns"; headers: string[] };

/**
 * `checkName` do người gọi tiêm vào (Worker: `staff/index.ts` tiêm hàm của module parties) — trả thông báo lỗi hoặc null.
 * Giới hạn độ dài tên thuộc về hồ sơ (`pty_person`) nên KHÔNG được chép vào đây; dòng tên không hợp lệ thành "dòng có vấn đề"
 * để một dòng Sheet xấu không làm hỏng cả đợt "Áp dụng" (chạy trong MỘT db.batch()).
 */
export function parseStaffSheet(csv: string, checkName: (full: string) => string | null): StaffSheetParse {
  const rows = parseCsv(csv);
  const header = rows[0] ?? [];
  const cName = findColumn(header, "tên người dùng", "họ tên", "họ và tên", "tên");
  const cPhone = findColumn(header, "số điện thoại", "sđt", "điện thoại", "phone");
  if (cName < 0 || cPhone < 0) return { ok: false, reason: "missing_columns", headers: header.map((h) => h.trim()) };

  const candidates: StaffCandidate[] = [];
  const problems: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  for (const [i, r] of rows.slice(1).entries()) {
    const row = i + 2;
    if (r.some((c) => /^ghi chú/i.test(c.trim()))) continue; // dòng ghi chú cuối bảng
    const name = (r[cName] ?? "").trim().replace(/\s+/g, " ");
    const rawPhone = (r[cPhone] ?? "").trim();
    if (!name && !rawPhone) continue; // dòng trống / chỉ có STT
    if (!rawPhone) {
      problems.push({ row, message: `"${name}": chưa có số điện thoại` });
      continue;
    }
    if (!name) {
      problems.push({ row, message: `${rawPhone}: chưa có họ tên` });
      continue;
    }
    const nameProblem = checkName(name);
    if (nameProblem) {
      problems.push({ row, message: `"${name.slice(0, 30)}…": ${nameProblem}` });
      continue;
    }
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      problems.push({ row, message: `"${name}": số điện thoại "${rawPhone}" không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84)` });
      continue;
    }
    if (seen.has(phone)) {
      problems.push({ row, message: `"${name}": số ${phone} trùng với một dòng phía trên` });
      continue;
    }
    seen.add(phone);
    candidates.push({ row, name, phone });
  }
  return { ok: true, candidates, problems };
}
