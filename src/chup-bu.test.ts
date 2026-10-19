// Sổ đại lý đợt 2, Task 6 (ADR-0079 điều 7 b1 / b2 — C4 = A; ADR-0077 điều 9; đặc tả docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md P6, trang-ghep.md §6):
// đơn ĐÃ XÁC NHẬN TRƯỚC khi có bảng mức (trước 0090) chưa có bản chụp thương mại nào.
//   (A) «Chụp bù» của Kế toán — `POST /api/orders/:id/chup-bu` + danh sách `GET /api/orders/cho-chup-bu` (cổng `office`, ô `order.terms.override`): chụp theo mức hiệu lực ở NGÀY
//       XÁC NHẬN, dùng CÙNG `chupDon` + `docBangChoChup` với lúc Xác nhận; còn dòng sẽ ra thiếu mức ⇒ 409, không ghi gì.
//   (B) migration `*_chup_bu_khach_le.sql` (0113 tạm): chụp bù MỘT LẦN cho đơn khách lẻ (b1) — dựng CSDL tới ngay trước tệp đó, gieo, rồi chạy tệp (khung `world()` áp mọi
//       migration lên CSDL rỗng nên chạy ở đó là xanh rỗng).
//   (C) chạy đua ghi mức tay ↔ «Đã giao» (chủ duyệt 19/10, I-2 người kiểm Task 3+4): ghi tay và chụp bù đổi `orders.updated_at` trong CÙNG lô ⇒ lô «Đã giao» đang chạy dở thua.
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs) — không mạng, không D1. Tên người / hồ sơ ở đây là GIẢ.
// Tệp đặt ở src/ (không ở src/modules/orders/) vì đọc cả sổ billing (`bil_*`) để kiểm «Đã giao» — ADR-0024 điều 4 cấm tệp của orders nhắc `bil_` (src/architecture.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";
import { AUDIT_ACTIONS, laHanhDongThuongMai } from "./shared/audit-actions.ts";
import { LICH_SU_DOI_TAC_AN } from "./shared/lich-su-doi-tac.ts";
import { PERMISSION_CODES, can, holdsPartner, type PermissionCode } from "./shared/permissions.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SUPER = "55555555-5555-4555-8555-555555555555";
const PT = "66666666-6666-4666-8666-666666666666"; // Đối tác thuần
const LAI_KT = "77777777-7777-4777-8777-777777777777"; // Kế toán + Đối tác (tài khoản lai)
const DAI_LY = "pty-dai-ly-c"; // hồ sơ tổ chức mang vai Đại lý lữ hành (được hưởng)
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
type V = string | number | null;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [QT, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]], [SUPER, "0900000005", "Chủ", ["SUPER_ADMIN"]], [PT, "0900000006", "Đại Lý A", ["PARTNER"]],
    [LAI_KT, "0900000007", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-pt', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý C', 1, ?, ?)").run(DAI_LY, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dlc', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(DAI_LY, AT, AT);
  return w;
}
const congTy = (w: W): string => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
/** Mức vai Đại lý lữ hành, mọi dịch vụ, tỷ lệ `tyLeBp`, hiệu lực [tuNgay, denNgay] — qua route thật của Kế toán. */
async function muc(w: W, tyLeBp: number, tuNgay: string, denNgay?: string, code = "TRAVEL_AGENCY"): Promise<void> {
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay, ...(denNgay ? { denNgay } : {}), doiTuong: { loai: "VAI", code }, phamVi: "ALL", kieu: "RATE", tyLeBp } });
  assert.equal(r.status, 201, r.text);
}
interface DvNhap { ten: string; catalog: string | null; gia: number }
/**
 * Đơn CŨ (xác nhận TRƯỚC 0090): lập bằng SQL rồi đổi sang `confirmed` bằng SQL — KHÔNG qua route nên KHÔNG có bản chụp. Ngày đi = hôm nay (để «Đã giao» được).
 * `xacNhanLuc` = `orders.confirmed_at` (null = trống); `taoLuc` = `created_at`.
 */
function donCu(w: W, o: { booker?: string | null; dichVu?: DvNhap[]; xacNhanLuc?: string | null; taoLuc?: string; nhap?: boolean } = {}): { id: string; svc: string[] } {
  const id = uuid();
  const dichVu = o.dichVu ?? [{ ten: "Tour đảo", catalog: "HONTAM", gia: 2_000_000 }];
  const tong = dichVu.reduce((t, d) => t + d.gia, 0);
  const tao = o.taoLuc ?? AT;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, o.booker === undefined ? DAI_LY : o.booker, tao, tao);
  const svc = dichVu.map((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
      .run(s, id, i, d.catalog, d.ten, d.catalog ? "perPax" : "manual", vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total)
      VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, d.catalog, d.catalog ? "adult" : null, d.gia, d.catalog ? d.gia : null, d.gia);
    return s;
  });
  if (o.nhap) return { id, svc }; // `nhap: true` ⇒ để nguyên nháp (trigger không cho đổi xác nhận → nháp)
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run(o.xacNhanLuc === undefined ? "2026-10-10T03:00:00.000Z" : o.xacNhanLuc, tao, id);
  return { id, svc };
}
/** Huỷ đơn bằng SQL — trigger 0078 đòi dòng lý do huỷ TRƯỚC câu đổi trạng thái. */
function huyDon(db: { prepare: (sql: string) => { run: (...a: V[]) => unknown } }, id: string): void {
  db.prepare(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'X', 'CHUA_KET_LUAN', NULL, '2026-10-12', NULL, 0, ?, NULL, ?, NULL)`).run(`lydo-${id}`, id, AT, AT);
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
}
const chupBu = (w: W, id: string, as = KT) => w.call("POST", `/api/orders/${id}/chup-bu`, { as });
const danhSach = (w: W, as = KT) => w.call("GET", "/api/orders/cho-chup-bu", { as });
const ghiTay = (w: W, id: string, svc: string, tyLeBp: number, as = KT) =>
  w.call("POST", `/api/orders/${id}/thuong-mai/${svc}`, { as, body: { lyDo: "thoả thuận riêng với đại lý C", hoaHong: { kieu: "RATE", tyLeBp } } });
const banChup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id, rowid", id).map((r: Record<string, V>) => ({ ...r }));
const dem = (w: W, sql: string, ...a: V[]): number => Number(w.q(sql, ...a)[0].n);
const capNhatLuc = (w: W, id: string): string => String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at);
const daGiao = (w: W, id: string, as = SUPER) => w.call("POST", `/api/orders/${id}/delivered`, { as, body: {} });
async function thuDu(w: W, id: string, soTien: number): Promise<void> {
  const t = await w.call("POST", `/api/orders/${id}/payments`, { as: SUPER, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(t.status, 201, t.text);
}
type Dong = { kind_code: string; debtor_party_id: string; creditor_party_id: string; amount: number };
const dongThuongMai = (w: W, id: string): Dong[] => w.q(`SELECT l.kind_code, l.debtor_party_id, l.creditor_party_id, l.amount FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id
  WHERE l.order_id = ? AND p.kind_code = 'DELIVERED' AND l.kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON') ORDER BY l.rowid`, id).map((r: Dong) => ({ ...r }));
/** Đơn không «Đã giao»: không mốc, không phiếu Đã giao, không dòng thương mại. */
function chuaGiao(w: W, id: string): void {
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON')", id), 0);
}

// =====================================================================================================================================================
// (A) «Chụp bù» (b2) — route
// =====================================================================================================================================================

test("(A1) chụp bù theo NGÀY XÁC NHẬN: mức 10% (2026-09-01 → 2026-10-15), 12% (từ 2026-10-16); đơn xác nhận 2026-10-10 ⇒ rateBp 1000, captured_date 2026-10-10, AUTO; đơn 2026-10-16 (qua nửa đêm giờ VN) ⇒ 1200", async () => {
  const w = setup();
  await muc(w, 1000, "2026-09-01", "2026-10-15");
  await muc(w, 1200, "2026-10-16");
  const a = donCu(w, { xacNhanLuc: "2026-10-10T03:00:00.000Z" });
  const b = donCu(w, { xacNhanLuc: "2026-10-15T17:30:00.000Z" }); // 00:30 ngày 16/10 giờ Việt Nam
  const truoc = capNhatLuc(w, a.id);
  const r = await chupBu(w, a.id);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.chup.length, 1);
  assert.deepEqual(r.json.chup[0].hoaHong.status, "SET");
  assert.equal(r.json.chup[0].hoaHong.rateBp, 1000);
  assert.equal(r.json.chup[0].beneficiaryPartyId, DAI_LY);
  const [t] = banChup(w, a.id);
  assert.equal(t!.order_service_id, a.svc[0]);
  assert.deepEqual([t!.commission_status, t!.commission_kind, t!.commission_rate_bp, t!.source, t!.captured_date, t!.supersedes_id, t!.created_by, t!.supply_term_id, t!.seller_party_id],
    ["SET", "RATE", 1000, "AUTO", "2026-10-10", null, KT, "prc-st-goc-all", congTy(w)]);
  assert.equal(banChup(w, a.id).length, 1, "đúng một bản chụp cho một dòng dịch vụ");
  assert.notEqual(capNhatLuc(w, a.id), truoc, "chụp bù đổi orders.updated_at trong cùng lô (chủ duyệt 19/10)");
  const nk = w.q("SELECT detail, staff_id FROM audit_log WHERE order_id = ? AND action = 'ord_terms_backfilled'", a.id);
  assert.equal(nk.length, 1, "một dòng nhật ký «Chụp bù mức hoa hồng»");
  assert.equal(nk[0].staff_id, KT);
  assert.doesNotMatch(String(nk[0].detail), /10%|1000|\d{3}\.\d{3}/, "nhật ký chỉ đếm dòng — không tỷ lệ, không tiền");
  const rb = await chupBu(w, b.id, QT);
  assert.equal(rb.status, 200, rb.text);
  assert.equal(rb.json.chup[0].hoaHong.rateBp, 1200, "xác nhận 00:30 ngày 16/10 giờ VN ⇒ mức 12%");
  assert.equal(banChup(w, b.id)[0]!.captured_date, "2026-10-16");
});

test("(A2) confirmed_at trống ⇒ ngày tạo đơn (giờ VN); sau chụp bù, đơn đại lý «Đã giao» được, hoa hồng theo mức ĐÃ CHỤP (10%), không theo mức hôm nay (12%)", async () => {
  const w = setup();
  await muc(w, 1000, "2026-09-01", "2026-10-15");
  await muc(w, 1200, "2026-10-16");
  const { id } = donCu(w, { xacNhanLuc: null, taoLuc: "2026-10-04T18:00:00.000Z" }); // 01:00 ngày 05/10 giờ VN
  const giu = (await w.call("GET", `/api/orders/${id}/payments`, { as: SUPER })).json.lyDoChuaGiao;
  assert.equal(giu?.ma, "terms_missing");
  assert.match(String(giu?.cau), /Chụp bù/, "trước chụp bù: câu giữ chỉ nút «Chụp bù»");
  const r = await chupBu(w, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(banChup(w, id)[0]!.captured_date, "2026-10-05");
  await thuDu(w, id, 2_000_000);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongThuongMai(w, id), [{ kind_code: "HOA_HONG", debtor_party_id: congTy(w), creditor_party_id: DAI_LY, amount: 200_000 }]);
});

test("(A3) từ chối: đơn đã có bản chụp (kể cả bản thiếu mức) ⇒ 409; đơn đã «Đã giao» ⇒ 409; đơn nháp / huỷ ⇒ 409; mã đơn lạ ⇒ 404 — không ghi gì", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  // (a) đã có bản chụp đủ mức (gieo như bản chụp lúc xác nhận)
  const coChup = donCu(w);
  gieoBanChup(w.sqlite, coChup.id);
  const a = await chupBu(w, coChup.id);
  assert.equal(a.status, 409, a.text);
  assert.deepEqual([a.json.error.code, a.json.error.message], ["da_co_ban_chup", "Đơn đã có bản chụp — ghi mức tay cho dòng thiếu"]);
  // (b) đã có bản chụp THIẾU mức (MISSING) — bản chụp đóng băng (ADR-0077 điều 9): vẫn từ chối
  const thieu = donCu(w, { booker: null, dichVu: [{ ten: "Ca nô", catalog: null, gia: 900_000 }] });
  gieoBanChup(w.sqlite, thieu.id, { nhapTay: "thieu" });
  assert.equal(dem(w, "SELECT count(*) AS n FROM v_ord_terms_missing WHERE order_id = ?", thieu.id), 1, "khung: bản chụp thiếu người bán");
  const b = await chupBu(w, thieu.id);
  assert.equal(b.status, 409, b.text);
  assert.equal(b.json.error.code, "da_co_ban_chup");
  // (c) đơn đã «Đã giao» (đơn cũ, mốc đặt bằng SQL — dữ liệu lượt 1)
  const giao = donCu(w);
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?").run(AT, SUPER, AT, giao.id);
  const c = await chupBu(w, giao.id);
  assert.equal(c.status, 409, c.text);
  assert.equal(c.json.error.code, "order_delivered");
  // (d) đơn nháp, đơn huỷ
  const nhap = donCu(w, { nhap: true });
  const rn = await chupBu(w, nhap.id);
  assert.equal(rn.status, 409, rn.text);
  assert.equal(rn.json.error.code, "not_confirmed");
  const huy = donCu(w);
  huyDon(w.sqlite, huy.id);
  assert.equal((await chupBu(w, huy.id)).status, 409);
  // (e) mã lạ
  assert.equal((await chupBu(w, "khong-phai-uuid")).status, 404);
  assert.equal((await chupBu(w, "99999999-9999-4999-8999-ffffffffffff")).status, 404);
  for (const id of [giao.id, nhap.id, huy.id]) assert.equal(banChup(w, id).length, 0, "không bản chụp nào được ghi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'ord_terms_backfilled'"), 0);
});

test("(A4) quyền: Bán hàng, HDV ⇒ 403 (qua cổng văn phòng, ô order.terms.override = none); Đối tác ⇒ 403 cổng; tài khoản lai Kế toán + Đối tác ⇒ 403; Quản trị, Toàn quyền, Kế toán được", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id } = donCu(w);
  for (const as of [SALES, HDV, PT, LAI_KT]) {
    const r = await chupBu(w, id, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    const l = await danhSach(w, as);
    assert.equal(l.status, 403, `danh sách — ${as}: ${l.text}`);
  }
  assert.equal(banChup(w, id).length, 0);
  for (const as of [KT, QT, SUPER]) assert.equal((await danhSach(w, as)).status, 200, `danh sách — ${as}`);
  assert.equal((await chupBu(w, id, SUPER)).status, 200);
});

test("(A5) còn dòng sẽ ra thiếu mức — không có mức ở ngày xác nhận ⇒ 409 chup_bu_thieu_muc nêu dịch vụ, KHÔNG ghi bản chụp nào (đơn vẫn b2), không nhật ký, updated_at giữ nguyên; cài mức lùi ngày rồi bấm lại ⇒ 200", async () => {
  const w = setup();
  await muc(w, 1200, "2026-10-16"); // chưa có mức cho ngày 10/10
  const { id } = donCu(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", gia: 2_000_000 }, { ten: "Lặn biển", catalog: "LANBIEN", gia: 1_000_000 }] });
  const truoc = capNhatLuc(w, id);
  const r = await chupBu(w, id);
  assert.equal(r.status, 409, r.text);
  assert.deepEqual([r.json.error.code, r.json.error.message],
    ["chup_bu_thieu_muc", "Còn thiếu mức cho Tour đảo, Lặn biển — cài mức rồi bấm lại"]);
  assert.equal(banChup(w, id).length, 0, "không ghi bản chụp nào — đơn chưa thành b3");
  assert.equal(capNhatLuc(w, id), truoc);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ord_terms_backfilled'", id), 0);
  assert.deepEqual((await danhSach(w)).json.don.map((d: { orderId: string }) => d.orderId), [id], "đơn vẫn nằm trong danh sách chờ chụp bù");
  await muc(w, 1000, "2026-09-01", "2026-10-15"); // Kế toán cài mức lùi ngày (C4 = A)
  const lai = await chupBu(w, id);
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual(banChup(w, id).map((t) => t.commission_rate_bp), [1000, 1000]);
});

test("(A6) còn dòng sẽ ra thiếu mức — xung đột mức (bên đặt mang hai vai được hưởng, hai mức khác nhau) ⇒ 409 chup_bu_thieu_muc, không ghi gì", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  await muc(w, 1500, "2026-01-01", undefined, "COLLABORATOR");
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dlc-ctv', ?, 'COLLABORATOR', '2026-01-01', ?, ?)").run(DAI_LY, AT, AT);
  const { id } = donCu(w);
  const r = await chupBu(w, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "chup_bu_thieu_muc");
  assert.match(r.json.error.message, /^Còn thiếu mức cho Tour đảo — /);
  assert.equal(banChup(w, id).length, 0);
});

test("(A7) Ruling R-P13: dòng DANH MỤC thiếu mức vẫn chặn cả đơn dù đơn có dòng nhập tay — 409 chỉ nêu dòng danh mục, không ghi gì; dòng danh mục thiếu NGƯỜI BÁN (không có điều khoản ở ngày xác nhận) cũng chặn", async () => {
  const w = setup();
  await muc(w, 1200, "2026-10-16"); // không có mức cho ngày 10/10
  const daiLy = donCu(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", gia: 2_000_000 }, { ten: "Ca nô riêng", catalog: null, gia: 900_000 }] });
  const r = await chupBu(w, daiLy.id);
  assert.equal(r.status, 409, r.text);
  assert.deepEqual([r.json.error.code, r.json.error.message], ["chup_bu_thieu_muc", "Còn thiếu mức cho Tour đảo — cài mức rồi bấm lại"], "dòng nhập tay không bị nêu (không chặn)");
  // khách lẻ, dòng danh mục, xác nhận TRƯỚC ngày bắt đầu điều khoản «mọi dịch vụ» (2025-01-01) ⇒ thiếu người bán ⇒ chặn
  const khachLe = donCu(w, { booker: null, xacNhanLuc: "2024-12-20T03:00:00.000Z" });
  const k = await chupBu(w, khachLe.id);
  assert.equal(k.status, 409, k.text);
  assert.deepEqual([k.json.error.code, k.json.error.message], ["chup_bu_thieu_muc", "Còn thiếu mức cho Tour đảo — cài mức rồi bấm lại"]);
  assert.equal(banChup(w, daiLy.id).length + banChup(w, khachLe.id).length, 0, "không ghi bản chụp nào");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'ord_terms_backfilled'"), 0);
});

const lyDoGiu = async (w: W, id: string) => (await w.call("GET", `/api/orders/${id}/payments`, { as: SUPER })).json.lyDoChuaGiao;
const tongHoaHong = (w: W, id: string): number => dongThuongMai(w, id).filter((d) => d.kind_code === "HOA_HONG").reduce((t, d) => t + d.amount, 0);

test("(A8) Ruling R-P13: đơn ĐẠI LÝ có dòng nhập tay — Chụp bù 200 cả đơn (dòng nhập tay ra MISSING/MANUAL_LINE); giữ «Đã giao» bằng câu ghi mức tay; ghi tay dòng đó ⇒ «Đã giao» 200 theo hai mức", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id, svc } = donCu(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", gia: 2_000_000 }, { ten: "Ca nô riêng", catalog: null, gia: 900_000 }] });
  assert.equal((await danhSach(w)).json.don.find((d: { orderId: string }) => d.orderId === id)?.lyDo, "nhap_tay", "trước chụp bù: danh sách ghi lý do dòng nhập tay");
  const r = await chupBu(w, id);
  assert.equal(r.status, 200, r.text);
  const [catalog, tay] = banChup(w, id);
  assert.deepEqual([catalog!.order_service_id, catalog!.commission_status, catalog!.commission_rate_bp, catalog!.supply_status], [svc[0], "SET", 1000, "SET"]);
  assert.deepEqual([tay!.order_service_id, tay!.commission_status, tay!.missing_reason, tay!.supply_status, tay!.source], [svc[1], "MISSING", "MANUAL_LINE", "MISSING", "AUTO"]);
  assert.equal((await danhSach(w)).json.don.some((d: { orderId: string }) => d.orderId === id), false, "đã có bản chụp ⇒ ra khỏi danh sách");
  await thuDu(w, id, 2_900_000);
  const giu = await lyDoGiu(w, id);
  assert.deepEqual([giu?.ma, giu?.cau], ["terms_missing", "Thiếu mức hoa hồng / người bán cho Ca nô riêng — Kế toán ghi mức tay cho dòng này."], "câu giữ cố định của Task 3 (canChupBu = false)");
  assert.equal((await daGiao(w, id)).status, 409, "còn giữ trước khi ghi tay");
  chuaGiao(w, id);
  const t = await w.call("POST", `/api/orders/${id}/thuong-mai/${svc[1]}`, { as: KT, body: { lyDo: "ca nô riêng thoả thuận với đại lý C", hoaHong: { kieu: "RATE", tyLeBp: 500 }, nguoiBan: { partyId: congTy(w) } } });
  assert.equal(t.status, 200, t.text);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.equal(tongHoaHong(w, id), 245_000, "10% × 2.000.000 + 5% × 900.000");
});

test("(A8b) Ruling R-P13: đơn KHÁCH LẺ có dòng nhập tay (không lọt 0113) — Chụp bù 200; ghi tay «Tour Đảo bán» ⇒ «Đã giao» 200, không dòng thương mại", async () => {
  const w = setup();
  const { id, svc } = donCu(w, { booker: null, dichVu: [{ ten: "Ca nô riêng", catalog: null, gia: 900_000 }] });
  const r = await chupBu(w, id);
  assert.equal(r.status, 200, r.text);
  const [tay] = banChup(w, id);
  assert.deepEqual([tay!.commission_status, tay!.beneficiary_party_id, tay!.supply_status], ["NONE", null, "MISSING"]);
  await thuDu(w, id, 900_000);
  const giu = await lyDoGiu(w, id);
  assert.deepEqual([giu?.ma, giu?.cau], ["terms_missing", "Thiếu mức hoa hồng / người bán cho Ca nô riêng — Kế toán ghi mức tay cho dòng này."]);
  const t = await w.call("POST", `/api/orders/${id}/thuong-mai/${svc[0]}`, { as: KT, body: { lyDo: "dòng nhập tay do Tour Đảo bán", nguoiBan: { partyId: congTy(w) } } });
  assert.equal(t.status, 200, t.text);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongThuongMai(w, id), [], "khách lẻ, Tour Đảo bán ⇒ không hoa hồng, không giá vốn");
});

test("(A8c) Ruling R-61: bên đặt mang vai bên ngoài KHÔNG được hưởng (BOOKER_NOT_BENEFICIARY) không chặn Chụp bù — chụp như lệnh Xác nhận; câu giữ chỉ «sửa bên đặt hoặc ghi mức tay»", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-tx-ngoai', 'PERSON', 'Tài xế ngoài', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-tx-ngoai', 'pty-tx-ngoai', 'DRIVER_EXTERNAL', '2026-01-01', ?, ?)").run(AT, AT);
  const { id } = donCu(w, { booker: "pty-tx-ngoai" });
  const r = await chupBu(w, id);
  assert.equal(r.status, 200, r.text);
  const [t] = banChup(w, id);
  assert.deepEqual([t!.commission_status, t!.missing_reason, t!.supply_status], ["MISSING", "BOOKER_NOT_BENEFICIARY", "SET"]);
  await thuDu(w, id, 2_000_000);
  assert.equal((await lyDoGiu(w, id))?.ma, "booker_not_beneficiary");
});

test("(A9) danh sách chờ chụp bù: chỉ đơn đã xác nhận, chưa «Đã giao», CHƯA có bản chụp nào; trường orderId, maDon, ngayXacNhan (giờ VN), benDat, lyDo; đặt TRƯỚC /api/orders/:id", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-kh-le', 'ORGANIZATION', 'Khách đoàn X', 1, ?, ?)").run(AT, AT);
  const daiLy = donCu(w, { xacNhanLuc: "2026-10-09T18:30:00.000Z" }); // 01:30 ngày 10/10 giờ VN
  const nhapTay = donCu(w, { booker: null, dichVu: [{ ten: "Ca nô", catalog: null, gia: 900_000 }], xacNhanLuc: null, taoLuc: "2026-10-03T02:00:00.000Z" });
  const khachLe = donCu(w, { booker: "pty-kh-le" }); // đơn khách lẻ lọt 0113 (vd bên đặt đổi vai sau bản lên) — vẫn hiện, không giấu
  const coChup = donCu(w);
  gieoBanChup(w.sqlite, coChup.id);
  const giao = donCu(w);
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SUPER, giao.id);
  const huy = donCu(w);
  huyDon(w.sqlite, huy.id);
  const lai = donCu(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", gia: 1 }, { ten: "Lặn", catalog: "LANBIEN", gia: 1 }] }); // đơn «lai»: một dòng đã chụp
  w.sqlite.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, commission_status, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    VALUES ('lai-1', ?, ?, 'NONE', 'SET', ?, 'prc-st-goc-all', 'AUTO', '2026-10-10', ?, ?)`).run(lai.id, lai.svc[0], congTy(w), AT, AT);
  const r = await danhSach(w);
  assert.equal(r.status, 200, r.text);
  const ma = (id: string) => String(w.q("SELECT order_code FROM orders WHERE id = ?", id)[0].order_code);
  const theoId = new Map(r.json.don.map((d: { orderId: string }) => [d.orderId, d]));
  assert.deepEqual([...theoId.keys()].sort(), [daiLy.id, nhapTay.id, khachLe.id].sort(), "không có đơn đã chụp, đơn lai, đơn đã giao, đơn huỷ");
  assert.deepEqual(theoId.get(daiLy.id), { orderId: daiLy.id, maDon: ma(daiLy.id), ngayXacNhan: "2026-10-10", benDat: "Đại lý C", lyDo: "co_nguoi_huong" });
  assert.deepEqual(theoId.get(nhapTay.id), { orderId: nhapTay.id, maDon: ma(nhapTay.id), ngayXacNhan: "2026-10-03", benDat: null, lyDo: "nhap_tay" });
  assert.deepEqual(theoId.get(khachLe.id), { orderId: khachLe.id, maDon: ma(khachLe.id), ngayXacNhan: "2026-10-10", benDat: "Khách đoàn X", lyDo: "khach_le" });
  assert.doesNotMatch(r.text, /customer|Khách Giả|0900000099/, "không tên / SĐT khách");
});

test("(A10) «bấm cả danh sách» = giao diện gọi từng đơn: đơn đủ mức được chụp, đơn thiếu nhận 409 nêu dịch vụ; danh sách sau đó chỉ còn đơn thiếu", async () => {
  const w = setup();
  await muc(w, 1000, "2026-09-01", "2026-10-15");
  await muc(w, 1200, "2026-10-16");
  const a = donCu(w, { xacNhanLuc: "2026-10-10T03:00:00.000Z" });
  const b = donCu(w, { xacNhanLuc: "2026-08-20T03:00:00.000Z" }); // chưa có mức ngày 20/8
  const c = donCu(w, { xacNhanLuc: "2026-10-20T03:00:00.000Z" });
  const ds = (await danhSach(w)).json.don as { orderId: string }[];
  const kq = new Map<string, number>();
  for (const d of ds) kq.set(d.orderId, (await chupBu(w, d.orderId)).status);
  assert.deepEqual([kq.get(a.id), kq.get(b.id), kq.get(c.id)], [200, 409, 200]);
  assert.deepEqual(((await danhSach(w)).json.don as { orderId: string }[]).map((d) => d.orderId), [b.id]);
  assert.deepEqual([banChup(w, a.id)[0]!.commission_rate_bp, banChup(w, c.id)[0]!.commission_rate_bp, banChup(w, b.id).length], [1000, 1200, 0]);
});

test("(A11) chạy đua: người khác chụp / ghi bản chụp cho đơn giữa lúc «Chụp bù» đọc và lúc ghi ⇒ 409, không bản chụp trùng, không nhật ký thừa", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id } = donCu(w);
  let daChen = false;
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_service_terms/.test(s.sql)), () => {
    daChen = true;
    gieoBanChup(w.sqlite, id);
  });
  const r = await chupBu(w, id);
  assert.ok(daChen, "đã chen đúng lô chụp bù");
  assert.equal(r.status, 409, r.text);
  assert.equal(banChup(w, id).length, 1, "chỉ bản chụp của người kia");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ord_terms_backfilled'", id), 0);
});

test("(A11b) chạy đua: đơn bị SỬA (vd đổi bên đặt sang khách lẻ) giữa lúc «Chụp bù» đọc bảng và lúc ghi ⇒ 409 stale (khoá lạc quan updated_at ở câu cổng), không chụp theo bên đặt cũ", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id } = donCu(w);
  const moc = "2026-10-18T05:00:00.000Z";
  let daChen = false;
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_service_terms/.test(s.sql)), () => {
    daChen = true;
    w.sqlite.prepare("UPDATE orders SET booker_party_id = NULL, updated_at = ? WHERE id = ?").run(moc, id);
  });
  const r = await chupBu(w, id);
  assert.ok(daChen, "đã chen đúng lô chụp bù");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(banChup(w, id).length, 0, "không bản chụp nào theo bên đặt cũ (đại lý C)");
  assert.equal(capNhatLuc(w, id), moc);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ord_terms_backfilled'", id), 0);
});

test("(A12) nhật ký mới `ord_terms_backfilled` («Chụp bù mức hoa hồng»): khai ở audit-actions, ẩn khỏi lịch sử đơn của Đối tác, thuộc nhóm hành động thương mại (trang Nhật ký bỏ khi người xem giữ quyền Đối tác)", () => {
  assert.deepEqual({ ...(AUDIT_ACTIONS as Record<string, { label: string; group: string }>).ord_terms_backfilled }, { label: "Chụp bù mức hoa hồng", group: "order" });
  assert.ok((LICH_SU_DOI_TAC_AN as readonly string[]).includes("ord_terms_backfilled"));
  assert.equal(laHanhDongThuongMai("ord_terms_backfilled"), true);
});

// =====================================================================================================================================================
// (B) migration 0113 — chụp bù MỘT LẦN đơn khách lẻ cũ (b1)
// =====================================================================================================================================================
const MIG = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const F0113 = FILES.find((f) => f.endsWith("_chup_bu_khach_le.sql"));
const SQL_0113 = (): string => {
  assert.ok(F0113, "thiếu migrations/*_chup_bu_khach_le.sql");
  return readFileSync(new URL(F0113, MIG), "utf8");
};
/** CSDL thử áp mọi migration ĐỨNG TRƯỚC tệp chụp bù (khoá ngoại bật) — dữ liệu gieo sau đó giống production lúc chủ áp migration. */
function dbTruoc0113(): DatabaseSync {
  assert.ok(F0113, "thiếu migrations/*_chup_bu_khach_le.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES) {
    if (f === F0113) break;
    db.exec(readFileSync(new URL(f, MIG), "utf8"));
  }
  return db;
}
/** Một câu của tệp câu đếm chỉ-đọc (dòng ngay dưới dòng chú thích bắt đầu bằng `-- (<nhãn>)`) — bài «hai nơi»: 0113 lọc ĐÚNG tập (b1) mà chủ đếm. */
function cauDem(nhan: string): string {
  const dong = readFileSync(new URL("../docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql", import.meta.url), "utf8").split("\n");
  const i = dong.findIndex((l, k) => l.startsWith(`-- (${nhan}) `) && (dong[k + 1] ?? "").startsWith("SELECT"));
  assert.ok(i >= 0 && dong[i + 1]!.startsWith("SELECT"), `không thấy câu đếm (${nhan})`);
  return dong[i + 1]!;
}
interface Khung0113 { db: DatabaseSync; ct: string; don: (o: { booker?: string | null; dv?: (string | null)[]; xacNhanLuc?: string | null; taoLuc?: string; status?: string; delivered?: boolean }) => string }
function khung0113(): Khung0113 {
  const db = dbTruoc0113();
  seedStaff(db, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  const ct = String((db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id);
  const hoSo = (id: string, ten: string, vai: string | null, dong: string | null = null) => {
    db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    if (vai) db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?, ?)").run(`r-${id}`, id, vai, dong, AT, AT);
  };
  hoSo("pty-dl", "Đại lý", "TRAVEL_AGENCY");
  hoSo("pty-txn", "Tài xế ngoài", "DRIVER_EXTERNAL"); // vai bên ngoài KHÔNG được hưởng ⇒ KHONG_HUONG (đơn bị giữ, không tự lấy 0)
  hoSo("pty-kh", "Khách quen", "CUSTOMER"); // vai thường ⇒ khách lẻ
  hoSo("pty-dl-cu", "Đại lý cũ", "TRAVEL_AGENCY", "2026-06-30"); // vai đã ĐÓNG ⇒ không còn vai mở ⇒ khách lẻ (đúng nguoiHuongCua)
  db.prepare("INSERT INTO pty_role_type (code, name, sort_order, active, role_group, is_partner_label) VALUES ('LD_THUNHAN', 'Loại đối tác thử', 99, 1, 'OTHER', 1)").run();
  hoSo("pty-ld", "Đối tác có nhãn", "LD_THUNHAN"); // loại đối tác (ADR-0117) không được hưởng ⇒ KHONG_HUONG
  hoSo("pty-ncc", "i-resort", "SUPPLIER");
  db.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'IRESORT', 'pty-ncc', 'pty-ncc', 8000, '2026-01-01', ?, ?)`).run(AT, AT);
  let n = 0;
  const don = (o: { booker?: string | null; dv?: (string | null)[]; xacNhanLuc?: string | null; taoLuc?: string; status?: string; delivered?: boolean }): string => {
    const id = `don-0113-${++n}`;
    const tao = o.taoLuc ?? AT;
    db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 0, 0, 0, ?, ?, ?)`).run(id, `TD-0113-${n}`, SALES, o.booker ?? null, tao, tao);
    (o.dv ?? ["HONTAM"]).forEach((code, i) => {
      db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, '2026-10-20')")
        .run(`${id}-s${i}`, id, i, code, code ?? "Dịch vụ nhập tay", code ? "perPax" : "manual");
    });
    const st = o.status ?? "confirmed";
    if (st !== "draft") db.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(o.xacNhanLuc === undefined ? "2026-10-10T03:00:00.000Z" : o.xacNhanLuc, id);
    if (st === "cancelled") huyDon(db, id);
    if (o.delivered) db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SALES, id);
    return id;
  };
  return { db, ct, don };
}
const chup0113 = (db: DatabaseSync, orderId: string) =>
  db.prepare("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id").all(orderId).map((r) => ({ ...(r as Record<string, V>) }));

test("(B1) 0113: đơn khách lẻ cũ không bản chụp ⇒ mỗi dòng một bản NONE, người bán = công ty chủ theo điều khoản ALL (prc-st-goc-all), AUTO, he-thong:0113, captured_date = ngày giờ VN của confirmed_at (trống ⇒ created_at)", () => {
  const { db, ct, don } = khung0113();
  const o1 = don({ dv: ["HONTAM", "ZA1"], xacNhanLuc: "2026-10-09T18:30:00.000Z" }); // 01:30 ngày 10/10 giờ VN
  const o2 = don({ booker: ct, xacNhanLuc: "2026-10-05T03:00:00.000Z" });
  const o3 = don({ booker: "pty-kh" });
  const o4 = don({ xacNhanLuc: null, taoLuc: "2026-09-30T20:00:00.000Z" }); // 03:00 ngày 01/10 giờ VN
  const o5 = don({ dv: ["IRESORT"] }); // b1x: điều khoản HÔM NAY của mã có nhà cung cấp — vẫn nhận người bán Tour Đảo (đúng chữ 7b1, không loại b1x)
  const o6 = don({ booker: "pty-dl-cu" });
  db.exec(SQL_0113());
  for (const [id, ngay, soDong] of [[o1, "2026-10-10", 2], [o2, "2026-10-05", 1], [o3, "2026-10-10", 1], [o4, "2026-10-01", 1], [o5, "2026-10-10", 1], [o6, "2026-10-10", 1]] as const) {
    const ds = chup0113(db, id);
    assert.equal(ds.length, soDong, `${id}: số bản chụp = số dòng dịch vụ`);
    for (const t of ds) {
      assert.deepEqual(
        [t.beneficiary_party_id, t.commission_status, t.missing_reason, t.commission_rule_id, t.supply_status, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.supply_term_id, t.source, t.reason, t.supersedes_id, t.captured_date, t.created_by, t.updated_by],
        [null, "NONE", null, null, "SET", ct, null, null, "prc-st-goc-all", "AUTO", null, null, ngay, "he-thong:0113", "he-thong:0113"], `${id}`);
    }
  }
  assert.equal(Number((db.prepare("SELECT count(*) AS n FROM v_ord_terms_uncaptured WHERE order_id IN (?, ?, ?, ?, ?, ?)").get(o1, o2, o3, o4, o5, o6) as { n: number }).n), 0, "lớp 1 / lớp 2 không còn giữ các đơn này");
  assert.equal(Number((db.prepare("SELECT count(*) AS n FROM v_ord_terms_missing WHERE order_id IN (?, ?, ?, ?, ?, ?)").get(o1, o2, o3, o4, o5, o6) as { n: number }).n), 0);
});

test("(B2) 0113 KHÔNG chụp (sang b2): bên đặt mang vai được hưởng / vai bên ngoài / loại đối tác, đơn có dòng nhập tay; không đụng đơn nháp, huỷ, đã giao, đơn đã có bản chụp", () => {
  const { db, ct, don } = khung0113();
  const loai = [
    don({ booker: "pty-dl" }), don({ booker: "pty-txn" }), don({ booker: "pty-ld" }), don({ dv: ["HONTAM", null] }), don({ dv: [null] }),
    don({ status: "draft" }), don({ status: "cancelled" }), don({ delivered: true }),
  ];
  const daChup = don({});
  gieoBanChup(db, daChup, { boi: "he-thong:khung-thu" });
  const truoc = chup0113(db, daChup);
  db.exec(SQL_0113());
  for (const id of loai) assert.equal(chup0113(db, id).length, 0, `${id} không được chụp bù tự động`);
  assert.deepEqual(chup0113(db, daChup), truoc, "đơn đã có bản chụp giữ nguyên");
  assert.equal(Number((db.prepare("SELECT count(*) AS n FROM ord_service_terms WHERE created_by = 'he-thong:0113'").get() as { n: number }).n), 0);
  void ct;
});

test("(B3) «hai nơi»: số bản chụp 0113 tạo (câu đếm «sau») = số dòng dịch vụ của câu đếm (b1) chạy TRƯỚC 0113; (b1) + (b2) = mọi đơn xác nhận chưa giao chưa chụp", () => {
  const { db, ct, don } = khung0113();
  don({ dv: ["HONTAM", "ZA1"] }); don({ booker: ct }); don({ booker: "pty-kh" }); don({ xacNhanLuc: null }); don({ dv: ["IRESORT"] }); don({ booker: "pty-dl-cu" });
  don({ booker: "pty-dl" }); don({ booker: "pty-txn" }); don({ booker: "pty-ld" }); don({ dv: ["HONTAM", null] });
  don({ status: "draft" }); don({ status: "cancelled" }); don({ delivered: true });
  const b1 = db.prepare(cauDem("b1")).get() as { so_don: number; so_dong_dich_vu: number };
  const b2 = db.prepare(cauDem("b2")).get() as { so_don: number; so_dong_dich_vu: number };
  assert.deepEqual([b1.so_don, b1.so_dong_dich_vu, b2.so_don], [6, 7, 4], "khung gieo đúng như dự tính");
  db.exec(SQL_0113());
  const sau = db.prepare(cauDem("sau")).get() as { so_ban_chup_bu: number };
  assert.equal(sau.so_ban_chup_bu, b1.so_dong_dich_vu, "(sau) = số dòng dịch vụ của (b1)");
  assert.deepEqual({ ...(db.prepare(cauDem("b1")).get() as object) }, { so_don: 0, so_dong_dich_vu: 0 }, "sau 0113, (b1) rỗng");
  assert.equal((db.prepare(cauDem("b2")).get() as { so_don: number }).so_don, 4, "(b2) không đổi");
});

test("(B4) 0113: đơn xác nhận TRƯỚC ngày bắt đầu của điều khoản ALL (2025-01-01) ⇒ migration KHÔNG hỏng (trigger term_valid), chụp với captured_date = ngày bắt đầu điều khoản (Ruling); CSDL không có đơn b1 ⇒ không làm gì", () => {
  const { db, ct, don } = khung0113();
  const cu = don({ xacNhanLuc: "2024-12-20T03:00:00.000Z" });
  db.exec(SQL_0113());
  const [t] = chup0113(db, cu);
  assert.deepEqual([t!.captured_date, t!.supply_term_id, t!.seller_party_id], ["2025-01-01", "prc-st-goc-all", ct]);
  const rong = dbTruoc0113();
  rong.exec(SQL_0113());
  assert.equal(Number((rong.prepare("SELECT count(*) AS n FROM ord_service_terms").get() as { n: number }).n), 0);
});

test("(B5) tệp 0113 chỉ có MỘT câu ghi: INSERT INTO ord_service_terms … SELECT (không đụng tiền, không UPDATE / DELETE, không CASE … END) — dán được qua wrangler", () => {
  const sql = SQL_0113().split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
  assert.equal((sql.match(/;/g) ?? []).length, 1, "đúng một câu");
  assert.match(sql, /^\s*INSERT INTO ord_service_terms\b/);
  assert.doesNotMatch(sql, /\b(UPDATE|DELETE|REPLACE|DROP|ALTER)\b|\bbil_|\bEND\s*\)/i);
});

// =====================================================================================================================================================
// (C) chạy đua ghi mức tay ↔ «Đã giao» (chủ duyệt 19/10 — I-2 người kiểm Task 3+4)
// =====================================================================================================================================================
type Cau = { sql: string };
const laLoDaGiao = (stmts: Cau[]): boolean => stmts.some((c) => /^UPDATE orders SET delivered_at/.test(c.sql));

test("(C1) Kế toán ghi mức tay CHEN giữa lúc «Đã giao» đọc bản chụp và lúc chạy lô ⇒ «Đã giao» 409 stale: không phiếu, không dòng theo mức cũ; bấm lại ⇒ dòng theo mức MỚI", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id, svc } = donCu(w);
  assert.equal((await chupBu(w, id)).status, 200);
  await thuDu(w, id, 2_000_000);
  let daChen = false;
  w.chenTruocLo(laLoDaGiao, async () => {
    daChen = true;
    const t = await ghiTay(w, id, svc[0]!, 1500); // đi ROUTE THẬT (đổi updated_at trong lô ghi tay)
    assert.equal(t.status, 200, t.text);
  });
  const g = await daGiao(w, id);
  assert.ok(daChen, "đã chen đúng lô «Đã giao»");
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "stale");
  chuaGiao(w, id);
  const lai = await daGiao(w, id);
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual(dongThuongMai(w, id), [{ kind_code: "HOA_HONG", debtor_party_id: congTy(w), creditor_party_id: DAI_LY, amount: 300_000 }], "15% của 2.000.000 — mức ghi tay");
});

test("(C2) ghi mức tay đổi orders.updated_at trong CÙNG lô (chỉ khi bản MANUAL đã chèn); ghi tay thua (đơn đã giao) không đổi gì", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id, svc } = donCu(w);
  assert.equal((await chupBu(w, id)).status, 200, "bản chụp có người hưởng (đại lý C) để ghi tay mức hoa hồng");
  const truoc = capNhatLuc(w, id);
  const t = await ghiTay(w, id, svc[0]!, 1500);
  assert.equal(t.status, 200, t.text);
  const sau = capNhatLuc(w, id);
  assert.notEqual(sau, truoc);
  assert.ok(sau > truoc && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(sau), "mốc ISO UTC mới");
  const cuoi = w.q("SELECT created_at FROM ord_service_terms WHERE order_id = ? AND source = 'MANUAL'", id)[0].created_at;
  assert.equal(sau, cuoi, "cùng một mốc giờ với bản ghi tay (một lô)");
  // Ghi tay THUA (đơn vừa «Đã giao» giữa lúc đọc và lúc ghi): câu chèn bản MANUAL không chèn ⇒ câu đổi updated_at cũng không áp, không nhật ký.
  const moc = "2026-10-02T00:00:00.000Z";
  w.chenTruocLo((stmts: Cau[]) => stmts.some((c) => /INSERT INTO ord_service_terms/.test(c.sql)), () => {
    w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?").run(moc, SUPER, moc, id);
  });
  const thua = await ghiTay(w, id, svc[0]!, 1800);
  assert.equal(thua.status, 409, thua.text);
  assert.equal(capNhatLuc(w, id), moc, "updated_at giữ nguyên khi ghi tay thua");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ? AND source = 'MANUAL'", id), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_terms_manual'", id), 1);
});

test("(A14) M-7 đơn «lai» (một dòng đã chụp, một dòng chưa — chỉ dựng được bằng SQL tay): GHIM HIỆN TRẠNG, CHƯA có lối thoát (Ruling R-59, Nợ) — Chụp bù 409 da_co_ban_chup; ghi tay dòng chưa chụp 404", async () => {
  const w = setup();
  await muc(w, 1000, "2026-01-01");
  const { id, svc } = donCu(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", gia: 1_000_000 }, { ten: "Lặn biển", catalog: "LANBIEN", gia: 1_000_000 }] });
  w.sqlite.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, commission_status, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    VALUES ('lai-1', ?, ?, 'NONE', 'SET', ?, 'prc-st-goc-all', 'AUTO', '2026-10-10', ?, ?)`).run(id, svc[0], congTy(w), AT, AT);
  const r = await chupBu(w, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "da_co_ban_chup");
  const t = await ghiTay(w, id, svc[1]!, 1500);
  assert.equal(t.status, 404, t.text);
  assert.equal(banChup(w, id).length, 1, "không ghi thêm gì");
});

test("(A13) phản hồi «Chụp bù» là bản chụp văn phòng (có người bán, giá vốn): mọi tập con quyền qua được cửa route (order.terms.override, không Đối tác) đều xem được người bán (supply.terms.view)", () => {
  let soTap = 0;
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const permissions = PERMISSION_CODES.filter((_, i) => (m >> i) & 1) as PermissionCode[];
    const ai = { id: "x", permissions };
    if (!can(ai, "order.terms.override") || holdsPartner(ai)) continue;
    soTap++;
    assert.ok(can(ai, "supply.terms.view"), `tập ${permissions.join("+")} chụp bù được nhưng không được xem người bán — phản hồi lộ giá vốn`);
  }
  assert.ok(soTap > 0, "có ít nhất một tập con quyền chụp bù được");
});
