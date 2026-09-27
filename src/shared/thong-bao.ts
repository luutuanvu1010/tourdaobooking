// THÔNG BÁO HỆ THỐNG (ADR-0034) — luật thuần dùng chung server ↔ web/: tin về đơn là HÌNH CHIẾU của audit_log; một hàm lọc cho cả số đỏ
// lẫn danh sách. Không I/O. Luật quyền chỉ qua can()/hasPermission/isOffice và các hàm của bang-tin.ts — không viết tay luật mới.
import { duocThayTinDon, nhanKetNoi, nhanSuKien, type TrangThaiPhuTrach } from "./bang-tin.ts";
import { can, hasPermission, isOffice, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode, type PermissionHolder } from "./permissions.ts";
import type { GuiThongBaoRequest, HopThongBaoResponse, LoaiTin, NguoiNhanTin, TinDto } from "./contracts.ts";

export const HANH_DONG_TIN_DON = ["created", "order_claimed", "order_handler_changed", "confirmed", "cancelled", "order_cancelled_by_field"] as const;
export const NGAY_GIU_TIN = 30;
export const TOI_DA_TIN = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DongDon {
  id: string; orderId: string; maDon: string; action: string; actorId: string | null; tenNguoiLam: string | null;
  luc: string; ownerId: string; phuTrach: TrangThaiPhuTrach; lapChuaCoNguoi: boolean;
  cungLoLap: boolean; // order_handler_changed cùng mốc với dòng created của đơn = chọn người phụ trách LÚC LẬP (ADR-0030 Task 1.3) → không thành tin riêng
}
export interface DongThuCong {
  id: string; tieuDe: string; noiDung: string; quanTrong: boolean; nhan: string[]; nguoiGuiId: string;
  tenNguoiGui: string; luc: string; thuHoi: boolean; daHieuLuc: string | null;
}
type LoaiTinDon = Exclude<LoaiTin, "thu_cong">;

export function loaiTinDon(d: DongDon): LoaiTinDon | null {
  switch (d.action) {
    case "created": return d.lapChuaCoNguoi ? "cho_nhan" : "lap";
    case "order_claimed": return "nhan";
    case "order_handler_changed": return d.cungLoLap ? null : "giao";
    case "confirmed": return "xac_nhan";
    case "cancelled": case "order_cancelled_by_field": return "huy";
    default: return null;
  }
}

const CAU: Record<LoaiTinDon, { coTen: (ten: string, ma: string) => string; khongTen: (ma: string) => string }> = {
  lap: { coTen: (t, m) => `${t} vừa lập đơn mới ${m}`, khongTen: (m) => `Có đơn mới ${m}` },
  cho_nhan: { coTen: (t, m) => `${t} vừa lập đơn ${m}, chưa có người phụ trách`, khongTen: (m) => `Có đơn mới ${m}, chưa có người phụ trách` },
  nhan: { coTen: (t, m) => `${t} vừa nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa có người nhận` },
  giao: { coTen: (t, m) => `${t} vừa giao đơn ${m} cho người khác phụ trách`, khongTen: (m) => `Đơn ${m} vừa đổi người phụ trách` },
  xac_nhan: { coTen: (t, m) => `${t} vừa xác nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa được xác nhận` },
  huy: { coTen: (t, m) => `${t} vừa huỷ đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa bị huỷ` },
};

/** "Toàn công ty" (K3): có ít nhất một quyền khác PARTNER. */
export const laNoiBo = (staff: PermissionHolder): boolean => staff.permissions.some((p) => p !== "PARTNER");
export function nhanNguoiNhan(n: NguoiNhanTin): string[] {
  return n === "noi-bo" ? ["noi-bo"] : [...new Set(n)].map((p) => `quyen:${p}`).sort();
}
export function nhanThayTinThuCong(staff: PermissionHolder, nhan: string[]): boolean {
  return nhan.some((t) => (t === "noi-bo" ? laNoiBo(staff) : t.startsWith("quyen:") && hasPermission(staff, t.slice(6) as PermissionCode)));
}
/** Nhãn tiếng Việt "Gửi cho" của tin thủ công (5b, đúng bản mẫu): "Toàn công ty" cho `noi-bo`, tên (các) nhóm quyền nối bằng ", " khi gửi theo nhóm. */
export function nhanNhomNhan(nhan: string[]): string {
  if (nhan.includes("noi-bo")) return "Toàn công ty";
  return nhan
    .filter((t) => t.startsWith("quyen:") && t !== "quyen:SUPER_ADMIN") // ADR-0038 điều 8: Toàn quyền là vai ẩn — không hiện trong "Gửi cho"
    .map((t) => PERMISSION_LABEL[t.slice(6) as PermissionCode])
    .join(", ");
}

/**
 * Chuẩn hoá một mốc giờ về ISO có mili-giây (`…T…Z`, luôn 3 chữ số). `locHopThongBao` so mốc giờ BẰNG CHUỖI (không `Date.parse` lại), nên
 * mọi giá trị đưa vào (`luc`, `docDenLuc`, `now`) phải cùng dạng — thiếu mili-giây làm chuỗi so SAI thứ tự (`"…:00Z" > "…:00.150Z"` theo
 * so sánh ký tự, vì `Z` (0x5A) > `.` (0x2E), dù mốc trước thật ra đứng TRƯỚC). Dùng cho mốc không tự sinh ở dạng chuẩn (vd `staff.createdAt`
 * — nguồn của mốc đọc mặc định khi tài khoản chưa từng mở hộp).
 */
export const chuanHoaMocGio = (x: string): string => new Date(x).toISOString();

export function locHopThongBao(
  staff: PermissionHolder,
  vao: { don: DongDon[]; thuCong: DongThuCong[]; docDenLuc: string; now: string; ngan: "cua-toi" | "tat-ca" },
): HopThongBaoResponse {
  const moc = new Date(Date.parse(vao.now) - NGAY_GIU_TIN * 86400000).toISOString();
  const ketNoi = new Set(nhanKetNoi(staff));
  const tat: TinDto[] = [];
  for (const d of vao.don) {
    if (d.luc < moc || d.actorId === staff.id) continue;
    const loai = loaiTinDon(d);
    if (!loai || !duocThayTinDon(staff, loai === "cho_nhan")) continue;
    // Hộp KHÔNG biết người phụ trách trước sự kiện. Nhãn cho-nhan do chính loại tin quyết (dòng dưới), nên bỏ mọi cho-nhan nhanSuKien suy ra.
    // Hôm nay (ADR-0030 chưa lên main) nhanSuKien chưa nhận null → truyền { coNguoi: false, staffId: null }; kết quả đúng nhờ .filter.
    // KHI GỘP ADR-0030 Task 1.4: đổi thành handlerTruoc: null ("không biết" — không bao giờ coi là "chưa ai", NT-3). Mục "Phụ thuộc ADR-0030" điểm 6.
    const nhan = nhanSuKien({ ownerId: d.ownerId, handlerTruoc: { coNguoi: false, staffId: null }, handlerSau: d.phuTrach })
      .filter((t) => t !== "cho-nhan");
    if (loai === "cho_nhan") nhan.push("cho-nhan");
    const chung = nhan.filter((t) => ketNoi.has(t));
    if (!chung.length) continue;
    const cuaToi = chung.some((t) => t !== "tat-ca");
    const coTen = d.tenNguoiLam !== null && can(staff, "order.history.view", { ownerId: d.ownerId, assigned: d.phuTrach.staffId === staff.id });
    tat.push({
      id: d.id, loai, maDon: d.maDon, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      cau: coTen ? CAU[loai].coTen(d.tenNguoiLam!, d.maDon) : CAU[loai].khongTen(d.maDon),
      lienKet: isOffice(staff) ? `/order?id=${d.orderId}` : "/account",
      luc: d.luc, cuaToi, chuaDoc: d.luc > vao.docDenLuc, mo: loai === "cho_nhan" && d.phuTrach.coNguoi,
    });
  }
  for (const t of vao.thuCong) {
    if (t.thuHoi || t.nguoiGuiId === staff.id || !nhanThayTinThuCong(staff, t.nhan)) continue;
    const conGiu = t.luc >= moc || (t.quanTrong && t.daHieuLuc === null);
    if (!conGiu) continue;
    tat.push({
      id: t.id, loai: "thu_cong", cau: t.tieuDe, maDon: null, noiDung: t.noiDung, nguoiGui: t.tenNguoiGui, nhomNhan: nhanNhomNhan(t.nhan), quanTrong: t.quanTrong,
      daHieuLuc: t.daHieuLuc, lienKet: null, luc: t.luc, cuaToi: true, chuaDoc: t.luc > vao.docDenLuc, mo: false,
    });
  }
  tat.sort((a, b) => (a.luc < b.luc ? 1 : a.luc > b.luc ? -1 : 0));
  // cuaToiDay: ngăn "Của tôi" ĐÃ lọc quyền, CHƯA cắt trần TOI_DA_TIN — nguồn cho quanTrongChuaHieu (X4 đứng trên trần: tin quan trọng
  // chưa "Đã hiểu" không được biến mất khỏi dải chỉ vì hộp có > 100 tin mới hơn). Sửa vòng kiểm Task 5→6, một nguồn luật duy nhất ở đây.
  const cuaToiDay = tat.filter((x) => x.cuaToi);
  const cua = cuaToiDay.slice(0, TOI_DA_TIN);
  const soChuaDoc = cua.filter((x) => x.chuaDoc).length; // đếm trên ĐÚNG danh sách ngăn "Của tôi" trả về → số đỏ không bao giờ lệch danh sách (Review Focus 5)
  const tin = vao.ngan === "cua-toi" ? cua : tat.slice(0, TOI_DA_TIN);
  const quanTrongChuaHieu = cuaToiDay.filter((x) => x.loai === "thu_cong" && x.quanTrong && x.daHieuLuc === null);
  return { tin, soChuaDoc, quanTrongChuaHieu };
}

export function kiemTinThuCong(raw: unknown): { ok: true; value: GuiThongBaoRequest } | { ok: false; message: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tieuDe = typeof r.tieuDe === "string" ? r.tieuDe.trim() : "";
  const noiDung = typeof r.noiDung === "string" ? r.noiDung.trim() : "";
  if (!tieuDe) return { ok: false, message: "Chưa có tiêu đề. Viết một câu ngắn nói tin này về việc gì." };
  if (tieuDe.length > 120) return { ok: false, message: "Tiêu đề tối đa 120 ký tự." };
  if (!noiDung) return { ok: false, message: "Chưa có nội dung." };
  if (noiDung.length > 2000) return { ok: false, message: "Nội dung tối đa 2000 ký tự." };
  const n = r.nguoiNhan;
  const hopLe = n === "noi-bo" || (Array.isArray(n) && n.length > 0 && n.every((p) => (PERMISSION_CODES as readonly unknown[]).includes(p)));
  if (!hopLe) return { ok: false, message: "Chưa chọn nhóm nhận hợp lệ. Chọn Toàn công ty hoặc tick ít nhất một nhóm." };
  if (typeof r.quanTrong !== "boolean") return { ok: false, message: "Thiếu lựa chọn tin quan trọng." };
  if (typeof r.clientRequestId !== "string" || !UUID.test(r.clientRequestId)) return { ok: false, message: "Thiếu mã yêu cầu. Tải lại trang rồi gửi lại." };
  return { ok: true, value: { tieuDe, noiDung, nguoiNhan: n as NguoiNhanTin, quanTrong: r.quanTrong, clientRequestId: r.clientRequestId } };
}
