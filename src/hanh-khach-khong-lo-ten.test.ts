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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as esbuild from "esbuild";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import type { AppModule } from "./shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

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
const D = inDays(3);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

test("họ tên, năm sinh hành khách chỉ rời máy chủ ở GET/POST /passengers: đủ tuyến, nhật ký sạch, màn khác sạch, Bảng tin chỉ id + loại", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  const svc = (extra: Record<string, unknown> = {}) => ({ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, ...extra });
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
    "POST /api/orders/:id/legs/:legId/close": async () => {
      const l = (await doc()).services[0].legs.find((x: any) => x.direction === "RETURN");
      await goi("đóng chặng", "POST", `/api/orders/${id}/legs/${l.id}/close`, SALES, { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" }, 200);
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
