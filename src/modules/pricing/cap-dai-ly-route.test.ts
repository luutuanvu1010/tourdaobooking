// Đặc tả docs/superpowers/specs/2026-11-04-man-cap-dai-ly.md: route đọc `GET /api/pricing/cap-dai-ly` của màn gom mọi hồ sơ đang mang vai trò được hưởng, có hay chưa có tài khoản.
// Cổng: `office` + ô `partner.commission.write` + chặn `holdsPartner`. Cấp lấy nguyên từ `capVaVaiMoiHoSo`, hàm chung với `capHienHanhMoiHoSo` của cột cũ (không luật thứ hai). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); tên GIẢ.
// Khuôn: cap-hien-hanh-route.test.ts, parties/vai-khong-tai-khoan-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, holdsPartner, isOffice, type PermissionCode } from "../../shared/permissions.ts";
import { addDays } from "../../shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác có tài khoản
const HR = "77777777-7777-4777-8777-777777777777";
const TXDT = "88888888-8888-4888-8888-888888888888"; // Tài xế đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai Kế toán + Đối tác
const DT_NGUNG = "66666666-6666-4666-8666-666666666667"; // Đối tác có tài khoản đã ngưng, hồ sơ vẫn mở
const AT = "2026-10-01T00:00:00.000Z";
const DUONG = "/api/pricing/cap-dai-ly";
const CONG_TY = "dda00000-0000-4000-8000-0000000000a1"; // tổ chức chưa có tài khoản
const CA_NHAN = "dda00000-0000-4000-8000-0000000000b1"; // cá nhân chưa có tài khoản
const KHONG_VAI = "dda00000-0000-4000-8000-0000000000a2"; // tổ chức không mang vai trò được hưởng
const NGUNG = "dda00000-0000-4000-8000-0000000000a3"; // tổ chức ngưng dùng, còn dòng vai trò mở
const SDT_LO = "0912345678";
const EMAIL_LO = "lo-email@vidu.test";
const MST_LO = "0312345678";
const DIA_CHI_LO = "Số 9 Đường Dò Tìm";
const KHOA_DONG = ["cap", "coTaiKhoan", "loaiHoSo", "partyId", "ten", "vaiTro"];
const KHOA_CAP = ["cap", "coMucRieng", "doiDuoc", "nguon", "partyId", "rieng", "sapApTu"];
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
function toChuc(w: W, id: string, ten: string, active = 1, mst: string | null = null, diaChi: string | null = null): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, ?, ?, ?)").run(id, ten, active, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, tax_code, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(id, mst, diaChi, AT, AT);
}
function caNhan(w: W, id: string, ten: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
}
let soVai = 0;
const vaiThang = (w: W, partyId: string, code: string): void => {
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`vai-${++soVai}`, partyId, code, AT, AT);
};
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [TXDT, "0900000010", "Tài Xế Ngoài", ["DRIVER_PARTNER"]],
    [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]], [DT_NGUNG, "0900000012", "Đối Tác Ngưng", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(DT_NGUNG);
  toChuc(w, CONG_TY, "Lữ hành Biển Xanh", 1, MST_LO, DIA_CHI_LO);
  toChuc(w, KHONG_VAI, "Công ty Không Vai");
  toChuc(w, NGUNG, "Lữ hành Đã Nghỉ", 0);
  caNhan(w, CA_NHAN, "Chị Mai");
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, created_at, updated_at) VALUES ('lh-1', ?, 'PHONE', ?, ?, '2026-01-01', ?, ?)").run(CONG_TY, SDT_LO, SDT_LO, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, created_at, updated_at) VALUES ('lh-2', ?, 'EMAIL', ?, ?, '2026-01-01', ?, ?)").run(CONG_TY, EMAIL_LO, EMAIL_LO, AT, AT);
  vaiThang(w, CONG_TY, "TRAVEL_AGENCY");
  vaiThang(w, CA_NHAN, "TAXI_DRIVER");
  vaiThang(w, `pty-${DT}`, "COLLABORATOR");
  vaiThang(w, `pty-${DT_NGUNG}`, "COLLABORATOR");
  vaiThang(w, NGUNG, "TRAVEL_AGENCY");
  return w;
}
const doc = (w: W, as?: string): Promise<Res> => w.call("GET", DUONG, as === undefined ? {} : { as });
const dongCua = (r: Res, id: string): any => (r.json.hoSo as any[]).find((x) => x.partyId === id);
async function taoCap(w: W, ten: string, tyLeBp = 1000): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `cấp ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp } }), 201, `dòng ${ten}`);
  return code;
}

test("TC1: Kế toán thấy cả hồ sơ có và chưa có tài khoản, cá nhân và tổ chức; hồ sơ không mang vai trò được hưởng, hồ sơ ngưng dùng không hiện; tài khoản ngưng vẫn tính là có tài khoản", async () => {
  const w = setup();
  const r = await ok(doc(w, KT), 200);
  const cty = dongCua(r, CONG_TY);
  assert.deepEqual([cty.ten, cty.loaiHoSo, cty.coTaiKhoan], ["Lữ hành Biển Xanh", "ORGANIZATION", false]);
  assert.deepEqual(cty.vaiTro.map((v: any) => v.code), ["TRAVEL_AGENCY"]);
  assert.ok(typeof cty.vaiTro[0].ten === "string" && cty.vaiTro[0].ten !== "TRAVEL_AGENCY", "vai trò có tên tiếng Việt, không mã thô");
  const nguoi = dongCua(r, CA_NHAN);
  assert.deepEqual([nguoi.ten, nguoi.loaiHoSo, nguoi.coTaiKhoan], ["Chị Mai", "PERSON", false]);
  const coTk = dongCua(r, `pty-${DT}`);
  assert.deepEqual([coTk.ten, coTk.loaiHoSo, coTk.coTaiKhoan], ["Đối Tác Một", "PERSON", true]);
  assert.equal(dongCua(r, `pty-${DT_NGUNG}`).coTaiKhoan, true, "tài khoản đã ngưng vẫn là có tài khoản");
  assert.equal(dongCua(r, KHONG_VAI), undefined, "không mang vai trò được hưởng ⇒ không hiện");
  assert.equal(dongCua(r, `pty-${SALES}`), undefined, "nhân viên nội bộ không hiện");
  assert.equal(dongCua(r, NGUNG), undefined, "hồ sơ ngưng dùng không hiện");
  assert.equal(r.json.hoSo.length, 4, "đúng bốn hồ sơ");
  assert.match(String(r.json.homNay), /^\d{4}-\d{2}-\d{2}$/);
});

test("TC1b: danh sách theo thứ tự tên; vai trò đang tắt không tính; một hồ sơ hai vai trò được hưởng hiện đủ hai", async () => {
  const w = setup();
  vaiThang(w, CONG_TY, "COLLABORATOR");
  const r = await ok(doc(w, KT), 200);
  assert.deepEqual(dongCua(r, CONG_TY).vaiTro.map((v: any) => v.code).sort(), ["COLLABORATOR", "TRAVEL_AGENCY"]);
  const ten = (r.json.hoSo as any[]).map((x) => x.ten);
  assert.deepEqual(ten, [...ten].sort((a, b) => a.localeCompare(b, "vi")), "xếp theo tên tiếng Việt");
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TAXI_DRIVER'").run();
  assert.equal(dongCua(await ok(doc(w, KT), 200), CA_NHAN), undefined, "vai trò không còn được hưởng ⇒ hồ sơ rời danh sách");
});

test("TC2, TC3: Kế toán đặt cấp đang bật bất kỳ cho hồ sơ mang vai trò được hưởng bất kỳ (gồm loại tự thêm), có hay chưa có tài khoản; màn thấy ngay; cấp khớp route cột cũ", async () => {
  const w = setup();
  const loaiMoi = (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Lễ tân tự thêm" } }), 201, "loại mới")).json.loai.code as string;
  const moi = "dda00000-0000-4000-8000-0000000000a4";
  toChuc(w, moi, "Khách sạn Tự Thêm");
  await ok(w.call("POST", `/api/parties/${moi}/roles`, { as: ADM, body: { roleTypeCode: loaiMoi } }), 201, "gắn loại tự thêm");
  const nam = ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"];
  const hoSoNam: string[] = [];
  for (const [i, code] of nam.entries()) {
    const id = `dda00000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`;
    toChuc(w, id, `Đơn vị ${code}`);
    await ok(w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, code);
    hoSoNam.push(id);
  }
  const cap = [];
  for (let n = 1; n <= 6; n++) cap.push(await taoCap(w, `Tên thử TA${n}`, 500 + n * 100));
  const dat = (id: string, muc: string, tuNgay: string) => w.call("POST", `/api/pricing/ho-so/${id}/muc-rieng`, { as: KT, body: { muc, tuNgay } });
  const homNay = (await ok(doc(w, KT), 200)).json.homNay as string;
  const dich = [CONG_TY, CA_NHAN, `pty-${DT}`, moi, ...hoSoNam];
  for (const [i, id] of dich.entries()) await ok(dat(id, cap[i % cap.length]!, homNay), 201, `đặt cấp ${i} cho ${id}`);
  const r = await ok(doc(w, KT), 200);
  const cu = await ok(w.call("GET", "/api/pricing/cap-hien-hanh", { as: KT }), 200);
  for (const [i, id] of dich.entries()) {
    const d = dongCua(r, id);
    assert.equal(d.cap.nguon, "RIENG", id);
    assert.equal(d.cap.cap.code, cap[i % cap.length], id);
    assert.deepEqual(d.cap, (cu.json.hoSo as any[]).find((x) => x.partyId === id), "đúng DTO của route cột cũ — không luật thứ hai");
  }
  // Kế toán đổi cấp đi đúng lệnh có sẵn: cấp riêng bắt đầu hôm nay nên cấp mới sớm nhất từ ngày mai (kiemDoi); đọc lại vẫn là cấp cũ tới hết hôm nay, ngày mai đã hẹn.
  const dongCty = dongCua(r, CONG_TY).cap.rieng.id as string;
  await ok(w.call("POST", `/api/pricing/muc-rieng/${dongCty}/doi`, { as: KT, body: { muc: cap[5], tuNgay: addDays(homNay, 1) } }), 200, "đổi cấp riêng");
  const sau = dongCua(await ok(doc(w, KT), 200), CONG_TY);
  assert.deepEqual([sau.cap.cap.code, sau.cap.sapApTu], [cap[0], addDays(homNay, 1)]);
});

test("TC4: Bán hàng, Hướng dẫn viên, Nhân sự, Đối tác, Tài xế đối tác, tài khoản lai 403; Kế toán, Quản trị, Toàn quyền 200; chưa đăng nhập 401", async () => {
  const w = setup();
  for (const as of [KT, ADM, SA]) await ok(doc(w, as), 200, `người ${as}`);
  for (const as of [SALES, HDV, HR, DT, TXDT, KP]) {
    const r = await ok(doc(w, as), 403, `người ${as}`);
    assert.equal(r.json.error.code, "forbidden");
    assert.ok(!r.text.includes("Biển Xanh"));
  }
  assert.equal((await doc(w)).status, 401, "chưa đăng nhập");
});

test("TC4b: quét MỌI tập quyền qua cổng văn phòng: chỉ tập có partner.commission.write và không giữ Đối tác được 200 (mỗi lớp thử một tài khoản)", async () => {
  const w = setup();
  const lop = new Map<string, PermissionCode[][]>();
  for (let mask = 1; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const nguoi = { id: "quet", permissions };
    if (!isOffice(nguoi)) continue;
    const khoa = `${can(nguoi, "partner.commission.write")}|${can(nguoi, "partner.commission.view")}|${holdsPartner(nguoi)}`;
    lop.set(khoa, [...(lop.get(khoa) ?? []), permissions]);
  }
  assert.ok(lop.has("true|true|false") && lop.has("true|true|true") && lop.has("false|true|false"), "chống bài rỗng: có tập được, tập lai và tập chỉ có ô xem");
  let n = 0;
  for (const [khoa, ds] of lop) {
    const [ghi, , doiTac] = khoa.split("|").map((x) => x === "true");
    const mong = ghi && !doiTac ? 200 : 403;
    let dung = false;
    for (const permissions of ds) {
      const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12, "0")}`;
      try { seedStaff(w.sqlite, { id, phone: `09000200${String(n).padStart(2, "0")}`, name: `Tập ${n}`, perms: [...permissions] }); } catch { continue; } // tổ hợp CSDL không cho tạo (LC-1) thì thử tập khác cùng lớp
      assert.equal((await doc(w, id)).status, mong, `lớp ${khoa}: ${permissions.join("+")}`);
      dung = true;
      break;
    }
    assert.ok(dung, `lớp ${khoa}: không tạo được tài khoản nào`);
  }
});

test("TC5: phản hồi đúng danh sách khoá trắng; không SĐT, email, mã số thuế, địa chỉ; chỉ đọc, không ghi nhật ký", async () => {
  const w = setup();
  const truoc = Number(w.q("SELECT count(*) n FROM audit_log")[0].n);
  const r = await ok(doc(w, KT), 200);
  assert.deepEqual(Object.keys(r.json).sort(), ["hoSo", "homNay", "soCapDangBat"]);
  for (const d of r.json.hoSo as any[]) {
    assert.deepEqual(Object.keys(d).sort(), KHOA_DONG, d.partyId);
    assert.deepEqual(Object.keys(d.cap).sort(), KHOA_CAP, d.partyId);
    for (const v of d.vaiTro) assert.deepEqual(Object.keys(v).sort(), ["code", "ten"]);
  }
  for (const lo of [SDT_LO, EMAIL_LO, MST_LO, DIA_CHI_LO, "0900000008"]) assert.ok(!r.text.includes(lo), `lộ ${lo}`);
  assert.doesNotMatch(r.text, /"[^"]*(phone|email|tax|address|diaChi|sdt|mst)[^"]*":|\b0\d{9}\b/i, "không khoá liên hệ, không dãy số điện thoại");
  assert.ok(r.text.includes("Lữ hành Biển Xanh"), "chống bài rỗng: có dòng hồ sơ đã gieo liên hệ");
  assert.equal(Number(w.q("SELECT count(*) n FROM audit_log")[0].n), truoc, "chỉ đọc: không nhật ký");
});

test("TC6: số câu không đổi theo số hồ sơ, không câu nào lặp theo hồ sơ", async () => {
  const w = setup();
  const dem = async (): Promise<string[]> => {
    const goc = w.env.DB.prepare;
    const ds: string[] = [];
    w.env.DB.prepare = (sql: string) => (ds.push(sql), goc(sql));
    try { await ok(doc(w, KT), 200, "đếm câu"); } finally { w.env.DB.prepare = goc; }
    return ds;
  };
  const cauDoc = (ds: string[]) => ds.filter((s) => /prc_|v_pty_|pty_role_type/.test(s));
  await ok(doc(w, KT), 200, "làm nóng phiên");
  const it = await dem();
  const nhieuTruoc = Number((await ok(doc(w, KT), 200)).json.hoSo.length);
  for (let n = 0; n < 30; n++) {
    const id = `dda00000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
    toChuc(w, id, `Đơn vị đếm ${n}`);
    vaiThang(w, id, "TRAVEL_AGENCY");
  }
  const nhieu = await dem();
  assert.equal(Number((await ok(doc(w, KT), 200)).json.hoSo.length), nhieuTruoc + 30, "chống bài rỗng: thêm đúng 30 hồ sơ");
  assert.equal(nhieu.length, it.length, "số câu không đổi theo số hồ sơ");
  assert.equal(new Set(cauDoc(nhieu)).size, cauDoc(nhieu).length, `không câu nào lặp: ${cauDoc(nhieu).join(" || ")}`);
});

test("TC7: `soCapDangBat` = số cấp đang bật: 0 khi chưa có, tăng khi tạo, không đếm cấp đã tắt (màn dùng để nói rõ và trỏ sang trang Hoa hồng)", async () => {
  const w = setup();
  assert.equal((await ok(doc(w, KT), 200)).json.soCapDangBat, 0);
  const a = await taoCap(w, "Cấp thử một");
  await taoCap(w, "Cấp thử hai");
  assert.equal((await ok(doc(w, KT), 200)).json.soCapDangBat, 2);
  w.sqlite.prepare("UPDATE prc_rate_tier SET active = 0 WHERE code = ?").run(a);
  assert.equal((await ok(doc(w, KT), 200)).json.soCapDangBat, 1);
});
