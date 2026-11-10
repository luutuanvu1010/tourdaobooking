// Bảng điều khiển giao diện của Toàn quyền (ADR-0194, đợt 1): DANH MỤC «hợp đồng hiển thị» và luật THUẦN giải chính sách cho một người. Dùng chung máy chủ
// (bỏ khoá trường ẩn, kiểm trường bắt buộc, kiểm POST) ↔ giao diện (ẩn/hiện, đánh dấu bắt buộc); không I/O, không import module.
//
// DANH SÁCH CHO PHÉP, không phải danh sách cấm (ADR-0194 ranh giới 2): chỉ trường KHAI Ở ĐÂY mới chỉnh được; trường không khai, hoặc khai mà cờ không cho
// ⇒ dòng chính sách bị BỎ QUA (không lỗi, không tác dụng). Nghi ngờ thì để `anDuoc: false`. Chính sách chỉ NỚI/THU phần hiển thị: quyền xem dữ liệu vẫn ở
// `permissions.ts`, luật nền (trigger, CHECK, `buildLines`, cổng xuất bến) không đổi.
//
// Hai bài canh (src/shared/ui-truong.test.ts): (a) mọi `truong` có thật trong interface `giaoDien` của `contracts.ts`; (b) trường máy chủ bắt buộc có mặt ở đây
// với hai cờ `false`. Thêm trường vào danh mục: `docs/CHANGE-GUIDE.md`, công thức «thêm trường vào danh mục hiển thị».
//
// ADR-0195: thêm bốn màn (`dich-vu-trong-don`, `chi-tiet-don`, `danh-sach-don`, `ho-tro`) và ĐIỀU KIỆN hiển thị (`dieu_kien` của dòng chính sách; danh sách ở `ui-dieu-kien.ts`).
// Mỗi mục khai điều kiện nào nó nhận (`dieuKien`; mặc định không nhận ⇒ chỉ dòng «không điều kiện» có tác dụng). Với một ô và một quyền: dòng CÓ điều kiện thắng khi dịch vụ thoả điều kiện đó,
// dòng không điều kiện là mặc định cho phần còn lại; SAU ĐÓ mới cộng gộp nhiều quyền (ẩn chỉ khi MỌI quyền ẩn).
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { DIEU_KIEN, laDieuKien, type DieuKien } from "./ui-dieu-kien.ts";

/**
 * Tám màn: bốn của đợt 1 (ADR-0194) + bốn của ADR-0195 (`dich-vu-trong-don` = thẻ dịch vụ trong form Tạo đơn, áp ở máy chủ lúc lập / sửa nháp; `chi-tiet-don`, `danh-sach-don`, `ho-tro` = màn chỉ xem,
 * chỉ ẩn hiển thị). Mã màn là khoá lưu trong CSDL — không đổi tên khi đã có dòng chính sách.
 */
export const MAN_UI = ["tao-don", "dich-vu-trong-don", "danh-sach-dich-vu", "danh-sach-tai-khoan", "quan-ly-doi-tac", "chi-tiet-don", "danh-sach-don", "ho-tro"] as const;
export type ManUi = (typeof MAN_UI)[number];

/** Chế độ của một dòng chính sách (khớp CHECK ở migration): HIEN = như mặc định; AN; BAT_BUOC = hiện và bắt buộc; TUY_CHON = hiện và bỏ bắt buộc. */
export const CHE_DO = ["HIEN", "AN", "BAT_BUOC", "TUY_CHON"] as const;
export type CheDo = (typeof CHE_DO)[number];

export interface MucTruong {
  man: ManUi;
  /** Tên trường — phải có trong interface `giaoDien` ở `contracts.ts` (bài canh (a)). */
  truong: string;
  giaoDien: string;
  /** `nhap` = ô nhập trên form (máy chủ bỏ khoá khi ẩn, kiểm khi bắt buộc); `xem` = cột/dòng chỉ hiển thị trong danh sách (chỉ giao diện ẩn; dữ liệu vẫn theo quyền xem). */
  loai: "nhap" | "xem";
  /** Được chọn AN. Mặc định (không khai) = false. */
  anDuoc: boolean;
  /** Trường ĐANG bắt buộc ở form mà luật nền không cần ⇒ được chọn TUY_CHON. Đợt 1 không có mục nào (ca nghi ngờ để false). `true` cũng nghĩa mặc định là bắt buộc. */
  boBatBuocDuoc: boolean;
  /** ADR-0195 Đ1: các điều kiện dòng chính sách của mục này được mang (mặc định: không — chỉ dòng không điều kiện). Chỉ trường CẤP DỊCH VỤ có điều kiện. */
  dieuKien?: readonly DieuKien[];
  /** ADR-0195 Đ3: tên khoá PHẲNG trên đường gửi lên máy chủ khi khác tên giao diện — `services[].<trường>` hoặc `services[].legs[].<trường>` (bài (a4) ép quy ước). */
  khoaGui?: string;
  /** Ô nhập ẩn được nhưng KHÔNG chọn được «Bắt buộc» (vd số người chiều về chỉ có ở chặng VỀ). Mặc định false. */
  khongBatBuoc?: boolean;
}

interface TuyChonNhap { man?: ManUi; giaoDien?: string; khoaGui?: string; dieuKien?: readonly DieuKien[]; khongBatBuoc?: boolean }
const nhap = (truong: string, anDuoc: boolean, o: TuyChonNhap = {}): MucTruong => ({
  man: o.man ?? "tao-don", truong, giaoDien: o.giaoDien ?? "OrderInput", loai: "nhap", anDuoc, boBatBuocDuoc: false,
  ...(o.khoaGui !== undefined ? { khoaGui: o.khoaGui } : {}), ...(o.dieuKien ? { dieuKien: o.dieuKien } : {}), ...(o.khongBatBuoc ? { khongBatBuoc: true } : {}),
});
/** Ô nhập trong thẻ dịch vụ (màn `dich-vu-trong-don`): `giaoDien` = TripInput / LegInput / ServiceInput; tên khoá gửi lên theo quy ước. */
const dichVu = (truong: string, giaoDien: "TripInput" | "LegInput" | "ServiceInput", anDuoc: boolean, o: Pick<TuyChonNhap, "dieuKien" | "khongBatBuoc"> = {}): MucTruong =>
  nhap(truong, anDuoc, { man: "dich-vu-trong-don", giaoDien, khoaGui: giaoDien === "LegInput" ? `services[].legs[].${truong}` : `services[].${truong}`, ...o });
const xem = (man: ManUi, giaoDien: string, truong: string): MucTruong => ({ man, truong, giaoDien, loai: "xem", anDuoc: true, boBatBuocDuoc: false });

/**
 * Danh mục khởi đầu. Tạo đơn: bốn trường phần chủ nêu ẩn được; mọi trường còn lại khai `anDuoc: false` để bài (b) ép máy chủ-bắt-buộc nằm TRONG danh mục (tên, SĐT, dịch vụ
 * kèm ngày đi, tiền, người phụ trách, bên đặt). Ba màn còn lại: chỉ cột phụ rõ ràng an toàn; tiền, mã, tên, trạng thái không khai.
 */
export const DANH_MUC_UI: readonly MucTruong[] = [
  nhap("customerName", false), nhap("customerPhone", false), nhap("services", false), nhap("discount", false), nhap("declaredDeposit", false), nhap("paymentTerm", false),
  nhap("handlerStaffId", false), nhap("bookerPartyId", false), nhap("newBooker", false),
  nhap("customerEmail", true), nhap("customerNote", true), nhap("passengers", true), nhap("paymentNote", true),
  xem("danh-sach-dich-vu", "CatalogAdminItemDto", "groupCode"), xem("danh-sach-dich-vu", "CatalogAdminItemDto", "unit"),
  xem("danh-sach-tai-khoan", "StaffAccount", "createdAt"), xem("danh-sach-tai-khoan", "StaffAccount", "lastLoginAt"),
  xem("quan-ly-doi-tac", "PartyListItemDto", "roleCodes"),
  // ---- ADR-0195 ----
  // Danh sách tài khoản: «trạng thái khoá» = `active` (StaffAccount), số Face ID = `passkeyCount` (StaffAccountDto). Chỉ ẩn hiển thị; quyền xem vẫn ở permissions.ts.
  xem("danh-sach-tai-khoan", "StaffAccount", "active"), xem("danh-sach-tai-khoan", "StaffAccountDto", "passkeyCount"),
  // Dịch vụ trong đơn (cấp DỊCH VỤ; máy chủ áp lúc lập / sửa nháp). Nhóm 2: số hiệu chuyến bay, số người chiều về, ghi chú dịch vụ — ẩn được, nhận hai điều kiện.
  dichVu("flightCode", "LegInput", true, { dieuKien: DIEU_KIEN }), dichVu("paxOverride", "LegInput", true, { dieuKien: DIEU_KIEN, khongBatBuoc: true }), dichVu("note", "TripInput", true, { dieuKien: DIEU_KIEN }),
  // Luật nền cần (máy chủ bắt buộc / vận hành / biên nhận): KHÔNG ẩn được. Bốn ô giờ (`departTime`, `checkinDate/Time/Place`) chủ đưa ra khỏi đợt này ngày 10/11 — biên nhận, ảnh xác nhận, «Việc của tôi» còn dùng.
  dichVu("departDate", "TripInput", false), dichVu("pickupChoice", "ServiceInput", false),
  dichVu("departTime", "TripInput", false), dichVu("checkinDate", "TripInput", false), dichVu("checkinTime", "TripInput", false), dichVu("checkinPlace", "TripInput", false),
  // Chi tiết đơn (chỉ xem): người lập = `staffName`.
  xem("chi-tiet-don", "OrderDto", "customerEmail"), xem("chi-tiet-don", "OrderDto", "customerNote"), xem("chi-tiet-don", "OrderDto", "paymentNote"), xem("chi-tiet-don", "OrderDto", "staffName"),
  // Danh sách đơn (chỉ xem): `pax` = tổng số khách; điểm đón của dịch vụ ĐẦU TIÊN.
  xem("danh-sach-don", "OrderSummaryDto", "customerNote"), xem("danh-sach-don", "OrderSummaryTripDto", "pickupPlace"), xem("danh-sach-don", "OrderSummaryDto", "staffName"),
  xem("danh-sach-don", "OrderSummaryDto", "createdAt"), xem("danh-sach-don", "OrderSummaryDto", "pax"),
  // Hỗ trợ: ô «Đơn liên quan» của phiếu = mã đơn chụp lúc gửi (`orderCode`; `orderId` đi cùng, không khai riêng).
  xem("ho-tro", "FeedbackTicketDto", "orderCode"),
];

export const timMuc = (man: string, truong: string): MucTruong | undefined => DANH_MUC_UI.find((m) => m.man === man && m.truong === truong);

/** Một dòng chính sách ĐANG HIỆU LỰC của một ô (màn × trường × quyền × điều kiện; `null` = không điều kiện, luôn áp). Giá trị lạ vẫn nhận được kiểu chuỗi — luật dưới bỏ qua. */
export interface DongChinhSach { man: string; truong: string; quyen: string; cheDo: string; dieuKien?: string | null }
/**
 * Kết quả cho MỘT người, chỉ các trường khác mặc định. `dieuKien` có mặt ⇔ đây là kết quả CHO DỊCH VỤ thoả điều kiện đó (khác kết quả không điều kiện); vắng ⇒ kết quả không điều kiện.
 * Hợp đồng GET `/api/cai-dat/giao-dien`: giao diện tra «điều kiện dịch vụ này đang thoả» trước, không có mục điều kiện thì rơi về mục không điều kiện.
 */
export interface TruongDaGiai { man: ManUi; truong: string; an: boolean; batBuoc: boolean; dieuKien?: string }

/** Mục này nhận điều kiện này không. */
export const laDieuKienHopLeChoMuc = (man: string, truong: string, dieuKien: string): boolean => laDieuKien(dieuKien) && !!timMuc(man, truong)?.dieuKien?.includes(dieuKien);

/**
 * Chế độ này áp được cho mục này không (dùng ở POST và ở luật giải). `HIEN` luôn hợp lệ cho mục có trong danh mục: là cách đặt lại mặc định. `dieuKien` khác null chỉ hợp lệ khi mục
 * khai điều kiện đó (ADR-0195 Đ1: danh sách cho phép; điều kiện lạ hay điều kiện mục không nhận ⇒ false).
 */
export function laCheDoHopLe(man: string, truong: string, cheDo: string, dieuKien: string | null = null): boolean {
  const m = timMuc(man, truong);
  if (!m || !(CHE_DO as readonly string[]).includes(cheDo)) return false;
  if (dieuKien !== null && !laDieuKienHopLeChoMuc(man, truong, dieuKien)) return false;
  if (cheDo === "HIEN") return true;
  if (cheDo === "AN") return m.anDuoc;
  if (cheDo === "TUY_CHON") return m.boBatBuocDuoc;
  return m.loai === "nhap" && m.anDuoc && !m.boBatBuocDuoc && m.khongBatBuoc !== true; // BAT_BUOC: chỉ ô nhập tuỳ chọn mà chủ coi là phụ
}

const laQuyen = (q: string): q is PermissionCode => (PERMISSION_CODES as readonly string[]).includes(q);

/** Chế độ hiệu lực của MỘT quyền với MỘT ô khi dịch vụ thoả điều kiện `dk` (null = không xét điều kiện): dòng có điều kiện `dk` (nếu mục nhận) thắng, rồi dòng không điều kiện, rồi HIEN. */
function cheDoCuaQuyen(dong: readonly DongChinhSach[], m: MucTruong, q: string, dk: string | null): string {
  const tim = (dieuKien: string | null): string | undefined =>
    dong.find((d) => d.man === m.man && d.truong === m.truong && d.quyen === q && (d.dieuKien ?? null) === dieuKien && laCheDoHopLe(m.man, m.truong, d.cheDo, dieuKien))?.cheDo;
  return (dk !== null ? tim(dk) : undefined) ?? tim(null) ?? "HIEN";
}

/** Kết quả (ẩn, bắt buộc) của một mục cho người giữ các quyền `cua`, với dịch vụ thoả điều kiện `dk` — cộng gộp nhiều quyền SAU khi mỗi quyền đã chọn dòng theo điều kiện. */
function giaiMuc(dong: readonly DongChinhSach[], m: MucTruong, cua: readonly PermissionCode[], dk: string | null): { an: boolean; batBuoc: boolean } {
  const theoQuyen = cua.map((q) => cheDoCuaQuyen(dong, m, q, dk));
  const an = theoQuyen.every((c) => c === "AN");
  const doi = (c: string): boolean => (c === "BAT_BUOC" ? true : c === "AN" || c === "TUY_CHON" ? false : m.boBatBuocDuoc);
  const batBuoc = an ? false : m.boBatBuocDuoc ? theoQuyen.some(doi) : theoQuyen.every(doi);
  return { an, batBuoc };
}

/**
 * Giải chính sách cho một người giữ các quyền `quyen` (hợp của mọi ô, Hiến chương 5.28). Mỗi quyền không có dòng ⇒ mặc định (HIEN).
 *  - ẨN chỉ khi MỌI quyền của người đó chọn AN.
 *  - BẮT BUỘC: trường mặc định tuỳ chọn thì chỉ bắt buộc khi MỌI quyền chọn BAT_BUOC; trường mặc định bắt buộc (`boBatBuocDuoc`) thì chỉ bỏ bắt buộc khi MỌI quyền bỏ.
 * Dòng ngoài danh mục, màn/quyền/chế độ lạ, điều kiện mà mục không nhận, hoặc cờ không cho ⇒ bỏ qua. Trả về chỉ trường KHÁC mặc định; bảng rỗng ⇒ `[]`. Thứ tự: theo danh mục.
 *
 * Ba cách gọi theo `dieuKien` (ADR-0195 Đ2):
 *  - vắng (`undefined`): ĐẦY ĐỦ cho giao diện — mục không điều kiện (như đợt 1), rồi với mỗi điều kiện mục nhận, MỘT mục có `dieuKien` NẾU kết quả khác kết quả không điều kiện của ô đó
 *    (kể cả khi bằng mặc định «hiện» — dòng điều kiện HIEN đè dòng trống AN; thiếu mục ấy giao diện sẽ rơi về mục không điều kiện và ẩn nhầm).
 *  - `null`: chỉ kết quả không điều kiện (bỏ mọi dòng có điều kiện).
 *  - một mã điều kiện: kết quả TUYỆT ĐỐI cho dịch vụ thoả điều kiện đó (so với mặc định danh mục), mục có `dieuKien` nếu mục nhận điều kiện; máy chủ lập / sửa đơn dùng cách này.
 */
export function giaiChinhSach(dong: readonly DongChinhSach[], quyen: readonly string[], dieuKien?: string | null): TruongDaGiai[] {
  const cua = [...new Set(quyen)].filter(laQuyen);
  if (cua.length === 0) return [];
  const ra: TruongDaGiai[] = [];
  for (const m of DANH_MUC_UI) {
    const mac = giaiMuc(dong, m, cua, null);
    const khac = (r: { an: boolean; batBuoc: boolean }): boolean => r.an || r.batBuoc !== m.boBatBuocDuoc;
    if (typeof dieuKien === "string") {
      const nhan = laDieuKienHopLeChoMuc(m.man, m.truong, dieuKien);
      const r = giaiMuc(dong, m, cua, nhan ? dieuKien : null);
      if (khac(r)) ra.push({ man: m.man, truong: m.truong, ...r, ...(nhan ? { dieuKien } : {}) });
      continue;
    }
    if (khac(mac)) ra.push({ man: m.man, truong: m.truong, ...mac });
    if (dieuKien === null) continue;
    for (const c of m.dieuKien ?? []) {
      const r = giaiMuc(dong, m, cua, c);
      if (r.an !== mac.an || r.batBuoc !== mac.batBuoc) ra.push({ man: m.man, truong: m.truong, ...r, dieuKien: c });
    }
  }
  return ra;
}

/**
 * Bảng tra cho giao diện: từ danh sách đã giải (`GET /api/cai-dat/giao-dien`) tra «đang ẩn / bắt buộc không» theo (màn, trường[, điều kiện dịch vụ đang thoả]). `dieuKienHienCo` là một mã hoặc danh sách mã
 * (theo thứ tự ưu tiên `DIEU_KIEN`): mục có điều kiện khớp thắng, không có thì rơi về mục không điều kiện, không có nữa ⇒ false (mặc định đầy đủ). Không truyền điều kiện ⇒ chỉ mục không điều kiện (gọi cũ).
 */
export function traCuuChinhSach(ds: readonly TruongDaGiai[]): {
  an: (man: ManUi, truong: string, dieuKienHienCo?: string | readonly string[]) => boolean;
  batBuoc: (man: ManUi, truong: string, dieuKienHienCo?: string | readonly string[]) => boolean;
} {
  const tim = (man: string, truong: string, dk?: string | readonly string[]): TruongDaGiai | undefined => {
    for (const c of dk === undefined ? [] : typeof dk === "string" ? [dk] : dk) {
      const r = ds.find((d) => d.man === man && d.truong === truong && d.dieuKien === c);
      if (r) return r;
    }
    return ds.find((d) => d.man === man && d.truong === truong && (d.dieuKien === undefined || d.dieuKien === null));
  };
  return { an: (man, truong, dk) => tim(man, truong, dk)?.an === true, batBuoc: (man, truong, dk) => tim(man, truong, dk)?.batBuoc === true };
}

/**
 * Tên tiếng Việt của màn và của trường để màn chỉnh hiển thị (không lộ mã thô). Tên màn theo ADR-0194; tên trường theo chữ đang hiện ở màn thật. Chữ MỚI cho chế độ (`NHAN_CHE_DO`) là TÊN TẠM —
 * chờ chủ chọn (nhật ký thi công ADR-0194 đợt 1). Bài (e) ở ui-truong.test.ts ép: mọi mục chỉnh được có tên, tên không lộ mã.
 */
export const NHAN_MAN: Readonly<Record<ManUi, string>> = {
  "tao-don": "Tạo đơn",
  "danh-sach-dich-vu": "Danh sách dịch vụ",
  "danh-sach-tai-khoan": "Danh sách tài khoản",
  "quan-ly-doi-tac": "Quản lý đối tác",
  // ADR-0195: TÊN TẠM, chờ chủ chọn (`cho-chon`; phương án khác: «Thẻ dịch vụ» / «Từng dịch vụ»; «Xem đơn» / «Trang đơn»; «Đơn hàng» / «Các đơn»; «Phiếu hỗ trợ» / «Yêu cầu hỗ trợ»).
  "dich-vu-trong-don": "Dịch vụ trong đơn",
  "chi-tiet-don": "Chi tiết đơn",
  "danh-sach-don": "Danh sách đơn",
  "ho-tro": "Hỗ trợ",
};
const NHAN_TRUONG: Readonly<Record<string, string>> = {
  "tao-don/customerEmail": "Email khách",
  "tao-don/customerNote": "Ghi chú khách",
  "tao-don/passengers": "Danh sách khách",
  "tao-don/paymentNote": "Ghi chú thanh toán",
  "danh-sach-dich-vu/groupCode": "Nhóm",
  "danh-sach-dich-vu/unit": "Đơn vị",
  "danh-sach-tai-khoan/createdAt": "Tạo lúc",
  "danh-sach-tai-khoan/lastLoginAt": "Đăng nhập gần nhất",
  "quan-ly-doi-tac/roleCodes": "Công việc hôm nay",
  // ADR-0195 (chữ đang hiện ở màn thật)
  "danh-sach-tai-khoan/active": "Trạng thái khoá",
  "danh-sach-tai-khoan/passkeyCount": "Face ID",
  "dich-vu-trong-don/flightCode": "Số hiệu chuyến bay",
  "dich-vu-trong-don/paxOverride": "Số người chiều về",
  "dich-vu-trong-don/note": "Ghi chú của dịch vụ",
  "chi-tiet-don/customerEmail": "Email khách",
  "chi-tiet-don/customerNote": "Ghi chú khách",
  "chi-tiet-don/paymentNote": "Ghi chú thanh toán",
  "chi-tiet-don/staffName": "Người lập",
  "danh-sach-don/customerNote": "Ghi chú khách",
  "danh-sach-don/pickupPlace": "Điểm đón",
  "danh-sach-don/staffName": "Người lập",
  "danh-sach-don/createdAt": "Giờ lập",
  "danh-sach-don/pax": "Số khách",
  "ho-tro/orderCode": "Đơn liên quan",
};
export const nhanTruong = (man: string, truong: string): string | undefined => NHAN_TRUONG[`${man}/${truong}`];
export const NHAN_CHE_DO: Readonly<Record<CheDo, string>> = { HIEN: "Hiện", AN: "Ẩn", BAT_BUOC: "Bắt buộc", TUY_CHON: "Không bắt buộc" };
/** Các chế độ ô này cho chọn (luôn có HIEN) — màn chỉnh chỉ liệt kê đúng những gì cờ cho. */
export const cheDoChoChon = (m: MucTruong): CheDo[] => CHE_DO.filter((c) => laCheDoHopLe(m.man, m.truong, c));
/** Mục có ít nhất một chế độ ngoài HIEN — chỉ những mục này hiện ở màn chỉnh. */
export const mucChinhDuoc = (man: string): MucTruong[] => DANH_MUC_UI.filter((m) => m.man === man && cheDoChoChon(m).length > 1);
