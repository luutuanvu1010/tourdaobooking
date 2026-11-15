// ADR-0210 Đ3, Đ5: (1) ba màn (Quản lý tài khoản, Danh bạ danh sách + chi tiết, Hồ sơ của tôi) trả CÙNG một giá trị cho cùng một hồ sơ, do máy chủ tính (route thật, SQLite thật);
// (2) ai vốn không thấy màn nào thì không thấy dấu ở màn đó (Bán hàng không có account.view; Nhân sự không có party.view); (3) dấu CHỈ ĐỂ BIẾT: quét mã, không route đơn / tiền / đăng nhập /
// đăng ký nào đọc view dữ kiện hay hàm tính dấu. Phá thử: cho `orders/index.ts` gọi `dauXacMinhTheoHoSo` → bài (3) đỏ; bỏ `account.view` khỏi GET /api/staff → (2) đỏ (xem task-10-report).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const KHACH = "99999999-9999-4999-8999-999999999999";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${KHACH}', 'PERSON', 'Khách Lẻ', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${KHACH}', 'Lẻ', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
  return w;
}
let dem = 0;
function xacMinhDu(w: any, party: string): void {
  const luc = () => new Date(Date.parse("2026-11-01T00:00:00.000Z") + ++dem * 1000).toISOString();
  const t = luc();
  w.sqlite.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, created_at, updated_at) VALUES ('gt-${party}', '${party}', 'CCCD', '000111', '000111', '2099-01-01', '${t}', '${t}')`);
  for (const [kind, target, code] of [["ATTRIBUTE", null, "HO_TEN"], ["ATTRIBUTE", null, "NGAY_SINH"], ["PERSON_DOCUMENT", `gt-${party}`, null]] as const) {
    const at = luc();
    w.sqlite.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'DA_XAC_MINH', ?, ?, ?, ?)`)
      .run(`xm-${++dem}`, party, kind, target, code, at, ADM, at, ADM);
  }
}

/** Dấu của hồ sơ của `staffId` ở cả ba màn (+ màn Danh bạ chi tiết). */
async function bonMan(w: any, staffId: string) {
  const party = `pty-${staffId}`;
  const ds = await w.call("GET", "/api/staff", { as: SUP });
  const dong = ds.json.staff.find((s: any) => s.id === staffId);
  const dsDanhBa = await w.call("GET", `/api/parties?limit=100&includeInactive=1`, { as: SUP });
  const ct = await w.call("GET", `/api/parties/${party}`, { as: SUP });
  const cuaToi = await w.call("GET", "/api/parties/cua-toi", { as: staffId });
  assert.equal(ds.status, 200, ds.text); assert.equal(dsDanhBa.status, 200, dsDanhBa.text); assert.equal(ct.status, 200, ct.text); assert.equal(cuaToi.status, 200, cuaToi.text);
  return {
    quanLyTaiKhoan: dong.dauXacMinh,
    danhBaDanhSach: dsDanhBa.json.parties.find((p: any) => p.id === party).dauXacMinh,
    danhBaChiTiet: ct.json.party.dauXacMinh,
    cuaToi: cuaToi.json.hoSo.dauXacMinh,
  };
}

test("ba màn cùng một giá trị: Chưa → Đã (sau khi duyệt đủ mục) → Cần lại (sau khi đổi tên tài khoản qua PATCH)", async () => {
  const w = setup();
  const chua = await bonMan(w, SALES);
  assert.deepEqual(chua, { quanLyTaiKhoan: "CHUA", danhBaDanhSach: "CHUA", danhBaChiTiet: "CHUA", cuaToi: "CHUA" });
  xacMinhDu(w, `pty-${SALES}`);
  assert.deepEqual(await bonMan(w, SALES), { quanLyTaiKhoan: "DA", danhBaDanhSach: "DA", danhBaChiTiet: "DA", cuaToi: "DA" });
  // đường đổi tên tài khoản THẬT (PATCH /api/staff/:id) — Toàn quyền đổi tên ⇒ HO_TEN cần xác minh lại ở cả bốn nơi
  const r = await w.call("PATCH", `/api/staff/${SALES}`, { as: SUP, body: { fullName: "Trần Văn Mới" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(await bonMan(w, SALES), { quanLyTaiKhoan: "CAN_LAI", danhBaDanhSach: "CAN_LAI", danhBaChiTiet: "CAN_LAI", cuaToi: "CAN_LAI" });
});

test("sửa hồ sơ ở Danh bạ (PUT /api/parties/:id) đổi họ tên ⇒ ba màn hiện Cần lại", async () => {
  const w = setup();
  xacMinhDu(w, `pty-${SALES}`);
  const ct = await w.call("GET", `/api/parties/pty-${SALES}`, { as: SUP });
  const p = ct.json.party;
  const r = await w.call("PUT", `/api/parties/pty-${SALES}`, { as: SUP, body: { kind: "PERSON", familyName: "Lê", middleName: "", givenName: "Khác", active: true, expectedUpdatedAt: p.updatedAt } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(await bonMan(w, SALES), { quanLyTaiKhoan: "CAN_LAI", danhBaDanhSach: "CAN_LAI", danhBaChiTiet: "CAN_LAI", cuaToi: "CAN_LAI" });
});

test("khách lẻ (không tài khoản, không vai đối tác) không có dấu ở Danh bạ; hồ sơ đối tác có dấu", async () => {
  const w = setup();
  const ds = await w.call("GET", "/api/parties?limit=100&includeInactive=1", { as: SUP });
  assert.equal(ds.status, 200, ds.text);
  assert.equal(ds.json.parties.find((p: any) => p.id === KHACH).dauXacMinh, null);
  const ct = await w.call("GET", `/api/parties/${KHACH}`, { as: SUP });
  assert.equal(ct.json.party.dauXacMinh, null);
  w.sqlite.exec("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('DT_THU', 'Đối tác thử', 90, 'OTHER', 1)");
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('rk', '${KHACH}', 'DT_THU', '2026-01-01', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
  const ct2 = await w.call("GET", `/api/parties/${KHACH}`, { as: SUP });
  assert.equal(ct2.json.party.dauXacMinh, "CHUA");
});

test("Bán hàng không thấy dấu ở Quản lý tài khoản (403); Nhân sự thấy ở Quản lý tài khoản nhưng không vào Danh bạ (403); Quản trị thấy cả hai", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/staff", { as: SALES })).status, 403);
  const hr = await w.call("GET", "/api/staff", { as: HR });
  assert.equal(hr.status, 200);
  assert.ok(hr.json.staff.every((s: any) => s.dauXacMinh === "CHUA" || s.dauXacMinh === null));
  assert.equal((await w.call("GET", "/api/parties", { as: HR })).status, 403);
  assert.equal((await w.call("GET", `/api/parties/pty-${SALES}`, { as: HR })).status, 403);
  assert.equal((await w.call("GET", "/api/staff", { as: ADM })).status, 200);
  assert.equal((await w.call("GET", "/api/parties", { as: ADM })).status, 200);
});

// ---- (3) chỉ để biết: quét mã ----
const SRC = fileURLToPath(new URL("./", import.meta.url));
const ROOT = fileURLToPath(new URL("../", import.meta.url));
function tep(dir: string, ra: string[] = []): string[] {
  for (const t of readdirSync(dir)) {
    const d = join(dir, t);
    if (statSync(d).isDirectory()) tep(d, ra);
    else if (/\.ts$/.test(t) && !/\.test\.ts$/.test(t)) ra.push(d);
  }
  return ra;
}
const TEP_MA = [...tep(SRC), ...tep(join(ROOT, "web"))].map((f) => ({ f: f.slice(ROOT.length), src: readFileSync(f, "utf8") }));
const GIAN_DAU = /v_pty_verification_facts|dauXacMinhTheoHoSo|dauXacMinhTaiKhoan|tinhDauXacMinh|dkienTuView/;

test("chỉ để biết (Đ5): chỉ parties (repository + ba màn), staff (hàm cho Quản lý tài khoản), accounts (route danh sách) và tệp thuần dùng chung nhắc view / hàm tính dấu", () => {
  const nhac = TEP_MA.filter((t) => GIAN_DAU.test(t.src)).map((t) => t.f).sort();
  assert.deepEqual(nhac, [
    "src/modules/accounts/index.ts", "src/modules/parties/index.ts", "src/modules/parties/repository.ts", "src/modules/staff/index.ts", "src/shared/dau-xac-minh.ts",
  ]);
});

test("chỉ để biết (Đ5): module đơn, tiền, đăng nhập, đăng ký, vận chuyển, giá không nhắc dấu xác minh dưới bất kỳ tên nào", () => {
  const CAM = /orders|billing|auth|dang-ky|dispatch|van-chuyen|pricing|ky-so|catalog|company|thongbao|bangtin|ve-dien-tu/;
  const sai = TEP_MA.filter((t) => /^src\/modules\/([^/]+)\//.test(t.f) && CAM.test(t.f.split("/")[2]!) && (GIAN_DAU.test(t.src) || /dauXacMinh|DauXacMinh/.test(t.src))).map((t) => t.f);
  assert.deepEqual(sai, []);
  // luật quyền không tham chiếu dấu: không ô quyền nào đọc trạng thái xác minh (chỉ ô ghi danh sách mục bắt buộc)
  const q = TEP_MA.find((t) => t.f === "src/shared/permissions.ts")!.src;
  assert.ok(!/dauXacMinh|DauXacMinh/.test(q));
});

test("chỉ để biết (Đ5): `dauXacMinhTheoHoSo(` được gọi đúng ba nơi của parties (danh sách Danh bạ, chi tiết Danh bạ, Hồ sơ của tôi) và một nơi của staff", () => {
  const p = TEP_MA.find((t) => t.f === "src/modules/parties/index.ts")!.src;
  assert.equal([...p.matchAll(/dauXacMinhTheoHoSo\(/g)].length, 3);
  assert.match(p, /async function dauCuaDanhSach[\s\S]{0,300}dauXacMinhTheoHoSo\(/);
  assert.match(p, /party\.dauXacMinh = \(await dauXacMinhTheoHoSo\(/);
  assert.match(p, /\/api\/parties\/cua-toi", "staff"[\s\S]{0,1800}dauXacMinhTheoHoSo\(/);
  const s = TEP_MA.find((t) => t.f === "src/modules/staff/index.ts")!.src;
  assert.equal([...s.matchAll(/dauXacMinhTheoHoSo\(/g)].length, 1);
  const a = TEP_MA.find((t) => t.f === "src/modules/accounts/index.ts")!.src;
  assert.match(a, /route\("GET", "\/api\/staff", "accounts"[\s\S]{0,400}account\.view[\s\S]{0,600}dauXacMinhTaiKhoan\(/);
});

test("chỉ để biết (Đ5, M-4): trong migrations/*.sql chỉ MỘT dòng không phải chú thích nhắc view dữ kiện — chính câu `CREATE VIEW` của nó; không trigger, view, câu gieo nào khác đọc", () => {
  const dir = join(ROOT, "migrations");
  const hit: string[] = [];
  for (const t of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    for (const [i, dong] of readFileSync(join(dir, t), "utf8").split("\n").entries()) {
      if (/v_pty_verification_facts/i.test(dong) && !/^\s*--/.test(dong)) hit.push(`${t}:${i + 1}: ${dong.trim().slice(0, 60)}`);
    }
  }
  assert.equal(hit.length, 1, hit.join("\n"));
  assert.match(hit[0]!, /^0168_tep_cho_dang_ky\.sql:\d+: CREATE VIEW v_pty_verification_facts AS$/);
});
