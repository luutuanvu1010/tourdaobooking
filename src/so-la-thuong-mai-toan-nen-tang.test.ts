// BÀI SỐ LẠ TOÀN NỀN TẢNG — tiền thương mại (sổ đại lý đợt 1, bước K-a; luật "ai thấy tiền của ai").
// CHẶN: tài khoản giữ quyền Đối tác (`holdsPartner` — Đối tác thuần VÀ mọi tài khoản lai <mã nội bộ> + Đối tác), hoặc tài khoản không có ô xem tương ứng, thấy tiền
// thương mại của BÊN KHÁC (hồ sơ đại lý B): mức hoa hồng (% và đ/khách), giá đại lý, hoa hồng đã tính, bản chụp mức trên đơn (đã xác nhận + nháp), mức ghi tay, tỷ lệ
// mua lại và giá vốn của nhà cung cấp — qua BẤT KỲ route GET nào (tự quét `route("GET", …)` của src/modules/*/index.ts — route mới tự vào bài), qua đường đọc bằng POST,
// qua phản hồi các lệnh ghi liên quan của tài khoản lai, qua nhật ký đơn và nhật ký toàn hệ thống.
// NEO: Hiến chương K4 (Quyền = Ai × Thao tác × Phạm vi; mọi route hỏi một bản đồ) + 2.3 (điều khoản thương mại gắn hồ sơ, không gắn tài khoản) + đặc tả sổ đại lý đợt 1
// đã duyệt (DTO Đối tác cho MỌI tài khoản giữ PARTNER, kể cả lai — "có quyền Đối tác là áp"). Hàng rào SIẾT (Hiến pháp Điều 9.4), phạm vi HẸP (Ruling 22): sổ tiền giữ
// ADR-0081 điều 1–2 (danh sách (b) dưới đây — hôm nay trống vì sổ tiền đợt 1 chưa chở số thương mại).
// HAI CHIỀU, suy từ bảng quyền thật (`src/shared/permissions.ts`): giữ PARTNER ⇒ CẤM THẲNG (không suy từ ô — chính ô `any` của Bán hàng / Kế toán từng làm tài khoản lai
// thấy số của B); tài khoản một mã quyền ⇒ được thấy khi `can()` cho ô xem tương ứng (`partner.commission.view`, hoặc `order.terms.view` theo phạm vi một đơn mang số
// của B; phần nhà cung cấp: `supply.terms.view`). Đối chứng: mỗi số lạ phải HIỆN với ít nhất một tài khoản văn phòng được phép (bài không rỗng).
// LUẬT CHỐNG RỖNG: mỗi route GET trả 200 cho ít nhất một tài khoản trong bài, hoặc nằm ở danh sách MIỄN (a) kèm lý do một dòng; route có `:tham số` phải có dòng ở
// bảng điền `bangDien` (hoặc MIỄN (a)); mục thừa (route không còn) ở hai bảng ⇒ đỏ.
// GIỚI HẠN: (1) chỉ bắt số bài gieo, viết theo các dạng ở `dang` (số trần, chấm nghìn, phần trăm có phẩy / chấm) — viết khác (khoảng trắng, chữ) không bắt được;
// (2) route ở MIỄN (a) không được gọi tới 200 (vẫn quét thân); (3) giao diện `web/` không quét — chỉ máy chủ; (4) bỏ mã UUID và mốc giờ ISO trước khi tìm.
// KHÔNG bao giờ nới bài này bằng cách bỏ bớt tài khoản, bề mặt hay số lạ. Số lạ đụng số thật thì ĐỔI số lạ, không thu hẹp phép quét.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { PERMISSION_CODES, can, holdsPartner, isExternalPermission, type PermissionCode } from "./shared/permissions.ts";
import { HANH_DONG_TIN_DON } from "./shared/thong-bao.ts";
import { HANH_DONG_TIN_CHUYEN } from "./shared/tin-chuyen.ts";
import { THAY_DOI } from "./shared/bang-tin.ts";
import { hanhDongCuaThayDoi } from "./shared/web-push.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import {
  ACC, ADM, DRIVER, DRIVER2, DRIVER_PARTNER, FIELD, INTERN, NGAY, PARTNER, SALES, SUP, batDongHo, chuyenSan, denGio, nhaXeKhung, setup, tienDo, uuid, xe,
} from "../tests/audit/dieu-phoi-khung.mjs";

type W = ReturnType<typeof setup>;
type Res = { status: number; text: string; json: any };
interface TaiKhoan { id: string; ten: string; permissions: PermissionCode[] }

const DT_B = "88888888-8888-4888-8888-88888888888b"; // đại lý B — chủ của mọi số lạ (không quét: số của chính B)
const PTY_B = `pty-${DT_B}`;
const AT = "2026-09-01T00:00:00.000Z";
/** Hai dịch vụ của mọi đơn mang số của B: SLX (mức riêng đ/khách của B + nhà cung cấp mua lại), SLY (mức riêng % của B; đơn đã xác nhận: Kế toán ghi tay %). */
const DV: [string, number][] = [["SLX", 1_000_000], ["SLY", 2_000_000]];

// ---- Tài khoản: SUY từ PERMISSION_CODES (mã quyền mới tự vào bài) ----
const KHUNG: Partial<Record<PermissionCode, string>> = { SALES, ACCOUNTING: ACC, ADMIN: ADM, FIELD, PARTNER, SUPER_ADMIN: SUP, INTERN, DRIVER, DRIVER_PARTNER };
/** Một tài khoản THUẦN cho mỗi mã quyền. Đối tác thuần = A (khung `PARTNER`; hồ sơ mang vai Đại lý lữ hành, có đơn của mình). FIELD thuần KHÔNG được giao đơn của B. */
const THUAN: TaiKhoan[] = PERMISSION_CODES.map((p, i) => ({ id: KHUNG[p] ?? `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, "0")}`, ten: `${p} thuần`, permissions: [p] }));
/** Một tài khoản LAI cho mỗi mã quyền NỘI BỘ + Đối tác (bỏ mã bên ngoài). FIELD + Đối tác được giao đơn đã xác nhận của B. */
const LAI: TaiKhoan[] = PERMISSION_CODES.filter((p) => !isExternalPermission(p)).map((p, i) => ({ id: `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, "0")}`, ten: `${p}+PARTNER`, permissions: [p, "PARTNER"] }));
const MOI: TaiKhoan[] = [...THUAN, ...LAI];
const laiCua = (p: PermissionCode): TaiKhoan => LAI.find((t) => t.permissions[0] === p)!;
const thuanCua = (p: PermissionCode): TaiKhoan => THUAN.find((t) => t.permissions[0] === p)!;

// ---- Số lạ (grep 2026-10-09: không dạng nào có trong src/, tests/, migrations/, web/) ----
type Loai = "HH" | "CU"; // HH: hoa hồng / giá đại lý / bản chụp của B. CU: tỷ lệ mua lại / giá vốn của nhà cung cấp (chỉ supply.terms.view).
const chamNghin = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tien = (n: number): string[] => [String(n), chamNghin(n)];
const tyLe = (bp: number): string[] => {
  const a = Math.floor(bp / 100);
  const b = String(bp % 100).padStart(2, "0");
  return [String(bp), `${a},${b}`, `${a}.${b}`];
};
const SO_LA: readonly { loai: Loai; ten: string; dang: readonly string[] }[] = [
  { loai: "HH", ten: "mức riêng của B 370.913đ/khách (= hoa hồng dòng SLX)", dang: tien(370_913) },
  { loai: "HH", ten: "mức riêng của B 37,29% mọi dịch vụ", dang: tyLe(3729) },
  { loai: "HH", ten: "mức tay 52,87% Kế toán ghi trên đơn B đã xác nhận", dang: tyLe(5287) },
  { loai: "HH", ten: "giá đại lý dòng SLX (1.000.000 − 370.913)", dang: tien(629_087) },
  { loai: "HH", ten: "hoa hồng dòng SLY theo mức 37,29%", dang: tien(745_800) },
  { loai: "HH", ten: "giá đại lý dòng SLY theo mức 37,29%", dang: tien(1_254_200) },
  { loai: "HH", ten: "hoa hồng dòng SLY theo mức tay 52,87%", dang: tien(1_057_400) },
  { loai: "HH", ten: "giá đại lý dòng SLY theo mức tay 52,87%", dang: tien(942_600) },
  { loai: "HH", ten: "tổng hoa hồng đơn B đã xác nhận", dang: tien(1_428_313) },
  { loai: "HH", ten: "tổng giá đại lý đơn B đã xác nhận", dang: tien(1_571_687) },
  { loai: "HH", ten: "tổng hoa hồng đơn mang mức 37,29% (nháp của B, đơn của tài khoản lai)", dang: tien(1_116_713) },
  { loai: "HH", ten: "tổng giá đại lý đơn mang mức 37,29%", dang: tien(1_883_287) },
  { loai: "HH", ten: "dòng mức TA 42,61% (ADR-0117 lần 2) gắn cho loại Đại lý lữ hành — bị dòng riêng của loại che, chỉ hiện ở bảng mức / màn Mức TA", dang: tyLe(4261) },
  { loai: "CU", ten: "tỷ lệ mua lại 61,73% của nhà cung cấp", dang: tyLe(6173) },
  { loai: "CU", ten: "giá vốn dòng SLX (61,73% × 1.000.000)", dang: tien(617_300) },
];
/** Số CÔNG KHAI của bài (giá khách, tổng đơn) — số lạ không được trùng / nằm trong chúng (tự kiểm bài). */
const SO_CONG_KHAI = [1_000_000, 2_000_000, 3_000_000, 777_000];

const UUID_RE = /(?:pty-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO_RE = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/g;
/** Bỏ mã UUID (kể cả `pty-<uuid>`) và mốc giờ ISO — hai thứ này chứa dãy số bất kỳ, không phải số liệu tiền. */
const boMaVaGio = (t: string): string => t.replace(UUID_RE, "").replace(ISO_RE, "");
const soLaTrong = (t: string) => {
  const s = boMaVaGio(t);
  return SO_LA.filter((x) => x.dang.some((d) => s.includes(d)));
};

// ---- Route GET: tự quét ----
const MODULES = new URL("./modules/", import.meta.url);
const ROUTE_GET: string[] = [...new Set(readdirSync(MODULES).flatMap((m) => {
  let src = "";
  try { src = readFileSync(new URL(`${m}/index.ts`, MODULES), "utf8"); } catch { return []; }
  return [...src.matchAll(/route\(\s*"GET"\s*,\s*"([^"]+)"/g)].map((x) => x[1]!);
}))];

/**
 * DANH SÁCH MIỄN (a) — route GET KHÔNG gọi tới 200 được trên khung thử (chỉ miễn luật chống rỗng; thân phản hồi VẪN được quét). Mỗi dòng một lý do.
 * Không bao giờ dùng danh sách này để che một chỗ lộ số: chỗ lộ đi danh sách (b).
 */
const MIEN_200: Record<string, string> = {
  "/api/bang-tin": "bắt tay WebSocket: khung thử không có trạm Bảng tin (426/503); sự kiện phát đi chỉ 5 khoá (ADR-0022 điều 4), không chở tiền",
  "/api/van-chuyen/chuyen/:id/xe-nhan": "gói A5 (ADR-0111): chỉ 200 khi chuyến ĐANG CHẠY có tài xế (409 nếu không) — khung thử không dựng chuyến chạy cho bài này; phản hồi chỉ chở năm khoá XeNhanDto (mã chuyến, tên tài xế, chỗ trống, điểm sắp tới; không biển số, không khách, không tiền, không hoa hồng); thân 4xx vẫn được quét",
  "/api/van-chuyen/cuoc-cua-toi/:id/xe-nhan": "gói A5 (ADR-0111): như dòng trên, và chỉ tài xế đang lái chuyến mới gọi được (404 với người khác)",
  "/api/parties/:id/documents/:did/tep": "ADR-0123 (lát H-2 kho tệp): danh sách ảnh của MỘT dòng giấy tờ người — chỉ Toàn quyền; bài này không gieo giấy tờ + ảnh; DTO chỉ mã / loại / cỡ / mốc, không chở tiền; bangDien gọi bằng mã lạ nên thân 4xx vẫn được quét",
  "/api/parties/:id/documents/:did/tep/:tid": "ADR-0123: thân là byte ảnh / PDF giấy tờ (không phải JSON, không chở tiền) — chỉ Toàn quyền, cần tệp đã tải lên; bài này không gieo ảnh; bangDien gọi bằng mã lạ nên thân 4xx vẫn được quét",
  "/api/parties/xac-minh/:pid": "ADR-0125 (lát H-4): chi tiết MỘT phiếu tự khai đang chờ — cần phiếu gieo sẵn (bài này không gieo); DTO chỉ ngày sinh / địa chỉ / số che / cờ, không chở tiền; bangDien gọi bằng mã lạ nên thân 404 vẫn được quét",
  "/api/parties/phieu-xoa/:pid": "ADR-0126 (lát H-5 việc 5): xem trước MỘT phiếu yêu cầu xoá đang chờ — cần phiếu gieo sẵn (bài này không gieo); DTO chỉ tên hồ sơ, hạn và SỐ ĐẾM, không chở tiền; bangDien gọi bằng mã lạ nên thân 404 vẫn được quét",
};

/**
 * DANH SÁCH MIỄN (b) — được THẤY số lạ có lý do. HÔM NAY TRỐNG: sổ tiền đợt 1 không chở số thương mại. Khi đợt 2 đưa hoa hồng vào sổ tiền mà tài khoản lai có
 * `ledger.view` thấy số ở `/api/ledger*`, thêm ĐÚNG MỘT dòng: { duong: /^\/api\/ledger/, o: "ledger.view", lyDo: "ADR-0081 điều 1–2 (phạm vi hẹp, chủ 2026-10-09) — xét lại đợt 3" }.
 * Chỉ áp cho tài khoản LAI có ô `o` — Đối tác THUẦN không bao giờ được miễn.
 */
const MIEN_THAY: readonly { duong: RegExp; o: "ledger.view"; lyDo: string }[] = [];
const mienThay = (beMat: string, tk: TaiKhoan): string | null => {
  if (tk.permissions.every((p) => p === "PARTNER")) return null;
  const duong = beMat.replace(/^[A-Z]+ /, ""); // "GET /api/ledger" → "/api/ledger"
  return MIEN_THAY.find((m) => m.duong.test(duong) && can(tk, m.o))?.lyDo ?? null;
};

/** Mọi id bài gieo (dùng cho bảng điền). */
interface Gieo {
  cuaA: string; cuaB: string; nhapB: string; donLai: Map<string, string>; xe: string; chuyen: string; chuyenHong: string; donChuyen: string; nhaXe: string; congTy: string; gopY: string; tin: string;
}
/**
 * BẢNG ĐIỀN — route GET có `:tham số` (và route cần chuỗi truy vấn) → các đường cụ thể; ưu tiên id thuộc bên B. Route có tham số mà vắng ở đây và không ở MIỄN (a) ⇒ đỏ
 * "chưa điền". Route không tham số vắng ở đây ⇒ gọi đúng đường khai.
 */
function bangDien(g: Gieo): Record<string, string[]> {
  const donB = [g.cuaB, g.nhapB];
  const laiIntern = g.donLai.get(laiCua("INTERN").id)!;
  return {
    "/api/orders/:id": [...donB, laiIntern].map((id) => `/api/orders/${id}`),
    "/api/orders/:id/passengers": donB.map((id) => `/api/orders/${id}/passengers`),
    "/api/orders/:id/thuong-mai": [...donB, laiIntern].map((id) => `/api/orders/${id}/thuong-mai`),
    "/api/orders/:id/payments": donB.map((id) => `/api/orders/${id}/payments`),
    "/api/orders/:id/nhap-ke-toan": donB.map((id) => `/api/orders/${id}/nhap-ke-toan`),
    "/api/orders/:id/receipt": donB.map((id) => `/api/orders/${id}/receipt`),
    "/api/orders/:id/qr-thanh-toan": donB.map((id) => `/api/orders/${id}/qr-thanh-toan`),
    "/api/staff/:id/roles": [`/api/staff/${DT_B}/roles`],
    "/api/feedback/:id": [`/api/feedback/${g.gopY}`],
    // ADR-0119 Việc 5b: hàng đợi MỘT nhóm (cần ?team) — nhóm Kỹ thuật giữ góp ý thử của B; Toàn quyền nhận 200.
    "/api/feedback/queue": ["/api/feedback/queue?team=fbk-team-ky-thuat"],
    "/api/catalog/:code/group-history": ["/api/catalog/SLX/group-history"],
    "/api/parties/:id": [`/api/parties/${PTY_B}`, "/api/parties/pty-ncc"],
    "/api/parties/:id/documents": [`/api/parties/${PTY_B}/documents`],
    // ADR-0123 (lát H-2 kho tệp): bài không gieo giấy tờ + ảnh ⇒ mã dòng / mã tệp lạ (Toàn quyền 404, người khác 403) — vẫn GỌI để thân được quét (MIEN_200 chỉ miễn 200).
    "/api/parties/:id/documents/:did/tep": [`/api/parties/${PTY_B}/documents/${uuid()}/tep`],
    "/api/parties/:id/documents/:did/tep/:tid": [`/api/parties/${PTY_B}/documents/${uuid()}/tep/${uuid()}`],
    // ADR-0125 (lát H-4): bài không gieo phiếu tự khai ⇒ mã phiếu lạ (Quản trị / Toàn quyền 404, người khác 403) — vẫn GỌI để thân được quét (MIEN_200 chỉ miễn 200).
    "/api/parties/xac-minh/:pid": [`/api/parties/xac-minh/${uuid()}`],
    // ADR-0126 (lát H-5 việc 5): như trên — bài không gieo phiếu xoá ⇒ mã phiếu lạ (Quản trị / Toàn quyền 404, người khác 403) — vẫn GỌI để thân được quét.
    "/api/parties/phieu-xoa/:pid": [`/api/parties/phieu-xoa/${uuid()}`],
    "/api/parties/:id/tai-khoan-nhan-tien": [`/api/parties/${PTY_B}/tai-khoan-nhan-tien`, `/api/parties/${g.congTy}/tai-khoan-nhan-tien`],
    "/api/van-chuyen/xe/:id": [`/api/van-chuyen/xe/${g.xe}`],
    "/api/van-chuyen/xe/:id/ban": [`/api/van-chuyen/xe/${g.xe}/ban`],
    "/api/van-chuyen/mau-chang/:code": ["/api/van-chuyen/mau-chang/SLX"],
    "/api/van-chuyen/chuyen/:id": [`/api/van-chuyen/chuyen/${g.chuyen}`],
    "/api/van-chuyen/chuyen/:id/chi-phi": [`/api/van-chuyen/chuyen/${g.chuyen}/chi-phi`],
    "/api/van-chuyen/chuyen/:id/cuu-ho": [`/api/van-chuyen/chuyen/${g.chuyenHong}/cuu-ho`],
    "/api/van-chuyen/cuoc-cua-toi/:id": [`/api/van-chuyen/cuoc-cua-toi/${g.chuyen}`],
    // Gói A5 (ADR-0111; ghép main 1c471990 vào gói A+C): danh sách xe nhận khách chuyển — chuyến phải đang chạy (409 nếu chưa) nên dùng chuyến cứu hộ.
    "/api/van-chuyen/chuyen/:id/xe-nhan": [`/api/van-chuyen/chuyen/${g.chuyenHong}/xe-nhan`],
    "/api/van-chuyen/cuoc-cua-toi/:id/xe-nhan": [`/api/van-chuyen/cuoc-cua-toi/${g.chuyenHong}/xe-nhan`, `/api/van-chuyen/cuoc-cua-toi/${g.chuyen}/xe-nhan`],
    "/api/van-chuyen/xe-cua-don/:orderId": [g.cuaB, g.donChuyen].map((id) => `/api/van-chuyen/xe-cua-don/${id}`),
    "/api/thong-bao/:id/nguoi-da-hieu": [`/api/thong-bao/${g.tin}/nguoi-da-hieu`],
    // chuỗi truy vấn. Nhật ký toàn hệ thống: trang đầu (100 dòng) + lọc đúng các hành động chở mức — thế giới lớn dần thì dòng cũ không rơi khỏi phép quét.
    "/api/audit": ["/api/audit?limit=100", "/api/audit?action=prc_commission_rule_added", "/api/audit?action=prc_supply_term_added", "/api/audit?action=order_terms_manual", "/api/audit?q=SL"],
    "/api/pricing/thu-tra": [`/api/pricing/thu-tra?doiTac=${PTY_B}&dichVu=SLX&ngay=${NGAY}`, `/api/pricing/thu-tra?doiTac=${PTY_B}&dichVu=SLY&ngay=${NGAY}`],
    "/api/pricing/nguoi-huong": ["/api/pricing/nguoi-huong?q=Đại"],
    "/api/parties/lookup": ["/api/parties/lookup?phone=0913000001"],
    "/api/sessions/policy/preview": ["/api/sessions/policy/preview?nhieuMay="],
    "/api/van-chuyen/lich": [`/api/van-chuyen/lich?ngay=${NGAY}`],
    "/api/van-chuyen/chi-phi": [`/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}`],
    "/api/van-chuyen/bang-gia": [`/api/van-chuyen/bang-gia?nha-xe=${g.nhaXe}`],
  };
}

/**
 * Bề mặt NGOÀI route GET — khai TƯỜNG MINH. "quét": bài dưới gọi và quét thân (tên phải nằm trong `daQuet` cuối bài). "miễn": lý do một dòng (và bài tĩnh ở cuối tệp).
 */
const NGOAI_GET: Record<string, string> = {
  "POST /api/ledger/balances — đọc tiền nhiều đơn bằng POST": "quét",
  "POST /api/orders/:id/status — tài khoản lai xác nhận đơn của mình có bên đặt B (lô chụp mức của B)": "quét",
  "PUT /api/orders/:id/booker — tài khoản lai đổi bên đặt đơn của mình sang B": "quét",
  "POST /api/orders/:id/thuong-mai/:serviceId — tài khoản lai ghi mức tay đơn của B": "quét",
  "Đơn của chính tài khoản lai, bên đặt B — chi tiết + lịch sử, phần đối tác, biên nhận, QR, lần thu, hành khách": "quét",
  "Nhật ký đơn (lịch sử trong GET /api/orders/:id): văn phòng có dòng order_terms_*, tài khoản giữ PARTNER không": "quét",
  "Bảng tin (WebSocket)": "miễn: sự kiện đúng 5 khoá kiểu SuKienDon (ADR-0022 điều 4; bang-tin.test.ts) — không chở tiền; bài dưới: đổi tiền / mức không phát tin",
  "Nội dung thông báo đẩy": "quét qua GET /api/thong-bao/moi-nhat (nội dung cú gõ cửa — trong phép quét route GET) + bài dưới: order_terms_* / prc_* không sinh tin",
  "Trợ lý Mai (POST /api/tro-ly/hoi)": "miễn: module tro-ly không đọc dữ liệu đơn / bảng mức / sổ tiền (bài tĩnh dưới) — chỉ kho hướng dẫn (ADR-0066 điều 1)",
};

/** Đơn NHÁP gieo bằng SQL (khuôn so-la-doi-tac): chủ `chu`, bên đặt `booker`, ngày đi = hôm nay giờ VN (đồng hồ giả). */
function nhap(w: W, chu: string, booker: string | null, dv: [string, number][]): string {
  const id = uuid();
  const tong = dv.reduce((s, [, t]) => s + t, 0);
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-SL-${id.slice(0, 4)}`, chu, tong, tong, tong, booker, AT, AT);
  dv.forEach(([code, t], i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, 'perPax', 1, ?)").run(s, id, i, code, `Dịch vụ ${code}`, ngay);
    w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', 1, ?, ?, ?)")
      .run(`${s}-i`, id, s, code, t, t, t);
  });
  return id;
}
const KQ = async (p: Promise<Res>, ma: number, ten: string): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten}: ${r.text}`);
  return r;
};

/** Dựng thế giới: tài khoản, vai, bảng mức + điều khoản (qua route thật của Kế toán), đơn của A, đơn của B (xác nhận + ghi tay, nháp), đơn nháp bên đặt B của mỗi tài khoản lai, chuyến xe, góp ý, tin. */
async function gieo(w: W): Promise<Gieo> {
  THUAN.forEach((t, i) => { if (!KHUNG[t.permissions[0]!]) seedStaff(w.sqlite, { id: t.id, phone: `0911000${String(i).padStart(3, "0")}`, name: `Thuần ${t.permissions[0]}`, perms: t.permissions }); });
  LAI.forEach((t, i) => seedStaff(w.sqlite, { id: t.id, phone: `0912000${String(i).padStart(3, "0")}`, name: `Lai ${t.permissions[0]}`, perms: t.permissions }));
  seedStaff(w.sqlite, { id: DT_B, phone: "0913000001", name: "Đại Lý Bê", perms: ["PARTNER"] });
  for (const [r, p] of [["r-sl-a", `pty-${PARTNER}`], ["r-sl-b", PTY_B]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(r, p, AT, AT);
  }
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'Nhà cung cấp Lạ', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES ('pty-ncc', 'Nhà cung cấp Lạ', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-sl-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  for (const [code, gia] of DV) {
    w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', ?, 1, '2026-01-01', '2026-01-01')").run(code, `Dịch vụ ${code}`, gia);
  }
  const muc = (body: Record<string, unknown>) => KQ(w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { tuNgay: "2026-01-01", ...body } }), 201, `mức ${JSON.stringify(body)}`);
  await muc({ doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  await muc({ doiTuong: { loai: "DOI_TAC", partyId: PTY_B }, phamVi: "SERVICE", catalogCode: "SLX", kieu: "PER_PAX", moiKhach: 370_913 });
  await muc({ doiTuong: { loai: "DOI_TAC", partyId: PTY_B }, phamVi: "ALL", kieu: "RATE", tyLeBp: 3729 });
  await KQ(w.call("POST", "/api/pricing/cung-ung", { as: ACC, body: { tuNgay: "2026-01-01", phamVi: "SERVICE", catalogCode: "SLX", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 6173 } }), 201, "điều khoản nhà cung cấp");
  // ADR-0117 lần 2: một mức TA có dòng 42,61% (số lạ), gắn cho loại Đại lý lữ hành. Dòng riêng 10% của loại (bậc 6) thắng dòng TA (bậc 9) nên không số tiền nào đổi —
  // số lạ chỉ có thể hiện ở bề mặt đọc bảng mức (/api/pricing/hoa-hong, /api/pricing/muc-ta) và nhật ký: văn phòng được phép thấy, tài khoản giữ PARTNER không bao giờ.
  const mucTa = (await KQ(w.call("POST", "/api/pricing/muc-ta", { as: ACC, body: { ten: "Mức TA Lạ" } }), 201, "tạo mức TA")).json.muc.code as string;
  await KQ(w.call("POST", `/api/pricing/muc-ta/${mucTa}/dong`, { as: ACC, body: { tuNgay: "2026-01-01", phamVi: "ALL", kieu: "RATE", tyLeBp: 4261 } }), 201, "dòng của mức TA");
  await KQ(w.call("POST", "/api/pricing/muc-ta/gan", { as: ACC, body: { loai: "TRAVEL_AGENCY", muc: mucTa, tuNgay: "2026-01-01" } }), 201, "gắn loại vào mức TA");

  const xacNhan = (id: string, as: string) => KQ(w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } }), 200, `xác nhận ${id}`);
  const cuaA = nhap(w, PARTNER, `pty-${PARTNER}`, [["ZA1", 777_000]]);
  await xacNhan(cuaA, PARTNER);
  const cuaB = nhap(w, DT_B, PTY_B, DV);
  await xacNhan(cuaB, DT_B);
  await KQ(w.call("POST", `/api/orders/${cuaB}/thuong-mai/${cuaB}-s1`, { as: ACC, body: { lyDo: "Thoả thuận riêng với đại lý Bê", hoaHong: { kieu: "RATE", tyLeBp: 5287 } } }), 200, "ghi tay");
  const nhapB = nhap(w, DT_B, PTY_B, DV);
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, valid_from_at, created_at, updated_at) VALUES ('as-sl-f', ?, 'HANDLE', ?, ?, ?, ?)")
    .run(cuaB, `pty-${laiCua("FIELD").id}`, AT, AT, AT);
  const donLai = new Map(LAI.map((t) => [t.id, nhap(w, t.id, PTY_B, DV)] as const));

  // Phần không thương mại — chỉ để mọi route GET có dữ liệu trả 200 (luật chống rỗng): chuyến xe (một chuyến thường của tài xế công ty, một chuyến Kết thúc gián
  // đoạn cho trang cứu hộ), nhà xe, góp ý, tin thủ công, tài khoản nhận tiền của công ty chủ (QR), Face ID bật trên khung thử.
  const x = xe(w);
  const c = await chuyenSan(w, { xe: x });
  const hong = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
  denGio("13:40");
  await KQ(tienDo(w, "tai-xe", hong.id, "xuat-ben", {}, DRIVER2), 200, "xuất bến chuyến sẽ gián đoạn");
  denGio("13:41");
  await KQ(tienDo(w, "tai-xe", hong.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }, DRIVER2), 200, "kết thúc gián đoạn");
  const nhaXe = nhaXeKhung(w, "Nhà xe Lạ");
  await KQ(w.call("POST", "/api/feedback", { as: DT_B, body: { kind: "BUG", title: "Góp ý thử", body: "Nội dung góp ý thử", clientRequestId: uuid() } }), 201, "góp ý");
  await KQ(w.call("POST", "/api/thong-bao", { as: SUP, body: { tieuDe: "Tin thử", noiDung: "Nội dung tin thử", nguoiNhan: "noi-bo", quanTrong: false, clientRequestId: uuid() } }), 201, "tin");
  const congTy = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  w.sqlite.prepare(`INSERT INTO pty_bank_account (id, party_id, bank_code, account_number, account_name, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
    VALUES ('tk-sl', ?, 'VCB', '0011001234567', 'CONG TY TNHH TOUR DAO', ?, NULL, ?, 'sa', ?, 'sa')`).run(congTy, AT, AT, AT);
  w.env.PASSKEY_RP_ID = "booking.tourdao.vn";
  w.env.PASSKEY_ORIGIN = "https://booking.tourdao.vn";
  return {
    cuaA, cuaB, nhapB, donLai, xe: x, chuyen: c.id, chuyenHong: hong.id, donChuyen: c.don.id, nhaXe, congTy,
    gopY: String(w.q("SELECT id FROM fbk_ticket LIMIT 1")[0].id), tin: String(w.q("SELECT id FROM ntf_notice LIMIT 1")[0].id),
  };
}

test("số lạ toàn Nền tảng: tài khoản giữ quyền Đối tác (thuần và MỌI tài khoản lai) hay không có ô xem tương ứng KHÔNG thấy tiền thương mại của đại lý B ở bất kỳ route GET, đường đọc POST hay phản hồi lệnh ghi nào; văn phòng được phép THẤY từng số", async () => {
  const batDau = performance.now();
  const tat = batDongHo();
  try {
    // ---- Tự kiểm bài (trước khi dựng): số lạ không đụng nhau giữa hai loại, không nằm trong số công khai ----
    for (const a of SO_LA) {
      for (const b of SO_LA) if (a.loai !== b.loai) for (const da of a.dang) for (const db of b.dang) assert.ok(!da.includes(db), `số lạ "${da}" (${a.loai}) chứa "${db}" (${b.loai}) — Bán hàng sẽ đỏ giả`);
      for (const n of SO_CONG_KHAI) for (const d of a.dang) assert.ok(!tien(n).some((c) => c.includes(d)), `số công khai ${n} chứa số lạ "${d}"`);
    }
    const w = setup();
    const g = await gieo(w);
    const donB = [{ id: g.cuaB, chu: DT_B, giao: laiCua("FIELD").id }, { id: g.nhapB, chu: DT_B }, ...LAI.map((t) => ({ id: g.donLai.get(t.id)!, chu: t.id }))];
    /** Hai chiều, suy từ MATRIX: giữ PARTNER ⇒ cấm thẳng; còn lại theo ô xem của đúng loại số. */
    const duocXem = (tk: TaiKhoan, loai: Loai): boolean => {
      if (holdsPartner(tk)) return false;
      if (loai === "CU") return can(tk, "supply.terms.view");
      return can(tk, "partner.commission.view") || donB.some((d) => can(tk, "order.terms.view", { ownerId: d.chu, assigned: d.giao === tk.id }));
    };
    const ketToan = thuanCua("ACCOUNTING");
    assert.ok(duocXem(ketToan, "HH") && duocXem(ketToan, "CU"), "đối chứng: Kế toán thuần có ô xem cả hai loại");

    // ---- Tự kiểm bài: văn phòng thấy đúng các số tính tay (số lạ thật sự tới được bề mặt văn phòng). Lệch thì GHI LẠI, báo cùng mọi lỗi khác ở cuối ----
    const tuKiem: string[] = [];
    const kiem = (ten: string, thuc: unknown, mong: unknown) => { if (JSON.stringify(thuc) !== JSON.stringify(mong)) tuKiem.push(`${ten}: được ${JSON.stringify(thuc)}, mong ${JSON.stringify(mong)}`); };
    const vpB = await KQ(w.call("GET", `/api/orders/${g.cuaB}/thuong-mai`, { as: ACC }), 200, "Kế toán đọc đơn B");
    const d = vpB.json.vanPhong.dong;
    kiem("đơn B xác nhận, dòng SLX", [d[0].muc, d[0].hoaHong, d[0].giaDaiLy, d[0].nhaCungCap?.tyLeMua, d[0].nhaCungCap?.giaVon], ["370.913đ/khách", 370_913, 629_087, "61,73%", 617_300]);
    kiem("đơn B xác nhận, dòng SLY", [d[1].muc, d[1].hoaHong, d[1].giaDaiLy, d[1].ghiTay], ["52,87%", 1_057_400, 942_600, true]);
    kiem("đơn B xác nhận, tổng", [vpB.json.vanPhong.tong.hoaHong, vpB.json.vanPhong.tong.giaDaiLy], [1_428_313, 1_571_687]);
    const vpNhap = await KQ(w.call("GET", `/api/orders/${g.nhapB}/thuong-mai`, { as: ACC }), 200, "Kế toán đọc đơn B nháp");
    kiem("đơn B nháp, các dòng", vpNhap.json.vanPhong.dong.map((x: { muc: string; hoaHong: number; giaDaiLy: number }) => [x.muc, x.hoaHong, x.giaDaiLy]), [["370.913đ/khách", 370_913, 629_087], ["37,29%", 745_800, 1_254_200]]);
    kiem("đơn B nháp, tổng", [vpNhap.json.vanPhong.tong.hoaHong, vpNhap.json.vanPhong.tong.giaDaiLy], [1_116_713, 1_883_287]);

    const lo: string[] = [];
    const loi5xx: string[] = [];
    const daMien: string[] = [];
    const thay = new Map<string, string>(); // số lạ → bề mặt + tài khoản được phép đầu tiên thấy nó
    const daQuet = new Set<string>();
    const xet = (beMat: string, tk: TaiKhoan, r: Res): void => {
      if (r.status >= 500) loi5xx.push(`${beMat} (${tk.ten}): ${r.status} ${r.text.slice(0, 160)}`);
      for (const s of soLaTrong(r.text)) {
        if (duocXem(tk, s.loai)) { if (!thay.has(s.ten)) thay.set(s.ten, `${beMat} (${tk.ten})`); continue; }
        const mien = mienThay(beMat, tk);
        if (mien) daMien.push(`${beMat} (${tk.ten}): ${s.ten} — ${mien}`);
        else lo.push(`${beMat} (${tk.ten}, ${r.status}) lộ: ${s.ten}`);
      }
    };
    // Đối chứng ở phản hồi lệnh ghi: lệnh ghi tay của Kế toán trả DTO văn phòng có số — bề mặt "phản hồi lệnh ghi" chở được số lạ, nên phép quét dưới có răng.
    xet("POST /api/orders/:id/thuong-mai/:serviceId (Kế toán, đối chứng)", ketToan, await w.call("POST", `/api/orders/${g.cuaB}/thuong-mai/${g.cuaB}-s1`, { as: ACC, body: { lyDo: "Ghi lại cùng mức để đối chứng", hoaHong: { kieu: "RATE", tyLeBp: 5287 } } }));
    assert.ok(thay.has("mức tay 52,87% Kế toán ghi trên đơn B đã xác nhận"), "đối chứng: phản hồi lệnh ghi tay của Kế toán có mức 52,87%");

    // ---- 1. Bề mặt ngoài GET: lệnh ghi của MỖI tài khoản lai (số trong thân lệnh là số thường — không số lạ) ----
    let xacNhan200 = 0;
    for (const tk of LAI) {
      const id = g.donLai.get(tk.id)!;
      const capNhat = String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at);
      daQuet.add("PUT /api/orders/:id/booker — tài khoản lai đổi bên đặt đơn của mình sang B");
      xet("PUT /api/orders/:id/booker", tk, await w.call("PUT", `/api/orders/${id}/booker`, { as: tk.id, body: { customerName: "Khách Giả", customerPhone: "0900000099", bookerPartyId: PTY_B, expectedUpdatedAt: capNhat } }));
      daQuet.add("POST /api/orders/:id/thuong-mai/:serviceId — tài khoản lai ghi mức tay đơn của B");
      const ghiTay = await w.call("POST", `/api/orders/${g.cuaB}/thuong-mai/${g.cuaB}-s0`, { as: tk.id, body: { lyDo: "Thoả thuận riêng thử ghi", hoaHong: { kieu: "RATE", tyLeBp: 1500 } } });
      assert.notEqual(ghiTay.status, 200, `${tk.ten} không bao giờ ghi được mức tay: ${ghiTay.text}`);
      xet("POST /api/orders/:id/thuong-mai/:serviceId", tk, ghiTay);
      daQuet.add("POST /api/orders/:id/status — tài khoản lai xác nhận đơn của mình có bên đặt B (lô chụp mức của B)");
      const xn = await w.call("POST", `/api/orders/${id}/status`, { as: tk.id, body: { status: "confirmed" } });
      if (xn.status === 200) xacNhan200++;
      xet("POST /api/orders/:id/status", tk, xn);
      daQuet.add("Đơn của chính tài khoản lai, bên đặt B — chi tiết + lịch sử, phần đối tác, biên nhận, QR, lần thu, hành khách");
      for (const duoi of ["", "/thuong-mai", "/receipt", "/qr-thanh-toan", "/payments", "/passengers"]) {
        const r = await w.call("GET", `/api/orders/${id}${duoi}`, { as: tk.id });
        xet(`GET /api/orders/:id${duoi} (đơn của mình, bên đặt B)`, tk, r);
        if (duoi === "/thuong-mai") assert.equal(r.status, 404, `${tk.ten}: phần đối tác đơn của mình mà người hưởng là B phải 404: ${r.text}`);
        if (duoi === "" && r.status === 200) assert.deepEqual(r.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")), [], `${tk.ten}: lịch sử lọc order_terms_*`);
      }
    }
    assert.ok(xacNhan200 >= 1, "chống bài rỗng: ít nhất một tài khoản lai xác nhận được đơn của mình (lô chụp mức của B chạy thật)");

    // ---- 2. Đường đọc bằng POST: mọi tài khoản ----
    daQuet.add("POST /api/ledger/balances — đọc tiền nhiều đơn bằng POST");
    for (const tk of MOI) xet("POST /api/ledger/balances", tk, await w.call("POST", "/api/ledger/balances", { as: tk.id, body: { orderIds: [g.cuaB, g.nhapB, ...g.donLai.values()] } }));

    // ---- 3. Nhật ký đơn: văn phòng thấy dòng order_terms_* (có mức tay), tài khoản giữ PARTNER không bao giờ ----
    daQuet.add("Nhật ký đơn (lịch sử trong GET /api/orders/:id): văn phòng có dòng order_terms_*, tài khoản giữ PARTNER không");
    const nkVp = await KQ(w.call("GET", `/api/orders/${g.cuaB}`, { as: ACC }), 200, "Kế toán đọc chi tiết đơn B");
    assert.ok(nkVp.json.history.some((e: { action: string; detail: string }) => e.action === "order_terms_manual" && e.detail.includes("52,87%")), "đối chứng: lịch sử văn phòng có dòng ghi tay 52,87%");
    for (const tk of MOI.filter((t) => holdsPartner(t))) {
      for (const id of [g.cuaB, g.nhapB]) {
        const r = await w.call("GET", `/api/orders/${id}`, { as: tk.id });
        if (r.status === 200) assert.deepEqual(r.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")), [], `${tk.ten}: lịch sử đơn B lọc order_terms_*`);
      }
    }
    // Nhật ký toàn hệ thống (bước K-a — chỗ rào đã đỏ thật): Toàn quyền thuần thấy dòng chở mức; tài khoản lai Toàn quyền + Đối tác KHÔNG thấy dòng nào (kể cả dòng
    // `order_terms_captured` chỉ đếm dòng — không số lạ nào để phép quét bắt), và lọc đích danh theo hành động cũng ra rỗng.
    const thuongMai = (e: { action: string }) => e.action.startsWith("order_terms_") || e.action.startsWith("prc_");
    const nkToan = await KQ(w.call("GET", "/api/audit?limit=100", { as: SUP }), 200, "Toàn quyền đọc Nhật ký");
    assert.ok(nkToan.json.entries.filter(thuongMai).length >= 5, "đối chứng: Toàn quyền thuần thấy các dòng mức / bản chụp / ghi tay");
    const laiToan = laiCua("SUPER_ADMIN");
    for (const loc of ["?limit=100", "?action=order_terms_captured", "?action=prc_commission_rule_added"]) {
      const r = await KQ(w.call("GET", `/api/audit${loc}`, { as: laiToan.id }), 200, `${laiToan.ten} đọc Nhật ký ${loc}`);
      assert.deepEqual(r.json.entries.filter(thuongMai).map((e: { action: string }) => e.action), [], `${laiToan.ten}: Nhật ký ${loc} không còn dòng thương mại`);
    }

    // ---- 4. MỌI route GET × MỌI tài khoản ----
    const dien = bangDien(g);
    const thua = [...Object.keys(dien), ...Object.keys(MIEN_200)].filter((p) => !ROUTE_GET.includes(p)).map((p) => `${p} (không còn route — xoá dòng)`);
    const chuaDien: string[] = [];
    const khong200: string[] = [];
    let soLanGoi = 0;
    for (const p of ROUTE_GET) {
      const duong = dien[p] ?? (p.includes(":") ? null : [p]);
      if (!duong || duong.length === 0) {
        if (!(p in MIEN_200)) chuaDien.push(`${p} — chưa điền: thêm vào bảng điền (bangDien) hoặc danh sách miễn (MIEN_200) kèm lý do`);
        continue;
      }
      let so200 = 0;
      for (const u of duong) {
        for (const tk of MOI) {
          const r = await w.call("GET", u, { as: tk.id });
          soLanGoi++;
          if (r.status === 200) so200++;
          xet(`GET ${p}`, tk, r);
        }
      }
      if (so200 === 0 && !(p in MIEN_200)) khong200.push(`${p} — không tài khoản nào trong bài nhận 200 (${duong.join(", ")}): điền tham số đúng hoặc thêm vào MIEN_200 kèm lý do`);
    }

    // ---- 5. Kết luận MỘT lần (mọi lỗi cùng hiện) ----
    const ngoaiGetChuaQuet = Object.entries(NGOAI_GET).filter(([ten, cach]) => cach === "quét" && !daQuet.has(ten)).map(([ten]) => ten);
    const rong = SO_LA.filter((s) => !thay.has(s.ten)).map((s) => `${s.ten} — không tài khoản văn phòng được phép nào thấy (bài rỗng: gieo hỏng hoặc văn phòng bị chặn)`);
    const ketToanThay = [...thay.values()].filter((v) => v.endsWith(`(${ketToan.ten})`));
    if (ketToanThay.length === 0) rong.push("Kế toán thuần không thấy số lạ nào (bài rỗng)");
    const loi = { "tự kiểm": tuKiem, "mục thừa": thua, "chưa điền": chuaDien, "5xx": loi5xx, "lộ số lạ": lo, "không 200": khong200, "bài rỗng": rong, "bề mặt ngoài GET chưa quét": ngoaiGetChuaQuet };
    assert.deepEqual(loi, { "tự kiểm": [], "mục thừa": [], "chưa điền": [], "5xx": [], "lộ số lạ": [], "không 200": [], "bài rỗng": [], "bề mặt ngoài GET chưa quét": [] }, JSON.stringify(loi, null, 1));
    assert.deepEqual(daMien, [], "danh sách miễn (b) hôm nay trống — một dòng miễn được dùng mà không khai là lỗi của bài");
    assert.ok(ROUTE_GET.length >= 100, `chống bài rỗng: ${ROUTE_GET.length} route GET`);
    assert.ok(soLanGoi >= 2000, `chống bài rỗng: ${soLanGoi} lần gọi GET`);
    console.log(`số lạ toàn Nền tảng: ${ROUTE_GET.length} route GET, ${MOI.length} tài khoản, ${soLanGoi} lần gọi GET, ${Math.round(performance.now() - batDau)} ms`);
  } finally {
    tat();
  }
});

test("số lạ toàn Nền tảng — bề mặt miễn: trợ lý Mai không đọc dữ liệu đơn / bảng mức / sổ tiền; ghi mức, đổi tiền không sinh thông báo, tin Bảng tin hay cú gõ cửa", () => {
  // Trợ lý (ADR-0066 điều 1): chỉ kho hướng dẫn. Mọi tệp mã của module tro-ly không nhập module đơn / bảng mức / sổ tiền và không nhắc bảng thương mại.
  const thuMuc = new URL("./modules/tro-ly/", import.meta.url);
  const tep = readdirSync(thuMuc).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  assert.ok(tep.length >= 3, `chống bài rỗng: ${tep.length} tệp mã tro-ly`);
  for (const f of tep) {
    const src = readFileSync(new URL(f, thuMuc), "utf8");
    for (const cam of [/from\s+"\.\.\/(orders|pricing|billing|receipt|dispatch)["/]/, /\bprc_/, /\bord_service_terms\b/, /\bv_ord_terms/, /\bbil_/]) {
      assert.doesNotMatch(src, cam, `tro-ly/${f} chạm dữ liệu thương mại (${cam}) — phải vào phép quét số lạ trước`);
    }
  }
  // Thông báo / Bảng tin / cú gõ cửa: không hành động thương mại nào sinh tin (nội dung tin đơn dựng từ các hành động này).
  const thuongMai = (a: string) => a.startsWith("order_terms_") || a.startsWith("prc_") || a.startsWith("ledger_");
  assert.deepEqual((HANH_DONG_TIN_DON as readonly string[]).filter(thuongMai), [], "hộp thông báo của đơn");
  assert.deepEqual((HANH_DONG_TIN_CHUYEN as readonly string[]).filter(thuongMai), [], "tin chuyến");
  assert.deepEqual(THAY_DOI.map((t) => hanhDongCuaThayDoi(t)).filter((a): a is string => a !== null).filter(thuongMai), [], "cú gõ cửa màn hình khoá");
  assert.equal(hanhDongCuaThayDoi("tien"), null, "đổi tiền / mức không gõ cửa máy nào");
  assert.ok(Object.values(NGOAI_GET).every((c) => c === "quét" || c.startsWith("quét qua") || c.startsWith("miễn: ")), "mỗi bề mặt ngoài GET: quét hoặc miễn có lý do");
});
