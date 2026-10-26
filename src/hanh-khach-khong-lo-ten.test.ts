// HÀNG RÀO TOÀN TUYẾN — họ tên, năm sinh hành khách KHÔNG lọt ra ngoài (ADR-0047 A2: "nhật ký, Bảng tin, thông báo chỉ ghi SỐ LƯỢNG, không tên, không năm
// sinh" — siết Hiến chương 5.12). Kế hoạch Task A14, khuôn src/giay-to-khong-lo-so.test.ts.
//   (1) ĐỦ TUYẾN (siết): tập route thật của orders có "/passengers" hoặc "/legs" trong đường dẫn (lấy từ MÃ THẬT bằng esbuild) phải BẰNG tập khoá của TUYEN.
//       Thêm route chặng/hành khách mới mà quên ca ở đây → đỏ.
//   (2) NHẬT KÝ: sau mọi thao tác (lập nháp có khách, sửa nháp, xác nhận, thêm/sửa/huỷ khách, thêm/sửa/đóng chặng có nơi chữ chứa SĐT, PUT /trip cũ),
//       `audit_log` (mọi cột, đã bỏ mã UUID) không chứa tên đánh dấu, năm sinh đánh dấu, dãy số đánh dấu nguyên vẹn.
//   (3) THÂN TRẢ VỀ của các màn KHÁC (danh sách đơn, chi tiết đơn, Trang chủ, hàng chờ HDV, "việc của tôi", Nhật ký Toàn quyền) không chứa tên đánh dấu.
//   (4) BẢNG TIN: sự kiện 5 khoá đã có bài riêng (src/shared/bang-tin.test.ts); ở đây khoá thêm: mọi lời gọi `baoThayDoi(` của route chặng/hành khách chỉ
//       truyền `{ orderId: id, thayDoi: "…" }`.
//   (5) Chống bài rỗng: GET /passengers CÓ tên; có nhật ký order_passenger_changed / order_leg_* để quét.
// Chạy CẢ ứng dụng trên SQLite thật. Tên là tên GIẢ có đánh dấu, năm sinh hiếm, SĐT giả.
//   (6) ADR-0049 (NỚI nghĩa hàng rào — ĐÃ DUYỆT 2026-09-30 (lần 17), đề xuất luật mục 3a): DTO tài xế GET /api/van-chuyen/cuoc-cua-toi/:id có `hoTen`, `namSinh` chỉ khi
//       `trongNgayChay`; ngoài khoảng đó khoá vắng mặt (bài src/modules/van-chuyen/tai-xe-dto.test.ts). DTO văn phòng GET /api/van-chuyen/chuyen/:id có
//       `hoTen`, `namSinh`, không `lienHe`; GET /lich không tên. Mọi lệnh ghi của van-chuyen có ca ở khối van-chuyen: nhật ký và cột chữ `vc_*` sạch.
// Bài thứ hai — KHỐI VAN-CHUYỂN (ADR-0049 Task A18, TC-39, TC-50): mô tả ở đầu khối, cuối tệp.
// Bài thứ ba — QUÉT MÃ đối "kèm tên" ở mọi nơi gọi `chiTietChuyen` / `cuocChiTiet` (kiểm độc lập K2a V2): cuối tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as esbuild from "esbuild";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import type { AppModule } from "./shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { ACC, ADM, DRIVER, DRIVER2, NGAY, NGAY_SAU, batDongHo, chuyenSan, denGio, don, setup, thanhTaiXe, tienDo, uuid, xe } from "../tests/audit/dieu-phoi-khung.mjs";

async function routesOf(entry: string, exportName: string): Promise<string[]> {
  const built = await esbuild.build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  return mod[exportName]!.routes.map((r) => `${r.method} ${r.path}`);
}
const TUYEN_THAT = (await routesOf("./modules/orders/index.ts", "ordersModule")).filter((k) => /\/passengers|\/legs/.test(k.split(" ")[1]!)).sort();

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const TEN = ["Khách Dò Tìm Một", "Khách Dò Tìm Hai", "Khách Dò Tìm Ba", "Khách Dò Tìm Một Sửa"];
const NAM = ["1911", "1922", "1933"];
const SDT = "0905123456";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
/** Ngày + giờ VN cách bây giờ `phut` phút (ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc 360 phút). */
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * 60_000).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
};
const D = inDays(3);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

test("họ tên, năm sinh hành khách chỉ rời máy chủ ở GET/POST /passengers: đủ tuyến, nhật ký sạch, màn khác sạch, Bảng tin chỉ id + loại", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  const svc = (extra: Record<string, unknown> = {}) => ({ kind: "catalog", pickupChoice: Array.isArray(extra.legs) && extra.legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, ...extra });
  const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: `Nhà riêng gọi ${SDT}`, dropoffLocationId: LOC, dropoffPlace: "" };
  const passengers = [{ fullName: TEN[0], birthYear: 1911, paxCode: "adult" }, { fullName: TEN[1], birthYear: 1922, paxCode: null }];

  const than: { khoa: string; text: string }[] = [];
  const goi = async (khoa: string, method: string, path: string, as: string, body?: unknown, mongDoi?: number) => {
    const r = await w.call(method, path, { as, body });
    if (mongDoi !== undefined) assert.equal(r.status, mongDoi, `${khoa}: ${r.text}`);
    return r;
  };
  const khac = async (khoa: string, path: string, as: string) => than.push({ khoa, text: (await goi(khoa, "GET", path, as, undefined, 200)).text });

  // Lập nháp có khách + chặng (nơi chữ chứa SĐT) → sửa nháp gửi lại → xác nhận.
  const lap = await goi("lập nháp", "POST", "/api/orders", SALES, { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ legs: [OUT] })], passengers, handlerStaffId: FIELD }, 201);
  const id = lap.json.order.id as string;
  const sid = lap.json.order.services[0].id as string;
  const sua = await goi("sửa nháp", "PUT", `/api/orders/${id}`, SALES, {
    customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: lap.json.order.updatedAt, services: [svc({ id: sid, legs: [OUT] })], passengers: [...passengers, { fullName: TEN[2], birthYear: 1933, paxCode: null }],
  }, 200);
  await goi("xác nhận", "POST", `/api/orders/${id}/status`, SALES, { status: "confirmed" }, 200);
  void sua;
  const doc = async () => (await goi("đọc đơn", "GET", `/api/orders/${id}`, SALES, undefined, 200)).json.order;
  const dsKhach = async () => (await goi("đọc khách", "GET", `/api/orders/${id}/passengers`, SALES, undefined, 200)).json;

  const TUYEN: Record<string, () => Promise<void>> = {
    "GET /api/orders/:id/passengers": async () => {
      const r = await dsKhach();
      assert.ok(JSON.stringify(r).includes(TEN[0]!), "chống bài rỗng: GET /passengers CÓ tên");
    },
    "POST /api/orders/:id/passengers": async () => {
      let ds = await dsKhach();
      ds = (await goi("thêm khách", "POST", `/api/orders/${id}/passengers`, SALES, { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Dò Tìm Bốn", birthYear: 1911, paxCode: null }], sua: [], huy: [] }, 200)).json;
      const a = ds.passengers.find((p: any) => p.fullName === TEN[0]);
      ds = (await goi("sửa khách", "POST", `/api/orders/${id}/passengers`, SALES, { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [{ personKey: a.personKey, fullName: TEN[3], birthYear: 1922, paxCode: "adult" }], huy: [] }, 200)).json;
      const b = ds.passengers.find((p: any) => p.fullName === TEN[1]);
      await goi("huỷ khách", "POST", `/api/orders/${id}/passengers`, SALES, { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [b.personKey] }, 200);
    },
    "POST /api/orders/:id/legs": async () => {
      const o = await doc();
      await goi("thêm chặng", "POST", `/api/orders/${id}/legs`, SALES, {
        expectedUpdatedAt: o.updatedAt, serviceId: sid,
        leg: { direction: "RETURN", pickupDate: inDays(4), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: `Nhà ${SDT}` },
      }, 201);
    },
    "PUT /api/orders/:id/legs/:legId": async () => {
      const l = (await doc()).services[0].legs.find((x: any) => x.direction === "OUT");
      await goi("sửa chặng", "PUT", `/api/orders/${id}/legs/${l.id}`, SALES, {
        expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: "07:00", pickupLocationId: null, pickupPlace: `Cổng sau, gọi ${SDT}`, dropoffLocationId: LOC, dropoffPlace: "" },
      }, 200);
    },
    "POST /api/orders/:id/legs/:legId/short-notice": async () => {
      // ADR-0049 D3 (ô order.leg.short_notice; ADR-0135: nháp chỉ NGƯỜI LẬP ghi được nên người đặt gấp là Bán hàng đã lập đơn — cũng giữ ô này, ADR-0107): ghi chú đặt gấp chứa tên + SĐT — nhật ký chỉ mã đơn + chiều + NHÃN lý do (TC-28).
      // ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc — chặng của đơn chính đón sau 3 ngày, nên ca này đặt gấp trên một đơn nháp riêng đón sau 150 phút.
      const g = vnSau(150);
      const sat = (await goi("lập nháp sát giờ", "POST", "/api/orders", SALES, { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc({ departDate: g.ngay, legs: [{ ...OUT, pickupDate: g.ngay, pickupTime: g.gio }] })] }, 201)).json.order;
      await goi("đặt gấp", "POST", `/api/orders/${sat.id}/legs/${sat.services[0].legs[0].id}/short-notice`, SALES, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: `${TEN[0]} gọi ${SDT}` }, 200);
    },
    "POST /api/orders/:id/legs/:legId/close": async () => {
      const l = (await doc()).services[0].legs.find((x: any) => x.direction === "RETURN");
      await goi("đóng chặng", "POST", `/api/orders/${id}/legs/${l.id}/close`, SALES, { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" }, 200);
    },
    "POST /api/orders/:id/legs/:legId/replace": async () => {
      // C14: thay chặng (đóng + thêm một lô) — nơi chữ của chặng MỚI chứa SĐT; hai dòng nhật ký (bỏ + thêm) phải che dãy số như route thêm / bỏ.
      const o = await doc();
      const l = o.services[0].legs.find((x: any) => x.direction === "OUT");
      await goi("thay chặng", "POST", `/api/orders/${id}/legs/${l.id}/replace`, SALES, {
        expectedUpdatedAt: o.updatedAt, leg: { direction: "OUT", pickupDate: D, pickupTime: "07:15", pickupLocationId: null, pickupPlace: `Sảnh khách sạn gọi ${SDT}`, dropoffLocationId: LOC, dropoffPlace: "" },
      }, 200);
    },
  };

  // (1) ĐỦ TUYẾN
  assert.deepEqual(Object.keys(TUYEN).sort(), TUYEN_THAT, "mỗi route chặng/hành khách thật phải có ca ở TUYEN (và ngược lại)");
  for (const k of Object.keys(TUYEN)) await TUYEN[k]!();
  const o = await doc();
  await goi("PUT /trip cũ", "PUT", `/api/orders/${id}/trip`, SALES, {
    expectedUpdatedAt: o.updatedAt,
    services: [{ id: sid, departDate: D, departTime: "", pickupTime: "07:30", pickupPlace: `Đổi nơi ${SDT}`, checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  }, 200);

  // (3) màn KHÁC
  await khac("danh sách đơn", "/api/orders?limit=100", SALES);
  await khac("chi tiết đơn", `/api/orders/${id}`, SALES);
  await khac("Trang chủ", "/api/orders/dashboard", SALES);
  await khac("hàng chờ HDV", "/api/orders/pool", FIELD);
  await khac("việc của tôi", "/api/dispatch/mine", FIELD);
  await khac("Nhật ký (Toàn quyền)", "/api/audit?limit=100", SUP);

  // (2) NHẬT KÝ — mọi cột, bỏ mã UUID (chữ hex ngẫu nhiên có thể chứa "1911" tình cờ).
  const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log")).replace(UUID, "");
  for (const t of TEN) assert.ok(!nhatKy.includes(t) && !nhatKy.includes("Dò Tìm"), `nhật ký lộ tên "${t}"`);
  for (const y of NAM) assert.ok(!nhatKy.includes(y), `nhật ký lộ năm sinh "${y}"`);
  assert.ok(!nhatKy.includes(SDT) && !nhatKy.replace(/[\s.\-]/g, "").includes(SDT), "nhật ký lộ dãy số nguyên vẹn");
  const dem = w.q("SELECT action, count(*) n FROM audit_log WHERE action IN ('order_passenger_changed', 'order_leg_added', 'order_leg_updated', 'order_leg_closed') GROUP BY action");
  assert.equal(dem.length, 4, `chống bài rỗng: đủ bốn loại nhật ký mới — ${JSON.stringify(dem)}`);
  for (const r of w.q("SELECT detail FROM audit_log WHERE action = 'order_passenger_changed'")) assert.match(r.detail, /^thêm \d+, sửa \d+, huỷ \d+ khách$/);

  // (3) thân các màn khác
  for (const t of than) for (const ten of TEN) assert.ok(!t.text.includes(ten), `thân "${t.khoa}" lộ tên "${ten}"`);
  assert.ok(than.find((t) => t.khoa === "Nhật ký (Toàn quyền)")!.text.includes("khách"), "chống bài rỗng: trang Nhật ký có dòng hành khách");

  // (4) BẢNG TIN — route chặng/hành khách chỉ truyền { orderId: id, thayDoi: "…" }
  const code = maskSource(readFileSync(new URL("./modules/orders/index.ts", import.meta.url), "utf8"), { strings: false, comments: true });
  for (const k of TUYEN_THAT.filter((x) => !x.startsWith("GET "))) {
    const [m, p] = k.split(" ");
    const start = code.indexOf(`route("${m}", "${p}", `);
    const next = code.indexOf("route(", start + 10);
    const calls = [...code.slice(start, next === -1 ? code.length : next).matchAll(/baoThayDoi\(([^)]*)\)/g)].map((x) => x[1]!.trim());
    assert.equal(calls.length, 1, `${k}: đúng một lời gọi baoThayDoi`);
    assert.match(calls[0]!, /^\{ orderId: id, thayDoi: "(chuyen|sua)" \}$/, `${k}: Bảng tin chỉ mang id đơn + loại thay đổi`);
  }
});

// ==== KHỐI VAN-CHUYỂN (ADR-0049 Task A18 bước 2 + 2b — kế hoạch mục 1.6–1.8, TC-39, TC-50) =================================================================
//   (1) ĐỦ TUYẾN (siết): tập route thật của van-chuyen thuộc điều phối (lịch, chuyến, cuốc của tôi, chặng, nhắc gọi khách, chính sách điều phối, xe của đơn — ADR-0059) — lấy từ MÃ
//       THẬT — phải BẰNG tập khoá của TUYEN_VC. Thêm route điều phối mới mà quên ca ở đây → đỏ (kể cả route 40 `cap-nhat-diem`, ba route gọi báo).
//   (2) TÊN CHỈ Ở HAI ROUTE: họ tên / năm sinh (chuỗi tên, số năm sinh đứng riêng, khoá `hoTen`, `namSinh`) chỉ có trong thân GET /api/van-chuyen/chuyen/:id và GET /api/van-chuyen/cuoc-cua-toi/:id;
//       mọi route khác (kể cả phản hồi lệnh ghi, lệnh tiến độ) KHÔNG. GET /cuoc-cua-toi/:id của chuyến NGOÀI ngày chạy không tên, không liên hệ.
//   (3) NHẬT KÝ + mọi cột chữ của bảng `vc_*` không có tên / năm sinh đánh dấu.
//   (4) [0050] TC-50: không DTO nào có khoá so sánh nơi (liệt kê khoá đệ quy); thân trả về + `audit_log` không có chuỗi `L:<id>` / `T:<hex>`; bản chụp, bản
//       chốt không có cột khoá nơi. DTO tài xế không có khoá gọi báo (`gioHenDoi`, `daGoiBao`, `phienBan`).
// SALES, SUP ở trên trùng giá trị với khung thử điều phối (tests/audit/dieu-phoi-khung.mjs).
const TUYEN_VC_THAT = (await routesOf("./modules/van-chuyen/index.ts", "vanChuyenModule"))
  .filter((k) => /^\/api\/van-chuyen\/(lich|chuyen|cuoc-cua-toi|chang|nhac-goi-khach|chinh-sach-dieu-phoi|xe-cua-don|mau-chang|ban|ban-tai-xe|de-nghi|de-nghi-cua-toi)(\/|$)/.test(k.split(" ")[1]!))
  .sort();
const TRA_TEN = ["GET /api/van-chuyen/chuyen/:id", "GET /api/van-chuyen/cuoc-cua-toi/:id"];
const TEN_VC = ["Khách Dò Tìm 1", "Khách Dò Tìm 2", "Khách Dò Tìm 3"];
const NAM_VC = /(^|[^0-9])(1911|1912|1913)([^0-9]|$)/;
const KHOA_NOI_RE = /\b[LT]:[0-9a-f-]{8,}/;
const KHOA_NOI_KEY = /^(khoaNoi\w*|placeKey|place_key)$/;
const KHOA_GOI_BAO_KEY = /^(gioHenDoi|daGoiBao|phienBan)$/;
const DRIVER3 = "66666666-6666-4666-8666-666666666669";
const DRIVER4 = "66666666-6666-4666-8666-66666666666a";
/** Mọi khoá (đệ quy) của một giá trị JSON. */
function moiKhoa(x: unknown, ra = new Set<string>()): Set<string> {
  if (Array.isArray(x)) for (const v of x) moiKhoa(v, ra);
  else if (x !== null && typeof x === "object") for (const [k, v] of Object.entries(x)) { ra.add(k); moiKhoa(v, ra); }
  return ra;
}

test("khối van-chuyen: đủ tuyến; tên hành khách chỉ ở GET /chuyen/:id + GET /cuoc-cua-toi/:id (trong ngày chạy); nhật ký + cột vc_* sạch; không khoá nơi (TC-39, TC-50)", async () => {
  const tat = batDongHo();
  try {
    // ADR-0104 Đ2 (kế hoạch N9 — đổi cách DỰNG, không nới luật): máy đồng bộ chuyến THẬT chạy cho mọi lệnh đơn; RIÊNG lúc dựng "khách đã đổi" cho nút tay ở
    // chuyến C, `giuChuyenC` giả một người khác vừa đổi chuyến C giữa lúc máy đọc và lúc ghi (khúc của máy thua cổng → chuyến giữ KHACH_DA_DOI như hôm nay).
    let giuChuyenC = false;
    const w = setup({
      chenGiuaDocVaGhi: async () => {
        if (giuChuyenC) w.sqlite.prepare("UPDATE vc_trip SET version = version + 1 WHERE id = ?").run(T.C.chuyen.id);
      },
    });
    seedStaff(w.sqlite, { id: DRIVER3, phone: "0900000036", name: "Tài Xế Ba", perms: ["DRIVER"] });
    seedStaff(w.sqlite, { id: DRIVER4, phone: "0900000046", name: "Tài Xế Bốn", perms: ["DRIVER"] });
    thanhTaiXe(w, `pty-${DRIVER3}`);
    thanhTaiXe(w, `pty-${DRIVER4}`);
    // ADR-0105 (phép 5): địa chỉ đánh dấu của nơi trả (LOC — mọi đơn của khối trả ở đây) chỉ được rời máy chủ ở GET /cuoc-cua-toi/:id trong ngày chạy.
    const DIA_CHI_VC = "Số 9 Đường Dò Chỉ Đường";
    w.sqlite.prepare("UPDATE loc_location SET address = ? WHERE id = ?").run(DIA_CHI_VC, LOC);
    const than: { route: string; khoa: string; text: string; json: unknown; coCaiDeLo: boolean }[] = [];
    /** Thân có mảng `suat` và ÍT NHẤT một suất trong đó đã gắn tên trong CSDL (lúc gọi) — nếu route lỡ kèm tên thì tên PHẢI hiện (kiểm độc lập K2a V2). */
    const coCaiDeLo = (j: any): boolean =>
      Array.isArray(j?.suat) && j.suat.some((x: any) => (w.q("SELECT passenger_key k FROM vc_trip_allocation WHERE id = ?", x.id)[0]?.k ?? null) !== null);
    const goi = async (route: string, khoa: string, method: string, path: string, as: string, body?: unknown, mongDoi = 200) => {
      const r = await w.call(method, path, { as, body });
      assert.equal(r.status, mongDoi, `${khoa}: ${r.text}`);
      than.push({ route, khoa, text: r.text, json: r.json, coCaiDeLo: coCaiDeLo(r.json) });
      return r.json;
    };
    const rid = () => uuid();
    const ct = (id: string) => goi("GET /api/van-chuyen/chuyen/:id", "chi tiết (đọc version)", "GET", `/api/van-chuyen/chuyen/${id}`, SALES);
    // Đơn (năm sinh đánh dấu 1911…): A, B chạy đủ tiến độ; C đổi giờ + nơi sau khi xếp; D, E kết thúc gián đoạn; F ngày mai.
    const dA = await don(w, { soNguoi: 3, gio: "13:00", namSinh: 1911 });
    const dB = await don(w, { soNguoi: 3, gio: "13:00", namSinh: 1911 });
    const dC = await don(w, { soNguoi: 3, gio: "19:00", namSinh: 1911 });
    const dD = await don(w, { soNguoi: 1, gio: "16:30", namSinh: 1911 });
    const dE = await don(w, { soNguoi: 1, gio: "16:30", namSinh: 1911 });
    const dF = await don(w, { soNguoi: 2, gio: "08:30", ngay: NGAY_SAU, namSinh: 1911 });
    // Đợt 5 (ADR-0052 D5.1, D5.2): đơn H thêm vào xe D ĐANG CHẠY (them-diem), rồi văn phòng báo huỷ một khách (bao-huy).
    const dH = await don(w, { soNguoi: 2, gio: "16:30", namSinh: 1911 });
    // Đợt 5 A-1b (ADR-0052 D5b — chủ duyệt 5/10): đơn J thiếu một tên — tài xế bổ sung tên trên chuyến J (tạo ở ca hanh-khach).
    const dJ = await don(w, { soNguoi: 2, ten: 1, gio: "21:10", namSinh: 1911 });
    // ADR-0111 (gói A5 lát 3): đơn K — khách có tên đi xe K rồi chuyển sang xe L (ca de-nghi/:rid/*). Xác nhận đơn lúc còn ngoài mốc.
    const dK = await don(w, { soNguoi: 2, gio: "16:40", namSinh: 1911 });
    const T: Record<string, any> = {};
    const S: Record<string, { don: string; tra: string; suat: string[] }> = {};
    const R = "POST /api/van-chuyen/cuoc-cua-toi/:id"; // tiền tố route tài xế
    const V = "POST /api/van-chuyen/chuyen/:id"; // tiền tố route văn phòng bấm thay

    const TUYEN_VC: Record<string, () => Promise<void>> = {
      // ADR-0054 "Hệ quả" (hàng rào): route mẫu đưa đón không mang tên khách, năm sinh, tiền (chỉ mã, chế độ, giờ gợi ý, nơi trả mặc định).
      "POST /api/van-chuyen/mau-chang/:code": async () => {
        await goi("POST /api/van-chuyen/mau-chang/:code", "ghi mẫu đưa đón", "POST", "/api/van-chuyen/mau-chang/ZA1", ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinhId: LOC }, 201);
      },
      "GET /api/van-chuyen/mau-chang/:code": async () => {
        await goi("GET /api/van-chuyen/mau-chang/:code", "lịch sử mẫu đưa đón", "GET", "/api/van-chuyen/mau-chang/ZA1", ADM);
      },
      "GET /api/van-chuyen/mau-chang": async () => {
        await goi("GET /api/van-chuyen/mau-chang", "mẫu đưa đón cho form", "GET", "/api/van-chuyen/mau-chang", SALES);
      },
      "GET /api/van-chuyen/chinh-sach-dieu-phoi": async () => {
        await goi("GET /api/van-chuyen/chinh-sach-dieu-phoi", "đọc chính sách", "GET", "/api/van-chuyen/chinh-sach-dieu-phoi", SUP);
      },
      "POST /api/van-chuyen/chinh-sach-dieu-phoi": async () => {
        const r = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
          as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
        });
        assert.ok(r.status < 300, r.text);
        than.push({ route: "POST /api/van-chuyen/chinh-sach-dieu-phoi", khoa: "lưu chính sách", text: r.text, json: r.json, coCaiDeLo: false });
      },
      "POST /api/van-chuyen/chuyen": async () => {
        const tao = async (k: string, taiXe: string, bd: string, kt: string, ngay = NGAY) => {
          T[k] = await goi("POST /api/van-chuyen/chuyen", `tạo chuyến ${k}`, "POST", "/api/van-chuyen/chuyen", SALES, {
            requestId: rid(), xeId: xe(w), taiXePartyId: `pty-${taiXe}`, batDau: { ngay, gio: bd }, ketThuc: { ngay, gio: kt },
          }, 201);
        };
        await tao("A", DRIVER, "12:30", "15:00");
        await tao("B", DRIVER2, "12:30", "15:00");
        await tao("C", DRIVER3, "18:30", "20:00");
        await tao("D", DRIVER, "16:00", "18:00");
        await tao("E", DRIVER2, "16:00", "18:00");
        await tao("F", DRIVER, "08:00", "10:00", NGAY_SAU);
        await tao("G", DRIVER4, "18:30", "20:30");
      },
      "POST /api/van-chuyen/chuyen/:id/phan-bo": async () => {
        // Chuyến C xếp KÈM khoá người (đường thân gửi `personKeys`); A / B / D / E / F xếp theo SỐ (máy tự gắn tên — I19a). Cả hai đường cho suất có tên ngay ⇒ mọi
        // lệnh kế hoạch sau đó (sửa, cập nhật điểm, dời, rút) có cái để lộ.
        const pkC = (await w.call("GET", `/api/orders/${dC.id}/passengers`, { as: SALES })).json.passengers.map((x: any) => x.personKey);
        assert.equal(pkC.length, 3);
        for (const [k, d, n] of [["A", dA, 3], ["B", dB, 3], ["C", dC, 3], ["D", dD, 1], ["E", dE, 1], ["F", dF, 2]] as const) {
          const c = await ct(T[k].chuyen.id);
          const r = await goi("POST /api/van-chuyen/chuyen/:id/phan-bo", `xếp ${k}`, "POST", `/api/van-chuyen/chuyen/${T[k].chuyen.id}/phan-bo`, SALES, {
            version: c.chuyen.version, requestId: rid(), chang: [{ legId: d.legId, soSuat: n, ...(k === "C" ? { personKeys: pkC } : {}) }],
          });
          S[k] = { don: r.diem.find((x: any) => x.loai === "PICKUP").id, tra: r.diem.find((x: any) => x.loai === "DROPOFF").id, suat: r.suat.filter((s: any) => s.loai === "PASSENGER").map((s: any) => s.id) };
        }
      },
      "PUT /api/van-chuyen/chuyen/:id": async () => {
        const c = await ct(T.C.chuyen.id);
        await goi("PUT /api/van-chuyen/chuyen/:id", "sửa chuyến C", "PUT", `/api/van-chuyen/chuyen/${T.C.chuyen.id}`, SALES, { version: c.chuyen.version, requestId: rid(), ketThuc: { ngay: NGAY, gio: "20:15" } });
      },
      "GET /api/van-chuyen/lich": async () => {
        await goi("GET /api/van-chuyen/lich", "lịch chung", "GET", `/api/van-chuyen/lich?ngay=${NGAY}`, SALES);
      },
      "GET /api/van-chuyen/xe-cua-don/:orderId": async () => {
        // ADR-0059: xe trên chi tiết đơn — đơn A có suất ĐÃ gắn tên (I19a) trên chuyến A: thân chỉ biển số, tên TÀI XẾ, số khách, trạng thái.
        const r = await goi("GET /api/van-chuyen/xe-cua-don/:orderId", "xe của đơn A", "GET", `/api/van-chuyen/xe-cua-don/${dA.id}`, SALES);
        assert.equal(r.chang[0].xe[0].soKhach, 3, "chống bài rỗng: đơn A có xe, 3 khách đã gắn tên");
      },
      // ADR-0057 T2 (kế hoạch Đợt 4 Task 10): route chi phí chuyến xe thuê — thân chỉ tiền + nhãn lý do + tên NGƯỜI GHI (nhân viên), không suất, không tên khách.
      // Chuyến A là xe công ty (không dòng chi phí) ⇒ lệnh ghi bị từ chối có lý do — thân lỗi cũng được quét.
      "GET /api/van-chuyen/chuyen/:id/chi-phi": async () => {
        await goi("GET /api/van-chuyen/chuyen/:id/chi-phi", "chi phí chuyến (Kế toán)", "GET", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/chi-phi`, ACC);
      },
      "POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh": async () => {
        await goi("POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh", "điều chỉnh (chưa có chi phí)", "POST", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/chi-phi/dieu-chinh`, ACC,
          { requestId: rid(), phienBanChiPhi: 0, soTien: 100_000, lyDo: "CPX_KHAC", ghiChu: null }, 409);
      },
      "POST /api/van-chuyen/chuyen/:id/chi-phi/dao": async () => {
        await goi("POST /api/van-chuyen/chuyen/:id/chi-phi/dao", "đảo dòng (không có)", "POST", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/chi-phi/dao`, ACC,
          { requestId: rid(), phienBanChiPhi: 0, dongId: uuid(), lyDo: "CPX_NHAP_SAI", ghiChu: null }, 404);
      },
      "POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai": async () => {
        await goi("POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai", "lấy lại giá bảng (không phải xe thuê)", "POST", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/chi-phi/chup-lai`, ACC,
          { requestId: rid(), phienBanChiPhi: 0 }, 409);
      },
      "POST /api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan": async () => {
        await goi("POST /api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan", "giá thoả thuận (không phải xe thuê)", "POST", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/chi-phi/gia-thoa-thuan`, ACC,
          { requestId: rid(), phienBanChiPhi: 0, soTien: 1_000_000, ghiChu: "thử" }, 409);
      },
      "GET /api/van-chuyen/chuyen/:id": async () => {
        // I19(a) (làm bù theo K2c VỪA-1): xếp theo SỐ → máy gắn tên ngay lúc xếp theo thứ tự khoá người ⇒ chi tiết văn phòng CÓ tên TRƯỚC xuất bến.
        const c = await ct(T.A.chuyen.id);
        assert.deepEqual(c.suat.map((s: any) => s.hoTen).sort(), TEN_VC, "chống bài rỗng: chi tiết chuyến văn phòng CÓ tên ngay sau xếp (I19a)");
      },
      // A4 T8 (ADR-0053 D9; ADR "Hệ quả"): bốn route Báo bận — thân là khung giờ + nhãn lý do (của chính người gọi) / dải văn phòng chỉ "bận"; không suất, không tên khách.
      // Dùng Toàn quyền (ô unavailability.self = any) để không dựng thêm tài khoản tài xế đối tác ở khối này (bài tai-xe-doi-tac-cuoc / bao-ban-tai-xe lo phần tài xế đối tác).
      "GET /api/van-chuyen/ban/cua-toi": async () => {
        await goi("GET /api/van-chuyen/ban/cua-toi", "khung bận của tôi", "GET", "/api/van-chuyen/ban/cua-toi", SUP);
      },
      "POST /api/van-chuyen/ban": async () => {
        await goi("POST /api/van-chuyen/ban", "báo bận", "POST", "/api/van-chuyen/ban", SUP, { batDau: { ngay: NGAY_SAU, gio: "22:00" }, ketThuc: { ngay: NGAY_SAU, gio: "23:00" }, lyDo: "BTX_OM" }, 201);
      },
      "POST /api/van-chuyen/ban/:id/rut": async () => {
        const k = (await w.call("GET", "/api/van-chuyen/ban/cua-toi", { as: SUP })).json.khung[0];
        assert.ok(k, "chống bài rỗng: có khung để rút");
        await goi("POST /api/van-chuyen/ban/:id/rut", "rút khung bận", "POST", `/api/van-chuyen/ban/${k.id}/rut`, SUP, { version: k.version });
      },
      "GET /api/van-chuyen/ban-tai-xe": async () => {
        await goi("GET /api/van-chuyen/ban-tai-xe", "dải tài xế bận (văn phòng)", "GET", `/api/van-chuyen/ban-tai-xe?tu=${NGAY_SAU}`, ADM);
      },
      "GET /api/van-chuyen/cuoc-cua-toi": async () => {
        await goi("GET /api/van-chuyen/cuoc-cua-toi", "danh sách cuốc", "GET", "/api/van-chuyen/cuoc-cua-toi", DRIVER);
      },
      "GET /api/van-chuyen/cuoc-cua-toi/:id": async () => {
        const f = await goi("GET /api/van-chuyen/cuoc-cua-toi/:id", "cuốc NGÀY MAI", "GET", `/api/van-chuyen/cuoc-cua-toi/${T.F.chuyen.id}`, DRIVER);
        const txt = JSON.stringify(f);
        for (const t of TEN_VC) assert.ok(!txt.includes(t), `DTO ngoài ngày chạy lộ tên "${t}"`);
        const k = moiKhoa(f);
        assert.ok(!k.has("hoTen") && !k.has("namSinh") && !k.has("lienHe"), "DTO ngoài ngày chạy: không hoTen / namSinh / lienHe");
        assert.ok(!k.has("diaChiChiDuong") && !txt.includes(DIA_CHI_VC), "DTO ngoài ngày chạy: không chuỗi đích chỉ đường (ADR-0105)");
        assert.equal(f.suat.length, 2, "chống bài rỗng: cuốc ngày mai có suất");
      },
      "POST /api/van-chuyen/chuyen/:id/cap-nhat-diem": async () => {
        // Người lập đổi giờ (19:00 → 19:15, vẫn trong khung chuyến) + nơi đón chặng của đơn C → cập nhật điểm theo đơn.
        const l = (await w.call("GET", `/api/orders/${dC.id}`, { as: SALES })).json.order.services[0].legs[0];
        const sua = await w.call("PUT", `/api/orders/${dC.id}/legs/${l.id}`, {
          as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "19:15", pickupLocationId: null, pickupPlace: "Khách sạn Đổi Nơi", dropoffLocationId: l.dropoffLocationId, dropoffPlace: "" } },
        });
        assert.equal(sua.status, 200, sua.text);
        const c = await ct(T.C.chuyen.id);
        const r = await goi("POST /api/van-chuyen/chuyen/:id/cap-nhat-diem", "cập nhật điểm C", "POST", `/api/van-chuyen/chuyen/${T.C.chuyen.id}/cap-nhat-diem`, SALES, { version: c.chuyen.version, requestId: rid() });
        assert.equal(r.daCapNhat, 3, "chống bài rỗng: có suất được cập nhật");
      },
      "POST /api/van-chuyen/chuyen/:id/cap-nhat-khach": async () => {
        // R-P29 (chủ lần 16): người lập bỏ một khách của đơn C và thêm một khách (năm sinh đánh dấu) → chuyến C giữ KHACH_DA_DOI → "Cập nhật khách theo đơn".
        // (ADR-0104 Đ2: giữ được vì khúc của máy thua cổng — `giuChuyenC`.)
        giuChuyenC = true;
        let ds = (await w.call("GET", `/api/orders/${dC.id}/passengers`, { as: SALES })).json;
        const bo = [...ds.passengers].sort((x: any, y: any) => (x.fullName < y.fullName ? -1 : 1))[2].personKey;
        ds = (await w.call("POST", `/api/orders/${dC.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [bo] } })).json;
        const them = await w.call("POST", `/api/orders/${dC.id}/passengers`, {
          as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: TEN_VC[2], birthYear: 1913, paxCode: "adult" }], sua: [], huy: [] },
        });
        assert.equal(them.status, 200, them.text);
        const c = await ct(T.C.chuyen.id);
        giuChuyenC = false;
        const r = await goi("POST /api/van-chuyen/chuyen/:id/cap-nhat-khach", "cập nhật khách C", "POST", `/api/van-chuyen/chuyen/${T.C.chuyen.id}/cap-nhat-khach`, SALES, { version: c.chuyen.version, requestId: rid() });
        assert.equal(r.daCapNhat, 1, "chống bài rỗng: có suất khách đã đổi được cập nhật");
        // NT-9 (ADR-0104 Đ2.9): MÁY đồng bộ theo đơn — đổi lại một khách của đơn C trong MỘT lệnh (huỷ khách vừa thêm, thêm khách năm sinh đánh dấu) → khúc
        // `trip_order_synced` trên chuyến C (nhật ký + cột vc_* do phần (3) quét); phản hồi phần "chuyến" chỉ câu cố định + cờ.
        ds = (await w.call("GET", `/api/orders/${dC.id}/passengers`, { as: SALES })).json;
        const moi = ds.passengers.find((p: any) => p.fullName === TEN_VC[2]).personKey;
        const doi = await w.call("POST", `/api/orders/${dC.id}/passengers`, {
          as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: TEN_VC[1], birthYear: 1912, paxCode: "adult" }], sua: [], huy: [moi] },
        });
        assert.equal(doi.status, 200, doi.text);
        assert.deepEqual(doi.json.dongBoChuyen, { nhac: null, capNhatTay: false });
        const dongBo = w.q("SELECT detail FROM audit_log WHERE action = 'trip_order_synced'");
        assert.equal(dongBo.length, 1, "chống bài rỗng: máy đồng bộ có nhật ký để quét");
        assert.match(dongBo[0].detail, /^[^:]+: máy cập nhật theo đơn — [A-Z0-9-]+ \(đổi người\): trả 1 ghế, thêm 1 ghế$/);
      },
      "GET /api/van-chuyen/nhac-goi-khach": async () => {
        const r = await goi("GET /api/van-chuyen/nhac-goi-khach", "nhắc gọi khách", "GET", "/api/van-chuyen/nhac-goi-khach", SALES);
        assert.equal(r.muc.length, 1, "chống bài rỗng: có mục nhắc");
      },
      "POST /api/van-chuyen/chang/:legId/da-goi-bao": async () => {
        await goi("POST /api/van-chuyen/chang/:legId/da-goi-bao", "đã gọi báo", "POST", `/api/van-chuyen/chang/${dC.legId}/da-goi-bao`, SALES, { requestId: rid(), phienBan: 1, gioMoi: { ngay: NGAY, gio: "19:15" } });
      },
      "POST /api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao": async () => {
        await goi("POST /api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao", "bỏ đánh dấu", "POST", `/api/van-chuyen/chang/${dC.legId}/bo-danh-dau-goi-bao`, SALES, { requestId: rid(), phienBan: 2 });
      },
      "POST /api/van-chuyen/chuyen/:id/doi": async () => {
        const c = await ct(T.C.chuyen.id);
        const g = await ct(T.G.chuyen.id);
        await goi("POST /api/van-chuyen/chuyen/:id/doi", "dời C → G", "POST", `/api/van-chuyen/chuyen/${T.C.chuyen.id}/doi`, SALES, {
          version: c.chuyen.version, requestId: rid(), denChuyenId: T.G.chuyen.id, denVersion: g.chuyen.version, suatIds: c.suat.filter((s: any) => s.loai === "PASSENGER").slice(0, 2).map((s: any) => s.id),
        });
      },
      "POST /api/van-chuyen/chuyen/:id/rut": async () => {
        const g = await ct(T.G.chuyen.id);
        assert.equal(g.suat.length, 2);
        await goi("POST /api/van-chuyen/chuyen/:id/rut", "rút khỏi G", "POST", `/api/van-chuyen/chuyen/${T.G.chuyen.id}/rut`, SALES, { version: g.chuyen.version, requestId: rid(), suatIds: [g.suat[0].id] });
      },
      "POST /api/van-chuyen/chuyen/:id/huy": async () => {
        const g = await ct(T.G.chuyen.id);
        await goi("POST /api/van-chuyen/chuyen/:id/huy", "huỷ G", "POST", `/api/van-chuyen/chuyen/${T.G.chuyen.id}/huy`, SALES, { version: g.chuyen.version, requestId: rid(), lyDo: "HUY_KHAC" });
      },
      [`${R}/xuat-ben`]: async () => {
        denGio("12:40");
        await goi(`${R}/xuat-ben`, "tài xế xuất bến A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/xuat-ben`, DRIVER, { requestId: rid() });
        // Trong ngày chạy, sau xuất bến: DTO tài xế CÓ tên (chống bài rỗng cho route thứ hai được trả tên).
        const a = await goi("GET /api/van-chuyen/cuoc-cua-toi/:id", "cuốc A trong ngày", "GET", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}`, DRIVER);
        assert.deepEqual(a.suat.map((s: any) => s.hoTen).sort(), TEN_VC, "chống bài rỗng: cuốc trong ngày chạy CÓ tên");
        assert.ok(JSON.stringify(a).includes(DIA_CHI_VC), "chống bài rỗng (ADR-0105): cuốc trong ngày chạy CÓ chuỗi đích là địa chỉ đánh dấu");
      },
      [`${V}/xuat-ben`]: async () => {
        await goi(`${V}/xuat-ben`, "văn phòng xuất bến B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/xuat-ben`, SALES, { requestId: rid() });
        const b = await ct(T.B.chuyen.id);
        assert.deepEqual(b.suat.map((s: any) => s.hoTen).sort(), TEN_VC, "chống bài rỗng: chi tiết chuyến văn phòng CÓ tên");
      },
      // ADR-0111 (gói A5, NT-A5-2): tài xế A xem xe nhận được đề nghị chuyển khách — B (DRIVER2, đang chạy, suất đã gắn tên) phải có trong danh sách, không tên.
      "GET /api/van-chuyen/cuoc-cua-toi/:id/xe-nhan": async () => {
        const r = await goi("GET /api/van-chuyen/cuoc-cua-toi/:id/xe-nhan", "xe nhận của A", "GET", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/xe-nhan?phamVi=ONBOARD`, DRIVER);
        assert.ok(r.xe.some((x: any) => x.tripId === T.B.chuyen.id), "chống bài rỗng: xe B đang chạy có trong danh sách");
      },
      // ADR-0111 (gói A5 T14): văn phòng xem xe nhận để gửi thay cứu hộ cho A — cùng năm khoá như danh sách của tài xế, không tên.
      "GET /api/van-chuyen/chuyen/:id/xe-nhan": async () => {
        const r = await goi("GET /api/van-chuyen/chuyen/:id/xe-nhan", "văn phòng xem xe nhận của A", "GET", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/xe-nhan`, SALES);
        assert.ok(r.xe.some((x: any) => x.tripId === T.B.chuyen.id), "chống bài rỗng: xe B đang chạy có trong danh sách");
      },
      // ADR-0111 (gói A5, NT-A5-16): đề nghị chuyển khách — tài xế A nhờ B đón điểm A (suất đã gắn tên), văn phòng gửi thay cứu hộ (nơi gặp chữ có dãy số), tài
      // xế A rút một đề nghị, tài xế B xem đề nghị gửi tới. Phản hồi không tên / năm sinh / khoá nơi; chữ nơi gặp (đã che) chỉ ở DTO đề nghị.
      [`${R}/de-nghi`]: async () => {
        const r = await goi(`${R}/de-nghi`, "tài xế A nhờ B đón điểm A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/de-nghi`, DRIVER, {
          requestId: rid(), denChuyenId: T.B.chuyen.id, phamVi: "STOP", diemId: S.A!.don,
        });
        S.DN = { don: r.deNghi.id, tra: "", suat: [] };
      },
      [`${V}/cuu-ho`]: async () => {
        await goi(`${V}/cuu-ho`, "văn phòng gửi thay cứu hộ A → B", "POST", `/api/van-chuyen/chuyen/${T.A.chuyen.id}/cuu-ho`, SALES, {
          requestId: rid(), denChuyenId: T.B.chuyen.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng Phước Đồng 0912345678" },
        });
      },
      "GET /api/van-chuyen/de-nghi-cua-toi": async () => {
        const r = await goi("GET /api/van-chuyen/de-nghi-cua-toi", "đề nghị gửi tới B", "GET", "/api/van-chuyen/de-nghi-cua-toi", DRIVER2);
        assert.equal(r.guiToi.length, 2, "chống bài rỗng: hai đề nghị tới B");
      },
      "POST /api/van-chuyen/de-nghi/:rid/rut": async () => {
        await goi("POST /api/van-chuyen/de-nghi/:rid/rut", "tài xế A rút đề nghị", "POST", `/api/van-chuyen/de-nghi/${S.DN!.don}/rut`, DRIVER, { requestId: rid() });
      },
      // ADR-0097 Đ3 (gói A1, V3-B): văn phòng thu hồi xuất bến B (chưa có tiến độ) rồi xuất bến lại — phản hồi thu hồi không kèm tên (suất B đã gắn tên).
      [`${V}/thu-hoi-xuat-ben`]: async () => {
        const b = await ct(T.B.chuyen.id);
        await goi(`${V}/thu-hoi-xuat-ben`, "văn phòng thu hồi xuất bến B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/thu-hoi-xuat-ben`, SALES, {
          version: b.chuyen.version, requestId: rid(), lyDo: "DIEU_CHINH_BAM_NHAM",
        }, 201);
        await goi(`${V}/xuat-ben`, "văn phòng xuất bến lại B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/xuat-ben`, SALES, { requestId: rid() });
      },
      [`${R}/thu-tu`]: async () => {
        await goi(`${R}/thu-tu`, "tài xế đổi thứ tự A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/thu-tu`, DRIVER, { requestId: rid(), diem: [{ id: S.A!.tra, thuTu: 7 }] });
      },
      [`${V}/thu-tu`]: async () => {
        await goi(`${V}/thu-tu`, "văn phòng đổi thứ tự B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/thu-tu`, SALES, { requestId: rid(), diem: [{ id: S.B!.tra, thuTu: 7 }] });
      },
      [`${R}/diem/:sid/da-toi`]: async () => {
        denGio("12:58");
        await goi(`${R}/diem/:sid/da-toi`, "tài xế tới điểm đón A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/diem/${S.A!.don}/da-toi`, DRIVER, { requestId: rid() });
      },
      [`${V}/diem/:sid/da-toi`]: async () => {
        await goi(`${V}/diem/:sid/da-toi`, "văn phòng tới điểm đón B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/diem/${S.B!.don}/da-toi`, SALES, { requestId: rid() });
      },
      [`${R}/phan-bo/:aid/don`]: async () => {
        await goi(`${R}/phan-bo/:aid/don`, "tài xế đã đón", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/phan-bo/${S.A!.suat[0]}/don`, DRIVER, { requestId: rid() });
      },
      [`${V}/phan-bo/:aid/don`]: async () => {
        await goi(`${V}/phan-bo/:aid/don`, "văn phòng đã đón", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${S.B!.suat[0]}/don`, SALES, { requestId: rid() });
      },
      // ADR-0097 Đ2: văn phòng sửa "Đã đón" nhầm của khách B[0] về "Chưa xử lý" (điểm đón đang ARRIVED) rồi đón lại suất THAY THẾ — phản hồi không kèm tên.
      [`${V}/phan-bo/:aid/dieu-chinh`]: async () => {
        const b = await ct(T.B.chuyen.id);
        const r = await goi(`${V}/phan-bo/:aid/dieu-chinh`, "văn phòng điều chỉnh khách B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${S.B!.suat[0]}/dieu-chinh`, SALES, {
          version: b.chuyen.version, requestId: rid(), trangThai: "WAITING", lyDo: "DIEU_CHINH_BAM_NHAM",
        }, 201);
        const moi = r.suat.find((x: any) => x.loai === "PASSENGER" && !S.B!.suat.includes(x.id));
        assert.ok(moi, "chống bài rỗng: có suất thay thế");
        S.B!.suat[0] = moi.id;
        await goi(`${V}/phan-bo/:aid/don`, "văn phòng đón lại khách B (suất thay thế)", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${moi.id}/don`, SALES, { requestId: rid() });
      },
      [`${R}/phan-bo/:aid/vang`]: async () => {
        await goi(`${R}/phan-bo/:aid/vang`, "tài xế khách vắng", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/phan-bo/${S.A!.suat[1]}/vang`, DRIVER, { requestId: rid() });
      },
      [`${V}/phan-bo/:aid/vang`]: async () => {
        await goi(`${V}/phan-bo/:aid/vang`, "văn phòng khách vắng", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${S.B!.suat[1]}/vang`, SALES, { requestId: rid() });
      },
      [`${R}/phan-bo/:aid/khach-huy`]: async () => {
        await goi(`${R}/phan-bo/:aid/khach-huy`, "tài xế khách huỷ", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/phan-bo/${S.A!.suat[2]}/khach-huy`, DRIVER, { requestId: rid() });
      },
      [`${V}/phan-bo/:aid/khach-huy`]: async () => {
        await goi(`${V}/phan-bo/:aid/khach-huy`, "văn phòng khách huỷ", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${S.B!.suat[2]}/khach-huy`, SALES, { requestId: rid() });
      },
      [`${R}/phan-bo/:aid/tra`]: async () => {
        denGio("13:40");
        await goi(`${R}/diem/:sid/da-toi`, "tài xế tới điểm trả A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/diem/${S.A!.tra}/da-toi`, DRIVER, { requestId: rid() });
        await goi(`${R}/phan-bo/:aid/tra`, "tài xế đã trả", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/phan-bo/${S.A!.suat[0]}/tra`, DRIVER, { requestId: rid() });
      },
      [`${V}/phan-bo/:aid/tra`]: async () => {
        await goi(`${V}/diem/:sid/da-toi`, "văn phòng tới điểm trả B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/diem/${S.B!.tra}/da-toi`, SALES, { requestId: rid() });
        await goi(`${V}/phan-bo/:aid/tra`, "văn phòng đã trả", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/phan-bo/${S.B!.suat[0]}/tra`, SALES, { requestId: rid() });
      },
      [`${R}/ket-thuc`]: async () => {
        await goi(`${R}/ket-thuc`, "tài xế kết thúc A", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/ket-thuc`, DRIVER, { requestId: rid() });
      },
      [`${V}/ket-thuc`]: async () => {
        await goi(`${V}/ket-thuc`, "văn phòng kết thúc B", "POST", `/api/van-chuyen/chuyen/${T.B.chuyen.id}/ket-thuc`, SALES, { requestId: rid() });
      },
      [`${V}/them-diem`]: async () => {
        denGio("16:10");
        await goi(`${R}/xuat-ben`, "tài xế xuất bến D", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.D.chuyen.id}/xuat-ben`, DRIVER, { requestId: rid() });
        const d = await ct(T.D.chuyen.id);
        const r = await goi(`${V}/them-diem`, "thêm đơn H vào xe D đang chạy", "POST", `/api/van-chuyen/chuyen/${T.D.chuyen.id}/them-diem`, ADM, {
          version: d.chuyen.version, requestId: rid(), chang: [{ legId: dH.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" },
        });
        S.H = { don: "", tra: "", suat: r.suat.filter((s: any) => s.maDon === dH.code).map((s: any) => s.id) };
        assert.equal(S.H.suat.length, 2, "chống bài rỗng: hai suất H (máy gắn tên — I19a) trên xe D");
      },
      [`${V}/phan-bo/:aid/bao-huy`]: async () => {
        const d = await ct(T.D.chuyen.id);
        await goi(`${V}/phan-bo/:aid/bao-huy`, "văn phòng báo huỷ khách H", "POST", `/api/van-chuyen/chuyen/${T.D.chuyen.id}/phan-bo/${S.H!.suat[0]}/bao-huy`, SALES, {
          version: d.chuyen.version, requestId: rid(), lyDo: "BAO_HUY_KHONG_DI",
        });
      },
      [`${R}/ket-thuc-gian-doan`]: async () => {
        // Xe D đã xuất bến ở ca them-diem (Đợt 5).
        await goi(`${R}/ket-thuc-gian-doan`, "tài xế kết thúc gián đoạn D", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.D.chuyen.id}/ket-thuc-gian-doan`, DRIVER, { requestId: rid(), lyDo: "GIAN_DOAN_XE_HONG" });
      },
      [`${V}/ket-thuc-gian-doan`]: async () => {
        await goi(`${V}/xuat-ben`, "văn phòng xuất bến E", "POST", `/api/van-chuyen/chuyen/${T.E.chuyen.id}/xuat-ben`, SALES, { requestId: rid() });
        await goi(`${V}/ket-thuc-gian-doan`, "văn phòng kết thúc gián đoạn E", "POST", `/api/van-chuyen/chuyen/${T.E.chuyen.id}/ket-thuc-gian-doan`, SALES, { requestId: rid(), lyDo: "GIAN_DOAN_XE_HONG" });
      },
      // Đợt 5 A-1b (D5c cứu hộ đơn giản): xe D (có suất H, D gắn tên) đã Kết thúc gián đoạn ⇒ có chặng cần chuyển — DTO không được kèm tên / năm sinh.
      "GET /api/van-chuyen/chuyen/:id/cuu-ho": async () => {
        const r = await goi("GET /api/van-chuyen/chuyen/:id/cuu-ho", "cứu hộ xe D", "GET", `/api/van-chuyen/chuyen/${T.D.chuyen.id}/cuu-ho`, SALES);
        assert.ok(r.changChoXep.length >= 1, "chống bài rỗng: xe D có chặng cần chuyển");
      },
      // Đợt 5 A-1b (D5b — chủ duyệt 5/10): tài xế bổ sung tên "Khách Dò Tìm 2" (năm 1912) — phản hồi ĐÚNG { ok, soNguoi }, không tên / năm sinh.
      [`${R}/hanh-khach`]: async () => {
        const j = await w.call("POST", "/api/van-chuyen/chuyen", { as: ADM, body: { requestId: rid(), xeId: xe(w), taiXePartyId: `pty-${DRIVER4}`, batDau: { ngay: NGAY, gio: "21:00" }, ketThuc: { ngay: NGAY, gio: "22:00" } } });
        assert.equal(j.status, 201, j.text);
        const x = await w.call("POST", `/api/van-chuyen/chuyen/${j.json.chuyen.id}/phan-bo`, {
          as: ADM, body: { version: j.json.chuyen.version, requestId: rid(), chang: [{ legId: dJ.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } },
        });
        assert.equal(x.status, 200, x.text);
        const [s] = w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND passenger_key IS NULL AND valid_to_at IS NULL", j.json.chuyen.id).map((r: any) => r.id);
        assert.ok(s, "chống bài rỗng: chuyến J có suất chưa tên");
        const r = await goi(`${R}/hanh-khach`, "tài xế bổ sung tên khách J", "POST", `/api/van-chuyen/cuoc-cua-toi/${j.json.chuyen.id}/hanh-khach`, DRIVER4, {
          requestId: rid(), suatId: s, fullName: TEN_VC[1], birthYear: 1912, paxCode: null,
        });
        assert.deepEqual(Object.keys(r).sort(), ["ok", "soNguoi"], "phản hồi chỉ { ok, soNguoi }");
        assert.equal(w.q("SELECT count(*) n FROM ord_passenger WHERE order_id = ? AND source = 'DRIVER' AND full_name = ?", dJ.id, TEN_VC[1])[0].n, 1, "chống bài rỗng: tên đã ghi");
      },
      // ADR-0111 (gói A5 lát 3, NT-A5-16): vòng đời đề nghị trên một cặp xe RIÊNG — K (DRIVER3, đơn K có tên, đang chạy) nhờ L (DRIVER4, chưa chạy — dưới mốc ⇒
      // Nhận thành leo thang). Ba đề nghị cùng điểm đón K: một Không nhận, hai Leo thang; Quản trị bác một, duyệt một (khách có tên sang L). Phản hồi chỉ DTO
      // đề nghị: không tên / năm sinh / khoá nơi.
      "POST /api/van-chuyen/de-nghi/:rid/khong-nhan": async () => {
        const tao = async (taiXe: string, bd: string, kt: string) => {
          const r = await w.call("POST", "/api/van-chuyen/chuyen", { as: ADM, body: { requestId: rid(), xeId: xe(w), taiXePartyId: `pty-${taiXe}`, batDau: { ngay: NGAY, gio: bd }, ketThuc: { ngay: NGAY, gio: kt } } });
          assert.equal(r.status, 201, r.text);
          return r.json.chuyen;
        };
        const k = await tao(DRIVER3, "16:20", "17:30");
        const l = await tao(DRIVER4, "16:30", "17:45");
        const x = await w.call("POST", `/api/van-chuyen/chuyen/${k.id}/phan-bo`, {
          as: ADM, body: { version: k.version, requestId: rid(), chang: [{ legId: dK.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } },
        });
        assert.equal(x.status, 200, x.text);
        const diemK = x.json.diem.find((d: any) => d.loai === "PICKUP").id;
        assert.equal((await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${k.id}/xuat-ben`, { as: DRIVER3, body: { requestId: rid() } })).status, 200);
        const gui = async () => {
          const r = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${k.id}/de-nghi`, { as: DRIVER3, body: { requestId: rid(), denChuyenId: l.id, phamVi: "STOP", diemId: diemK } });
          assert.equal(r.status, 200, r.text);
          return r.json.deNghi.id as string;
        };
        S.DN2 = { don: await gui(), tra: await gui(), suat: [await gui()] };
        assert.ok(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND passenger_key IS NOT NULL AND valid_to_at IS NULL", k.id)[0].n === 2, "chống bài rỗng: suất K có tên");
        await goi("POST /api/van-chuyen/de-nghi/:rid/khong-nhan", "tài xế L không nhận", "POST", `/api/van-chuyen/de-nghi/${S.DN2.suat[0]}/khong-nhan`, DRIVER4, {
          requestId: rid(), lyDo: "TU_CHOI_DAY_CHO",
        });
      },
      "POST /api/van-chuyen/de-nghi/:rid/nhan": async () => {
        for (const id of [S.DN2!.don, S.DN2!.tra]) {
          const r = await goi("POST /api/van-chuyen/de-nghi/:rid/nhan", "tài xế L bấm Nhận (leo thang)", "POST", `/api/van-chuyen/de-nghi/${id}/nhan`, DRIVER4, { requestId: rid() });
          assert.equal(r.ketQua, "LEO_THANG");
        }
      },
      "GET /api/van-chuyen/de-nghi": async () => {
        const r = await goi("GET /api/van-chuyen/de-nghi", "văn phòng xem đề nghị trong ngày", "GET", `/api/van-chuyen/de-nghi?ngay=${NGAY}`, ADM);
        assert.ok(r.deNghi.filter((x: any) => x.trangThai === "ESCALATED" && Array.isArray(x.kiem) && x.kiem.length === 12).length >= 2, "chống bài rỗng: hai đề nghị leo thang có dòng kiểm");
      },
      "POST /api/van-chuyen/de-nghi/:rid/bac": async () => {
        await goi("POST /api/van-chuyen/de-nghi/:rid/bac", "Quản trị bác", "POST", `/api/van-chuyen/de-nghi/${S.DN2!.tra}/bac`, ADM, { requestId: rid(), lyDo: "TU_CHOI_KHAC" });
      },
      "POST /api/van-chuyen/de-nghi/:rid/duyet": async () => {
        const r = await goi("POST /api/van-chuyen/de-nghi/:rid/duyet", "Quản trị duyệt — khách có tên sang L", "POST", `/api/van-chuyen/de-nghi/${S.DN2!.don}/duyet`, ADM, {
          requestId: rid(), lyDo: "PHA_LE_SU_CO",
        });
        assert.equal(r.deNghi.trangThai, "CONFIRMED");
        assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE transfer_id = ? AND passenger_key IS NOT NULL AND valid_to_at IS NULL", S.DN2!.don)[0].n, 2, "chống bài rỗng: khách có tên đã sang L");
      },
      // A4 T7 (ADR-0053 D8): Từ chối chuyến trả ĐÚNG { daTuChoi: true } khi thành công (khoá ở tu-choi.test.ts — bài đó theo luật đồng hồ giờ thật). Ở đây
      // (đồng hồ NOW_GIA — không đi đường thành công, tránh bom hẹn giờ B8.3) gọi bằng tài xế công ty → 403: thân lỗi cũng được quét "không lộ tên".
      [`${R}/tu-choi`]: async () => {
        await goi(`${R}/tu-choi`, "tài xế công ty bấm Từ chối (403)", "POST", `/api/van-chuyen/cuoc-cua-toi/${T.A.chuyen.id}/tu-choi`, DRIVER, { requestId: rid(), lyDo: "TCC_KHAC" }, 403);
      },
    };

    // (1) ĐỦ TUYẾN
    assert.deepEqual(Object.keys(TUYEN_VC).sort(), TUYEN_VC_THAT, "mỗi route điều phối thật của van-chuyen phải có ca ở TUYEN_VC (và ngược lại)");
    for (const k of Object.keys(TUYEN_VC)) await TUYEN_VC[k]!();
    assert.deepEqual([...new Set(than.map((t) => t.route))].sort(), TUYEN_VC_THAT, "mọi route đã thật sự được gọi (thân được quét)");

    // (2) TÊN CHỈ Ở HAI ROUTE
    for (const t of than) {
      if (TRA_TEN.includes(t.route)) continue;
      for (const ten of TEN_VC) assert.ok(!t.text.includes(ten), `thân "${t.khoa}" (${t.route}) lộ tên "${ten}"`);
      assert.doesNotMatch(t.text.replace(UUID, ""), NAM_VC, `thân "${t.khoa}" (${t.route}) lộ năm sinh`);
      const k = moiKhoa(t.json);
      assert.ok(!k.has("hoTen") && !k.has("namSinh"), `thân "${t.khoa}" (${t.route}) có khoá hoTen / namSinh`);
    }
    for (const r of TRA_TEN) assert.ok(than.some((t) => t.route === r && t.text.includes(TEN_VC[0]!)), `chống bài rỗng: ${r} CÓ tên`);
    // K2a V2: phép (2) chỉ có nghĩa khi thân CÓ suất đã gắn tên. Bốn route bản chất không còn suất mở có tên (tạo chuyến — chuyến rỗng; huỷ chuyến, kết thúc
    // gián đoạn ×2 — mọi suất đã đóng) do bài 3 (quét mã: đối `kemTen` / `hk` ở MỌI nơi gọi) canh.
    // Đợt 5 A-1b (chủ duyệt 5/10): `${R}/hanh-khach` trả ĐÚNG { ok, soNguoi } (không mảng suất — khoá tập khoá ở ca của nó) nên cũng không có cái để lộ.
    const KHONG_THE_LO = new Set(["POST /api/van-chuyen/chuyen", "POST /api/van-chuyen/chuyen/:id/huy", `${R}/ket-thuc-gian-doan`, `${V}/ket-thuc-gian-doan`,
      // ADR-0057 T2: bốn lệnh ghi CHI PHÍ — phản hồi là DTO chi phí (không có mảng `suat` bao giờ), phép "không lộ tên" ở (2) vẫn quét thân.
      "POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh", "POST /api/van-chuyen/chuyen/:id/chi-phi/dao", "POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai",
      "POST /api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan", `${R}/hanh-khach`,
      // ADR-0111 (gói A5): lệnh đề nghị chuyển khách trả DTO đề nghị (không bao giờ có mảng `suat`) — phép (2) vẫn quét thân.
      // A4 T7: Từ chối trả { daTuChoi: true } hoặc thân lỗi — không mảng suất.
      `${R}/de-nghi`, `${V}/cuu-ho`, `${R}/tu-choi`]);
    const phaiCoCaiDeLo = TUYEN_VC_THAT.filter((k) => /^(POST|PUT) \/api\/van-chuyen\/(chuyen\/:id|cuoc-cua-toi\/:id)(\/|$)/.test(k) && !KHONG_THE_LO.has(k));
    assert.equal(phaiCoCaiDeLo.length, 26, "6 lệnh kế hoạch (sửa, xếp, rút, dời, cập nhật điểm, cập nhật khách — R-P29) + 8 lệnh tài xế + 8 lệnh văn phòng bấm thay + 2 lệnh xe đang chạy (thêm điểm, báo huỷ — Đợt 5) + 2 lệnh điều chỉnh (điều chỉnh khách, thu hồi xuất bến — ADR-0097)");
    for (const r of phaiCoCaiDeLo) assert.ok(than.some((t) => t.route === r && t.coCaiDeLo), `${r}: không lần gọi nào có suất đã gắn tên — phép "không lộ tên" vô nghĩa ở route này`);

    // (3) NHẬT KÝ + cột chữ vc_* — mọi cột, bỏ mã UUID.
    const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log")).replace(UUID, "");
    for (const ten of TEN_VC) assert.ok(!nhatKy.includes(ten), `nhật ký lộ tên "${ten}"`);
    assert.doesNotMatch(nhatKy, NAM_VC, "nhật ký lộ năm sinh");
    const soDong = w.q("SELECT count(*) n FROM audit_log WHERE action LIKE 'trip_%'")[0].n;
    assert.ok(soDong >= 30, `chống bài rỗng: có nhật ký chuyến để quét (${soDong})`);
    const bangVc = w.q("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'vc\\_%' ESCAPE '\\'").map((r: any) => r.name as string);
    assert.ok(bangVc.includes("vc_trip_allocation") && bangVc.includes("vc_trip_manifest") && bangVc.includes("vc_leg_appt_ack"), "chống bài rỗng: có bảng chuyến");
    for (const b of bangVc) {
      const txt = JSON.stringify(w.q(`SELECT * FROM ${b}`)).replace(UUID, "");
      for (const ten of TEN_VC) assert.ok(!txt.includes(ten), `bảng ${b} chứa tên "${ten}"`);
      assert.doesNotMatch(txt, NAM_VC, `bảng ${b} chứa năm sinh`);
    }

    // (4) TC-50 — khoá nơi
    for (const t of than) {
      assert.doesNotMatch(t.text, KHOA_NOI_RE, `thân "${t.khoa}" (${t.route}) có chuỗi khoá nơi`);
      const k = [...moiKhoa(t.json)];
      assert.deepEqual(k.filter((x) => KHOA_NOI_KEY.test(x)), [], `thân "${t.khoa}" (${t.route}) có khoá so sánh nơi`);
      if (t.route.includes("/cuoc-cua-toi")) assert.deepEqual(k.filter((x) => KHOA_GOI_BAO_KEY.test(x)), [], `DTO tài xế "${t.khoa}" có khoá gọi báo`);
    }
    assert.doesNotMatch(JSON.stringify(w.q("SELECT * FROM audit_log")), KHOA_NOI_RE, "nhật ký có chuỗi khoá nơi (L:<id> / T:<hex>)");

    // (5) ADR-0105 — chuỗi đích chỉ đường (địa chỉ đánh dấu của nơi trả) CHỈ ở GET /cuoc-cua-toi/:id; không ở mọi route khác (kể cả phản hồi lệnh tài xế),
    // không ở nhật ký, không ở cột chữ vc_*.
    for (const t of than) {
      if (t.route === "GET /api/van-chuyen/cuoc-cua-toi/:id") continue;
      assert.ok(!t.text.includes(DIA_CHI_VC), `thân "${t.khoa}" (${t.route}) có địa chỉ chỉ đường`);
      assert.ok(!moiKhoa(t.json).has("diaChiChiDuong"), `thân "${t.khoa}" (${t.route}) có khoá diaChiChiDuong`);
    }
    assert.ok(!JSON.stringify(w.q("SELECT * FROM audit_log")).includes(DIA_CHI_VC), "nhật ký có địa chỉ chỉ đường");
    for (const b of bangVc) assert.ok(!JSON.stringify(w.q(`SELECT * FROM ${b}`)).includes(DIA_CHI_VC), `bảng ${b} chứa địa chỉ chỉ đường`);
    assert.ok(w.q("SELECT count(*) n FROM vc_trip_stop WHERE place_key GLOB 'T:*'")[0].n >= 1 && w.q("SELECT count(*) n FROM vc_trip_stop WHERE place_key GLOB 'L:*'")[0].n >= 1, "chống bài rỗng: có khoá T: và L: để dò");
    for (const b of ["vc_trip_departure_check", "vc_trip_departure_check_item", "vc_trip_manifest"]) {
      const cot = w.q(`PRAGMA table_info(${b})`).map((r: any) => r.name as string);
      assert.ok(cot.length > 0, `bảng ${b} tồn tại`);
      assert.deepEqual(cot.filter((c: string) => /place|khoa/i.test(c)), [], `bản chụp / bản chốt ${b} không có cột khoá nơi`);
    }
  } finally {
    tat();
  }
});

// ==== BÀI 3 — QUÉT MÃ: đối "kèm tên" ở MỌI nơi gọi (kiểm độc lập K2a V2) =================================================================================
// Bài 2 chỉ bắt được route có suất ĐÃ GẮN TÊN trong thân; bốn route bản chất không còn suất mở có tên (tạo chuyến, huỷ chuyến, kết thúc gián đoạn ×2) thì
// lỡ truyền `kemTen = true` cũng không lộ gì hôm nay — nhưng là lỗ chờ sẵn. Bài này đọc mã `src/modules/van-chuyen/*.ts` (bỏ chú thích):
//   - `chiTietChuyen(` và `cuocChiTiet(` CHỈ được gọi trong `index.ts` (nơi khai route);
//   - đối thứ 5 của `chiTietChuyen` (kemTen) là chữ `true` ĐÚNG ở GET /api/van-chuyen/chuyen/:id, chữ `false` ở MỌI nơi khác (không biến, không biểu thức);
//   - đối thứ 4 (`hk`) và thứ 5 (`lienHe`) của `cuocChiTiet` là `[]` và `null` ở MỌI nơi khác GET /api/van-chuyen/cuoc-cua-toi/:id;
//   - đối thứ 9 (`kemChiDuong`, ADR-0105 — siết G18-B) của `cuocChiTiet` là chữ `true` ĐÚNG ở GET /api/van-chuyen/cuoc-cua-toi/:id, chữ `false` ở mọi nơi khác.
/** Tách đối số của lời gọi bắt đầu ngay sau dấu "(" ở vị trí `mo` (đếm ngoặc; chuỗi đã được giữ nguyên nên không có ngoặc lạ trong mã này). */
function doiSo(code: string, mo: number): string[] {
  const ra: string[] = [];
  let sau = 0;
  let dau = mo;
  for (let i = mo; i < code.length; i++) {
    const c = code[i]!;
    if (c === "(" || c === "[" || c === "{") sau++;
    else if (c === ")" || c === "]" || c === "}") {
      if (sau === 0) {
        ra.push(code.slice(dau, i).trim());
        return ra;
      }
      sau--;
    } else if (c === "," && sau === 0) {
      ra.push(code.slice(dau, i).trim());
      dau = i + 1;
    }
  }
  throw new Error("không đóng ngoặc");
}
test("khối van-chuyen (bài 3, quét mã — K2a V2): chỉ GET /chuyen/:id truyền kemTen = true, chỉ GET /cuoc-cua-toi/:id truyền hk + lienHe; mọi nơi gọi khác là chữ false / [] / null", () => {
  const thuMuc = new URL("./modules/van-chuyen/", import.meta.url);
  const tep = readdirSync(thuMuc).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const loi: string[] = [];
  const dem = { chiTiet: 0, cuoc: 0 };
  for (const f of tep) {
    const code = maskSource(readFileSync(new URL(f, thuMuc), "utf8"), { strings: false, comments: true });
    for (const m of code.matchAll(/\b(chiTietChuyen|cuocChiTiet)\(/g)) {
      const truoc = code.slice(Math.max(0, m.index! - 30), m.index!);
      if (/function\s+$/.test(truoc)) continue; // chỗ khai hàm
      if (f !== "index.ts") {
        loi.push(`${f}: gọi ${m[1]} ngoài index.ts`);
        continue;
      }
      const r = [...code.slice(0, m.index!).matchAll(/route\("([A-Z]+)", "([^"]+)"/g)].pop();
      const khoa = r ? `${r[1]} ${r[2]}` : "(ngoài route)";
      const a = doiSo(code, m.index! + m[0].length);
      if (m[1] === "chiTietChuyen") {
        dem.chiTiet++;
        const mong = khoa === "GET /api/van-chuyen/chuyen/:id" ? "true" : "false";
        if (a[4] !== mong) loi.push(`${khoa}: chiTietChuyen(…, kemTen = ${a[4]}, …) — phải là chữ ${mong}`);
      } else {
        dem.cuoc++;
        if (khoa !== "GET /api/van-chuyen/cuoc-cua-toi/:id" && (a[3] !== "[]" || a[4] !== "null")) loi.push(`${khoa}: cuocChiTiet(…, hk = ${a[3]}, lienHe = ${a[4]}, …) — phải là [] và null`);
        const mongCd = khoa === "GET /api/van-chuyen/cuoc-cua-toi/:id" ? "true" : "false";
        if (a[8] !== mongCd) loi.push(`${khoa}: cuocChiTiet(…, kemChiDuong = ${a[8]}) — phải là chữ ${mongCd}`);
      }
    }
  }
  assert.deepEqual(loi, []);
  assert.deepEqual(dem, { chiTiet: 22, cuoc: 10 }, "chống bài rỗng: 22 nơi gọi chiTietChuyen (1 GET + 21 lệnh — thêm cập nhật khách R-P29, thêm điểm + báo huỷ Đợt 5, điều chỉnh khách + thu hồi xuất bến ADR-0097), 10 nơi gọi cuocChiTiet (1 GET + 9 lệnh tài xế)");
});

// ADR-0052 tiêu chí 12 (D6 — Đợt 2 Vận chuyển): tin chuyến ở hộp thông báo không mang tên, năm sinh, SĐT, chữ nơi tự do có dãy số, khoá nơi.
test("ADR-0052 tiêu chí 12 (D6): sau đổi tài xế, khách vắng, gián đoạn với nơi đón chữ tự do có dãy số + tên khách đánh dấu → hộp thông báo của MỌI tài khoản không chứa tên, năm sinh, dãy ≥ 8 số, khoá nơi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2, noiDon: "Khách sạn Dò Tìm 0905123456" });
    denGio("06:10");
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    const doi = await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } });
    assert.equal(doi.status, 200, doi.text);
    denGio("12:40");
    for (const d of ["xuat-ben", `diem/${a.diemDon}/da-toi`, `phan-bo/${a.suat[0]}/vang`]) {
      const r = await tienDo(w, "tai-xe", a.id, d, {}, DRIVER2);
      assert.equal(r.status, 200, `${d}: ${r.text}`);
    }
    const gd = await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }, DRIVER2);
    assert.equal(gd.status, 200, gd.text);
    let thayTin = 0;
    for (const as of [SALES, ADM, ACC, DRIVER, DRIVER2, FIELD]) {
      const r = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as });
      assert.equal(r.status, 200, r.text);
      thayTin += (r.json.tin as { loai: string }[]).filter((t) => t.loai === "chuyen").length;
      // Bỏ id (UUID) và MÃ ĐƠN (TD-YYYYMMDD-NNNN — mã hiển thị, đã có trong mọi tin đơn) trước khi quét dãy số: không phải số điện thoại / giấy tờ.
      const txt = r.text.replace(UUID, "<id>").replace(/\bTD-\d{8}-\d{4,}\b/g, "<ma-don>");
      assert.doesNotMatch(txt, /Khách Dò Tìm|199\d|0905123456|\d{8,}|"[LT]:|\b[LT]:[0-9a-f-]{8,}/, `tài khoản ${as}`);
    }
    assert.ok(thayTin >= 3, `chống bài rỗng: phải có tin chuyến để quét (thấy ${thayTin})`);
  } finally {
    tat();
  }
});

// ==== KHỐI TÀI XẾ CÓ VẾ HẠN, NGOÀI KHUNG XEM KHÁCH (ADR-0053 "Hệ quả"; phiếu kiểm độc lập A4 12/10, CAO-1 + CAO-1b) ========================================
// Người có vế hạn Từ chối (can(trip.refuse, {assigned}) — Toàn quyền tự lái là cách dựng gọn; DRIVER_PARTNER cùng đường `khungCuaNguoiGoi`) NGOÀI khung
// (qua hạn, đã xuất bến sớm tối hôm trước, CHƯA tới ngày chạy): MỌI route lệnh của tài xế — thân 200 lẫn thân 409 — không có mã đơn, họ tên, năm sinh,
// liên hệ. Bài này bắt CAO-1 (409 Xuất bến mang "<mã đơn> thiếu N tên") và CAO-1b (409 thu_tu_dao mang mã đơn): quan sát đỏ khi hoàn nguyên bản vá.
test("khối tài xế có vế hạn NGOÀI khung: mọi route lệnh cuoc-cua-toi (200 lẫn 409) không mã đơn / tên / năm sinh / liên hệ; có tập route khớp mã thật; văn phòng cùng ca vẫn có mã đơn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const cs = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP,
      body: { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 90, dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 300, departureWindowMinutes: 1440, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
    });
    assert.equal(cs.status, 201, cs.text);
    thanhTaiXe(w, `pty-${SUP}`);
    // X: đủ tên, 06:00 ngày D (chạy trọn vòng); Y: đủ tên, 12:00 ngày D (kết thúc gián đoạn); Z: thiếu một tên, 15:00 ngày D (409 Xuất bến).
    const X = await chuyenSan(w, { taiXe: SUP, ngay: NGAY_SAU, bd: "06:00", kt: "08:00", gio: "06:30", soNguoi: 3, namSinh: 1911 });
    const Y = await chuyenSan(w, { taiXe: SUP, ngay: NGAY_SAU, bd: "10:00", kt: "12:00", gio: "10:30", soNguoi: 1, namSinh: 1911 });
    const Z = await chuyenSan(w, { taiXe: SUP, ngay: NGAY_SAU, bd: "15:00", kt: "17:00", gio: "15:30", soNguoi: 2, ten: 1, namSinh: 1911 });
    const maDon = [X.don.code, Y.don.code, Z.don.code];
    const cam = (t: string) => [...maDon, ...TEN_VC, "Khách Liên Hệ", "0912345678"].filter((c) => t.includes(c));
    denGio("18:30", NGAY);
    const bodies: { khoa: string; status: number; text: string }[] = [];
    const lenh = async (route: string, khoa: string, path: string, body: Record<string, unknown>, as = SUP) => {
      const r = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${path}`, { as, body: { requestId: uuid(), ...body } });
      assert.ok(r.status < 500, `${khoa}: ${r.status} ${r.text}`);
      bodies.push({ khoa: `${route} — ${khoa}`, status: r.status, text: r.text });
      return r;
    };
    const R = "POST /api/van-chuyen/cuoc-cua-toi/:id";
    // Z thiếu tên: văn phòng thấy mã đơn (chống bài rỗng); tài xế có vế hạn ngoài khung thì không.
    const zVp = await w.call("POST", `/api/van-chuyen/chuyen/${Z.id}/xuat-ben`, { as: ADM, body: { requestId: uuid() } });
    assert.equal(zVp.status, 409, zVp.text);
    assert.ok(zVp.text.includes(Z.don.code), `chống bài rỗng: văn phòng thấy mã đơn: ${zVp.text}`);
    const z = await lenh(`${R}/xuat-ben`, "Xuất bến Z thiếu tên (409)", `${Z.id}/xuat-ben`, {});
    assert.equal(z.status, 409, z.text);
    // X: văn phòng xuất bến sớm; tài xế chạy trọn vòng.
    const xb = await tienDo(w, "van-phong", X.id, "xuat-ben", {}, ADM);
    assert.equal(xb.status, 200, xb.text);
    const gx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${X.id}`, { as: SUP });
    assert.equal(gx.json.trongNgayChay, false, "chống bài rỗng: đang chạy mà ngoài khung");
    assert.deepEqual(cam(gx.text), [], "GET chi tiết ngoài khung");
    const sd = new Map(w.q("SELECT id, seq FROM vc_trip_stop WHERE trip_id = ?", X.id).map((a: any) => [a.id, a.seq]));
    await lenh(`${R}/thu-tu`, "đảo trả trước đón (409)", `${X.id}/thu-tu`, { diem: [{ id: X.diemTra, thuTu: sd.get(X.diemDon) }, { id: X.diemDon, thuTu: sd.get(X.diemTra) }] });
    await lenh(`${R}/thu-tu`, "đổi số giữ thứ tự (200)", `${X.id}/thu-tu`, { diem: [{ id: X.diemTra, thuTu: 7 }] });
    await lenh(`${R}/diem/:sid/da-toi`, "tới điểm đón", `${X.id}/diem/${X.diemDon}/da-toi`, {});
    await lenh(`${R}/phan-bo/:aid/don`, "đã đón", `${X.id}/phan-bo/${X.suat[0]}/don`, {});
    await lenh(`${R}/phan-bo/:aid/vang`, "khách vắng", `${X.id}/phan-bo/${X.suat[1]}/vang`, {});
    await lenh(`${R}/phan-bo/:aid/khach-huy`, "khách huỷ", `${X.id}/phan-bo/${X.suat[2]}/khach-huy`, {});
    await lenh(`${R}/diem/:sid/da-toi`, "tới điểm trả", `${X.id}/diem/${X.diemTra}/da-toi`, {});
    await lenh(`${R}/phan-bo/:aid/tra`, "đã trả", `${X.id}/phan-bo/${X.suat[0]}/tra`, {});
    await lenh(`${R}/ket-thuc`, "kết thúc", `${X.id}/ket-thuc`, {});
    // Y: xuất bến sớm rồi kết thúc gián đoạn.
    denGio("19:30", NGAY); // đủ khoảng nghỉ sau chuyến X (45 phút)
    const yb = await tienDo(w, "van-phong", Y.id, "xuat-ben", {}, ADM);
    assert.equal(yb.status, 200, yb.text);
    await lenh(`${R}/ket-thuc-gian-doan`, "kết thúc gián đoạn", `${Y.id}/ket-thuc-gian-doan`, { lyDo: "GIAN_DOAN_XE_HONG" });
    // Hai route còn lại: bổ sung tên, và Từ chối (sau phép kiểm "trong khung" bên dưới).
    await lenh(`${R}/hanh-khach`, "bổ sung tên", `${Z.id}/hanh-khach`, { chang: [] });
    // ADR-0111 (gói A5): gửi đề nghị chuyển khách — thiếu thân hợp lệ nên 400; thân lỗi cũng phải sạch tên / mã đơn / liên hệ.
    await lenh(`${R}/de-nghi`, "gửi đề nghị chuyển khách (thân lỗi)", `${Z.id}/de-nghi`, {});
    // (3) Qua 03:00 ngày D (hạn Từ chối của Z = 15:00 − 12 giờ; đã qua hạn, trong ngày chạy → TRONG khung): GET chi tiết CÓ mã đơn — chống bài rỗng cho phép (1)
    denGio("03:05", NGAY_SAU);
    const trong = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${Z.id}`, { as: SUP });
    assert.equal(trong.json.trongNgayChay, true, trong.text);
    assert.ok(trong.text.includes(Z.don.code), "trong khung: có mã đơn");
    // Từ chối quá hạn (đồng hồ giả) → 409 refuse_deadline_passed: thân lỗi cũng được quét; đường thành công: tu-choi.test.ts (giờ thật).
    await lenh(`${R}/tu-choi`, "Từ chối", `${Z.id}/tu-choi`, { lyDo: "TCC_KHAC" });
    // (1) mọi thân đều sạch
    for (const b of bodies) assert.deepEqual(cam(b.text), [], `${b.khoa} (${b.status}) lộ: ${b.text}`);
    assert.ok(bodies.some((b) => b.status === 409) && bodies.some((b) => b.status === 200), "chống bài rỗng: có cả thân 409 lẫn 200");
    // (2) tập route đã quét = tập route lệnh POST của tài xế trong mã thật
    const thatLenh = (await routesOf("./modules/van-chuyen/index.ts", "vanChuyenModule")).filter((k) => /^POST \/api\/van-chuyen\/cuoc-cua-toi\/:id\//.test(k)).sort();
    assert.deepEqual([...new Set(bodies.map((b) => b.khoa.split(" — ")[0]!))].sort(), thatLenh, "mỗi route lệnh của tài xế phải có ca ở khối này (và ngược lại)");
  } finally {
    tat();
  }
});

// ---- ADR-0113 Đ2–Đ3 (accepted 2026-10-12), cùng KHỐI vế hạn NGOÀI khung: thân 409 `refuse_blocked_transferred_in` và DTO có `chanTuChoi` KHÔNG kèm tên khách, năm sinh,
// mã đơn của chuyến nhận, mã đơn / mã chuyến của chuyến NGUỒN, liên hệ — dù tài xế (Toàn quyền tự lái) đang ngoài khung xem khách và trước hạn Từ chối. -------------
test("khối vế hạn NGOÀI khung (ADR-0113): chuyến nhận khách chuyển vào, Từ chối trước hạn → 409 refuse_blocked_transferred_in không tên / năm sinh / mã đơn / mã chuyến nguồn / liên hệ; chi tiết cuốc có chanTuChoi và cũng sạch", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const cs = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP,
      body: { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 90, dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 300, departureWindowMinutes: 1440, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
    });
    assert.equal(cs.status, 201, cs.text);
    thanhTaiXe(w, `pty-${SUP}`);
    // S (tài xế công ty, đủ tên, 06:00 ngày D) → B (Toàn quyền tự lái, 15:00 ngày D; hạn Từ chối 03:00 ngày D).
    const S = await chuyenSan(w, { taiXe: DRIVER, ngay: NGAY_SAU, bd: "06:00", kt: "08:00", gio: "06:30", soNguoi: 2, namSinh: 1911, noiDon: "Khách sạn Nguồn" });
    const B = await chuyenSan(w, { taiXe: SUP, ngay: NGAY_SAU, bd: "15:00", kt: "17:00", gio: "15:30", soNguoi: 1, namSinh: 1922, noiDon: "Khách sạn Đích" });
    denGio("18:30", NGAY);
    assert.equal((await tienDo(w, "van-phong", S.id, "xuat-ben", {}, ADM)).status, 200);
    const g = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${S.id}/de-nghi`, { as: DRIVER, body: { requestId: uuid(), denChuyenId: B.id, phamVi: "STOP", diemId: S.diemDon } });
    assert.equal(g.status, 200, g.text);
    const n = await w.call("POST", `/api/van-chuyen/de-nghi/${g.json.deNghi.id}/nhan`, { as: SUP, body: { requestId: uuid() } });
    assert.equal(n.status, 200, n.text);
    assert.equal(n.json.ketQua, "DA_CHUYEN", n.text);
    const cam = (t: string) => [S.don.code, B.don.code, S.ma, ...TEN_VC, "Khách Liên Hệ", "0912345678", "1911", "1922"] /* tên điểm đón (nơi) là dữ liệu chuyến, luôn hiện cho tài xế — không tính */.filter((c) => t.includes(c));
    const ct = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${B.id}`, { as: SUP });
    assert.equal(ct.status, 200, ct.text);
    assert.equal(ct.json.trongNgayChay, false, "chống bài rỗng: ngoài khung xem khách");
    assert.equal(ct.json.chanTuChoi, "KHACH_CHUYEN_VAO", "chống bài rỗng: khách đã chuyển vào");
    assert.deepEqual(cam(ct.text), [], `GET chi tiết lộ: ${ct.text}`);
    const r = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${B.id}/tu-choi`, { as: SUP, body: { requestId: uuid(), lyDo: "TCC_KHAC" } });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "refuse_blocked_transferred_in", r.text);
    assert.deepEqual(cam(r.text), [], `thân 409 lộ: ${r.text}`);
  } finally {
    tat();
  }
});
