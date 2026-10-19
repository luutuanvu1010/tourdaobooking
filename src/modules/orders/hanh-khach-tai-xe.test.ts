// Đợt 5 A-1b (ADR-0052 D5b; kế hoạch Task 13) — câu ghi hành khách do TÀI XẾ nhập `cauThemHanhKhachTaiXe` (orders cấp câu, van-chuyen gọi trong lô):
// chèn đúng `source = 'DRIVER'`, `person_key = id`, chuỗi mới (previous_id NULL); 0 dòng khi: không có dòng nhật ký gác, đơn nháp / huỷ / đã giao, đơn đã đủ
// người có tên (không thêm quá số khách HIỆU LỰC của dịch vụ đông nhất — L-A1). `kiemHanhKhachTaiXe`: kiểm thân (họ tên, năm sinh, loại khách).
// Hàm không tự kiểm quyền (nơi gọi đứng sau can(trip.passenger.add) — bài quét src/orders-cong-bo.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

type Mod = typeof import("./index.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const { cauThemHanhKhachTaiXe, kiemHanhKhachTaiXe } = await loadModule();

const SALES = "11111111-1111-4111-8111-111111111111";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = new Date(Date.now() + 7 * 3600e3 + 3 * 86400e3).toISOString().slice(0, 10);
const AT = "2026-10-05T03:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
async function don(w: any, o: { confirm?: boolean; pax?: number; ten?: number } = {}) {
  const pax = o.pax ?? 3;
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Chủ Đơn", customerPhone: "0912345678", customerEmail: "", customerNote: "", paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: pax, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D,
        legs: [{ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn A", dropoffLocationId: LOC, dropoffPlace: "" }] }],
      passengers: Array.from({ length: o.ten ?? 1 }, (_, i) => ({ fullName: `Khách Văn Phòng ${i + 1}`, birthYear: 1980 + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  if (o.confirm !== false) assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return r.json.order.id as string;
}
let soNhatKy = 0;
const nhatKy = (w: any, orderId: string): string => {
  const id = `00000000-0000-4000-8000-${String(++soNhatKy).padStart(12, "0")}`;
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, ?, ?, 'updated', ?)").run(id, orderId, SALES, AT);
  return id;
};
const vao = (orderId: string, id: string, o: Partial<{ fullName: string; birthYear: number; paxCode: "adult" | "child" | "senior" | "infant" | null }> = {}) => ({
  id, orderId, fullName: "Khách Tài Xế Nhập", birthYear: 1990, paxCode: null, at: AT, by: SALES, ...o,
});
const dong = (w: any, orderId: string) => w.sqlite.prepare("SELECT id, person_key, previous_id, source, full_name, birth_year, pax_code FROM ord_passenger WHERE order_id = ? ORDER BY created_at, rowid").all(orderId).map((r: any) => ({ ...r }));
const chay = async (w: any, st: D1PreparedStatement) => (await st.run()).meta.changes;

test("cauThemHanhKhachTaiXe: chèn source DRIVER, person_key = id, chuỗi mới; đúng họ tên / năm sinh / loại", async () => {
  const w = setup();
  const o = await don(w);
  const id = "aaaaaaaa-0000-4000-8000-000000000001";
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(o, id, { paxCode: "child" }), nhatKy(w, o))), 1);
  const moi = dong(w, o).find((r: any) => r.id === id);
  assert.deepEqual(moi, { id, person_key: id, previous_id: null, source: "DRIVER", full_name: "Khách Tài Xế Nhập", birth_year: 1990, pax_code: "child" });
});

test("cauThemHanhKhachTaiXe: 0 dòng khi không có dòng nhật ký gác / đơn nháp / đơn huỷ / đã đủ người có tên", async () => {
  const w = setup();
  const o = await don(w);
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(o, "aaaaaaaa-0000-4000-8000-000000000002"), "khong-co-nhat-ky")), 0, "không nhật ký");
  const nhap = await don(w, { confirm: false });
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(nhap, "aaaaaaaa-0000-4000-8000-000000000003"), nhatKy(w, nhap))), 0, "đơn nháp");
  const huy = await don(w);
  const cur = (await w.call("GET", `/api/orders/${huy}`, { as: SALES })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${huy}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y", reason: "Khách huỷ", expectedUpdatedAt: cur.updatedAt } })).status, 200);
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(huy, "aaaaaaaa-0000-4000-8000-000000000004"), nhatKy(w, huy))), 0, "đơn huỷ");
  const du = await don(w, { pax: 2, ten: 2 });
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(du, "aaaaaaaa-0000-4000-8000-000000000005"), nhatKy(w, du))), 0, "đủ người có tên");
  const conMot = await don(w, { pax: 2, ten: 1 });
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(conMot, "aaaaaaaa-0000-4000-8000-000000000006"), nhatKy(w, conMot))), 1, "còn một chỗ");
  assert.equal(await chay(w, await cauThemHanhKhachTaiXe(w.env.DB, vao(conMot, "aaaaaaaa-0000-4000-8000-000000000007"), nhatKy(w, conMot))), 0, "vừa đủ → thêm nữa 0");
  assert.equal(dong(w, o).filter((r: any) => r.source === "DRIVER").length, 0);
});

test("kiemHanhKhachTaiXe: họ tên (cắt khoảng trắng, không trống, không quá dài), năm sinh hợp lệ, loại khách trong tập hoặc null", () => {
  const nam = "2026-10-05";
  assert.deepEqual(kiemHanhKhachTaiXe({ fullName: "  Nguyễn  Văn A ", birthYear: 1990, paxCode: "adult" }, nam), { ok: true, value: { fullName: "Nguyễn Văn A", birthYear: 1990, paxCode: "adult" } });
  assert.deepEqual(kiemHanhKhachTaiXe({ fullName: "Bé B", birthYear: 2020 }, nam), { ok: true, value: { fullName: "Bé B", birthYear: 2020, paxCode: null } });
  for (const sai of [null, {}, { fullName: "", birthYear: 1990 }, { fullName: "A", birthYear: 1800 }, { fullName: "A", birthYear: 2027 }, { fullName: "A", birthYear: "1990" }, { fullName: "A", birthYear: 1990, paxCode: "baby" }, { fullName: "x".repeat(121), birthYear: 1990 }]) {
    const r = kiemHanhKhachTaiXe(sai, nam);
    assert.equal(r.ok, false, JSON.stringify(sai));
    assert.ok(!r.ok && /[ăâđêôơưàáạảãèéẹẻẽ]/i.test(r.message), "câu lỗi tiếng Việt");
  }
});
