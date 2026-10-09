// BÀI RÀO "MỤC HIỆN ⇔ TRANG MỞ ĐƯỢC" (bước K-c sổ đại lý đợt 1).
// Neo: Hiến chương K4 (docs/ARCHITECTURE.md — một bản đồ quyền; mọi route hỏi `can()`) và web/CLAUDE.md ("ẩn/hiện hỏi CÙNG bảng với máy chủ; máy chủ luôn kiểm
// lại"). Bảng mục: src/shared/muc-giao-dien.ts (TRANG + các nơi đặt) và src/shared/trang-chu-o.ts (O_TRANG_CHU).
//
// CHẶN (trên ĐỦ 1024 tập quyền = mọi tập con của PERMISSION_CODES; mỗi tập một tài khoản thật trong CSDL thử, gọi route THẬT qua khung thử
// tests/audit/harness.mjs — router, cổng, `can()`, CSDL dựng từ migrations/):
//   (1) mục điều hướng HIỆN cho một tài khoản mà ĐƯỜNG GỌI CHÍNH của trang bị máy chủ TỪ CHỐI với chính tài khoản đó (bấm vào là gặp trang lỗi) ⇒ ĐỎ;
//   (2) mục ẨN mà máy chủ CHO PHÉP, khi tập đó chưa ghi ĐÚNG ở DUOC_MA_AN kèm lý do (chờ chủ quyết; dòng thừa / hẹp / rộng hơn thực tế cũng ĐỎ);
//   (3) trang chưa khai đường gọi chính (`goi`) mà không có trong MIEN kèm lý do ⇒ ĐỎ "chưa khai"; mã trạng thái lạ (khác 2xx/401/403) ⇒ ĐỎ;
//   (4) khung tạm (bản nhớ khung, ADR-0035) vẽ mục mà khung thật của cùng tài khoản không vẽ ⇒ ĐỎ;
//   (5) logo (về "/", trang chuyển tiếp theo `homeRedirect`) đưa tài khoản tới trang đầu bị từ chối ⇒ ĐỎ (trừ CHO_CHU_TRANG_DAU);
//   (6) web/shell.ts, web/account.ts viết tay `href: "<chuỗi>"` ngoài danh sách LIEN_KET_VIET_TAY (lối vào phải khai ở bảng mục để vào bài này) ⇒ ĐỎ.
// Mục / trang MỚI khai ở bảng tự vào bài (bài lặp THANH_BEN, THANH_TAB, THANH_TREN, TRANG_TOI, O_TRANG_CHU và mọi khoá TRANG).
//
// QUY ƯỚC "bị từ chối": 401 / 403. 404 chỉ khi đường gọi đó dùng 404 làm câu từ chối (khai ở TU_CHOI_BANG_404 — hôm nay rỗng). 2xx = mở được. Mã khác (400, 5xx,
// 404 không khai) = ĐỎ "mã lạ": đường gọi chính khai sai (vd thiếu tham số bắt buộc) — sửa `goi`, không nới bài.
//
// KHUNG THỬ: CSDL thử BỎ trigger `lc1b_stf_permission_driver_partner_alone` (DRIVER_PARTNER phải đứng một mình — ADR-0048) để gieo được 511 tập hôm nay CSDL
// không cho tạo: bài phủ RỘNG hơn thực tế, không nới luật của Nền tảng (trigger vẫn trong migration, chỉ vắng trong CSDL thử của bài này). Tài khoản mang đúng
// tập quyền được kiểm bằng /api/auth/me trước.
//
// GIỚI HẠN (dựa vào kỷ luật / bài khác): chỉ lối vào ĐIỀU HƯỚNG (thanh bên, thanh tab, thanh trên, trang Tôi, ô Trang chủ — ô lưới điện thoại và lối tắt máy tính
// là tập con của nhóm ô máy tính `nhomMayTinh` mà bài dùng). KHÔNG phủ: nút ghi trong trang (Lưu, Xác nhận…); trạng thái dữ liệu (chỉ phủ quyền); liên kết
// trong nội dung trang (khối "Cần xem lại" của Trang chủ — src/shared/dashboard-review.ts, dải chào web/trang-chu-may-tinh.ts, `data-back`); huy hiệu số; chặn
// phía trình duyệt của từng trang (vd web/tai-xe.ts tự chuyển người không phải "chỉ tài xế" về "/"); khung mất mạng (bốn tab cơ bản khi không biết vai — không
// có mạng thì không trang nào tải được). Đường gọi chính là MỘT lời gọi đọc đại diện cho trang; trang cần thêm lời gọi khác thì bài không thấy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { PERMISSION_CODES, can, canAccessOrders, hasPermission, seesAllOrders, type PermissionHolder } from "./shared/permissions.ts";
import { chiTaiXe, homeRedirect } from "./shared/start-page.ts";
import {
  KHOA_TRANG,
  THANH_BEN,
  THANH_TAB,
  THANH_TREN,
  TRANG,
  TRANG_TOI,
  coKhungNho,
  sangTai,
  thanhBen,
  thanhTab,
  thanhTren,
  trangToi,
  type KhoaTrang,
  type NguoiXem,
  type TrangDich,
} from "./shared/muc-giao-dien.ts";
import { O_TOI, O_TRANG_CHU, nhomMayTinh } from "./shared/trang-chu-o.ts";

const BAT_DAU = Date.now();
const SO_TAP = 1 << PERMISSION_CODES.length;
const TAP = Array.from({ length: SO_TAP }, (_, m) => m);
const nguoi = (m: number): PermissionHolder => ({ id: idCua(m), permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) });
function idCua(m: number): string {
  return `00000000-0000-4000-8000-${String(m).padStart(12, "0")}`;
}
const ten = (m: number): string => `tập ${m} [${nguoi(m).permissions.join(", ") || "không quyền"}]`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Các nơi đặt lối vào: dòng khai + mục THẬT SỰ hiện (đọc từ chính hàm mà web/shell.ts, web/account.ts, web/home.ts vẽ).

type TenNoi = "thanh-ben" | "thanh-tab" | "thanh-tren" | "trang-toi" | "trang-chu";
const NOI: Record<TenNoi, { dong: readonly { trang: KhoaTrang; nhan: string }[]; hien: (s: PermissionHolder) => KhoaTrang[] }> = {
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
    hien: (s) => nhomMayTinh(s).flatMap((g) => g.o.map((o) => (o.khoa === O_TOI.khoa ? "toi" : O_TRANG_CHU.find((d) => d.khoa === o.khoa)!.trang))),
  },
};

/** Trang chưa có đường gọi chính (`goi: null`) — mỗi dòng một lý do. Hôm nay rỗng: mọi trang có lối vào đều khai được một lời gọi đọc. */
const MIEN: Partial<Record<KhoaTrang, string>> = {};

/** Đường gọi chính dùng 404 làm câu từ chối (như đơn không tồn tại). Hôm nay rỗng: các lời gọi chính là danh sách / cấu hình, từ chối bằng 403. */
const TU_CHOI_BANG_404: ReadonlySet<string> = new Set<string>();

/**
 * "ĐƯỢC MÀ ẨN": máy chủ cho gọi đường chính nhưng mục không hiện. Đề bài K-c: KHÔNG đổi (không tự hiện thêm, không nới máy chủ) — ghi ĐÚNG tập ở đây kèm lý do,
 * trình chủ quyết. Bài đòi hợp các dòng của một (nơi, trang) BẰNG ĐÚNG tập thật; mỗi dòng phải góp ít nhất một tập.
 */
interface DuocMaAn {
  readonly noi: readonly TenNoi[];
  readonly trang: KhoaTrang;
  readonly khi: (s: PermissionHolder) => boolean;
  readonly lyDo: string;
}
const coDriver = (s: PermissionHolder): boolean => hasPermission(s, "DRIVER");
const DUOC_MA_AN: readonly DuocMaAn[] = [
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
    noi: ["thanh-ben", "trang-toi", "trang-chu"],
    trang: "diaDiem",
    khi: (s) => !can(s, "admin.manage"),
    lyDo:
      "GET /api/locations mở cho MỌI tài khoản đăng nhập (form đơn, form chuyến cần danh sách địa điểm) nên rộng hơn trang Địa điểm (trang quản lý danh mục — " +
      "sửa cần admin.manage). Chờ chủ: giữ, hay tách lời gọi riêng cho trang quản lý.",
  },
  {
    noi: ["thanh-ben", "thanh-tab"],
    trang: "trangTaiXe",
    khi: (s) => s.permissions.length > 0 && !hasPermission(s, "PARTNER") && !chiTaiXe(s),
    lyDo:
      "GET /api/parties/documents/mine (giấy tờ của tôi) phục vụ trang Tôi của MỌI nhân viên nội bộ (ADR-0040 D2) nên rộng hơn trang đầu tài xế /tai-xe — trang " +
      "đó chỉ cho tài khoản 'chỉ tài xế' (ADR-0040 D3), web/tai-xe.ts tự chuyển người khác về '/'. Chờ chủ (giữ là hợp lý).",
  },
  {
    noi: ["thanh-ben", "thanh-tab", "trang-toi", "trang-chu"],
    trang: "cuoc",
    khi: (s) => can(s, "trip.view") && !coDriver(s),
    lyDo:
      "GET /api/van-chuyen/cuoc-cua-toi cho cả văn phòng (ô trip.view mọi chuyến) nhưng 'Cuốc của tôi' chỉ có nghĩa với tài xế công ty (Q5, coCuocCuaToi). " +
      "Chờ chủ (giữ là hợp lý).",
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
];

/** Logo / "/" đưa tới trang đầu bị từ chối — tập được miễn, kèm lý do (chờ chủ). */
const CHO_CHU_TRANG_DAU: ReadonlyMap<number, string> = new Map([
  [0, "Tài khoản không còn quyền nào: homeRedirect giữ ở Trang chủ, GET /api/orders/dashboard 403 (trang báo lỗi). Chờ chủ: trang riêng cho tài khoản rỗng quyền hay giữ."],
]);

/**
 * `href` viết tay còn lại ở web/shell.ts, web/account.ts (ngoài bảng mục) — đếm ĐÚNG số lần; thêm một liên kết viết tay ⇒ ĐỎ (khai nó ở bảng mục).
 * `href: back` (đọc `data-back` của trang) không phải chuỗi — giới hạn ghi ở đầu tệp.
 */
const LIEN_KET_VIET_TAY: readonly { tep: string; href: string; lan: number; lyDo: string }[] = [
  { tep: "web/shell.ts", href: "/", lan: 2, lyDo: "logo ở đầu thanh bên và thanh trên — về trang đầu; bài (5) kiểm trang đầu của mọi tập" },
  { tep: "web/shell.ts", href: "/account", lan: 1, lyDo: "dải 'Đang ở chế độ bảo trì' — trang Tôi, ai cũng mở được (TRANG.toi; bài kiểm dưới)" },
  { tep: "web/shell.ts", href: "", lan: 1, lyDo: "mục cha 'Vận chuyển' — vẽ thành <div>, không phải liên kết" },
];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Dựng CSDL thử, 1024 tài khoản, gọi MỖI đường gọi chính (khử trùng) bằng MỖI tài khoản.

const w = world();
const TRIGGER_BO = "lc1b_stf_permission_driver_partner_alone";
const coTrigger = w.sqlite.prepare("SELECT 1 AS co FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(TRIGGER_BO);
w.sqlite.exec(`DROP TRIGGER IF EXISTS ${TRIGGER_BO}`);
for (const m of TAP) seedStaff(w.sqlite, { id: idCua(m), phone: `09${String(m).padStart(8, "0")}`, name: `Tập ${m}`, perms: nguoi(m).permissions });
const COOKIE: string[] = [];
for (const m of TAP) COOKIE.push(`td_session=${await w.token(idCua(m))}`);

const GOI = [...new Set(KHOA_TRANG.map((k) => (TRANG[k] as TrangDich).goi).filter((g): g is NonNullable<typeof g> => typeof g === "string"))];
/** Mã trạng thái theo (đường gọi, tập). */
const MA = new Map<string, number[]>();
const QUYEN_THAT: string[][] = [];
for (const g of GOI) {
  const duong = g.slice("GET ".length);
  const ds: number[] = [];
  for (const m of TAP) {
    const r = await w.call("GET", duong, { headers: { cookie: COOKIE[m]! } });
    ds.push(r.status);
    if (g === "GET /api/auth/me") QUYEN_THAT[m] = [...((r.json as { staff?: { permissions?: string[] } } | null)?.staff?.permissions ?? [])].sort();
  }
  MA.set(g, ds);
}
const GIO_GOI = Date.now() - BAT_DAU;
/** Mục hiện theo (nơi, tập) — tính một lần. */
const HIEN = Object.fromEntries(Object.entries(NOI).map(([noi, { hien }]) => [noi, TAP.map((m) => new Set(hien(nguoi(m))))])) as Record<TenNoi, Set<KhoaTrang>[]>;

const laDuoc = (g: string, ma: number): boolean | null =>
  ma >= 200 && ma < 300 ? true : ma === 401 || ma === 403 || (ma === 404 && TU_CHOI_BANG_404.has(g)) ? false : null;
/** Trang `k` mở được với tập `m`: đường gọi chính không bị từ chối. Trang chưa khai đường gọi: null (bài (3) đỏ riêng). */
function moDuoc(k: KhoaTrang, m: number): boolean | null {
  const g = (TRANG[k] as TrangDich).goi;
  return typeof g === "string" ? laDuoc(g, MA.get(g)![m]!) : null;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

test(`khung thử: bỏ đúng trigger ${TRIGGER_BO}, ${SO_TAP} tài khoản mang ĐÚNG tập quyền của mình (gọi ${GOI.length} đường × ${SO_TAP} tập: ${GIO_GOI} ms)`, () => {
  assert.ok(coTrigger, `không thấy trigger ${TRIGGER_BO} trong CSDL thử — đổi tên? sửa bài cho đúng (đừng bỏ trigger khác)`);
  const lech = TAP.filter((m) => JSON.stringify(QUYEN_THAT[m]) !== JSON.stringify([...nguoi(m).permissions].sort()));
  assert.deepEqual(lech.slice(0, 5).map(ten), [], "tài khoản thử không mang đúng tập quyền (đọc lại qua /api/auth/me)");
  assert.ok(GOI.includes("GET /api/auth/me"), "bài cần /api/auth/me trong tập đường gọi để kiểm tài khoản thử");
});

test("(3) mọi trang có đường gọi chính dạng `GET /api/…` — hoặc nằm ở MIEN kèm lý do; MIEN không thừa", () => {
  const chuaKhai = KHOA_TRANG.filter((k) => (TRANG[k] as TrangDich).goi == null && !MIEN[k]);
  assert.deepEqual(chuaKhai, [], "trang chưa khai đường gọi chính (`goi` ở TRANG, src/shared/muc-giao-dien.ts) — khai một lời gọi ĐỌC mà trang cần; không khai được thì thêm vào MIEN kèm lý do");
  const sai = KHOA_TRANG.filter((k) => {
    const g = (TRANG[k] as TrangDich).goi;
    return typeof g === "string" && !/^GET \/api\/[^\s]+$/.test(g);
  });
  assert.deepEqual(sai, [], "đường gọi chính phải là `GET /api/…` (lời gọi đọc)");
  const thua = Object.keys(MIEN).filter((k) => (TRANG[k as KhoaTrang] as TrangDich | undefined)?.goi != null);
  assert.deepEqual(thua, [], "MIEN thừa: trang đã có đường gọi chính");
});

test("(3) mã trạng thái của mọi đường gọi chính chỉ là 2xx / 401 / 403 (404 khi có khai) — mã lạ là đường gọi khai sai", () => {
  const la: string[] = [];
  for (const [g, ds] of MA) {
    const dem = new Map<number, number>();
    for (const ma of ds) if (laDuoc(g, ma) === null) dem.set(ma, (dem.get(ma) ?? 0) + 1);
    for (const [ma, n] of dem) la.push(`${g} → ${ma} (${n} tập)`);
  }
  assert.deepEqual(la, []);
});

test("bài không rỗng: có đường gọi vừa được vừa bị từ chối; mỗi nơi có mục hiện và mục ẩn", () => {
  assert.ok([...MA.values()].some((ds) => ds.some((x) => x === 200) && ds.some((x) => x === 403)));
  for (const noi of Object.keys(NOI) as TenNoi[]) {
    const dem = TAP.map((m) => HIEN[noi][m]!.size);
    assert.ok(Math.max(...dem) > Math.min(...dem), `${noi}: số mục không đổi theo quyền — bài đọc sai nơi?`);
  }
});

for (const [noi, { dong }] of Object.entries(NOI) as [TenNoi, (typeof NOI)[TenNoi]][]) {
  test(`(1) ${noi}: mục HIỆN ⇒ đường gọi chính của trang KHÔNG bị máy chủ từ chối (${SO_TAP} tập)`, () => {
    const loi: string[] = [];
    for (const m of TAP) for (const k of HIEN[noi][m]!) if (moDuoc(k, m) === false) loi.push(`${dong.find((d) => d.trang === k)?.nhan ?? k} (${k}) — ${ten(m)}`);
    assert.deepEqual(loi.slice(0, 10), [], `${noi}: ${loi.length} lần mục hiện mà máy chủ từ chối — ẩn mục (siết điều kiện ở bảng mục), KHÔNG nới máy chủ`);
  });

  test(`(2) ${noi}: mục ẨN mà máy chủ CHO PHÉP ⇔ đúng tập ghi ở DUOC_MA_AN (chờ chủ)`, () => {
    const loi: string[] = [];
    for (const { trang: k, nhan } of dong) {
      const dongAn = DUOC_MA_AN.filter((d) => d.trang === k && d.noi.includes(noi));
      const that = TAP.filter((m) => moDuoc(k, m) === true && !HIEN[noi][m]!.has(k));
      const ghi = TAP.filter((m) => dongAn.some((d) => d.khi(nguoi(m))));
      const thieu = that.filter((m) => !ghi.includes(m));
      const thua = ghi.filter((m) => !that.includes(m));
      if (thieu.length) loi.push(`"${nhan}" (${k}): được mà ẩn CHƯA GHI ở ${thieu.length} tập, vd ${ten(thieu[0]!)} — ghi vào DUOC_MA_AN kèm lý do (không tự hiện thêm)`);
      if (thua.length) loi.push(`"${nhan}" (${k}): DUOC_MA_AN ghi ${thua.length} tập không thật sự "được mà ẩn", vd ${ten(thua[0]!)} — thu hẹp dòng`);
      for (const d of dongAn) if (!that.some((m) => d.khi(nguoi(m)))) loi.push(`"${nhan}" (${k}): dòng DUOC_MA_AN thừa (không góp tập nào): ${d.lyDo.slice(0, 80)}…`);
    }
    assert.deepEqual(loi, []);
  });
}

test("DUOC_MA_AN chỉ trỏ tới (nơi, trang) có dòng đặt thật", () => {
  const thua = DUOC_MA_AN.flatMap((d) => d.noi.filter((noi) => !NOI[noi].dong.some((x) => x.trang === d.trang)).map((noi) => `${noi}/${d.trang}`));
  assert.deepEqual(thua, []);
});

test(`(4) khung tạm (bản nhớ khung ADR-0035) chỉ vẽ mục mà khung thật của cùng tài khoản cũng vẽ (${SO_TAP} tập)`, () => {
  const loi: string[] = [];
  const cap: [string, (n: NguoiXem) => string[]][] = [
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

test(`(5) logo / "/" đưa mỗi tài khoản tới trang đầu (homeRedirect) MỞ ĐƯỢC (${SO_TAP} tập; trừ CHO_CHU_TRANG_DAU)`, () => {
  const loi: string[] = [];
  for (const m of TAP) {
    const dich = homeRedirect(nguoi(m)) ?? "/";
    const k = KHOA_TRANG.find((x) => sangTai(x, dich));
    if (!k) loi.push(`trang đầu ${dich} không có trong TRANG — ${ten(m)}`);
    else if (moDuoc(k, m) !== true && !CHO_CHU_TRANG_DAU.has(m)) loi.push(`trang đầu ${dich} bị từ chối — ${ten(m)}`);
  }
  for (const m of CHO_CHU_TRANG_DAU.keys()) {
    const k = KHOA_TRANG.find((x) => sangTai(x, homeRedirect(nguoi(m)) ?? "/"));
    if (k && moDuoc(k, m) === true) loi.push(`CHO_CHU_TRANG_DAU thừa: ${ten(m)} nay mở được trang đầu`);
  }
  assert.deepEqual(loi.slice(0, 10), []);
});

test("(6) web/shell.ts, web/account.ts không viết tay liên kết ngoài bảng mục (trừ LIEN_KET_VIET_TAY); trang Tôi ai cũng mở được", () => {
  const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const dem = new Map<string, number>();
  for (const tep of ["web/shell.ts", "web/account.ts"]) {
    const src = boChuThich(readFileSync(new URL(`../${tep}`, import.meta.url), "utf8"));
    for (const x of src.matchAll(/\bhref\s*:\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g)) dem.set(`${tep}|${x[2]}`, (dem.get(`${tep}|${x[2]}`) ?? 0) + 1);
  }
  const mongDoi = new Map(LIEN_KET_VIET_TAY.map((l) => [`${l.tep}|${l.href}`, l.lan]));
  assert.deepEqual(Object.fromEntries([...dem].sort()), Object.fromEntries([...mongDoi].sort()), "liên kết viết tay mới ⇒ khai trang ở bảng mục (src/shared/muc-giao-dien.ts) thay vì viết `href` trong tệp vẽ");
  assert.ok(TAP.every((m) => moDuoc("toi", m) === true), "trang Tôi phải mở được với mọi tập (dải bảo trì, mục 'Của tôi', tab 'Tôi')");
});
