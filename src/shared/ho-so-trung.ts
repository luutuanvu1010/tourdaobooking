// Luật THUẦN của "hồ sơ nghi trùng" (ADR-0068 Đ8, Đ9; đặc tả T1, C1, C2) — dùng CHUNG máy chủ (parties: danh sách nghi trùng, hồ sơ khớp khi tạo tài khoản, ô
// "gõ lại tên" khi gộp) và giao diện (web/parties.ts, web/staff.ts). Không I/O. So tên GIỮ dấu: `lower()` của SQLite không thường hoá chữ có dấu nên việc so
// làm ở đây, bằng JS.

export type LyDoKhop = "PHONE" | "NAME" | "LOGIN_PHONE";
export const NHAN_LY_DO_KHOP: Record<LyDoKhop, string> = {
  PHONE: "Cùng số điện thoại",
  NAME: "Cùng họ tên",
  LOGIN_PHONE: "Số đăng nhập của tài khoản trùng số liên hệ",
};
const THU_TU: readonly LyDoKhop[] = ["PHONE", "NAME", "LOGIN_PHONE"];

/** Tên để so: Unicode NFC, chữ thường kiểu Việt, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa (cả khoảng trắng không ngắt). GIỮ dấu. */
export function chuanHoaTen(s: string): string {
  return s.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

export interface CapNghiTrung { aId: string; bId: string; lyDo: LyDoKhop[] }

/**
 * Các cặp hồ sơ nghi trùng trong tập `hoSo` (nơi gọi đã lọc: cá nhân, đang dùng, chưa gộp). Một cặp một lần, lý do gộp lại. SĐT của hồ sơ ngoài tập bị bỏ qua.
 * Xếp: nhiều lý do trước, rồi theo id. Cắt ở `gioiHan` (mặc định 300) và báo `conNua`.
 */
export function capNghiTrung(
  v: { hoSo: { id: string; ten: string }[]; sdtLienHe: { partyId: string; so: string }[]; sdtDangNhap: { partyId: string; so: string }[] },
  gioiHan = 300,
): { cap: CapNghiTrung[]; conNua: boolean } {
  const trongTap = new Set(v.hoSo.map((h) => h.id));
  const theoCap = new Map<string, Set<LyDoKhop>>();
  const them = (x: string, y: string, lyDo: LyDoKhop) => {
    if (x === y) return;
    const [a, b] = x < y ? [x, y] : [y, x];
    const k = `${a}|${b}`;
    const s = theoCap.get(k) ?? new Set<LyDoKhop>();
    s.add(lyDo);
    theoCap.set(k, s);
  };
  const nhom = (ds: { key: string; id: string }[]): string[][] => {
    const m = new Map<string, Set<string>>();
    for (const d of ds) if (d.key) m.set(d.key, (m.get(d.key) ?? new Set()).add(d.id));
    return [...m.values()].filter((s) => s.size > 1).map((s) => [...s]);
  };
  const lienHe = v.sdtLienHe.filter((c) => trongTap.has(c.partyId));
  for (const ids of nhom(lienHe.map((c) => ({ key: c.so, id: c.partyId })))) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) them(ids[i]!, ids[j]!, "PHONE");
  for (const ids of nhom(v.hoSo.map((h) => ({ key: chuanHoaTen(h.ten), id: h.id })))) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) them(ids[i]!, ids[j]!, "NAME");
  for (const d of v.sdtDangNhap) {
    if (!d.so || !trongTap.has(d.partyId)) continue;
    for (const c of lienHe) if (c.so === d.so) them(d.partyId, c.partyId, "LOGIN_PHONE");
  }
  const cap = [...theoCap.entries()]
    .map(([k, s]) => {
      const [aId, bId] = k.split("|") as [string, string];
      return { aId, bId, lyDo: THU_TU.filter((l) => s.has(l)) };
    })
    .sort((x, y) => y.lyDo.length - x.lyDo.length || x.aId.localeCompare(y.aId) || x.bId.localeCompare(y.bId));
  return { cap: cap.slice(0, gioiHan), conNua: cap.length > gioiHan };
}
