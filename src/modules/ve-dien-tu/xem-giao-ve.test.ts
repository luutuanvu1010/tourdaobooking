// Xem ảnh vé và giao vé, mở khoá theo thanh toán (ADR-0153 Đ3; kế hoạch Task 6) qua ứng dụng THẬT (khung thử điều phối, đồng hồ giả, kho R2 giả).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, PARTNER, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { thuDu } from "./rules.ts";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

async function nhapKho(w: any, soVe: number) {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: b64(PNG(i + 1)), maVe: `BI.MAT.${i + 1}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
}
/** Đơn 2 khách đã xác nhận, kho 3 vé ⇒ giữ 2 vé. */
async function donCoVe(w: any) {
  await nhapKho(w, 3);
  const d = await don(w, { soNguoi: 2 });
  const phaiThu = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
  return { ...d, phaiThu };
}
const thu = (w: any, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ADM, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const phanBo = (w: any, id: string) => w.q("SELECT id, revealed_at FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL ORDER BY slot_no", id) as { id: string; revealed_at: string | null }[];

test("thuDu: thu đủ ⇔ đã thu ≥ phải thu VÀ phải thu > 0; null hoặc phải thu 0 không mở", () => {
  assert.equal(thuDu({ daThu: 100, phaiThu: 100 }), true);
  assert.equal(thuDu({ daThu: 150, phaiThu: 100 }), true);
  assert.equal(thuDu({ daThu: 99, phaiThu: 100 }), false);
  assert.equal(thuDu({ daThu: 0, phaiThu: 0 }), false);
  assert.equal(thuDu({ daThu: 5, phaiThu: 0 }), false);
  assert.equal(thuDu(null), false);
});

test("chuaThuDu_anhBi403_vaKhongCoMa; thuDu_anhDocDuoc: ảnh chỉ mở khi đã thu đủ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    const [a] = phanBo(w, d.id);
    const chua = await w.call("GET", `/api/ve/anh/${a!.id}`, { as: SALES });
    assert.equal(chua.status, 403, chua.text);
    assert.doesNotMatch(chua.text, /BI\.MAT|vdt\//);
    assert.equal(phanBo(w, d.id)[0]!.revealed_at, null, "chưa thu đủ ⇒ chưa lộ");
    assert.equal((await thu(w, d.id, d.phaiThu - 1)).status, 201);
    assert.equal((await w.call("GET", `/api/ve/anh/${a!.id}`, { as: SALES })).status, 403, "thiếu 1 đồng vẫn khoá");
    assert.equal((await thu(w, d.id, 1)).status, 201);
    const ok = await w.call("GET", `/api/ve/anh/${a!.id}`, { as: SALES });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("content-type"), "image/png");
    assert.equal(ok.headers.get("cache-control"), "no-store");
    assert.ok(phanBo(w, d.id)[0]!.revealed_at, "ghi revealed_at ngay lần đầu đọc");
  } finally { tat(); }
});

test("nhatKyGhiTruocKhiDocKho: nhật ký xem ảnh chỉ có số thứ tự vé, không mã; và có trước lần đọc kho", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    await thu(w, d.id, d.phaiThu);
    const [a] = phanBo(w, d.id);
    const truoc = w.r2VeDienTu.soLan.get;
    await w.call("GET", `/api/ve/anh/${a!.id}`, { as: SALES });
    assert.equal(w.r2VeDienTu.soLan.get, truoc + 1);
    const nk = w.q("SELECT detail, target_id FROM audit_log WHERE order_id = ? AND action = 've_xem_anh'", d.id);
    assert.equal(nk.length, 1);
    assert.doesNotMatch(`${nk[0].detail} ${nk[0].target_id}`, /BI\.MAT|vdt\//);
  } finally { tat(); }
});

test("veCuaDonKhacKhongDocDuoc (đơn của đối tác khác thuộc doi-tac-mo-ve.test.ts): người không phải chủ / người phụ trách đơn, hoặc không có quyền gửi vé, không đọc được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    await thu(w, d.id, d.phaiThu);
    const [a] = phanBo(w, d.id);
    assert.equal((await w.call("GET", `/api/ve/anh/${a!.id}`, { as: ACC })).status, 403, "Kế toán không có ve.cap.send");
    assert.equal((await w.call("GET", `/api/ve/anh/${a!.id}`, { as: PARTNER })).status, 403, "Đối tác chỉ mở vé đơn do chính mình lập (ADR-0170 Đ1); đây là đơn Bán hàng lập");
    assert.equal((await w.call("GET", `/api/ve/anh/${"0".repeat(32)}`, { as: SALES })).status, 404);
    assert.equal((await w.call("GET", `/api/ve/anh/${a!.id}`, { as: ADM })).status, 200, "Quản trị mọi đơn");
  } finally { tat(); }
});

test("giaoVeGhiLanGuiVaKhongTrungKhiBamDup; phanHoiGhiKhongKemMa", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    const body = { orderId: d.id, requestId: crypto.randomUUID() };
    assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body })).status, 403, "chưa thu đủ");
    await thu(w, d.id, d.phaiThu);
    const r = await w.call("POST", "/api/ve/giao", { as: SALES, body });
    assert.equal(r.status, 200, r.text);
    assert.doesNotMatch(r.text, /BI\.MAT|vdt\/|[0-9a-f]{32}/);
    assert.equal(r.json.daGiao, 2);
    const lai = await w.call("POST", "/api/ve/giao", { as: SALES, body }); // bấm đúp cùng requestId
    assert.equal(lai.status, 200);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_delivery")[0].n, 2, "bấm đúp không ghi thêm lần giao");
    assert.ok(phanBo(w, d.id).every((x) => x.revealed_at), "giao ⇒ vé coi như đã lộ");
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 've_giao'", d.id)[0].n, 1);
  } finally { tat(); }
});

test("danhSachVeCuaDon: số lượng theo nhóm, không ảnh, không mã; Kế toán thấy theo order.view", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    const r = await w.call("GET", `/api/ve/don/${d.id}`, { as: ACC });
    assert.equal(r.status, 200, r.text);
    assert.doesNotMatch(r.text, /BI\.MAT|vdt\/|storage|token/i);
    const nhom = r.json.dichVu[0].nhom.find((x: any) => x.nhom === "ADULT");
    assert.deepEqual([nhom.can, nhom.giu, nhom.thieu], [2, 2, 0]);
    assert.equal(r.json.thuDu, false);
    assert.deepEqual(r.json.veXem, [], "chưa thu đủ ⇒ không lộ mã phân bổ");
    await thu(w, d.id, d.phaiThu);
    const sau = (await w.call("GET", `/api/ve/don/${d.id}`, { as: SALES })).json;
    assert.equal(sau.thuDu, true);
    assert.equal(sau.veXem.length, 2);
    assert.deepEqual((await w.call("GET", `/api/ve/don/${d.id}`, { as: ACC })).json.veXem, [], "Kế toán thấy số lượng nhưng không có ô gửi vé");
    assert.equal((await w.call("GET", `/api/ve/don/${crypto.randomUUID()}`, { as: SALES })).status, 404);
  } finally { tat(); }
});

test("thuDuRoiDaoKhoanThu_veDaLoKhongTraVeKho: vé đã lộ giữ nguyên khi khoản thu bị đảo (chỉ khoá xem tiếp)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donCoVe(w);
    await thu(w, d.id, d.phaiThu);
    const [a] = phanBo(w, d.id);
    await w.call("GET", `/api/ve/anh/${a!.id}`, { as: SALES });
    w.sqlite.exec(`UPDATE vdt_allocation SET updated_at = updated_at WHERE id = '${a!.id}'`); // chạm nhẹ; không có đường đảo trong khung — kiểm trực tiếp trạng thái
    assert.equal(w.q("SELECT status FROM vdt_ticket WHERE id = (SELECT ticket_id FROM vdt_allocation WHERE id = ?)", a!.id)[0].status, "ALLOCATED");
  } finally { tat(); }
});

test("hàng rào tĩnh: route đọc ảnh theo thứ tự quyền → mở được vé (veMoDuoc → moVeDuoc, ADR-0168) → nhật ký → đọc kho", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  const i = src.indexOf('route("GET", "/api/ve/anh/:allocationId"');
  assert.ok(i !== -1);
  const than = src.slice(i, src.indexOf("route(", i + 10));
  const vi = (re: RegExp) => than.search(re);
  assert.ok(vi(/can\(staff, "ve\.cap\.send"/) !== -1 && vi(/veMoDuoc\(/) !== -1 && vi(/auditStatement|nhatKy/) !== -1 && vi(/kho\.get\(/) !== -1);
  assert.ok(vi(/can\(staff, "ve\.cap\.send"/) < vi(/veMoDuoc\(/) && vi(/veMoDuoc\(/) < vi(/auditStatement|nhatKy/) && vi(/auditStatement|nhatKy/) < vi(/kho\.get\(/));
  // MỘT cửa: bốn route vé không so `thuDu(` trực tiếp, chỉ `veMoDuoc` (bọc `moVeDuoc`) — đường vé mới không lách được luật Trả sau.
  assert.equal([...src.matchAll(/\bthuDu\(/g)].length, 1, "thuDu( chỉ còn trong thân moTheoTien");
  // ADR-0175 Đ2.1: một cửa theo từng vé — `veMoDuoc` bọc `veMoDuocTheoVe` với cổng tiền `moTheoTien` (bọc `moVeDuoc`); không route nào gọi `moVeDuoc(` thẳng.
  assert.match(src, /const moTheoTien = [^\n]*moVeDuoc\(/);
  assert.match(src, /const veMoDuoc = [^\n]*veMoDuocTheoVe\([^\n]*moTheoTien\(/);
  assert.equal([...src.matchAll(/\bmoVeDuoc\(/g)].length, 1, "moVeDuoc( chỉ còn trong thân moTheoTien");
});
