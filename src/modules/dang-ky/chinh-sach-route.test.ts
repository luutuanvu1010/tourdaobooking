// Chỗ mở, đóng đăng ký của Toàn quyền (ADR-0206 Đ9; đợt 1 Task 12 vòng sửa 1, I-3) qua route thật (tests/audit/harness.mjs, SQLite thật). Mọi email, số là GIẢ.
import { after, test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { registeredSql } from "../../shared/sql-registry.ts";
import "./repository.ts"; // đăng ký các câu defineSql của dang-ky

const SUP = "77777777-7777-4777-8777-777777777777";
const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "99999999-9999-4999-8999-999999999999";
const SALES = "11111111-1111-4111-8111-111111111111";
const AT = "2026-11-10T00:00:00.000Z";
const LOAI = ["GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"];
// Turnstile hỏi `fetch` toàn cục: thay bằng bản giả (khuôn xin-ma-route.test.ts) — không mạng.
const goc = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  if (!String(url).includes("challenges.cloudflare.com")) return goc(url, init);
  const ok = new URLSearchParams(String(init?.body)).get("response") === "token-tot";
  return new Response(JSON.stringify({ success: ok, "error-codes": ok ? [] : ["invalid-input-response"] }), { status: 200 });
}) as typeof fetch;
after(() => { globalThis.fetch = goc; });

function setup(o: { riengTu?: boolean } = {}) {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("DELETE FROM pty_privacy_policy"); // bài tự quyết có / không có chính sách riêng tư
  if (o.riengTu !== false) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  return w;
}
const xem = (w: any, as = SUP) => w.call("GET", "/api/dang-ky/chinh-sach", { as });
const doi = (w: any, body: unknown, as = SUP) => w.call("POST", "/api/dang-ky/chinh-sach", { as, body });
const soDong = (w: any): number => Number(w.q("SELECT count(*) AS n FROM dk_policy")[0].n);
const moiNhat = (w: any) => ({ ...w.q("SELECT * FROM dk_policy ORDER BY valid_from_at DESC LIMIT 1")[0] });

test("(1) Chỉ Toàn quyền xem và đổi; Quản trị, Nhân sự, Bán hàng ⇒ 403, không thêm dòng", async () => {
  const w = setup();
  const r = await xem(w);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanDangKy, false, "bản gieo: công tắc tắt");
  // ADR-0212 Đ1: danh sách đọc từ pty_role_type (sáu vai bên ngoài), kèm tên từ bảng và câu «chưa mở được» (null = mở được).
  assert.deepEqual(r.json.loaiCoThe.map((x: any) => x.ma), ["TRAVEL_AGENCY", ...LOAI, "DRIVER_EXTERNAL"], "theo sort_order của bảng");
  const tuBang = Object.fromEntries(w.q("SELECT code, name FROM pty_role_type").map((x: any) => [x.code, x.name]));
  for (const l of r.json.loaiCoThe) assert.equal(l.ten, tuBang[l.ma], `tên ${l.ma} từ bảng`);
  const lyDo = Object.fromEntries(r.json.loaiCoThe.map((x: any) => [x.ma, x.lyDoChuaMo]));
  for (const ma of LOAI) assert.equal(lyDo[ma], null, ma);
  assert.match(lyDo.TRAVEL_AGENCY, /Công ty lữ hành/);
  assert.match(lyDo.DRIVER_EXTERNAL, /bằng lái/);
  assert.equal(r.json.loaiCoThe.every((x: any) => x.laLoaiDoiTac === false), true, "sáu vai có sẵn không mang cờ loại đối tác");
  const truoc = soDong(w);
  for (const as of [ADM, HR, SALES]) {
    assert.equal((await xem(w, as)).status, 403, `xem ${as}`);
    assert.equal((await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: r.json.id }, as)).status, 403, `đổi ${as}`);
  }
  assert.equal(soDong(w), truoc);
});

test("(2) Mở: thêm ĐÚNG MỘT dòng mới, chỉ đổi công tắc và loại mở, mọi con số khác giữ nguyên; dòng cũ không đổi; nhật ký không có dữ liệu cá nhân", async () => {
  const w = setup();
  const cu = moiNhat(w);
  const r = await doi(w, { nhanDangKy: true, loaiMo: ["TAXI_DRIVER", "GUIDE_FREELANCE", "GUIDE_FREELANCE"], dangHieuLuc: cu.id });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.nhanDangKy, true);
  assert.deepEqual(r.json.loaiMo, ["GUIDE_FREELANCE", "TAXI_DRIVER"], "thứ tự chuẩn, bỏ trùng");
  const moi = moiNhat(w);
  assert.notEqual(moi.id, cu.id);
  assert.equal(moi.registration_open, 1);
  assert.equal(moi.open_role_codes, "GUIDE_FREELANCE,TAXI_DRIVER");
  assert.equal(moi.created_by, SUP);
  for (const k of Object.keys(cu)) {
    if (["id", "registration_open", "open_role_codes", "valid_from_at", "created_at", "created_by", "updated_at", "updated_by"].includes(k)) continue;
    assert.equal(moi[k], cu[k], `cột ${k} phải giữ nguyên`);
  }
  assert.deepEqual({ ...w.q("SELECT * FROM dk_policy WHERE id = ?", cu.id)[0] }, cu, "dòng cũ không đổi");
  const nk = w.q("SELECT staff_id, detail, target_type FROM audit_log WHERE action = 'registration_policy_set'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, SUP);
  assert.match(nk[0].detail, /Bật/);
  // Đóng lại: thêm một dòng nữa, tắt.
  const r2 = await doi(w, { nhanDangKy: false, loaiMo: ["TAXI_DRIVER"], dangHieuLuc: moi.id });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(r2.json.nhanDangKy, false);
  assert.equal(moiNhat(w).registration_open, 0);
});

test("(3) Mở khi chưa có chính sách riêng tư đang hiệu lực ⇒ 409 no_privacy_policy, không thêm dòng; đóng thì vẫn được", async () => {
  const w = setup({ riengTu: false });
  const cu = moiNhat(w);
  const truoc = soDong(w);
  const r = await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: cu.id });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "no_privacy_policy");
  assert.equal(soDong(w), truoc);
  assert.equal((await xem(w)).json.coChinhSachRiengTu, false);
  assert.equal((await doi(w, { nhanDangKy: false, loaiMo: [], dangHieuLuc: cu.id })).status, 200);
});

test("(4) TRAVEL_AGENCY, vai lạ, mở mà không loại nào, ô thừa ⇒ 400, không thêm dòng", async () => {
  const w = setup();
  const id = moiNhat(w).id;
  const truoc = soDong(w);
  for (const body of [
    { nhanDangKy: true, loaiMo: ["TRAVEL_AGENCY"], dangHieuLuc: id },
    { nhanDangKy: true, loaiMo: ["COLLABORATOR", "TRAVEL_AGENCY"], dangHieuLuc: id },
    { nhanDangKy: true, loaiMo: ["DRIVER_EXTERNAL"], dangHieuLuc: id },
    { nhanDangKy: true, loaiMo: [], dangHieuLuc: id },
    { nhanDangKy: true, loaiMo: ["COLLABORATOR"] },
    { nhanDangKy: "co", loaiMo: ["COLLABORATOR"], dangHieuLuc: id },
    { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: id, photo_max_mb: 10 },
  ]) {
    const r = await doi(w, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(soDong(w), truoc);
});

test("(5) Khoá lạc quan: dòng đã thấy cũ ⇒ 409; hai người đổi cùng lúc (người kia ghi NGAY TRƯỚC lô của mình) ⇒ 409, chỉ một dòng mới, một dòng nhật ký", async () => {
  const w = setup();
  const cu = moiNhat(w);
  assert.equal((await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: "khong-co" })).status, 409);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /INSERT INTO dk_policy/.test(s.sql)), async () => {
    const r = await doi(w, { nhanDangKy: true, loaiMo: ["TAXI_DRIVER"], dangHieuLuc: cu.id });
    assert.equal(r.status, 200, `người kia: ${r.text}`);
  });
  const r = await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: cu.id });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2, "dòng gieo + đúng một dòng của người thắng");
  assert.equal(moiNhat(w).open_role_codes, "TAXI_DRIVER");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'registration_policy_set'")[0].n), 1);
});

test("(6) Đóng ⇒ xin mã cho email mới KHÔNG gửi thư (cùng câu 200); mở qua route ⇒ gửi thư", async () => {
  const w = setup();
  w.env.TURNSTILE_SECRET_KEY = "khoa-bi-mat-thu";
  w.env.FEEDBACK_MAIL_FROM = "no-reply@booking.tourdao.vn";
  const thu: { to: string }[] = [];
  w.env.EMAIL = { send: async (m: { to: string }) => { thu.push(m); } };
  const xinMa = (email: string, ip: string) => w.call("POST", "/api/dang-ky/ma", { body: { email, turnstileToken: "token-tot" }, headers: { "cf-connecting-ip": ip } });
  const r1 = await xinMa("dong.cua@example.com", "203.0.113.31");
  assert.equal(r1.status, 200, r1.text);
  await w.choNen();
  assert.equal(thu.length, 0, "đang đóng: không thư nào");
  assert.equal((await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR"], dangHieuLuc: moiNhat(w).id })).status, 200);
  await new Promise((r) => setTimeout(r, 5)); // dòng mới có mốc ≤ lúc xin mã
  const r2 = await xinMa("mo.cua@example.com", "203.0.113.32");
  assert.equal(r2.status, 200, r2.text);
  await w.choNen();
  assert.deepEqual(thu.map((m) => m.to), ["mo.cua@example.com"]);
});

test("(7) Câu đổi chính sách chép ĐỦ mọi cột của dk_policy (so PRAGMA table_info): chỉ mã, công tắc, loại mở và các cột mốc / người ghi do route tự đặt; cột thêm sau này không bị bỏ rơi lặng lẽ", () => {
  const w = setup();
  const cot = (w.q("PRAGMA table_info(dk_policy)") as { name: string }[]).map((c) => c.name);
  assert.ok(cot.length >= 20, "đọc được bảng");
  const sql = registeredSql().find((e) => e.module === "dang-ky" && e.name === "policy_switch_insert")?.sql ?? "";
  const m = /INSERT INTO dk_policy \(([^)]*)\)\s*SELECT ([\s\S]*?)\s+FROM dk_policy p\b/.exec(sql);
  assert.ok(m, "tìm thấy câu INSERT … SELECT … FROM dk_policy p");
  const chen = m![1]!.split(",").map((x) => x.trim());
  const chon = m![2]!.split(",").map((x) => x.trim());
  assert.equal(chen.length, chon.length, "số cột chèn = số biểu thức chọn");
  assert.deepEqual([...chen].sort(), [...cot].sort(), "câu chèn liệt kê ĐÚNG mọi cột của bảng (thêm cột vào bảng thì phải thêm vào câu)");
  const ROUTE_DAT = new Set(["id", "registration_open", "open_role_codes", "valid_from_at", "created_at", "created_by", "updated_at", "updated_by"]);
  for (const [i, c] of chen.entries()) {
    if (ROUTE_DAT.has(c)) assert.match(chon[i]!, /^\?\d+$/, `${c}: route tự đặt bằng tham số`);
    else assert.equal(chon[i], `p.${c}`, `${c}: phải chép nguyên từ dòng hiện hành`);
  }
});

// ---- ADR-0212 Đ1, Đ2: danh sách vai là dữ liệu ----
const themLoai = (w: any, ma = "LD_TEST", ten = "Loại thử", active = 1) =>
  w.sqlite.exec(`INSERT INTO pty_role_type (code, name, sort_order, active, role_group, is_partner_label, created_at, created_by, updated_at, updated_by) VALUES ('${ma}', '${ten}', 150, ${active}, 'OTHER', 1, '${AT}', '${SUP}', '${AT}', '${SUP}')`);

test("(8) Loại do Kế toán thêm (có cờ) tự hiện với tên từ bảng; tắt thì biến mất; mở được ⇒ 200", async () => {
  const w = setup();
  themLoai(w);
  const r = await xem(w);
  const l = r.json.loaiCoThe.find((x: any) => x.ma === "LD_TEST");
  assert.deepEqual(l, { ma: "LD_TEST", ten: "Loại thử", laLoaiDoiTac: true, lyDoChuaMo: null });
  const mo = await doi(w, { nhanDangKy: true, loaiMo: ["LD_TEST"], dangHieuLuc: r.json.id });
  assert.equal(mo.status, 200, mo.text);
  assert.deepEqual(mo.json.loaiMo, ["LD_TEST"]);
  w.sqlite.exec("UPDATE pty_role_type SET active = 0 WHERE code = 'LD_TEST'");
  assert.equal((await xem(w)).json.loaiCoThe.some((x: any) => x.ma === "LD_TEST"), false, "tắt ⇒ biến khỏi danh sách");
});

test("(9) Vai nội bộ, vai OTHER không cờ, vai lạ ⇒ 400; Công ty lữ hành và Tài xế đối tác ⇒ 400 kèm câu nói thiếu gì", async () => {
  const w = setup();
  const id = moiNhat(w).id;
  const truoc = soDong(w);
  for (const ma of ["ACCOUNTANT", "DIRECTOR", "CARRIER", "OWNER_COMPANY", "KHONG_CO"]) {
    const r = await doi(w, { nhanDangKy: true, loaiMo: [ma], dangHieuLuc: id });
    assert.equal(r.status, 400, `${ma}: ${r.text}`);
  }
  const ta = await doi(w, { nhanDangKy: true, loaiMo: ["TRAVEL_AGENCY"], dangHieuLuc: id });
  assert.equal(ta.status, 400);
  assert.match(ta.json.error.message, /Công ty lữ hành/);
  const tx = await doi(w, { nhanDangKy: true, loaiMo: ["DRIVER_EXTERNAL"], dangHieuLuc: id });
  assert.equal(tx.status, 400);
  assert.match(tx.json.error.message, /bằng lái/);
  assert.equal(soDong(w), truoc);
});

test("(10) Cấu hình công khai: loaiMo là {ma, ten, phan}; loại đã tắt tự biến khỏi loaiMo dù chính sách còn mã", async () => {
  const w = setup();
  themLoai(w);
  const r = await doi(w, { nhanDangKy: true, loaiMo: ["COLLABORATOR", "LD_TEST"], dangHieuLuc: moiNhat(w).id });
  assert.equal(r.status, 200, r.text);
  const ch = await w.call("GET", "/api/dang-ky/cau-hinh");
  const mo = Object.fromEntries(ch.json.loaiMo.map((x: any) => [x.ma, x]));
  assert.deepEqual(mo.LD_TEST, { ma: "LD_TEST", ten: "Loại thử", phan: "CA_NHAN_HOAC_TO_CHUC" });
  assert.equal(mo.COLLABORATOR.phan, "CA_NHAN");
  w.sqlite.exec("UPDATE pty_role_type SET active = 0 WHERE code = 'LD_TEST'");
  const ch2 = await w.call("GET", "/api/dang-ky/cau-hinh");
  assert.deepEqual(ch2.json.loaiMo.map((x: any) => x.ma), ["COLLABORATOR"]);
});
