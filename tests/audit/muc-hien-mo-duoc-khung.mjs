// BÀI RÀO "MỤC HIỆN ⇔ TRANG MỞ ĐƯỢC" (bước K-c sổ đại lý đợt 1; vòng sửa 1: chốt chặn phía trình duyệt `moTrang`, chia ba tệp theo đường gọi; vòng sửa 2:
// canh nối dây ba tệp (8), "một nguồn" đọc đúng tệp trang và bỏ chú thích).
// Neo: Hiến chương K4 (docs/ARCHITECTURE.md — một bản đồ quyền; mọi route hỏi `can()`) và web/CLAUDE.md ("ẩn/hiện hỏi CÙNG bảng với máy chủ; máy chủ luôn kiểm
// lại"). Bảng mục: src/shared/muc-giao-dien.ts (TRANG + các nơi đặt) và src/shared/trang-chu-o.ts (O_TRANG_CHU).
//
// Tệp này là phần CHUNG (dữ liệu, luật, dựng khung thử) — ba tệp src/muc-hien-mo-duoc-{1,2,3}.test.ts mỗi tệp gọi `kiemPhan(i)`: gọi một phần ba danh sách
// đường gọi chính (chia theo thứ tự chữ, phần = chỉ số % 3 — đường MỚI tự rơi vào một phần; phần 1 khẳng định HỢP ba phần = toàn bộ, không trùng) để ba tệp
// chạy song song. Phần 1 chạy thêm các kiểm tĩnh (không gọi máy chủ). Đặt ở tests/audit/ (không ở src/) vì nó nhập khung thử .mjs và node:* — `tsc` của src
// không có khai kiểu cho hai thứ đó.
//
// CHẶN (trên ĐỦ 1024 tập quyền = mọi tập con của PERMISSION_CODES; mỗi tập một tài khoản thật trong CSDL thử, gọi route THẬT qua khung thử harness.mjs — router,
// cổng, `can()`, CSDL dựng từ migrations/):
//   (1) mục điều hướng HIỆN mà ĐƯỜNG GỌI CHÍNH của trang bị máy chủ TỪ CHỐI với chính tài khoản đó ⇒ ĐỎ;
//   (1b) mục HIỆN mà chính trang TỰ CHẶN ở trình duyệt (`moTrang` của bảng mục là sai) ⇒ ĐỎ;
//   (2) mục ẨN mà trang VÀO ĐƯỢC (máy chủ cho gọi VÀ `moTrang` — nếu có — cho mở), khi tập đó chưa ghi ĐÚNG ở DUOC_MA_AN kèm lý do (chờ chủ; dòng thừa /
//       hẹp / rộng hơn thực tế cũng ĐỎ);
//   (3) trang chưa khai đường gọi chính (`goi`) mà không có trong MIEN kèm lý do ⇒ ĐỎ "chưa khai"; mã trạng thái lạ (khác 2xx/401/403) ⇒ ĐỎ;
//   (4) khung tạm (bản nhớ khung, ADR-0035) vẽ mục mà khung thật của cùng tài khoản không vẽ ⇒ ĐỎ;
//   (5) logo (về "/", trang chuyển tiếp theo `homeRedirect`) đưa tài khoản tới trang đầu không vào được ⇒ ĐỎ (trừ CHO_CHU_TRANG_DAU);
//   (6) web/shell.ts, web/account.ts viết tay `href: "<chuỗi>"` ngoài LIEN_KET_VIET_TAY ⇒ ĐỎ;
//   (7) đường trang / trang cùng sáng của bảng không có trong PAGES (src/shared/sw-policy.ts — trang có thật) ⇒ ĐỎ;
//   (8) nối dây ba tệp (vòng sửa 2): số tệp src/muc-hien-mo-duoc-<n>.test.ts khác SO_PHAN, tệp thứ n không gọi đúng một lần `kiemPhan(n−1)`, hay các chỉ số
//       không phủ đúng {0..SO_PHAN−1} mỗi số một lần ⇒ ĐỎ — bài này chạy ở MỌI phần (thiếu tệp phần 1 thì hai tệp kia vẫn đỏ).
// Mục / trang MỚI khai ở bảng tự vào bài (bài lặp THANH_BEN, THANH_TAB, THANH_TREN, TRANG_TOI, O_TRANG_CHU và mọi khoá TRANG).
//
// QUY ƯỚC "bị từ chối": 401 / 403. 404 chỉ khi đường gọi đó dùng 404 làm câu từ chối (TU_CHOI_BANG_404 — hôm nay rỗng). 2xx = mở được. Mã khác (400, 5xx, 404
// không khai) = ĐỎ "mã lạ": đường gọi chính khai sai (vd thiếu tham số bắt buộc) — sửa `goi`, không nới bài.
//
// KHUNG THỬ: CSDL thử BỎ trigger `lc1b_stf_permission_driver_partner_alone` (DRIVER_PARTNER phải đứng một mình — ADR-0048) để gieo được 511 tập hôm nay CSDL
// không cho tạo: bài phủ RỘNG hơn thực tế, không nới luật của Nền tảng. Tài khoản mang đúng tập quyền được kiểm bằng /api/auth/me (ở phần gọi đường đó).
//
// GIỚI HẠN (dựa vào kỷ luật / bài khác): chỉ lối vào ĐIỀU HƯỚNG (thanh bên, thanh tab, thanh trên, trang Tôi, ô Trang chủ — ô lưới điện thoại và lối tắt máy tính
// là tập con của `nhomMayTinh` mà bài dùng). KHÔNG phủ: nút ghi trong trang; trạng thái dữ liệu (chỉ phủ quyền); liên kết trong nội dung trang (khối "Cần xem
// lại" src/shared/dashboard-review.ts, dải chào web/trang-chu-may-tinh.ts, `data-back`); huy hiệu số; chốt chặn phía trình duyệt CHỈ phủ trang có khai
// `moTrang` (hôm nay: Địa điểm, Trang chủ tài xế, Cuốc của tôi — trang tự hỏi quyền theo cách khác mà không khai thì bài không thấy); "một nguồn" chỉ đọc MẪU
// chữ `if (!moTrang("<khoá>", …))` trong tệp trang (đã bỏ chú thích) — không chứng minh nhánh đó thật sự dừng trang; khung mất mạng (bốn tab cơ bản khi không
// biết vai). Đường gọi chính là MỘT lời gọi đọc đại diện cho trang; trang cần thêm lời gọi khác thì bài không thấy. Xoá CẢ ba tệp mỏng thì không còn bài nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { world, seedStaff } from "./harness.mjs";
import { PERMISSION_CODES, can, canAccessOrders, hasPermission, seesAllOrders } from "../../src/shared/permissions.ts";
import { chiTaiXe, coCuocCuaToi, homeRedirect } from "../../src/shared/start-page.ts";
import { PAGES } from "../../src/shared/sw-policy.ts";
import { KHOA_TRANG, THANH_BEN, THANH_TAB, THANH_TREN, TRANG, TRANG_TOI, coKhungNho, moTrang, sangTai, thanhBen, thanhTab, thanhTren, trangToi } from "../../src/shared/muc-giao-dien.ts";
import { O_TOI, O_TRANG_CHU, nhomMayTinh } from "../../src/shared/trang-chu-o.ts";

export const SO_PHAN = 3;
const SO_TAP = 1 << PERMISSION_CODES.length;
const TAP = Array.from({ length: SO_TAP }, (_, m) => m);
const idCua = (m) => `00000000-0000-4000-8000-${String(m).padStart(12, "0")}`;
const nguoi = (m) => ({ id: idCua(m), permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) });
const ten = (m) => `tập ${m} [${nguoi(m).permissions.join(", ") || "không quyền"}]`;
const ROOT = new URL("../../", import.meta.url);
/** Bỏ chú thích khối và dòng (giữ `//` đứng sau `:` / dấu nháy — URL, chuỗi). */
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Các nơi đặt lối vào: dòng khai + mục THẬT SỰ hiện (đọc từ chính hàm mà web/shell.ts, web/account.ts, web/home.ts vẽ).

const NOI = {
  "thanh-ben": { dong: THANH_BEN, hien: (s) => thanhBen({ staff: s }, "/").flatMap((g) => g.muc.flatMap((x) => (x.kieu === "muc" ? [x.trang] : []))) },
  "thanh-tab": { dong: THANH_TAB, hien: (s) => thanhTab({ staff: s }).map((x) => x.trang) },
  "thanh-tren": { dong: THANH_TREN, hien: (s) => thanhTren({ staff: s }).map((x) => x.trang) },
  "trang-toi": {
    dong: TRANG_TOI,
    hien: (s) => {
      const t = trangToi(s);
      return [...t.dau, ...(t.vanChuyen ?? []), ...t.sau].map((x) => x.trang);
    },
  },
  "trang-chu": {
    dong: [...O_TRANG_CHU, { trang: "toi", nhan: O_TOI.nhan }],
    hien: (s) => nhomMayTinh(s).flatMap((g) => g.o.map((o) => (o.khoa === O_TOI.khoa ? "toi" : O_TRANG_CHU.find((d) => d.khoa === o.khoa).trang))),
  },
};

/** Trang chưa có đường gọi chính (`goi: null`) — mỗi dòng một lý do. Hôm nay rỗng: mọi trang có lối vào đều khai được một lời gọi đọc. */
const MIEN = {};

/** Đường gọi chính dùng 404 làm câu từ chối (như đơn không tồn tại). Hôm nay rỗng: các lời gọi chính là danh sách / cấu hình, từ chối bằng 403. */
const TU_CHOI_BANG_404 = new Set();

/**
 * "ĐƯỢC MÀ ẨN": trang VÀO ĐƯỢC (máy chủ cho gọi đường chính VÀ trang không tự chặn — `moTrang`) nhưng mục không hiện. Đề bài K-c: KHÔNG đổi (không tự hiện
 * thêm, không nới máy chủ) — ghi ĐÚNG tập ở đây kèm lý do, trình chủ quyết. Bài đòi hợp các dòng của một (nơi, trang) BẰNG ĐÚNG tập thật; mỗi dòng phải góp
 * ít nhất một tập. Vòng sửa 1: ba dòng cũ (Địa điểm, Trang chủ tài xế, Cuốc với văn phòng) KHÔNG còn ở đây — chính trang tự chặn ở trình duyệt (`moTrang`),
 * nên không phải lựa chọn của chủ (cho hiện sẽ thành "thấy nút mà bấm bị trang chặn" — bài (1b) đỏ).
 */
// Giữ "Cuốc của tôi" = ô trip.view ĐÚNG BẰNG assigned: tài xế công ty (DRIVER) và, từ A4 (ADR-0053 D7.1), tài xế đối tác (DRIVER_PARTNER) — ghép main 1c471990, 12/10.
const coDriver = (s) => coCuocCuaToi(s);
const DUOC_MA_AN = [
  {
    noi: ["thanh-ben", "thanh-tab", "trang-chu"],
    trang: "donHang",
    khi: (s) => canAccessOrders(s) && !seesAllOrders(s) && !can(s, "order.create"),
    lyDo:
      "HDV chỉ-FIELD (và FIELD kèm tài xế / Nhân sự): GET /api/orders cho xem đơn mình phụ trách và trang đầu của họ là /orders (homeRedirect), nhưng mục " +
      "'Đơn hàng' ẩn theo coMucDonHang (lỗi báo 30/9 L3 chỉ mở cho Đối tác, Thực tập; HDV dùng 'Việc của tôi'). Chờ chủ: hiện mục cho HDV hay giữ.",
  },
  {
    noi: ["thanh-tren"],
    trang: "donHang",
    khi: (s) => canAccessOrders(s) && !seesAllOrders(s),
    lyDo: "Ô tìm đơn chỉ cho người xem MỌI đơn (cùng đối tượng mục Trang chủ); Đối tác, Thực tập, HDV tìm trong danh sách đơn của mình. Chờ chủ (giữ là hợp lý).",
  },
  {
    noi: ["trang-toi", "trang-chu"],
    trang: "cuoc",
    khi: (s) => coDriver(s) && chiTaiXe(s),
    lyDo: "Tài khoản 'chỉ tài xế' có tab 'Cuốc của tôi' riêng (và mục ở thanh bên) nên trang Tôi, ô Trang chủ không lặp lại (K2b T2). Chờ chủ (giữ là hợp lý).",
  },
  {
    noi: ["thanh-tab"],
    trang: "cuoc",
    khi: (s) => coDriver(s) && !chiTaiXe(s),
    lyDo: "Tài khoản vừa tài xế công ty vừa văn phòng / HDV / Đối tác / Thực tập: KHÔNG thêm tab (GA-K2b-T2 — thanh tab văn phòng đã đủ chỗ). Chờ chủ.",
  },
  {
    noi: ["trang-toi"],
    trang: "cuoc",
    khi: (s) => coDriver(s) && !chiTaiXe(s) && !can(s, "trip.view"),
    lyDo:
      "Tài xế công ty kiêm HDV / Đối tác / Thực tập (không có ô trip.view mọi chuyến): dòng 'Cuốc của tôi' một mình không mở nhóm VẬN CHUYỂN của trang Tôi, " +
      "không có tab riêng (GA-K2b-T2) ⇒ ở ĐIỆN THOẠI không có lối vào /cuoc (máy tính có mục ở thanh bên). Chờ chủ — lỗ thật, nên quyết.",
  },
  {
    noi: ["thanh-ben", "trang-toi"],
    trang: "deNghi",
    khi: (s) => can(s, "trip.view") && !can(s, "trip.override"),
    lyDo:
      "Gói A5 (ADR-0111, bản vẽ V10): GET /api/van-chuyen/de-nghi chỉ hỏi trip.view (rộng — Bán hàng, Kế toán, văn phòng xem được danh sách), nhưng mục 'Đề nghị chuyển khách' " +
      "chỉ hiện cho ô trip.override (Quản trị, Toàn quyền — người duyệt / bác). Giữ như mã gói A5 (ghép main 1c471990, 12/10). Chờ chủ (giữ là hợp lý).",
  },
  {
    noi: ["thanh-ben", "thanh-tab"],
    trang: "ban",
    khi: (s) => can(s, "unavailability.self", { ownerId: s.id }) && !chiTaiXe(s),
    lyDo:
      "A4 T9 (ADR-0053 D9, G-A4-16): 'Báo bận của tôi' chỉ hiện cho tài khoản 'chỉ tài xế' (có tab riêng); Toàn quyền, tài khoản tài xế đối tác kiêm văn phòng gọi được " +
      "GET /api/van-chuyen/ban/cua-toi nhưng không có mục (văn phòng xem dải 'Tài xế bận' ở Điều phối xe, không ghi thay). Giữ như mã A4 (ghép main 1c471990, 12/10). Chờ chủ (giữ là hợp lý).",
  },
];

/** Logo / "/" đưa tới trang đầu không vào được — tập được miễn, kèm lý do (chờ chủ). */
const CHO_CHU_TRANG_DAU = new Map([
  [0, "Tài khoản không còn quyền nào: homeRedirect giữ ở Trang chủ, GET /api/orders/dashboard 403 (trang báo lỗi). Chờ chủ: trang riêng cho tài khoản rỗng quyền hay giữ."],
]);

/**
 * `href` viết tay còn lại ở web/shell.ts, web/account.ts (ngoài bảng mục) — đếm ĐÚNG số lần; thêm một liên kết viết tay ⇒ ĐỎ (khai nó ở bảng mục).
 * `href: back` (đọc `data-back` của trang) không phải chuỗi — giới hạn ghi ở đầu tệp.
 */
const LIEN_KET_VIET_TAY = [
  { tep: "web/shell.ts", href: "/", lan: 2, lyDo: "logo ở đầu thanh bên và thanh trên — về trang đầu; bài (5) kiểm trang đầu của mọi tập" },
  { tep: "web/shell.ts", href: "/account", lan: 1, lyDo: "dải 'Đang ở chế độ bảo trì' — trang Tôi, ai cũng mở được (TRANG.toi; bài kiểm ở phần gọi /api/auth/me)" },
  { tep: "web/shell.ts", href: "", lan: 1, lyDo: "mục cha 'Vận chuyển' — vẽ thành <div>, không phải liên kết" },
];

/**
 * Tệp trang của khoá có `moTrang` — mặc định `web/<duong bỏ "/">.ts` (Địa điểm /locations → web/locations.ts, Cuốc /cuoc → web/cuoc.ts, Trang chủ tài xế
 * /tai-xe → web/tai-xe.ts). Trang có tệp khác tên thì khai ở đây.
 */
const TEP_TRANG = {};
const tepTrang = (k) => TEP_TRANG[k] ?? `web/${TRANG[k].duong.slice(1)}.ts`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Chia đường gọi chính thành SO_PHAN phần.

/** Mọi đường gọi chính (khử trùng), theo thứ tự chữ. */
export const GOI_TAT_CA = [...new Set(KHOA_TRANG.map((k) => TRANG[k].goi).filter((g) => typeof g === "string"))].sort();
export const goiCuaPhan = (phan) => GOI_TAT_CA.filter((_, i) => i % SO_PHAN === phan);
const goiCua = (k) => (typeof TRANG[k].goi === "string" ? TRANG[k].goi : null);

/**
 * Nối dây (vòng sửa 2, I-3): tệp mỏng src/muc-hien-mo-duoc-<n>.test.ts nào gọi `kiemPhan(<số>)` nào. Trả danh sách lỗi (rỗng = đúng): đúng SO_PHAN tệp; tệp thứ
 * n gọi đúng MỘT lần `kiemPhan(n−1)` viết bằng chữ số (đã bỏ chú thích); các chỉ số phủ đúng {0..SO_PHAN−1}, mỗi số một lần.
 */
function loiNoiDay() {
  const thuMuc = new URL("src/", ROOT);
  const tep = readdirSync(thuMuc).filter((f) => /^muc-hien-mo-duoc-.*\.test\.ts$/.test(f)).sort();
  const loi = [];
  if (tep.length !== SO_PHAN) loi.push(`có ${tep.length} tệp src/muc-hien-mo-duoc-*.test.ts (${tep.join(", ")}), cần đúng SO_PHAN = ${SO_PHAN}`);
  const tatCa = [];
  for (const f of tep) {
    const so = [...boChuThich(readFileSync(new URL(f, thuMuc), "utf8")).matchAll(/\bkiemPhan\s*\(\s*(\d+)\s*\)/g)].map((x) => Number(x[1]));
    tatCa.push(...so);
    const thu = f.match(/^muc-hien-mo-duoc-(\d+)\.test\.ts$/);
    if (so.length !== 1) loi.push(`${f}: gọi kiemPhan(<chữ số>) ${so.length} lần, cần đúng 1`);
    if (!thu) loi.push(`${f}: tên phải là muc-hien-mo-duoc-<1..${SO_PHAN}>.test.ts`);
    else if (so.length === 1 && so[0] !== Number(thu[1]) - 1) loi.push(`${f}: gọi kiemPhan(${so[0]}), cần kiemPhan(${Number(thu[1]) - 1})`);
  }
  const mong = Array.from({ length: SO_PHAN }, (_, i) => i);
  tatCa.sort((a, b) => a - b);
  if (JSON.stringify(tatCa) !== JSON.stringify(mong)) loi.push(`các chỉ số kiemPhan của mọi tệp = [${tatCa}], cần đúng [${mong}] (mỗi phần đúng một tệp)`);
  return loi;
}

/** Mục hiện theo (nơi, tập) — tính một lần (thuần, không gọi máy chủ). */
const HIEN = Object.fromEntries(Object.entries(NOI).map(([noi, { hien }]) => [noi, TAP.map((m) => new Set(hien(nguoi(m))))]));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

/** Đăng ký các bài của phần `phan` (0-based): dựng CSDL thử, 1024 tài khoản, gọi các đường của phần này bằng mọi tài khoản, rồi kiểm. */
export async function kiemPhan(phan) {
  const batDau = Date.now();
  const goiPhan = goiCuaPhan(phan);
  const w = world();
  const TRIGGER_BO = "lc1b_stf_permission_driver_partner_alone";
  const coTrigger = w.sqlite.prepare("SELECT 1 AS co FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(TRIGGER_BO);
  w.sqlite.exec(`DROP TRIGGER IF EXISTS ${TRIGGER_BO}`);
  for (const m of TAP) seedStaff(w.sqlite, { id: idCua(m), phone: `09${String(m).padStart(8, "0")}`, name: `Tập ${m}`, perms: nguoi(m).permissions });
  const cookie = [];
  for (const m of TAP) cookie.push(`td_session=${await w.token(idCua(m))}`);

  /** Mã trạng thái theo (đường gọi, tập) — chỉ các đường của phần này. */
  const MA = new Map();
  const quyenThat = [];
  for (const g of goiPhan) {
    const ds = [];
    for (const m of TAP) {
      const r = await w.call("GET", g.slice("GET ".length), { headers: { cookie: cookie[m] } });
      ds.push(r.status);
      if (g === "GET /api/auth/me") quyenThat[m] = [...(r.json?.staff?.permissions ?? [])].sort();
    }
    MA.set(g, ds);
  }
  const gioGoi = Date.now() - batDau;

  const laDuoc = (g, ma) => (ma >= 200 && ma < 300 ? true : ma === 401 || ma === 403 || (ma === 404 && TU_CHOI_BANG_404.has(g)) ? false : null);
  /** Đường gọi chính của trang `k` với tập `m`: true / false / null (mã lạ). Gọi chỉ với trang có đường gọi thuộc phần này. */
  const goiDuoc = (k, m) => laDuoc(goiCua(k), MA.get(goiCua(k))[m]);
  /** Trang `k` VÀO ĐƯỢC với tập `m`: máy chủ cho gọi đường chính VÀ trang không tự chặn ở trình duyệt. */
  const vaoDuoc = (k, m) => goiDuoc(k, m) === true && moTrang(k, nguoi(m));
  const thuocPhan = (k) => goiPhan.includes(goiCua(k));
  const nhan = `[phần ${phan + 1}/${SO_PHAN}]`;

  test(`${nhan} khung thử: bỏ đúng trigger ${TRIGGER_BO}; ${SO_TAP} tài khoản đăng nhập được (gọi ${goiPhan.length} đường × ${SO_TAP} tập: ${gioGoi} ms)`, () => {
    assert.ok(coTrigger, `không thấy trigger ${TRIGGER_BO} trong CSDL thử — đổi tên? sửa bài cho đúng (đừng bỏ trigger khác)`);
    assert.ok(goiPhan.length > 0, "phần này không có đường gọi nào — SO_PHAN lớn hơn số đường?");
    for (const [g, ds] of MA) assert.ok(ds.some((x) => x !== 401), `${g}: mọi tập đều 401 — phiên của khung thử hỏng`);
    assert.ok(
      [...MA.values()].some((ds) => ds.some((x) => x >= 200 && x < 300) && ds.some((x) => x === 403)),
      "phần này không có đường nào vừa mở vừa bị từ chối (403) tuỳ tập — khung thử không phân quyền? (bài (1) của phần thành rỗng nghĩa; nếu chỉ do cách chia, đổi SO_PHAN)",
    );
    if (goiPhan.includes("GET /api/auth/me")) {
      const lech = TAP.filter((m) => JSON.stringify(quyenThat[m]) !== JSON.stringify([...nguoi(m).permissions].sort()));
      assert.deepEqual(lech.slice(0, 5).map(ten), [], "tài khoản thử không mang đúng tập quyền (đọc lại qua /api/auth/me)");
      assert.ok(MA.get("GET /api/auth/me").every((x) => x === 200), "trang Tôi phải mở được với mọi tập (dải bảo trì, mục 'Của tôi', tab 'Tôi')");
    }
  });

  test(`${nhan} [tĩnh] (8) nối dây: đúng ${SO_PHAN} tệp src/muc-hien-mo-duoc-<n>.test.ts, tệp thứ n gọi đúng một lần kiemPhan(n−1) — chạy ở mọi phần`, () => {
    assert.deepEqual(loiNoiDay(), [], "tệp mỏng gọi nhầm / thiếu / thừa phần ⇒ một phần ba đường gọi lặng lẽ thôi được canh — sửa tệp mỏng (hoặc SO_PHAN)");
  });

  test(`${nhan} (3) mã trạng thái của các đường gọi chính chỉ là 2xx / 401 / 403 (404 khi có khai) — mã lạ là đường gọi khai sai`, () => {
    const la = [];
    for (const [g, ds] of MA) {
      const dem = new Map();
      for (const ma of ds) if (laDuoc(g, ma) === null) dem.set(ma, (dem.get(ma) ?? 0) + 1);
      for (const [ma, n] of dem) la.push(`${g} → ${ma} (${n} tập)`);
    }
    assert.deepEqual(la, []);
  });

  for (const [noi, { dong }] of Object.entries(NOI)) {
    const dongPhan = dong.filter((d) => thuocPhan(d.trang));
    if (dongPhan.length === 0) continue;
    test(`${nhan} (1) ${noi}: mục HIỆN ⇒ đường gọi chính của trang KHÔNG bị máy chủ từ chối (${SO_TAP} tập, ${dongPhan.length} dòng)`, () => {
      const loi = [];
      for (const m of TAP) for (const { trang: k, nhan: chu } of dongPhan) if (HIEN[noi][m].has(k) && goiDuoc(k, m) === false) loi.push(`${chu} (${k}) — ${ten(m)}`);
      assert.deepEqual(loi.slice(0, 10), [], `${noi}: ${loi.length} lần mục hiện mà máy chủ từ chối — ẩn mục (siết điều kiện ở bảng mục), KHÔNG nới máy chủ`);
    });

    test(`${nhan} (2) ${noi}: mục ẨN mà trang VÀO ĐƯỢC ⇔ đúng tập ghi ở DUOC_MA_AN (chờ chủ)`, () => {
      const loi = [];
      for (const { trang: k, nhan: chu } of dongPhan) {
        const dongAn = DUOC_MA_AN.filter((d) => d.trang === k && d.noi.includes(noi));
        const that = TAP.filter((m) => vaoDuoc(k, m) && !HIEN[noi][m].has(k));
        const ghi = TAP.filter((m) => dongAn.some((d) => d.khi(nguoi(m))));
        const thieu = that.filter((m) => !ghi.includes(m));
        const thua = ghi.filter((m) => !that.includes(m));
        if (thieu.length) loi.push(`"${chu}" (${k}): được mà ẩn CHƯA GHI ở ${thieu.length} tập, vd ${ten(thieu[0])} — ghi vào DUOC_MA_AN kèm lý do (không tự hiện thêm)`);
        if (thua.length) loi.push(`"${chu}" (${k}): DUOC_MA_AN ghi ${thua.length} tập không thật sự "được mà ẩn", vd ${ten(thua[0])} — thu hẹp dòng`);
        for (const d of dongAn) if (!that.some((m) => d.khi(nguoi(m)))) loi.push(`"${chu}" (${k}): dòng DUOC_MA_AN thừa (không góp tập nào): ${d.lyDo.slice(0, 80)}…`);
      }
      assert.deepEqual(loi, []);
    });
  }

  test(`${nhan} (5) logo / "/" đưa mỗi tài khoản tới trang đầu (homeRedirect) VÀO ĐƯỢC — các tập có trang đầu thuộc phần này (trừ CHO_CHU_TRANG_DAU)`, () => {
    const loi = [];
    for (const m of TAP) {
      const dich = homeRedirect(nguoi(m)) ?? "/";
      const k = KHOA_TRANG.find((x) => sangTai(x, dich));
      if (!k) {
        if (phan === 0) loi.push(`trang đầu ${dich} không có trong TRANG — ${ten(m)}`);
        continue;
      }
      if (!thuocPhan(k)) continue;
      const duoc = vaoDuoc(k, m);
      if (!duoc && !CHO_CHU_TRANG_DAU.has(m)) loi.push(`trang đầu ${dich} không vào được — ${ten(m)}`);
      if (duoc && CHO_CHU_TRANG_DAU.has(m)) loi.push(`CHO_CHU_TRANG_DAU thừa: ${ten(m)} nay vào được trang đầu`);
    }
    assert.deepEqual(loi.slice(0, 10), []);
  });

  if (phan === 0) kiemTinh();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Kiểm tĩnh (không gọi máy chủ) — chạy MỘT lần, ở phần 1.

function kiemTinh() {
  test(`[tĩnh] chia đường gọi: HỢP ${SO_PHAN} phần = toàn bộ ${GOI_TAT_CA.length} đường, không trùng, không phần rỗng`, () => {
    const phan = Array.from({ length: SO_PHAN }, (_, i) => goiCuaPhan(i));
    assert.deepEqual(phan.flat().sort(), [...GOI_TAT_CA].sort(), "đường gọi bị bỏ sót hoặc lặp giữa các phần");
    assert.equal(new Set(phan.flat()).size, phan.flat().length, "một đường gọi nằm ở hai phần");
    assert.ok(phan.every((p) => p.length > 0), "có phần không có đường gọi nào");
    assert.ok(
      GOI_TAT_CA.includes("GET /api/auth/me"),
      "không trang nào còn dùng GET /api/auth/me làm đường gọi chính ⇒ kiểm 'tài khoản thử mang đúng tập quyền' (bài khung thử của phần chứa đường đó) mất — thêm khẳng định thay thế",
    );
  });

  test("[tĩnh] (3) mọi trang có đường gọi chính dạng `GET /api/…` — hoặc nằm ở MIEN kèm lý do; MIEN không thừa", () => {
    const chuaKhai = KHOA_TRANG.filter((k) => TRANG[k].goi == null && !MIEN[k]);
    assert.deepEqual(chuaKhai, [], "trang chưa khai đường gọi chính (`goi` ở TRANG, src/shared/muc-giao-dien.ts) — khai một lời gọi ĐỌC mà trang cần; không khai được thì thêm vào MIEN kèm lý do");
    const sai = KHOA_TRANG.filter((k) => typeof TRANG[k].goi === "string" && !/^GET \/api\/[^\s]+$/.test(TRANG[k].goi));
    assert.deepEqual(sai, [], "đường gọi chính phải là `GET /api/…` (lời gọi đọc)");
    const thua = Object.keys(MIEN).filter((k) => TRANG[k]?.goi != null);
    assert.deepEqual(thua, [], "MIEN thừa: trang đã có đường gọi chính");
  });

  test("[tĩnh] (7) mọi đường trang và trang cùng sáng của bảng là trang có thật (PAGES của src/shared/sw-policy.ts)", () => {
    const la = KHOA_TRANG.flatMap((k) => [TRANG[k].duong, ...(TRANG[k].cungSang ?? [])].filter((d) => !PAGES.includes(d)).map((d) => `${k}: ${d}`));
    assert.deepEqual(la, [], "trang không có trong PAGES — tạo trang (public/<trang>.html, web/<trang>.ts, PAGES / PRECACHE, build:web) trước khi khai lối vào");
  });

  test(`[tĩnh] (1b) mục HIỆN ⇒ trang không tự chặn ở trình duyệt (\`moTrang\` của bảng mục) — ${SO_TAP} tập × năm nơi`, () => {
    const loi = [];
    for (const [noi, { dong }] of Object.entries(NOI)) {
      for (const m of TAP) for (const k of HIEN[noi][m]) if (!moTrang(k, nguoi(m))) loi.push(`${noi}: ${dong.find((d) => d.trang === k)?.nhan ?? k} (${k}) — ${ten(m)}`);
    }
    assert.deepEqual(loi.slice(0, 10), [], `${loi.length} lần mục hiện mà chính trang tự chặn (thấy nút mà bấm không vào được) — ẩn mục, hoặc sửa chốt chặn của trang theo bảng`);
  });

  test("[tĩnh] (1b) một nguồn: khoá khai `moTrang` ⇔ tệp trang của nó chặn bằng `if (!moTrang(\"<khoá>\", …))` (đã bỏ chú thích); web/ không gọi `moTrang` cho khoá không khai", () => {
    const thuMuc = new URL("web/", ROOT);
    const nguon = new Map(readdirSync(thuMuc).filter((f) => f.endsWith(".ts")).map((f) => [`web/${f}`, boChuThich(readFileSync(new URL(f, thuMuc), "utf8"))]));
    const coKhai = KHOA_TRANG.filter((k) => typeof TRANG[k].moTrang === "function");
    const loi = [];
    for (const k of coKhai) {
      const tep = tepTrang(k);
      const src = nguon.get(tep);
      if (src === undefined) loi.push(`${k}: không thấy tệp trang ${tep} — khai tệp ở TEP_TRANG`);
      else if (!new RegExp(`\\bif\\s*\\(\\s*!\\s*moTrang\\(\\s*"${k}"\\s*,`).test(src)) loi.push(`${k}: ${tep} không chặn bằng if (!moTrang("${k}", …))`);
    }
    for (const [tep, src] of nguon) {
      for (const x of src.matchAll(/\bmoTrang\(\s*"([^"]+)"/g)) if (!coKhai.includes(x[1])) loi.push(`${tep}: moTrang("${x[1]}") — khoá không khai moTrang ở bảng (luôn đúng, chốt chặn rỗng)`);
    }
    assert.deepEqual(loi, [], "chốt chặn trình duyệt của trang và bảng mục phải là MỘT hàm: khai `moTrang` ở TRANG VÀ tệp trang chặn bằng if (!moTrang(\"<khoá>\", staff))");
  });

  test("[tĩnh] bài không rỗng: mỗi nơi có mục hiện và mục ẩn tuỳ tập; mọi dòng DUOC_MA_AN trỏ tới (nơi, trang) có dòng đặt thật", () => {
    for (const noi of Object.keys(NOI)) {
      const dem = TAP.map((m) => HIEN[noi][m].size);
      assert.ok(Math.max(...dem) > Math.min(...dem), `${noi}: số mục không đổi theo quyền — bài đọc sai nơi?`);
    }
    const thua = DUOC_MA_AN.flatMap((d) => d.noi.filter((noi) => !NOI[noi].dong.some((x) => x.trang === d.trang)).map((noi) => `${noi}/${d.trang}`));
    assert.deepEqual(thua, []);
  });

  test(`[tĩnh] (4) khung tạm (bản nhớ khung ADR-0035) chỉ vẽ mục mà khung thật của cùng tài khoản cũng vẽ (${SO_TAP} tập)`, () => {
    const loi = [];
    const cap = [
      ["thanh-ben", (n) => thanhBen(n, "/").flatMap((g) => g.muc.map((x) => (x.kieu === "muc" ? x.trang : `cha:${x.nhan}`)))],
      ["thanh-tab", (n) => thanhTab(n).map((x) => x.trang)],
      ["thanh-tren", (n) => thanhTren(n).map((x) => `${x.kieu}:${x.trang}`)],
    ];
    for (const m of TAP) {
      const s = nguoi(m);
      for (const [noi, f] of cap) {
        const that = f({ staff: s });
        for (const x of f({ khungNho: coKhungNho(s) })) if (!that.includes(x)) loi.push(`${noi}: ${x} — ${ten(m)}`);
      }
    }
    assert.deepEqual(loi.slice(0, 10), [], `${loi.length} mục chỉ có ở khung tạm — sửa \`tam\` ở bảng mục (khung tạm phải là tập con)`);
  });

  test("[tĩnh] (6) web/shell.ts, web/account.ts không viết tay liên kết ngoài bảng mục (trừ LIEN_KET_VIET_TAY); trang Tôi không có chốt chặn riêng", () => {
    const dem = new Map();
    for (const tep of ["web/shell.ts", "web/account.ts"]) {
      const src = boChuThich(readFileSync(new URL(tep, ROOT), "utf8"));
      for (const x of src.matchAll(/\bhref\s*:\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g)) dem.set(`${tep}|${x[2]}`, (dem.get(`${tep}|${x[2]}`) ?? 0) + 1);
    }
    const mongDoi = new Map(LIEN_KET_VIET_TAY.map((l) => [`${l.tep}|${l.href}`, l.lan]));
    assert.deepEqual(Object.fromEntries([...dem].sort()), Object.fromEntries([...mongDoi].sort()), "liên kết viết tay mới ⇒ khai trang ở bảng mục (src/shared/muc-giao-dien.ts) thay vì viết `href` trong tệp vẽ");
    assert.ok(TAP.every((m) => moTrang("toi", nguoi(m)) && TRANG.toi.hien(nguoi(m))), "trang Tôi phải hiện và tự mở với mọi tập");
  });
}
