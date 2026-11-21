// Bộ lọc khối «Lô trong kho» ở MÁY CHỦ (kế hoạch 16 việc 21/11/2026, Việc 4): GET /api/ve/lo?tatCa=1&ma=…|boMa=…&tim=… lọc TRƯỚC khi chia trang 50,
// tìm KHÔNG phân biệt dấu (tên dịch vụ, mã, tên in trên vé), không bao giờ nới nguồn vé được xem (ADR-0175 Đ1.4). Qua ứng dụng THẬT (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { bangNhomTheoMa, dieuKienLo, thamSoLo } from "../../shared/loc-dich-vu-kho.ts";
import { CHUA_PHAN_LOAI } from "../../shared/loc-danh-muc.ts";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT = U(3);
const AT = "2026-01-01T00:00:00.000Z";
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };

function setup() {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT, "0900000003", ["ACCOUNTING"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  }
  const dv = w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 100000, ?, 1, ?, ?)");
  dv.run("VW1", "Vinwonders Nha Trang", 1, AT, AT);
  dv.run("TD4", "Tour 4 đảo", 2, AT, AT);
  dv.run("LAN", "Lặn biển Hòn Mun", 3, AT, AT);
  return w;
}
/** Chèn thẳng một lô (khuôn bài chia trang của ADR-0217): `giay` để thứ tự tạo cố định (mới nhất lên đầu). */
const loThang = (w: any, o: { ma: string; ten?: string; nguon?: "HANG_NGOAI" | "TOUR_DAO"; giay: number }): string => {
  const id = crypto.randomUUID();
  const t = new Date(Date.parse(AT) + o.giay * 1000).toISOString();
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES (?, ?, 'ADULT', ?, 'ACTIVE', ?, ?, ?)").run(id, o.ma, o.ten ?? "Vé thử", o.nguon ?? "HANG_NGOAI", t, t);
  return id;
};
const ds = (w: any, as: string, q: string) => w.call("GET", `/api/ve/lo?tatCa=1${q}`, { as });
const qs = (cap: [string, string][]) => cap.map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("");

test("lọc theo nhóm TRƯỚC khi chia trang: 55 lô nhóm A + 3 lô nhóm B ⇒ trang 1 có 50, trang 2 có 5, không lô nào của B", async () => {
  const w = setup();
  const lotA = Array.from({ length: 55 }, (_x, i) => loThang(w, { ma: "VW1", giay: i * 2 }));
  const lotB = [0, 1, 2].map((i) => loThang(w, { ma: "TD4", giay: i * 2 + 1 }));
  const bang = bangNhomTheoMa([{ code: "VW1", groupCode: "VUI_CHOI" }, { code: "TD4", groupCode: "TOUR" }, { code: "LAN", groupCode: "TOUR" }]);
  const q = qs(thamSoLo(dieuKienLo(bang, { nhom: "VUI_CHOI", tim: "" })));
  const p1 = await ds(w, SUPER, q);
  assert.equal(p1.status, 200, p1.text);
  assert.equal(p1.json.lo.length, 50);
  assert.equal(p1.json.coTrangSau, true);
  const p2 = await ds(w, SUPER, `${q}&trang=2`);
  assert.equal(p2.json.lo.length, 5);
  assert.equal(p2.json.coTrangSau, false);
  const thay = [...p1.json.lo, ...p2.json.lo].map((l: any) => l.loId);
  assert.equal(new Set(thay).size, 55, "hai trang không trùng, không sót");
  assert.ok(thay.every((id: string) => lotA.includes(id)), "chỉ lô nhóm A");
  assert.ok(!thay.some((id: string) => lotB.includes(id)));
  assert.deepEqual(thay, [...lotA].reverse(), "giữ thứ tự mới nhất lên đầu như danh sách không lọc");
  assert.ok(p1.json.lo.every((l: any) => l.catalogCode === "VW1" && l.tenDichVu === "Vinwonders Nha Trang"), "mỗi lô kèm mã dịch vụ");
  const p3 = await ds(w, SUPER, `${q}&trang=3`);
  assert.equal(p3.status, 200);
  assert.deepEqual([p3.json.lo.length, p3.json.coTrangSau], [0, false], "trang quá cuối: rỗng để trang lùi lại");
  const tB = await ds(w, SUPER, qs(thamSoLo(dieuKienLo(bang, { nhom: "TOUR", tim: "" }))));
  assert.deepEqual(tB.json.lo.map((l: any) => l.loId), [...lotB].reverse());
});

test("tìm không phân biệt dấu: «vin» và «vịn» ra cùng kết quả; khớp tên dịch vụ, mã, tên in trên vé", async () => {
  const w = setup();
  const vw = loThang(w, { ma: "VW1", ten: "Vé vào cổng", giay: 1 });
  const vinh = loThang(w, { ma: "TD4", ten: "Tour Vịnh Nha Trang", giay: 2 });
  const lan = loThang(w, { ma: "LAN", ten: "Lặn ngắm san hô", giay: 3 });
  const tim = async (chu: string) => ((await ds(w, SUPER, `&tim=${encodeURIComponent(chu)}`)).json.lo as any[]).map((l) => l.loId).sort();
  assert.deepEqual(await tim("vin"), [vinh, vw].sort(), "«vin»: tên dịch vụ Vinwonders + tên in «Vịnh»");
  assert.deepEqual(await tim("vịn"), await tim("vin"));
  assert.deepEqual(await tim("VỊNH"), [vinh]);
  assert.deepEqual(await tim("san ho"), [lan], "tên in trên vé, gõ không dấu");
  assert.deepEqual(await tim("hon mun"), [lan], "tên dịch vụ, gõ không dấu");
  assert.deepEqual(await tim("td4"), [vinh], "mã dịch vụ");
  assert.deepEqual(await tim("khong co"), []);
  // Nhóm VÀ chữ tìm.
  const bang = bangNhomTheoMa([{ code: "VW1", groupCode: "VUI_CHOI" }, { code: "TD4", groupCode: "TOUR" }, { code: "LAN", groupCode: "TOUR" }]);
  const r = await ds(w, SUPER, qs(thamSoLo(dieuKienLo(bang, { nhom: "TOUR", tim: "vịn" }))));
  assert.deepEqual(r.json.lo.map((l: any) => l.loId), [vinh]);
});

test("«Chưa phân loại»: lô của mã đã rời danh mục và mã không nhóm đều hiện; lô của mã có nhóm thì không", async () => {
  const w = setup();
  const coNhom = loThang(w, { ma: "VW1", giay: 1 });
  const khongNhom = loThang(w, { ma: "LAN", giay: 2 });
  const roiDanhMuc = loThang(w, { ma: "CU9", ten: "Vé dịch vụ cũ", giay: 3 });
  const bang = bangNhomTheoMa([{ code: "VW1", groupCode: "VUI_CHOI" }, { code: "TD4", groupCode: "TOUR" }, { code: "LAN", groupCode: null }]);
  const r = await ds(w, SUPER, qs(thamSoLo(dieuKienLo(bang, { nhom: CHUA_PHAN_LOAI, tim: "" }))));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.lo.map((l: any) => l.loId), [roiDanhMuc, khongNhom]);
  assert.ok(!r.json.lo.some((l: any) => l.loId === coNhom));
  const cu = r.json.lo.find((l: any) => l.loId === roiDanhMuc);
  assert.deepEqual([cu.catalogCode, cu.tenDichVu], ["CU9", null], "mã đã rời danh mục: còn mã, không tên");
  assert.deepEqual((await ds(w, SUPER, "&tim=dich%20vu%20cu")).json.lo.map((l: any) => l.loId), [roiDanhMuc], "vẫn tìm được theo tên in trên vé");
});

test("bộ lọc không bao giờ nới nguồn vé: Kế toán lọc đúng mã của lô hãng ngoài vẫn 0 lô; Bán hàng thấy lô Tour Đảo như danh sách không lọc", async () => {
  const w = setup();
  const hn = loThang(w, { ma: "VW1", nguon: "HANG_NGOAI", giay: 1 });
  const td = loThang(w, { ma: "TD4", nguon: "TOUR_DAO", giay: 2 });
  const kt = await ds(w, KT, "&ma=VW1");
  assert.equal(kt.status, 200, kt.text);
  assert.deepEqual(kt.json.lo, [], "Kế toán không giữ ô kho hãng ngoài");
  assert.deepEqual((await ds(w, KT, "&tim=vin")).json.lo, []);
  assert.deepEqual((await ds(w, KT, "&boMa=VW1")).json.lo.map((l: any) => l.loId), [td]);
  // Bán hàng xem số lượng được cả lô Tour Đảo ở danh sách này (ADR-0175 Đ1.4, chiXem): lọc không đổi điều đó.
  const sa = await ds(w, SALES, "&ma=VW1,TD4");
  assert.deepEqual(sa.json.lo.map((l: any) => [l.loId, l.nguon]), [[td, "TOUR_DAO"], [hn, "HANG_NGOAI"]]);
});

test("tham số lọc sai ⇒ 400 tiếng Việt; không tham số lọc thì như cũ (kèm mã dịch vụ)", async () => {
  const w = setup();
  loThang(w, { ma: "VW1", giay: 1 });
  for (const q of ["&ma=VW1,có dấu", "&ma=VW1&boMa=TD4", `&tim=${"a".repeat(101)}`, "&boMa=A;B"]) {
    const r = await ds(w, SUPER, q);
    assert.equal(r.status, 400, q);
    assert.match(r.json.error.message, /Bộ lọc/, q);
  }
  const thuong = await ds(w, SUPER, "");
  assert.equal(thuong.json.lo.length, 1);
  assert.equal(thuong.json.lo[0].catalogCode, "VW1");
  assert.equal((await ds(w, SUPER, "&tim=%20%20")).json.lo.length, 1, "chữ tìm trắng = không lọc");
});

test("Lô đã huỷ gần đây kèm mã dịch vụ của lô (để trang lọc theo nhóm)", async () => {
  const w = setup();
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "LAN", nhomKhach: "ADULT", tenSanPham: "Lặn ngắm san hô" } });
  assert.equal(lo.status, 201, lo.text);
  const them = await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve: [{ noiDung: PNG(1), maVe: "TA.10000000001", tuNgay: "2026-10-24", denNgay: "2099-11-23" }] } });
  assert.equal(them.json.themDuoc, 1, them.text);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/bo`, { as: SALES, body: {} })).status, 200);
  const huy = await w.call("GET", "/api/ve/lo-da-huy", { as: SALES });
  assert.equal(huy.status, 200, huy.text);
  assert.deepEqual(huy.json.lo.map((l: any) => [l.loId, l.catalogCode]), [[lo.json.loId, "LAN"]]);
});
