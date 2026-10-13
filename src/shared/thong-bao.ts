// THÔNG BÁO HỆ THỐNG (ADR-0034) — luật thuần dùng chung server ↔ web/: tin về đơn là HÌNH CHIẾU của audit_log; một hàm lọc cho cả số đỏ
// lẫn danh sách. Không I/O. Luật quyền chỉ qua can()/hasPermission/isOffice và các hàm của bang-tin.ts — không viết tay luật mới.
import { duocThayTinDoi, duocThayTinDon, nhanKetNoi, nhanSuKien, type TrangThaiPhuTrach } from "./bang-tin.ts";
import { can, coQuyenTien, hasPermission, isExternalPermission, isOffice, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode, type PermissionHolder } from "./permissions.ts";
import type { GuiThongBaoRequest, HopThongBaoResponse, LoaiTin, NguoiNhanTin, TinDto } from "./contracts.ts";
import { tinChuyenCho, tinGioHenCho, type ChuyenCuaChang, type DongChuyen, type NguoiNhanChuyen } from "./tin-chuyen.ts";
import { HANH_DONG_DOI_SO_KHACH } from "./audit-actions.ts";
import { phanDoiCuaTin, type PhanDoiTin } from "./tin-doi-don.ts";

export const HANH_DONG_TIN_DON = ["created", "order_claimed", "order_handler_changed", "confirmed", "cancelled", "order_cancelled_by_field"] as const;
/**
 * ADR-0062 Đ1 — tập nguồn ĐÓNG của tin "đơn đổi sau xác nhận" (khai MỘT nơi; view `v_aud_order_change` lọc đúng tập này — bài migrations-tin-doi-don):
 * sửa thông tin chuyến, sửa / thêm / bỏ chặng, và MỌI hành động mang cờ `doiSoKhach` (dẫn từ AUDIT_ACTIONS — không gõ tay).
 */
export const HANH_DONG_TIN_DOI: readonly string[] = ["trip_updated", "order_leg_updated", "order_leg_added", "order_leg_closed", ...HANH_DONG_DOI_SO_KHACH];
export const laHanhDongTinDoi = (a: string): boolean => HANH_DONG_TIN_DOI.includes(a);
const laDoiSoKhach = (a: string): boolean => (HANH_DONG_DOI_SO_KHACH as readonly string[]).includes(a);
/**
 * ADR-0062 Đ1 "mốc bắt đầu": chỉ dòng nguồn ghi TỪ mốc này mới thành tin (đơn đổi + MQ-07) — tránh "Của tôi" bật lên hàng loạt tin cũ ngay sau triển khai.
 * GIÁ TRỊ TẠM trong lúc thi công (e2e thấy tin); K1B đặt = lúc gộp / phát hành, rồi bật bài NT-B16 (thong-bao-doi.test.ts). ISO có mili-giây (so CHUỖI).
 */
export const MOC_TIN_DOI = "2026-10-12T23:00:00.000Z";
export const NGAY_GIU_TIN = 30;
export const TOI_DA_TIN = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DongDon {
  id: string; orderId: string; maDon: string; action: string; actorId: string | null; tenNguoiLam: string | null;
  luc: string; ownerId: string; phuTrach: TrangThaiPhuTrach; lapChuaCoNguoi: boolean;
  cungLoLap: boolean; // order_handler_changed cùng mốc với dòng created của đơn = chọn người phụ trách LÚC LẬP (ADR-0030 Task 1.3) → không thành tin riêng
  // ---- Chỉ dòng ĐỔI (ADR-0062 — view v_aud_order_change; gốc lắp ráp dựng cho gõ cửa). Dòng tin đơn cũ để vắng. ----
  /** Chữ nhật ký có khuôn do máy chủ viết — CHỈ hàm đọc `phanDoiCuaTin` dùng, không bao giờ in thô. */
  detail?: string | null;
  /** Đơn có dòng `confirmed` TRƯỚC dòng này (tính từ nhật ký — cùng một câu cho hộp thư lẫn gõ cửa). Vắng = không biết → không tin. */
  sauXacNhan?: boolean;
  /** MQ-07: id chặng của dòng sửa chặng (cột leg_id) + chuyến giữ suất MỞ của chặng lúc `luc` (dữ kiện van-chuyen qua hàm tiêm). Vắng / rỗng = chưa xếp. */
  legId?: string | null;
  chuyenCuaChang?: readonly ChuyenCuaChang[];
}
export interface DongThuCong {
  id: string; tieuDe: string; noiDung: string; quanTrong: boolean; nhan: string[]; nguoiGuiId: string;
  tenNguoiGui: string; luc: string; thuHoi: boolean; daHieuLuc: string | null;
}
/**
 * ADR-0090 đ3: một lần NGƯNG tài khoản (hình chiếu v_aud_account_event — migration 0075) đã ghép tên + quyền HIỆN TẠI của tài khoản bị ngưng (thongbao đọc
 * qua staff). Luật nhận ở locHopThongBao: chỉ Toàn quyền, trừ chính người làm, chỉ khi tài khoản bị ngưng có quyền tiền (coQuyenTien).
 */
export interface DongTaiKhoan {
  id: string; accountId: string; tenTaiKhoan: string; quyenTaiKhoan: readonly PermissionCode[]; actorId: string | null; tenNguoiLam: string | null; luc: string;
}
/**
 * ADR-0115: một dòng nhật ký về yêu cầu điều chỉnh công nợ (hình chiếu v_aud_ledger_event — migration 0094; CHỈ khoá, không chữ nhật ký). Khoá người nhận
 * nằm ở `loaiMuc`/`mucId`: ('ledger', mã yêu cầu) = người có ô duyệt; ('staff', mã tài khoản) = đúng tài khoản đó.
 */
export interface DongDieuChinh {
  id: string; maDon: string; action: string; mucLoai: string; mucId: string; actorId: string | null; tenNguoiLam: string | null; luc: string;
}
const CAU_DIEU_CHINH: Record<string, (ten: string, ma: string) => string> = {
  ledger_adjustment_requested: (t, m) => `${t} gửi yêu cầu điều chỉnh công nợ đơn ${m} — chờ bạn duyệt`,
  ledger_adjustment_withdrawn: (t, m) => `${t} đã rút yêu cầu điều chỉnh công nợ đơn ${m}`,
  ledger_adjustment_approved: (t, m) => `${t} đã duyệt yêu cầu điều chỉnh công nợ đơn ${m} của bạn`,
  ledger_adjustment_rejected: (t, m) => `${t} đã từ chối yêu cầu điều chỉnh công nợ đơn ${m} của bạn`,
  ledger_adjustment_affected: (_t, m) => `Số dư của bạn trên đơn ${m} vừa được điều chỉnh`,
};
type LoaiTinDon = Exclude<LoaiTin, "thu_cong" | "chuyen" | "tai_khoan" | "dieu_chinh">;
/** Phần đổi của một dòng đổi (ADR-0062 Đ2) — null = dòng không thành tin (không qua bộ lọc nguồn / không có đoạn nhận ra). */
export const phanDoiCuaDong = (d: DongDon): PhanDoiTin | null => phanDoiCuaTin(d.action, d.detail ?? null, laDoiSoKhach(d.action));
const phanCua = phanDoiCuaDong;

export function loaiTinDon(d: DongDon): LoaiTinDon | null {
  switch (d.action) {
    // ADR-0045: lưu NHÁP không báo ai (chỉ còn ở ngăn "Tất cả", xem locHopThongBao); "chờ nhận" nảy ra lúc XÁC NHẬN đơn chưa có người phụ trách
    // (theo người phụ trách HIỆN TẠI — có người nhận rồi thì thành tin "xác nhận" thường). `lapChuaCoNguoi` không còn quyết loại tin.
    case "created": return "lap";
    case "order_claimed": return "nhan";
    case "order_handler_changed": return d.cungLoLap ? null : "giao";
    case "confirmed": return d.phuTrach.coNguoi ? "xac_nhan" : "cho_nhan";
    case "cancelled": case "order_cancelled_by_field": return "huy";
    // ADR-0062 Đ1: dòng đổi thành tin khi đơn ĐÃ xác nhận trước đó VÀ hàm đọc nhận ra phần đổi (mốc / cửa sổ do locHopThongBao xét).
    default: return laHanhDongTinDoi(d.action) && d.sauXacNhan === true && phanCua(d) !== null ? "doi_sau_xac_nhan" : null;
  }
}

const CAU: Record<Exclude<LoaiTinDon, "doi_sau_xac_nhan">, { coTen: (ten: string, ma: string) => string; khongTen: (ma: string) => string }> = {
  lap: { coTen: (t, m) => `${t} vừa lập đơn mới ${m}`, khongTen: (m) => `Có đơn mới ${m}` },
  cho_nhan: { coTen: (t, m) => `${t} vừa xác nhận đơn ${m}, chưa có người phụ trách`, khongTen: (m) => `Có đơn mới ${m}, chưa có người phụ trách` },
  nhan: { coTen: (t, m) => `${t} vừa nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa có người nhận` },
  giao: { coTen: (t, m) => `${t} vừa giao đơn ${m} cho người khác phụ trách`, khongTen: (m) => `Đơn ${m} vừa đổi người phụ trách` },
  xac_nhan: { coTen: (t, m) => `${t} vừa xác nhận đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa được xác nhận` },
  huy: { coTen: (t, m) => `${t} vừa huỷ đơn ${m}`, khongTen: (m) => `Đơn ${m} vừa bị huỷ` },
};

/** Chữ của một phần đổi khi GHÉP nhiều dòng cùng lô (câu chung thành cụm cố định — không chữ thô). */
const chuPhan = (p: PhanDoiTin): string => (p.loai === "cu-the" ? p.phan : p.cau === "so-khach" ? "đổi số khách" : "đổi chặng đưa đón");
/**
 * Câu tin "đơn đổi sau xác nhận" (ADR-0062 Đ2): chỉ nhãn cố định + giá trị đã kiểm dạng (phanDoiCuaTin). Một dòng: câu theo loại; nhiều dòng cùng lô: nối phần
 * đổi bằng "; " (bỏ trùng). `ten` = null khi người xem không qua order.history.view.
 */
/** Thứ tự phần đổi trong MỘT lô (cùng đơn + người làm + mốc): bỏ chặng đứng trước thêm chặng (lô thay chặng đọc như người làm đã làm). */
const THU_TU_PHAN_DOI: readonly string[] = ["trip_updated", "order_leg_closed", "order_leg_updated", "order_leg_added", "order_money_adjusted_by_field", "order_money_adjusted"];
function cauTinDoi(ten: string | null, ma: string, phan: readonly PhanDoiTin[]): string {
  const dau = (x: string) => (ten !== null ? `${ten} đổi đơn ${ma}: ${x}` : `Đơn ${ma}: ${x}`);
  const p = phan[0]!;
  if (phan.length === 1 && p.loai === "chung" && p.cau === "chang") return ten !== null ? `${ten} vừa đổi chặng đưa đón của đơn ${ma}` : `Đơn ${ma} vừa đổi chặng đưa đón`;
  return dau([...new Set(phan.map(chuPhan))].join("; "));
}
/** Liên kết tin đổi (ADR-0062 Đ2, NT-B11): văn phòng → trang đơn; người lập xem được đơn mình (Đối tác / Thực tập — order.view own) → trang đơn; còn lại → "Việc của tôi". */
const lienKetTinDoi = (staff: PermissionHolder, d: DongDon): string =>
  isOffice(staff) || (d.ownerId === staff.id && can(staff, "order.view", { ownerId: d.ownerId })) ? `/order?id=${d.orderId}` : "/account";

/**
 * "Toàn công ty" (K3; ADR-0034 điều 6 sửa bởi ADR-0048): có ít nhất một quyền KHÔNG thuộc EXTERNAL_PERMISSIONS (Đối tác, Tài xế đối tác) — cùng hằng với LC-1.
 * Tài xế công ty (DRIVER) vẫn nhận; tài khoản chỉ Đối tác hay chỉ Tài xế đối tác không nhận. MỘT nguồn cho hộp thư lẫn màn hình khoá (locNguoiNhan dùng lại).
 */
export const laNoiBo = (staff: PermissionHolder): boolean => staff.permissions.some((p) => !isExternalPermission(p));
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
    .filter((t) => t.startsWith("quyen:") && t !== "quyen:SUPER_ADMIN") // ADR-0042: Toàn quyền là vai ẩn — không hiện trong "Gửi cho"
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
  staff: PermissionHolder & { readonly partyId?: string | null },
  vao: {
    don: DongDon[]; thuCong: DongThuCong[]; chuyen?: DongChuyen[]; taiKhoan?: DongTaiKhoan[]; dieuChinh?: DongDieuChinh[]; docDenLuc: string; now: string; ngan: "cua-toi" | "tat-ca";
    /** ADR-0062 Đ1 mốc bắt đầu của dòng đổi — vắng = MOC_TIN_DOI (bài kiểm truyền mốc riêng). */
    mocTinDoi?: string;
  },
): HopThongBaoResponse {
  const moc = new Date(Date.parse(vao.now) - NGAY_GIU_TIN * 86400000).toISOString();
  const mocDoi = vao.mocTinDoi ?? MOC_TIN_DOI;
  const ketNoi = new Set(nhanKetNoi(staff));
  const nguoiChuyen: NguoiNhanChuyen = { id: staff.id, permissions: staff.permissions, partyId: staff.partyId ?? null };
  const tat: TinDto[] = [];
  /** Dòng đổi đủ điều kiện nguồn, gom theo LÔ (cùng đơn + cùng người làm + cùng mốc — ADR-0062 Đ1 "cùng lô = một tin"). */
  const loDoi = new Map<string, { d: DongDon; p: PhanDoiTin }[]>();
  for (const d of vao.don) {
    if (d.luc < moc || d.actorId === staff.id) continue;
    if (laHanhDongTinDoi(d.action)) {
      if (d.luc < mocDoi || loaiTinDon(d) !== "doi_sau_xac_nhan") continue;
      const k = JSON.stringify([d.orderId, d.actorId, d.luc]);
      const lo = loDoi.get(k) ?? [];
      lo.push({ d, p: phanCua(d)! });
      loDoi.set(k, lo);
      continue;
    }
    let loai = loaiTinDon(d);
    // ADR-0045 (vòng kiểm độc lập I-1): người KHÔNG nhận được đơn (Kế toán…) thấy dòng xác nhận của đơn chưa có người như tin "xác nhận"
    // thường (ở "Tất cả") — giữ đúng hành vi trước 1.30, không để việc xác nhận biến mất khỏi hộp của họ.
    if (loai === "cho_nhan" && !duocThayTinDon(staff, true)) loai = "xac_nhan";
    if (!loai || loai === "doi_sau_xac_nhan" || !duocThayTinDon(staff, loai === "cho_nhan")) continue; // dòng đổi đã rẽ nhánh ở trên
    // Hộp KHÔNG biết người phụ trách trước sự kiện. Nhãn cho-nhan do chính loại tin quyết (dòng dưới), nên bỏ mọi cho-nhan nhanSuKien suy ra.
    // Hôm nay (ADR-0030 chưa lên main) nhanSuKien chưa nhận null → truyền { coNguoi: false, staffId: null }; kết quả đúng nhờ .filter.
    // KHI GỘP ADR-0030 Task 1.4: đổi thành handlerTruoc: null ("không biết" — không bao giờ coi là "chưa ai", NT-3). Mục "Phụ thuộc ADR-0030" điểm 6.
    const nhan = nhanSuKien({ ownerId: d.ownerId, handlerTruoc: { coNguoi: false, staffId: null }, handlerSau: d.phuTrach })
      .filter((t) => t !== "cho-nhan");
    if (loai === "cho_nhan") nhan.push("cho-nhan");
    // ADR-0045: đơn NHÁP chưa là việc của ai — tin "lập đơn" chỉ ở ngăn "Tất cả" (không "Của tôi" → không số đỏ, không gõ cửa màn hình khoá).
    if (d.action === "created") nhan.splice(0, nhan.length, ...nhan.filter((t) => t === "tat-ca"));
    const chung = nhan.filter((t) => ketNoi.has(t));
    if (!chung.length) continue;
    const cuaToi = chung.some((t) => t !== "tat-ca");
    const coTen = d.tenNguoiLam !== null && can(staff, "order.history.view", { ownerId: d.ownerId, assigned: d.phuTrach.staffId === staff.id });
    tat.push({
      id: d.id, loai, maDon: d.maDon, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      cau: coTen ? CAU[loai].coTen(d.tenNguoiLam!, d.maDon) : CAU[loai].khongTen(d.maDon),
      lienKet: isOffice(staff) ? `/order?id=${d.orderId}` : "/account",
      luc: d.luc, cuaToi, chuaDoc: d.luc > vao.docDenLuc, mo: false, // ADR-0045: "chờ nhận" chỉ tồn tại khi đơn ĐANG chưa có người → không còn tin chờ nhận "mờ"
    });
  }
  // ADR-0062 + ADR-0052 D6.2 MQ-07 — MỘT hàm chọn tin cho mỗi lô đổi: mỗi người nhận TỐI ĐA MỘT tin (ADR-0062 Đ3 "chống trùng"). Xét MQ-07 TRƯỚC (tài xế không
  // qua cửa tin đơn); người đủ điều kiện MQ-07 nhận tin chuyến "gọi báo khách" / "mở để xem" và KHÔNG nhận tin đơn đổi cho lô đó ở ngăn nào.
  for (const lo of loDoi.values()) {
    // Thứ tự CỐ ĐỊNH trong lô (SQL không hứa thứ tự cho các dòng cùng mốc): theo THU_TU_PHAN_DOI rồi theo id — câu "bỏ chặng đón; thêm chặng đón" của lô
    // thay chặng và id tin không đổi giữa các lần đọc (phiếu kiểm A3 T3).
    lo.sort((a, b) => THU_TU_PHAN_DOI.indexOf(a.d.action) - THU_TU_PHAN_DOI.indexOf(b.d.action) || (a.d.id < b.d.id ? -1 : a.d.id > b.d.id ? 1 : 0));
    const d = lo[0]!.d;
    let gioHen: { cau: string; lienKet: string } | null = null;
    for (const x of lo) {
      if (x.d.action !== "order_leg_updated" || !x.p.gioHen || !x.d.chuyenCuaChang?.length) continue;
      gioHen = tinGioHenCho(nguoiChuyen, {
        actorId: x.d.actorId, luc: x.d.luc, maDon: x.d.maDon, ownerId: x.d.ownerId, handlerStaffId: x.d.phuTrach.staffId, chuyen: x.d.chuyenCuaChang,
      });
      if (gioHen) break;
    }
    if (gioHen) {
      tat.push({
        id: d.id, loai: "chuyen", cau: gioHen.cau, maDon: null, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
        lienKet: gioHen.lienKet, luc: d.luc, cuaToi: true, chuaDoc: d.luc > vao.docDenLuc, mo: false,
      });
      continue;
    }
    if (!duocThayTinDoi(staff, d.ownerId)) continue;
    // Người lập + người phụ trách HIỆN TẠI (handlerTruoc "không biết") + tat-ca; bỏ cho-nhan (đơn đã xác nhận — tin đổi không phải việc hàng chờ).
    const chung = nhanSuKien({ ownerId: d.ownerId, handlerTruoc: null, handlerSau: d.phuTrach }).filter((t) => t !== "cho-nhan" && ketNoi.has(t));
    if (!chung.length) continue;
    const coTen = d.tenNguoiLam !== null && can(staff, "order.history.view", { ownerId: d.ownerId, assigned: d.phuTrach.staffId === staff.id });
    tat.push({
      id: d.id, loai: "doi_sau_xac_nhan", maDon: d.maDon, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      cau: cauTinDoi(coTen ? d.tenNguoiLam : null, d.maDon, lo.map((x) => x.p)), lienKet: lienKetTinDoi(staff, d),
      luc: d.luc, cuaToi: chung.some((t) => t !== "tat-ca"), chuaDoc: d.luc > vao.docDenLuc, mo: false,
    });
  }
  // ADR-0052 D6.2: tin CHUYẾN — người nhận do MỘT hàm (tinChuyenCho, src/shared/tin-chuyen.ts); luôn ở "Của tôi" của người nhận, không bao giờ tat-ca.
  for (const d of vao.chuyen ?? []) {
    if (d.luc < moc) continue;
    const t = tinChuyenCho(nguoiChuyen, d);
    if (!t) continue;
    tat.push({
      id: d.id, loai: "chuyen", cau: t.cau, maDon: null, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      lienKet: t.lienKet, luc: d.luc, cuaToi: true, chuaDoc: d.luc > vao.docDenLuc, mo: false,
    });
  }
  // ADR-0090 đ3: ngưng tài khoản giữ tiền làm đứt người duyệt tiền → tin vào "Của tôi" của Toàn quyền (không phải người làm). Ai ngưng cũng báo (Quản trị,
  // Nhân sự, Toàn quyền khác — ruling R-Q2 ở sổ thi công luồng Q). Tài khoản không còn quyền tiền lúc đọc thì thôi báo.
  if (can(staff, "admin.manage.superadmin")) {
    for (const d of vao.taiKhoan ?? []) {
      if (d.luc < moc || d.actorId === staff.id || !coQuyenTien(d.quyenTaiKhoan)) continue;
      tat.push({
        id: d.id, loai: "tai_khoan", cau: `${d.tenNguoiLam ?? "Có người"} vừa ngưng tài khoản giữ tiền ${d.tenTaiKhoan}`, maDon: null, noiDung: null, nguoiGui: null,
        nhomNhan: null, quanTrong: false, daHieuLuc: null, lienKet: "/staff", luc: d.luc, cuaToi: true, chuaDoc: d.luc > vao.docDenLuc, mo: false,
      });
    }
  }
  // ADR-0115: tin về yêu cầu điều chỉnh công nợ — MỘT nơi chọn người nhận. Yêu cầu mới / rút: mọi người có ô `ledger.adjust.approve` TRỪ người làm; đã duyệt /
  // từ chối / số dư của bạn đổi: đúng tài khoản trỏ ở khoá. Luôn vào "Của tôi"; câu không chứa số tiền, lý do hay tên bên nợ (chỉ tên người làm + mã đơn).
  const duyetDuoc = can(staff, "ledger.adjust.approve");
  for (const d of vao.dieuChinh ?? []) {
    if (d.luc < moc || d.actorId === staff.id) continue;
    const cho = d.mucLoai === "ledger" && (d.action === "ledger_adjustment_requested" || d.action === "ledger_adjustment_withdrawn");
    const rieng = d.mucLoai === "staff" && d.mucId === staff.id && d.action !== "ledger_adjustment_requested" && d.action !== "ledger_adjustment_withdrawn";
    const cau = CAU_DIEU_CHINH[d.action];
    if (!cau || !(cho ? duyetDuoc : rieng)) continue;
    tat.push({
      id: d.id, loai: "dieu_chinh", cau: cau(d.tenNguoiLam ?? "Có người", d.maDon), maDon: d.maDon, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      lienKet: cho || can(staff, "ledger.write") ? "/dieu-chinh-cong-no" : isOffice(staff) ? "/order" : "/account", luc: d.luc, cuaToi: true, chuaDoc: d.luc > vao.docDenLuc, mo: false,
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
