// TÁC NHÂN DỌN PHIẾU ĐĂNG KÝ (ADR-0208 Đ6–Đ8, khuôn ADR-0186; đợt 1 Task 9) chạy trên khung thử THẬT (tests/audit/harness.mjs, SQLite thật, kho R2 giả). Phiếu gieo bằng SQL theo đúng đồ thị
// trạng thái (trigger 0170 canh), mốc giờ đặt lùi để mô phỏng tuổi phiếu. Bốn việc: hết hạn, ẩn danh, xoá kho tệp chờ, xoá mã email / lượt tải cũ; một dòng nhật ký mang mã tác nhân.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../shared/permissions.ts";
import { DK_COOKIE, taoPhienDangKy } from "./phien.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../../../tests/audit/harness.mjs";
// @ts-ignore tệp .mjs không có khai kiểu
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";

const NGAY = 86_400_000;
const PHUT = 60_000;
const HR = "99999999-9999-4999-8999-999999999999";
const BAY_GIO = new Date(Date.now() + 5 * 60_000); // mốc của lượt: sau mốc hiệu lực của dòng chính sách gieo lúc dựng CSDL thử
const truoc = (ms: number) => new Date(BAY_GIO.getTime() - ms).toISOString();
const sau = (ms: number) => new Date(BAY_GIO.getTime() + ms).toISOString();
const TAC_NHAN = (P as any).tacNhan("DON_PHIEU_DANG_KY");
const chay = (w: any, who: unknown = TAC_NHAN, luc: Date = BAY_GIO) => app.donPhieuDangKy(w.env, who, luc);
let so = 0;

function setup() {
  const w = world();
  w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'x', '2026-01-01T00:00:00.000Z', 'x')`);
  return w;
}
type Gieo = { taoLuc?: string; hetHanLuc?: string | null; quyetLuc?: string; hanKichHoat?: string; doiLuc?: string; banKhai?: boolean; toChuc?: boolean };
/** Gieo phiếu ở `trangThai` (đi đúng đồ thị), có danh tính (email riêng) và — nếu `banKhai` — một bản khai đủ dữ liệu cá nhân. Trả mã phiếu và mã danh tính. */
function phieu(w: any, trangThai: string, o: Gieo = {}): { id: string; ident: string; email: string } {
  const id = `DK_${String.fromCharCode(65 + (so % 26))}${String.fromCharCode(65 + Math.floor(so / 26) % 26)}AAAAAA`;
  so++;
  const ident = `ident-${id}`;
  const email = `nguoi-${id.toLowerCase()}@example.com`;
  const tao = o.taoLuc ?? truoc(NGAY);
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, expires_at, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'GUIDE_FREELANCE', ?, ?, ?)").run(id, o.hetHanLuc ?? null, tao, tao);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?)").run(ident, id, email, email, tao, tao);
  if (o.banKhai) {
    w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key,
        issued_place, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, 'Phạm', 'Thử', '1990-05-06', '12 Đường Thử', '0912 000 111', '0912000111', 'CCCD', '079 111 000 222', '079111000222', 'Cục thử', 'pol', ?, ?, ?)`)
      .run(`sub-${id}`, id, tao, tao, tao);
    // Phần tổ chức (ADR-0212 Đ4): cùng phiên bản, chèn TRƯỚC câu tăng current_version.
    if (o.toChuc) w.sqlite.prepare(`INSERT INTO dk_submission_org (id, registration_id, version, display_name, legal_name, tax_code, tax_key, address, invoice_email, phone_value, phone_key, gpkd_number, gpkd_key,
        gpkd_issued_place, authority_confirmed_at, created_at, updated_at) VALUES (?, ?, 1, 'Công ty Thử', 'CÔNG TY TNHH THỬ', '0123456789', '0123456789', '5 Tổ Chức', 'hd@example.com', '0258 381 234', '0258381234',
        '41-0398', '410398', 'Sở thử', ?, ?, ?)`).run(`org-${id}`, id, tao, tao, tao);
    w.sqlite.prepare("UPDATE dk_registration SET current_version = 1 WHERE id = ?").run(id);
  }
  const duong: Record<string, string[]> = {
    DANG_DIEN: [], CHO_XAC_MINH: ["CHO_XAC_MINH"], CAN_BO_SUNG: ["CHO_XAC_MINH", "CAN_BO_SUNG"], TU_CHOI: ["CHO_XAC_MINH", "TU_CHOI"], DA_RUT: ["DA_RUT"], HET_HAN: ["HET_HAN"],
    DA_DUYET: ["CHO_XAC_MINH", "CHO_DUYET", "DA_DUYET"],
  };
  for (const t of duong[trangThai]!) {
    if (t === "DA_DUYET") w.sqlite.prepare("UPDATE dk_registration SET status = 'DA_DUYET', staff_id = 'tk-gia', decided_at = ?, activation_deadline_at = ? WHERE id = ?").run(o.quyetLuc ?? tao, o.hanKichHoat ?? sau(NGAY), id);
    else w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, id);
  }
  if (["TU_CHOI", "DA_RUT", "HET_HAN"].includes(trangThai)) w.sqlite.prepare("UPDATE dk_registration SET decided_at = ? WHERE id = ?").run(o.quyetLuc ?? tao, id);
  if (o.doiLuc) w.sqlite.prepare("UPDATE dk_registration SET updated_at = ? WHERE id = ?").run(o.doiLuc, id);
  return { id, ident, email };
}
/** Tệp chờ: `kieu` = "song" (đã lưu, đang sống), "cho-xoa" (đã quyết gỡ, kho chưa xoá), "do-dang" (chưa lưu), "da-chuyen". */
async function tep(w: any, reg: string, kieu: "song" | "cho-xoa" | "do-dang" | "da-chuyen", taoLuc = truoc(NGAY)): Promise<{ id: string; key: string }> {
  const id = crypto.randomUUID();
  const key = `pty/${crypto.randomUUID().replace(/-/g, "")}`;
  const bam = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  w.sqlite.prepare(`INSERT INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, 'png', 8, ?, ?, 'ident', ?, 'ident')`).run(id, reg, `O_${so++}`, key, bam, taoLuc, taoLuc);
  await w.r2.put(key, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  if (kieu !== "do-dang") w.sqlite.prepare("UPDATE pty_registration_attachment SET stored_at = ? WHERE id = ?").run(taoLuc, id);
  if (kieu === "cho-xoa") w.sqlite.prepare("UPDATE pty_registration_attachment SET purged_at = ?, purge_reason = 'DA_RUT', content_hash = NULL WHERE id = ?").run(taoLuc, id);
  if (kieu === "da-chuyen") w.sqlite.prepare("UPDATE pty_registration_attachment SET transferred_at = ?, content_hash = NULL WHERE id = ?").run(taoLuc, id);
  return { id, key };
}
const reg = (w: any, id: string) => ({ ...w.q("SELECT * FROM dk_registration WHERE id = ?", id)[0] });
const dt = (w: any, ident: string) => ({ ...w.q("SELECT * FROM dk_identity WHERE id = ?", ident)[0] });
const bk = (w: any, id: string) => ({ ...w.q("SELECT * FROM dk_submission WHERE registration_id = ?", id)[0] });
const n = (w: any, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const nhatKy = (w: any) => w.q("SELECT staff_id, agent_code, target_type, target_id, detail FROM audit_log WHERE action = 'registration_cleanup_run'").map((x: any) => ({ ...x }));

test("(1) Hết hạn: ĐANG ĐIỀN 8 ngày (không mốc — lưới an toàn theo ngày tạo), ĐANG ĐIỀN có mốc đã qua, CẦN BỔ SUNG có mốc đã qua ⇒ HẾT HẠN + mốc kết thúc + lịch sử tác nhân; tệp gỡ và xoá khỏi kho. Phiếu 6 ngày, CHỜ XÁC MINH cũ: không đụng", async () => {
  const w = setup();
  const a = phieu(w, "DANG_DIEN", { taoLuc: truoc(8 * NGAY) });
  const ta = await tep(w, a.id, "song");
  const b = phieu(w, "DANG_DIEN", { taoLuc: truoc(NGAY), hetHanLuc: truoc(PHUT) });
  const c = phieu(w, "CAN_BO_SUNG", { hetHanLuc: truoc(PHUT), banKhai: true });
  const giu1 = phieu(w, "DANG_DIEN", { taoLuc: truoc(6 * NGAY) });
  const tg = await tep(w, giu1.id, "song");
  const giu2 = phieu(w, "CHO_XAC_MINH", { taoLuc: truoc(60 * NGAY), banKhai: true });
  const giu3 = phieu(w, "CAN_BO_SUNG", { hetHanLuc: sau(NGAY), doiLuc: truoc(30 * NGAY), banKhai: true }); // có mốc còn hạn: mốc thắng lưới
  const kq = await chay(w);
  assert.equal(kq.hetHan, 3);
  for (const x of [a, b, c]) {
    const p = reg(w, x.id);
    assert.equal(p.status, "HET_HAN", x.id);
    assert.equal(p.decided_at, BAY_GIO.toISOString(), "mốc kết thúc = lúc chạy (đồng hồ ẩn danh)");
    assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND actor_kind = 'AGENT' AND actor_ref = 'DON_PHIEU_DANG_KY' AND command = 'HET_HAN'", x.id), 1);
    assert.equal(dt(w, x.ident).is_open, 0, "danh tính hết «đang mở» (email đăng ký lại được)");
  }
  const d = w.q("SELECT purged_at, purge_reason, r2_deleted_at FROM pty_registration_attachment WHERE id = ?", ta.id)[0];
  assert.equal(d.purge_reason, "HET_HAN");
  assert.ok(d.r2_deleted_at);
  assert.equal(w.r2.co(ta.key), false);
  assert.ok(kq.xoaKho >= 1);
  for (const x of [giu1, giu2, giu3]) assert.notEqual(reg(w, x.id).status, "HET_HAN", x.id);
  assert.equal(w.r2.co(tg.key), true);
});

test("(2) Mốc hạn được ĐẶT theo chính sách: yêu cầu bổ sung ⇒ +14 ngày (mở phiếu +7 ngày: xin-ma-route.test.ts; gửi lại xoá mốc: phieu-route.test.ts)", async () => {
  const w = setup();
  const { id } = phieu(w, "CHO_XAC_MINH", { banKhai: true });
  seedStaff(w.sqlite, { id: "44444444-4444-4444-8444-444444444441", phone: "0900000005", name: "Quản Lý Bán Hàng", perms: ["SALES_MANAGER", "SALES"] }); // ADR-0219 Đ1: người xác minh
  const truocMs = Date.now();
  const r = await w.call("POST", `/api/dang-ky/phieu/${id}/bo-sung`, { as: "44444444-4444-4444-8444-444444444441", body: { lyDo: "KHONG_DOC_DUOC", phienBan: 1 } });
  assert.equal(r.status, 200, r.text);
  const han = Date.parse(reg(w, id).expires_at);
  assert.ok(han >= truocMs + 14 * NGAY - 1000 && han <= Date.now() + 14 * NGAY, "hạn bổ sung = lúc yêu cầu + supplement_expire_days");
});

test("(3) Ẩn danh: TỪ CHỐI 31 ngày ⇒ bản khai thay dấu, danh tính ẩn danh, mốc của phiếu; ĐÃ RÚT không bản khai ⇒ danh tính ẩn danh; TỪ CHỐI 29 ngày: không đụng; giữ mã phiếu, trạng thái, lý do", async () => {
  const w = setup();
  const a = phieu(w, "TU_CHOI", { quyetLuc: truoc(31 * NGAY), banKhai: true });
  w.sqlite.prepare("UPDATE dk_registration SET reason_code = 'KHONG_THUOC_DIEN' WHERE id = ?").run(a.id);
  const b = phieu(w, "DA_RUT", { quyetLuc: truoc(31 * NGAY) });
  const giu = phieu(w, "TU_CHOI", { quyetLuc: truoc(29 * NGAY), banKhai: true });
  const kq = await chay(w);
  assert.equal(kq.anDanh, 2);
  const s = bk(w, a.id);
  assert.equal(s.given_name, "(đã ẩn)");
  for (const c of ["family_name", "birth_date", "address_value", "phone_value", "phone_key", "issued_place"]) assert.equal(s[c], null, c);
  assert.match(s.document_number, /^XOA/);
  for (const x of [a, b]) {
    const d = dt(w, x.ident);
    assert.ok(d.erased_at);
    assert.equal(d.contact_email, null);
    assert.match(d.subject, /^XOA/);
    assert.ok(reg(w, x.id).erased_at, "mốc đã ẩn danh của phiếu");
    assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'AN_DANH'", x.id), 1);
  }
  const p = reg(w, a.id);
  assert.equal(p.status, "TU_CHOI");
  assert.equal(p.reason_code, "KHONG_THUOC_DIEN");
  assert.equal(bk(w, giu.id).given_name, "Thử");
  assert.equal(dt(w, giu.ident).contact_email, giu.email);
  // Lượt sau không làm lại (đã hết dữ liệu cá nhân).
  assert.equal((await chay(w)).anDanh, 0);
});

test("(4) Phiếu ĐÃ DUYỆT quá hạn đặt PIN + ÂN HẠN (activation_grace_days, gieo 30 ngày), chưa kích hoạt ⇒ danh tính ẩn danh, phiếu giữ ĐÃ DUYỆT; còn hạn: không đụng; sau đó «gửi lại lời mời» ⇒ 409 rõ ràng, không mở lại hạn", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  const a = phieu(w, "DA_DUYET", { hanKichHoat: truoc(31 * NGAY) });
  const giu = phieu(w, "DA_DUYET", { hanKichHoat: sau(NGAY) });
  const kq = await chay(w);
  assert.equal(kq.anDanh, 1);
  const d = dt(w, a.ident);
  assert.ok(d.erased_at);
  assert.equal(d.contact_email, null);
  const p = reg(w, a.id);
  assert.equal(p.status, "DA_DUYET");
  assert.equal(p.activated_at, null);
  assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'AN_DANH_DANH_TINH'", a.id), 1);
  assert.equal(dt(w, giu.ident).contact_email, giu.email);
  const han = p.activation_deadline_at;
  const r = await w.call("POST", `/api/dang-ky/phieu/${a.id}/gui-lai-loi-moi`, { as: HR });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_identity_erased");
  assert.doesNotMatch(r.json.error.message, /đăng ký lại/, "không hứa đăng ký lại (số điện thoại còn thuộc tài khoản tắt)");
  assert.match(r.json.error.message, /Toàn quyền/);
  assert.equal(reg(w, a.id).activation_deadline_at, han, "không mở lại hạn");
  assert.equal(n(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_invite_resent'"), 0);
  assert.equal((await w.call("POST", `/api/dang-ky/phieu/${giu.id}/gui-lai-loi-moi`, { as: HR })).status, 200, "phiếu còn danh tính: gửi lại được");
});

test("(5) «Gửi lại lời mời» đua với tác nhân: danh tính bị ẩn danh NGAY TRƯỚC lô (sau kiểm của route) ⇒ câu ghi tự canh, 409, không lịch sử / nhật ký", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  const a = phieu(w, "DA_DUYET", { hanKichHoat: truoc(31 * NGAY) });
  const han = reg(w, a.id).activation_deadline_at;
  // Lô gửi lại lời mời: [mở lại hạn, lịch sử, nhật ký, xếp thư «đã duyệt»] = 4 câu (rà soát cuối I-1 thêm câu xếp thư).
  w.chenTruocLo((stmts: any[]) => stmts.length === 4, async () => { await chay(w); });
  const r = await w.call("POST", `/api/dang-ky/phieu/${a.id}/gui-lai-loi-moi`, { as: HR });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "registration_identity_erased");
  assert.equal(reg(w, a.id).activation_deadline_at, han);
  assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command = 'GUI_LAI_LOI_MOI'", a.id), 0);
  assert.equal(n(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_invite_resent'"), 0);
  assert.equal(n(w, "SELECT count(*) n FROM dk_event WHERE registration_id = ? AND command GLOB 'THU_*'", a.id), 0, "danh tính đã ẩn danh ⇒ không xếp thư, không ghi gì");
});

test("(6) Kho: tệp «chờ xoá» (xoá kho hỏng / lần rút thứ hai) ⇒ xoá và đánh dấu; «tải dở dang» 11 phút ⇒ quyết gỡ + xoá; tải dở dang 5 phút và tệp đã chuyển: không đụng", async () => {
  const w = setup();
  const r = phieu(w, "DA_RUT", { quyetLuc: truoc(NGAY) });
  const choXoa = await tep(w, r.id, "cho-xoa");
  const song = phieu(w, "DANG_DIEN");
  const doDang = await tep(w, song.id, "do-dang", truoc(11 * PHUT));
  const moi = await tep(w, song.id, "do-dang", truoc(5 * PHUT));
  const chuyen = await tep(w, phieu(w, "DA_DUYET").id, "da-chuyen");
  const kq = await chay(w);
  assert.equal(kq.xoaKho, 2);
  assert.equal(w.r2.co(choXoa.key), false);
  assert.ok(w.q("SELECT r2_deleted_at FROM pty_registration_attachment WHERE id = ?", choXoa.id)[0].r2_deleted_at);
  const dd = w.q("SELECT purge_reason, r2_deleted_at FROM pty_registration_attachment WHERE id = ?", doDang.id)[0];
  assert.equal(dd.purge_reason, "TAI_LEN_DO_DANG");
  assert.ok(dd.r2_deleted_at);
  assert.equal(w.r2.co(moi.key), true);
  assert.equal(w.q("SELECT purged_at FROM pty_registration_attachment WHERE id = ?", moi.id)[0].purged_at, null);
  assert.equal(w.r2.co(chuyen.key), true);
  assert.equal(w.q("SELECT purged_at, r2_deleted_at FROM pty_registration_attachment WHERE id = ?", chuyen.id).map((x: any) => ({ ...x }))[0].r2_deleted_at, null);
});

test("(7) Mã email: dòng hết hạn tạo 61 phút trước ⇒ xoá; 59 phút trước (đã hết hạn 10 phút) ⇒ GIỮ (trần theo giờ còn đếm); lượt tải tệp 61 phút ⇒ xoá, 59 phút ⇒ giữ", async () => {
  const w = setup();
  const ma = (id: string, taoMs: number) =>
    w.sqlite.prepare("INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES (?, 'k', 'h', ?, 0, ?, ?)").run(id, truoc(taoMs - 10 * PHUT), truoc(taoMs), truoc(taoMs));
  ma("cu", 61 * PHUT);
  ma("moi", 59 * PHUT);
  ma("con-han", 5 * PHUT);
  const luot = (id: string, taoMs: number) => w.sqlite.prepare("INSERT INTO dk_upload_attempt (id, ip_key, at_ms, created_at, updated_at) VALUES (?, 'ip', ?, ?, ?)").run(id, BAY_GIO.getTime() - taoMs, truoc(taoMs), truoc(taoMs));
  luot("l-cu", 61 * PHUT);
  luot("l-moi", 59 * PHUT);
  const kq = await chay(w);
  assert.equal(kq.xoaMa, 1);
  assert.deepEqual(w.q("SELECT id FROM dk_email_code ORDER BY id").map((x: any) => x.id), ["con-han", "moi"]);
  assert.deepEqual(w.q("SELECT id FROM dk_upload_attempt").map((x: any) => x.id), ["l-moi"]);
  assert.match(nhatKy(w)[0].detail, /xoá lượt tải 1/);
});

test("(8) Một dòng nhật ký mỗi lượt có việc: mang mã tác nhân, không mã người, CHỈ số đếm (không mã phiếu, email, khoá kho); lượt không việc ⇒ không dòng nào", async () => {
  const w = setup();
  assert.deepEqual(await chay(w), { hetHan: 0, anDanh: 0, xoaKho: 0, xoaMa: 0 });
  assert.equal(nhatKy(w).length, 0, "không việc ⇒ không nhật ký");
  const a = phieu(w, "DANG_DIEN", { taoLuc: truoc(8 * NGAY) });
  const t = await tep(w, a.id, "song");
  const b = phieu(w, "TU_CHOI", { quyetLuc: truoc(40 * NGAY), banKhai: true });
  await chay(w);
  const nk = nhatKy(w);
  assert.equal(nk.length, 1);
  assert.equal(nk[0].agent_code, "DON_PHIEU_DANG_KY");
  assert.equal(nk[0].staff_id, null);
  for (const bi of [a.id, b.id, a.email, b.email, t.key, t.id]) assert.equal(String(nk[0].detail).includes(bi), false, `nhật ký lộ ${bi}`);
  assert.match(nk[0].detail, /^hết hạn 1 · ẩn danh 1 · xoá kho 1 · xoá mã 0 · xoá lượt tải 0$/);
});

test("(9) Cổng can(): người không giữ ô (Bán hàng, tác nhân khác) chạy ⇒ mọi số 0, không đổi dòng nào", async () => {
  const w = setup();
  const a = phieu(w, "DANG_DIEN", { taoLuc: truoc(8 * NGAY) });
  const b = phieu(w, "TU_CHOI", { quyetLuc: truoc(40 * NGAY), banKhai: true });
  for (const who of [{ id: "u", permissions: ["SALES"] }, (P as any).tacNhan("DON_ANH_VE")]) {
    assert.deepEqual(await chay(w, who), { hetHan: 0, anDanh: 0, xoaKho: 0, xoaMa: 0 });
  }
  assert.equal(reg(w, a.id).status, "DANG_DIEN");
  assert.equal(dt(w, b.ident).contact_email, b.email);
  assert.equal(nhatKy(w).length, 0);
});

test("(10) Lỗi không ném ra ngoài: kho hỏng ⇒ dòng còn «chờ xoá», lượt vẫn xong; log chỉ tên lỗi", async () => {
  const w = setup();
  const r = phieu(w, "DA_RUT", { quyetLuc: truoc(NGAY) });
  const t = await tep(w, r.id, "cho-xoa");
  w.env.HO_SO = { ...w.env.HO_SO, delete: async () => { throw new Error(`hỏng ${t.key}`); } };
  const dong: string[] = [];
  const g = console.error;
  console.error = (...a: unknown[]) => { dong.push(a.map(String).join(" ")); };
  try {
    const kq = await chay(w);
    assert.equal(kq.xoaKho, 0);
  } finally {
    console.error = g;
  }
  assert.equal(w.q("SELECT r2_deleted_at FROM pty_registration_attachment WHERE id = ?", t.id)[0].r2_deleted_at, null);
  assert.equal(dong.join("\n").includes(t.key), false, "log không mang khoá kho");
});

test("(11) Cron thật: `scheduled` của Worker chạy tác nhân dọn phiếu", async () => {
  const w = setup();
  const a = phieu(w, "DANG_DIEN", { taoLuc: truoc(8 * NGAY) });
  const goc = globalThis.fetch;
  globalThis.fetch = (async () => new Response("", { status: 503 })) as typeof fetch; // Google Sheet của việc đồng bộ danh mục: không gọi mạng thật
  const cho: Promise<unknown>[] = [];
  try {
    await app.default.scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now() }, w.env, { waitUntil: (p: Promise<unknown>) => void cho.push(p), passThroughOnException() {} });
    await Promise.all(cho);
  } finally {
    globalThis.fetch = goc;
  }
  assert.equal(reg(w, a.id).status, "HET_HAN");
  assert.equal(nhatKy(w)[0].agent_code, "DON_PHIEU_DANG_KY");
});

test("(12) Câu ẩn danh danh tính tự canh trạng thái: phiếu đang sống (đang điền, chờ xác minh, chờ duyệt) hay ĐÃ DUYỆT còn hạn chưa kích hoạt ⇒ 0 dòng, kể cả gọi thẳng", async () => {
  const w = setup();
  const { cauAnDanhDanhTinh } = await import("./repository.ts");
  for (const [t, o] of [["DANG_DIEN", {}], ["CHO_XAC_MINH", {}], ["CAN_BO_SUNG", {}], ["DA_DUYET", { hanKichHoat: sau(NGAY) }]] as [string, Gieo][]) {
    const x = phieu(w, t, o);
    const [r] = await w.env.DB.batch([cauAnDanhDanhTinh(w.env.DB, { registrationId: x.id, at: BAY_GIO.toISOString(), by: "DON_PHIEU_DANG_KY", mocAnHan: new Date(BAY_GIO.getTime() - 30 * NGAY).toISOString() })]);
    assert.equal(r.meta.changes, 0, t);
    assert.equal(dt(w, x.ident).contact_email, x.email, t);
  }
});

test("(13) Ân hạn sau hạn đặt PIN (phán quyết điều phối 15/11): hạn đã qua 29 ngày (< 30) ⇒ tác nhân GIỮ danh tính, «gửi lại lời mời» thành công và mở lại hạn; câu ẩn danh gọi thẳng cũng 0 dòng", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  const a = phieu(w, "DA_DUYET", { hanKichHoat: truoc(29 * NGAY) });
  const kq = await chay(w);
  assert.equal(kq.anDanh, 0);
  assert.equal(dt(w, a.ident).contact_email, a.email, "trong ân hạn: danh tính còn");
  const { cauAnDanhDanhTinh } = await import("./repository.ts");
  const [r0] = await w.env.DB.batch([cauAnDanhDanhTinh(w.env.DB, { registrationId: a.id, at: BAY_GIO.toISOString(), by: "DON_PHIEU_DANG_KY", mocAnHan: new Date(BAY_GIO.getTime() - 30 * NGAY).toISOString() })]);
  assert.equal(r0.meta.changes, 0, "câu ẩn danh tự canh ân hạn");
  const truocMs = Date.now();
  const r = await w.call("POST", `/api/dang-ky/phieu/${a.id}/gui-lai-loi-moi`, { as: HR });
  assert.equal(r.status, 200, r.text);
  assert.ok(Date.parse(reg(w, a.id).activation_deadline_at) >= truocMs + 14 * NGAY - 1000, "hạn mới = bây giờ + activation_days");
  assert.equal(n(w, "SELECT count(*) n FROM audit_log WHERE action = 'registration_invite_resent'"), 1);
});

test("(14) Hạn phiếu đang điền tính từ THAO TÁC cuối (ADR-0206: «quá 7 ngày không thao tác»): mở ngày 0, lưu nháp (PUT) ngày 6 / tải tệp ngày 6 ⇒ ngày 8 vẫn ĐANG ĐIỀN; không thao tác ⇒ ngày 8 HẾT HẠN", async () => {
  const w = setup();
  // Ngày 0 = 6 ngày trước «bây giờ»; mốc hạn gieo như lúc mở (ngày 0 + 7 ngày). Thao tác chạy «bây giờ» (= ngày 6); tác nhân chạy ngày 8.
  const mo = (): ReturnType<typeof phieu> => phieu(w, "DANG_DIEN", { taoLuc: new Date(Date.now() - 6 * NGAY).toISOString(), hetHanLuc: new Date(Date.now() + NGAY).toISOString() });
  const luu = mo();
  const tai = mo();
  const khong = mo();
  const ck = async (x: { id: string; ident: string }) => `${DK_COOKIE}=${await taoPhienDangKy(w.env.SESSION_SECRET, x.id, x.ident, Date.now())}`;
  const r1 = await w.call("PUT", "/api/dang-ky/phieu", { body: { loai: "GUIDE_FREELANCE" }, headers: { cookie: await ck(luu) } });
  assert.equal(r1.status, 200, r1.text);
  const than = { o: "CCCD_MAT_TRUOC", noiDung: Buffer.from(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7])).toString("base64") };
  const r2 = await w.call("POST", "/api/dang-ky/phieu/tep", { body: than, headers: { cookie: await ck(tai), "content-length": String(Buffer.byteLength(JSON.stringify(than))) } });
  assert.equal(r2.status, 200, r2.text);
  const ngay8 = new Date(Date.now() + 2 * NGAY);
  const kq = await chay(w, TAC_NHAN, ngay8);
  assert.equal(kq.hetHan, 1, "chỉ phiếu không thao tác hết hạn");
  assert.equal(reg(w, luu.id).status, "DANG_DIEN", "lưu nháp ngày 6 đẩy hạn");
  assert.equal(reg(w, tai.id).status, "DANG_DIEN", "tải tệp ngày 6 đẩy hạn");
  assert.equal(reg(w, khong.id).status, "HET_HAN");
});

test("(15) Lô ẩn danh phiếu đã kết thúc tự canh TRONG câu: câu mốc «đã ẩn danh» khớp 0 dòng (phiếu chưa đủ tuổi) ⇒ hai câu xoá (bản khai, danh tính) cũng 0 dòng, kể cả gọi thẳng", async () => {
  const w = setup();
  const { cauDanhDauAnDanh, cauAnDanhBanKhai, cauAnDanhDanhTinh } = await import("./repository.ts");
  const x = phieu(w, "TU_CHOI", { quyetLuc: truoc(29 * NGAY), banKhai: true });
  const at = BAY_GIO.toISOString();
  const moc = truoc(30 * NGAY);
  const kq = await w.env.DB.batch([
    cauDanhDauAnDanh(w.env.DB, { registrationId: x.id, at, moc, by: "DON_PHIEU_DANG_KY" }),
    cauAnDanhBanKhai(w.env.DB, { registrationId: x.id, at, by: "DON_PHIEU_DANG_KY" }),
    cauAnDanhDanhTinh(w.env.DB, { registrationId: x.id, at, by: "DON_PHIEU_DANG_KY", mocAnHan: moc }),
  ]);
  assert.deepEqual(kq.map((r: any) => r.meta.changes), [0, 0, 0], "phiếu 29 ngày: không câu nào đổi dòng");
  assert.equal(bk(w, x.id).given_name, "Thử");
  assert.equal(dt(w, x.ident).contact_email, x.email);
  assert.equal(reg(w, x.id).erased_at, null);
});

test("(T7) ADR-0212 Đ7 (đợt 2 Task 7): TỪ CHỐI 31 ngày có phần tổ chức ⇒ tác nhân ẩn danh CẢ phần tổ chức cùng lô (đúng khuôn trigger), R-DK-8 sạch; 29 ngày: phần tổ chức giữ nguyên", async () => {
  const w = setup();
  const a = phieu(w, "TU_CHOI", { quyetLuc: truoc(31 * NGAY), banKhai: true, toChuc: true });
  const giu = phieu(w, "TU_CHOI", { quyetLuc: truoc(29 * NGAY), banKhai: true, toChuc: true });
  assert.equal((await chay(w)).anDanh, 1);
  const o = { ...w.q("SELECT * FROM dk_submission_org WHERE registration_id = ?", a.id)[0] };
  assert.ok(o.erased_at);
  assert.equal(o.display_name, "(đã ẩn)");
  for (const c of ["legal_name", "address", "invoice_email", "phone_value", "phone_key", "gpkd_issued_place"]) assert.equal(o[c], null, c);
  for (const c of ["tax_code", "tax_key", "gpkd_number", "gpkd_key"]) assert.match(String(o[c]), /^XOA/, c);
  const r8 = CHECKS.find((c: any) => c.code === "R-DK-8");
  assert.equal(demViPham(w.sqlite, r8), 0, "R-DK-8 sạch sau lượt tác nhân");
  assert.equal(w.q("SELECT display_name FROM dk_submission_org WHERE registration_id = ?", giu.id)[0].display_name, "Công ty Thử");
});

// ---- ADR-0213 Đ7 (mốc B2 Task 15; Ruling R6): tác nhân dọn lời mời vào tổ chức — không thêm mã tác nhân ----
function toChucMoi(w: any, id = "org-loi-moi"): string {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Tổ chức thử', 1, ?, ?)").run(id, truoc(60 * NGAY), truoc(60 * NGAY));
  return id;
}
let soMv = 0;
/** Gieo lời mời ở trạng thái `tt` (đi đúng đồ thị trigger 0176). */
function loiMoiGieo(w: any, org: string, o: { tt?: "MO" | "GIU_CHO_PHIEU" | "DA_DUNG" | "DA_HUY" | "HET_HAN"; han?: string; tao?: string; giu?: string; ketThuc?: string } = {}): string {
  const id = `MV_DON${String.fromCharCode(65 + (soMv % 26))}AAAA`.slice(0, 11);
  soMv++;
  const tao = o.tao ?? truoc(NGAY);
  w.sqlite.prepare("INSERT INTO pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, '0912000111', ?, 'MO', ?, ?, 'tk-moi', ?, 'tk-moi')")
    .run(id, org, `bam-${id}`, o.han ?? sau(6 * NGAY), tao, tao);
  const kt = o.ketThuc ?? tao;
  if (o.tt === "GIU_CHO_PHIEU") w.sqlite.prepare("UPDATE pty_org_invite SET status = 'GIU_CHO_PHIEU', held_registration_id = ?, updated_at = ? WHERE id = ?").run(o.giu, kt, id);
  if (o.tt === "DA_DUNG") w.sqlite.prepare("UPDATE pty_org_invite SET status = 'DA_DUNG', used_by_staff_id = 'tk-nhan', used_at = ?, updated_at = ? WHERE id = ?").run(kt, kt, id);
  if (o.tt === "DA_HUY") w.sqlite.prepare("UPDATE pty_org_invite SET status = 'DA_HUY', cancelled_by = 'tk-moi', cancelled_at = ?, updated_at = ? WHERE id = ?").run(kt, kt, id);
  if (o.tt === "HET_HAN") w.sqlite.prepare("UPDATE pty_org_invite SET status = 'HET_HAN', updated_at = ? WHERE id = ?").run(kt, id);
  return id;
}
const lm = (w: any, id: string) => ({ ...w.q("SELECT status, held_registration_id, phone_key, erased_at FROM pty_org_invite WHERE id = ?", id)[0] });

test("(R6) Lời mời: MỞ quá hạn ⇒ HẾT HẠN; đang GIỮ CHỖ quá hạn KHÔNG hết hạn (phiếu còn chờ); kết thúc quá 30 ngày ⇒ số thay bằng dấu ẩn danh + erased_at; 29 ngày: chưa; nhật ký chỉ số đếm", async () => {
  const w = setup();
  const org = toChucMoi(w);
  const cho = phieu(w, "CHO_XAC_MINH", { banKhai: true });
  const moQuaHan = loiMoiGieo(w, org, { han: truoc(PHUT) });
  const moConHan = loiMoiGieo(w, org);
  const giuQuaHan = loiMoiGieo(w, org, { tt: "GIU_CHO_PHIEU", han: truoc(NGAY), giu: cho.id });
  const xong31 = loiMoiGieo(w, org, { tt: "DA_DUNG", tao: truoc(40 * NGAY), ketThuc: truoc(31 * NGAY) });
  const huy31 = loiMoiGieo(w, org, { tt: "DA_HUY", tao: truoc(40 * NGAY), ketThuc: truoc(31 * NGAY) });
  const xong29 = loiMoiGieo(w, org, { tt: "DA_DUNG", tao: truoc(40 * NGAY), ketThuc: truoc(29 * NGAY) });
  await chay(w);
  assert.equal(lm(w, moQuaHan).status, "HET_HAN");
  assert.equal(lm(w, moConHan).status, "MO");
  assert.deepEqual(lm(w, giuQuaHan), { status: "GIU_CHO_PHIEU", held_registration_id: cho.id, phone_key: "0912000111", erased_at: null }, "giữ chỗ không hết hạn khi phiếu còn chờ");
  for (const id of [xong31, huy31]) {
    assert.equal(lm(w, id).phone_key, "(đã ẩn)");
    assert.ok(lm(w, id).erased_at);
  }
  assert.equal(lm(w, xong29).phone_key, "0912000111");
  const nk = nhatKy(w);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /lời mời: bỏ giữ chỗ 0, hết hạn 1, ẩn danh 2$/);
  assert.doesNotMatch(nk[0].detail, /0912/);
  // Lượt sau: lời mời vừa hết hạn chưa đủ 30 ngày ⇒ không ẩn; không còn gì ⇒ không dòng nhật ký mới.
  await chay(w);
  assert.equal(lm(w, moQuaHan).phone_key, "0912000111");
  assert.equal(nhatKy(w).length, 1);
});

test("(R6) Phiếu CẦN BỔ SUNG đang giữ lời mời hết hạn ⇒ bỏ giữ chỗ TRONG lô hết hạn (về MỞ nếu còn hạn); lưới: phiếu TỪ CHỐI còn sót giữ chỗ ⇒ bỏ giữ chỗ (HẾT HẠN nếu đã quá)", async () => {
  const w = setup();
  const org = toChucMoi(w);
  const bs = phieu(w, "CAN_BO_SUNG", { banKhai: true, hetHanLuc: truoc(PHUT) });
  const a = loiMoiGieo(w, org, { tt: "GIU_CHO_PHIEU", giu: bs.id });
  w.sqlite.prepare("UPDATE dk_registration SET invite_id = ? WHERE id = ?").run(a, bs.id);
  const tc = phieu(w, "TU_CHOI", { banKhai: true });
  const b = loiMoiGieo(w, org, { tt: "GIU_CHO_PHIEU", giu: tc.id, han: truoc(NGAY) });
  w.sqlite.prepare("UPDATE dk_registration SET invite_id = ? WHERE id = ?").run(b, tc.id);
  const kq = await chay(w);
  assert.equal(kq.hetHan, 1);
  assert.equal(reg(w, bs.id).status, "HET_HAN");
  assert.deepEqual([lm(w, a).status, lm(w, a).held_registration_id], ["MO", null]);
  assert.deepEqual([lm(w, b).status, lm(w, b).held_registration_id], ["HET_HAN", null]);
  assert.match(nhatKy(w)[0].detail, /lời mời: bỏ giữ chỗ 1, hết hạn 0, ẩn danh 0$/, "lưới đếm đúng lời mời của phiếu TỪ CHỐI (lời mời của phiếu hết hạn đã bỏ trong lô của nó)");
});
