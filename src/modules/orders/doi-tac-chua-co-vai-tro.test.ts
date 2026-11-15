// ADR-0185 Đ1 (a) (chủ duyệt 2026-11-08) — cổng `congDoiTacChuaCoVaiTro`: người LẬP đơn giữ quyền Đối tác mà người hưởng tính ở bước xác nhận ra «không người hưởng» ⇒ 409
// `doi_tac_chua_co_vai_tro`, không ghi gì (không xác nhận, không mở yêu cầu kiểm vé, không bản chụp, không nhật ký). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
// Tiêu chí nghiệm thu 1–6 của ADR + ca K3 (kế hoạch: cổng sớm ở Còn vé) + hồi quy + thứ tự theo mã nguồn. Mọi bài khẳng định MÃ lỗi; chỉ ca đầu của mỗi câu so nguyên hằng
// (chủ đổi chữ ở hằng — Hiến chương 5.27 — mà không làm đỏ bài khác). Hàng rào H1 (docs/SO-HANG-RAO.md): bỏ dòng gọi cổng trong `kiemCongXacNhan` ⇒ tiêu chí 1 ĐỎ;
// bỏ lời gọi sớm ở `quyet-dinh` ⇒ ca K3 ĐỎ (nhận `pickup_time_required`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, LAI, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";

// Tệp cổng import không đuôi (chạy trong Worker): gói bằng esbuild như src/tai-xe-cong.test.ts, chỉ để đọc hằng câu và gọi cổng với CSDL ném lỗi.
const goi = await esbuild.build({ entryPoints: [new URL("./xac-nhan-chung.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const chung = (await import(`data:text/javascript;base64,${Buffer.from(goi.outputFiles[0]!.text).toString("base64")}`)) as typeof import("./xac-nhan-chung.ts");

const DT_CU = "8a8a8a8a-8a8a-4a8a-8a8a-8a8a8a8a8a8a"; // Đối tác kiểu cũ: vai trò đối tác đã kết thúc, hồ sơ chỉ còn vai STAFF (seedStaff kieuCu)
const MA = "doi_tac_chua_co_vai_tro";

function dung() {
  const w = setup();
  seedStaff(w.sqlite, { id: DT_CU, phone: "0900000010", name: "Đối Tác Cũ", perms: ["PARTNER"], kieuCu: true });
  return w;
}
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const xacNhan = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const trangThai = (w: any, id: string): string => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const benDat = (w: any, id: string): string | null => w.q("SELECT booker_party_id b FROM orders WHERE id = ?", id)[0].b;
const soChup = (w: any, id: string): number => Number(w.q("SELECT count(*) n FROM ord_service_terms WHERE order_id = ?", id)[0].n);
const nguoiHuong = (w: any, id: string): (string | null)[] => w.q("SELECT DISTINCT beneficiary_party_id b FROM ord_service_terms WHERE order_id = ?", id).map((r: any) => r.b);
const soNhatKy = (w: any, id: string, action: string): number => Number(w.q("SELECT count(*) n FROM audit_log WHERE order_id = ? AND action = ?", id, action)[0].n);
const soYeuCau = (w: any, id: string): number => Number(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ?", id)[0].n);
const soYeuCauMo = (w: any, id: string): number => Number(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].n);
/** Dữ liệu sửa tay: vai trò đối tác của hồ sơ bị kết thúc SAU khi tài khoản đã giữ quyền Đối tác — trigger lc1c chỉ canh lúc mở quyền nên không thấy. */
const ketThucVaiTro = (w: any, staffId: string) => w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-02-01' WHERE id = ?").run(`r-${staffId}`);
/** Còn vé với đúng mốc + yêu cầu ĐANG LƯU (người xét vừa đọc) — khuôn con-ve-chot-gio.test.ts. */
function quyetDinh(w: any, id: string, as: string, extra: Record<string, unknown>) {
  const u = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0].u;
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: u, ...extra } });
}

test("tiêu chí 1: Đối tác kiểu cũ (hồ sơ chỉ vai STAFF) Gửi đơn không cần kiểm vé → 409 câu ca 1; đơn nháp, không bản chụp, không nhật ký confirmed", async () => {
  const w = dung();
  const o = await lap(w, DT_CU, [svc("ZB1", inDays(3))]);
  assert.equal(benDat(w, o.id), null, "chống bài rỗng: máy chủ không ép bên đặt cho tài khoản kiểu cũ");
  const r = await guiDon(w, o.id, DT_CU);
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: MA, message: chung.CAU_DOI_TAC_CHUA_CO_VAI_TRO });
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(soChup(w, o.id), 0, "không bản chụp");
  assert.equal(soNhatKy(w, o.id, "confirmed"), 0, "không nhật ký confirmed");
  assert.equal(soYeuCau(w, o.id), 0, "không mở yêu cầu");
});

test("tiêu chí 2: như trên với dịch vụ cần kiểm vé (nhánh A) → 409 cùng mã; không mở yêu cầu kiểm vé", async () => {
  const w = dung();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, DT_CU, [svc("ZA1", inDays(3))]);
  const r = await guiDon(w, o.id, DT_CU);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, MA);
  assert.equal(soYeuCau(w, o.id), 0);
  assert.equal(trangThai(w, o.id), "draft");
});

test("tiêu chí 3 (Review Focus 1): nháp lưu lúc chưa có vai trò, rồi được gán Công ty lữ hành → Gửi đơn 409 câu ca 2; lưu lại rồi Gửi đơn → xác nhận, người hưởng là hồ sơ đối tác", async () => {
  const w = dung();
  const o = await lap(w, DT_CU, [svc("ZB1", inDays(3))]);
  const gan = await w.call("PUT", `/api/staff/${DT_CU}/roles`, { as: SUP, body: { roles: ["TRAVEL_AGENCY"] } });
  assert.equal(gan.status, 200, gan.text);
  const r = await guiDon(w, o.id, DT_CU);
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: MA, message: chung.CAU_NHAP_LUU_TRUOC_KHI_CO_VAI_TRO });
  assert.equal(soChup(w, o.id), 0);
  const luu = await w.call("PUT", `/api/orders/${o.id}`, { as: DT_CU, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], expectedUpdatedAt: o.updatedAt } });
  assert.equal(luu.status, 200, luu.text);
  assert.equal(benDat(w, o.id), `pty-${DT_CU}`, "lưu lại thì máy chủ ép bên đặt là hồ sơ đối tác");
  const lai = await guiDon(w, o.id, DT_CU);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(nguoiHuong(w, o.id), [`pty-${DT_CU}`]);
});

test("tiêu chí 4: yêu cầu kiểm vé đã mở, vai trò đối tác của người lập bị kết thúc (sửa tay) → văn phòng Còn vé 409 câu ca 3; đơn nháp, yêu cầu còn mở, không bản chụp", async () => {
  const w = dung();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, PARTNER, [svc("ZA1", inDays(3))]);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 201, g.text);
  ketThucVaiTro(w, PARTNER);
  const r = await quyetDinh(w, o.id, B, { ketQua: "CON_VE" });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: MA, message: chung.CAU_NGUOI_LAP_CHUA_CO_VAI_TRO });
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(soYeuCauMo(w, o.id), 1, "yêu cầu còn mở");
  assert.equal(soChup(w, o.id), 0);
  assert.equal(soNhatKy(w, o.id, "confirmed"), 0);
});

test("K3: yêu cầu mang cờ «cần chốt giờ», người lập mất vai trò → Còn vé không gửi giờ nhận 409 doi_tac_chua_co_vai_tro, KHÔNG phải pickup_time_required", async () => {
  const w = dung();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3), [leg(inDays(3), null)])]);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 201, g.text);
  assert.equal(w.q("SELECT pickup_time_required p FROM ord_confirm_request WHERE order_id = ?", o.id)[0].p, 1, "chống bài rỗng: yêu cầu mang cờ chốt giờ");
  ketThucVaiTro(w, PARTNER);
  const r = await quyetDinh(w, o.id, B, { ketQua: "CON_VE" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, MA);
  assert.equal(trangThai(w, o.id), "draft");
});

test("tiêu chí 5 (Review Focus 2): Toàn quyền đang «xem như» Đối tác Gửi đơn → 409; thoát vai, gửi nháp của chính mình → xác nhận như hôm nay", async () => {
  const w = dung();
  await w.token(SUP);
  const bat = await w.call("POST", "/api/auth/xem-nhu-vai", { as: SUP, body: { role: "PARTNER" } });
  assert.equal(bat.status, 200, bat.text);
  const o = await lap(w, SUP, [svc("ZB1", inDays(3))]);
  const r = await guiDon(w, o.id, SUP);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, MA);
  assert.equal(trangThai(w, o.id), "draft");
  const thoat = await w.call("DELETE", "/api/auth/xem-nhu-vai", { as: SUP });
  assert.equal(thoat.status, 200, thoat.text);
  const o2 = await lap(w, SUP, [svc("ZB1", inDays(3))]);
  const r2 = await guiDon(w, o2.id, SUP);
  assert.equal(r2.status, 200, r2.text);
  assert.equal(trangThai(w, o2.id), "confirmed");
});

test("tiêu chí 6 (Review Focus 4): đơn văn phòng cho khách lẻ và «Đặt qua đối tác» xác nhận như hôm nay; cổng không đọc câu nào khi người lập không giữ quyền Đối tác", async () => {
  const w = dung();
  const le = await lap(w, A, [svc("ZB1", inDays(3))]);
  const r1 = await xacNhan(w, le.id, A);
  assert.equal(r1.status, 200, r1.text);
  assert.equal(trangThai(w, le.id), "confirmed");
  const qua = await lap(w, A, [svc("ZB1", inDays(3))], { bookerPartyId: `pty-${PARTNER}` });
  assert.equal(benDat(w, qua.id), `pty-${PARTNER}`, "chống bài rỗng: đơn đặt qua đối tác");
  const r2 = await xacNhan(w, qua.id, A);
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(nguoiHuong(w, qua.id), [`pty-${PARTNER}`]);
  const dbNemLoi = { prepare() { throw new Error("cổng không được đọc CSDL khi người lập không giữ quyền Đối tác"); }, batch() { throw new Error("không ghi"); } } as unknown as D1Database;
  assert.deepEqual(await chung.congDoiTacChuaCoVaiTro(dbNemLoi, { nguoiLap: null, order: { bookerPartyId: null, services: [] } as never, today: "2026-11-08" }), { bang: null });
});

test("hồi quy: Đối tác có vai trò Gửi đơn → xác nhận, người hưởng là hồ sơ của nó; tài khoản lai (kiểu cũ) Gửi đơn bên đặt trống → 409", async () => {
  const w = dung();
  const o = await lap(w, PARTNER, [svc("ZB1", inDays(3))]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.deepEqual(nguoiHuong(w, o.id), [`pty-${PARTNER}`]);
  const nhapLai = await lap(w, LAI, [svc("ZB1", inDays(3))]);
  const rl = await guiDon(w, nhapLai.id, LAI);
  assert.equal(rl.status, 409, rl.text);
  assert.equal(rl.json.error.code, MA);
  assert.equal(trangThai(w, nhapLai.id), "draft");
});

// ---- Thứ tự theo mã nguồn (khuôn src/luat-ban-moi-cua.test.ts): bỏ chú thích rồi so vị trí lời gọi.
const ROOT = new URL("../../../", import.meta.url).pathname;
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const doc = (rel: string): string => boChuThich(readFileSync(ROOT + rel, "utf8"));

test("thứ tự: trong kiemCongXacNhan cổng đứng sau congLuatBan( và trước traSauChoXacNhan(; trong route quyet-dinh sau congLuatBan( và trước congNhomTatDuaDon(", () => {
  const src = doc("src/modules/orders/xac-nhan-chung.ts");
  const i = src.search(/export async function kiemCongXacNhan\b/);
  assert.ok(i >= 0, "không thấy kiemCongXacNhan");
  const than = src.slice(i, src.indexOf("\nexport ", i + 10));
  const [a, b, c] = [than.indexOf("congLuatBan("), than.indexOf("congDoiTacChuaCoVaiTro("), than.indexOf("traSauChoXacNhan(")];
  assert.ok(a > 0 && b > a && c > b, `kiemCongXacNhan: congLuatBan(${a}) < congDoiTacChuaCoVaiTro(${b}) < traSauChoXacNhan(${c})`);
  const route = doc("src/modules/orders/xac-nhan-route.ts");
  const j = route.indexOf('route("POST", "/api/orders/:id/quyet-dinh"');
  assert.ok(j >= 0, "không thấy route quyet-dinh");
  const k = route.indexOf("route(", j + 10);
  const qd = route.slice(j, k < 0 ? route.length : k);
  const [x, y, z] = [qd.indexOf("congLuatBan("), qd.indexOf("congDoiTacChuaCoVaiTro("), qd.indexOf("congNhomTatDuaDon(")];
  assert.ok(x > 0 && y > x && z > y, `quyet-dinh: congLuatBan(${x}) < congDoiTacChuaCoVaiTro(${y}) < congNhomTatDuaDon(${z})`);
});
