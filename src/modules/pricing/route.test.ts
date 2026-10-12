// Route pricing qua khung thử (đặc tả §6, §12 tiêu chí 4, 7). Bốn ô: partner.commission.*, supply.terms.*; route nguoi-huong.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "55555555-5555-4555-8555-555555555555";
const HR = "66666666-6666-4666-8666-666666666666";
const SA = "77777777-7777-4777-8777-777777777777";
const SP = "88888888-8888-4888-8888-888888888888"; // tài khoản lai: Bán hàng + Đối tác
const KP = "99999999-9999-4999-8999-999999999999"; // tài khoản lai: Kế toán + Đối tác
const NOW = "2026-10-01T00:00:00.000Z";
type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DT, "0900000006", "Đại Lý A", ["PARTNER"]], [HR, "0900000008", "Hà Nhân Sự", ["HR"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
    [SP, "0900000009", "Sơn Lai Bán", ["SALES", "PARTNER"]], [KP, "0900000010", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dt', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${DT}`, NOW, NOW);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NOW, NOW);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(NOW, NOW);
  // Danh mục có sẵn mã IRESORT: route kiểm mã dịch vụ qua danh mục, không bỏ kiểm.
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'I-Resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${NOW}', '${NOW}')`);
  return w;
}
const congTyChu = (w: W): string => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const mucVai = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: "2026-10-01" };

test("thêm mức: Kế toán 201 + Location + nhật ký; trùng khoảng 409 câu tiếng Việt; Bán hàng 403 khi ghi, 200 khi xem; HDV, Đối tác, Nhân sự 403", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), "/hoa-hong");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'prc_commission_rule_added'")[0].n), 1);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'prc_commission_rule_added'")[0].detail, "Công ty lữ hành · mọi dịch vụ · 10%", "nhật ký ghi lời thường, không mã thô");
  const lap = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, tuNgay: "2026-11-01" } });
  assert.equal(lap.status, 409);
  assert.match(lap.json.error.message, /Đã có mức/);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: SALES, body: mucVai })).status, 403);
  for (const as of [HDV, DT, HR]) assert.equal((await w.call("GET", "/api/pricing/hoa-hong", { as })).status, 403);
  assert.equal((await w.call("GET", "/api/pricing/hoa-hong", { as: SALES })).status, 200);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: ADM, body: { ...mucVai, doiTuong: { loai: "VAI", code: "COLLABORATOR" } } })).status, 201);
});

test("mức riêng cho hồ sơ không mang vai được hưởng ⇒ 400; đóng mức ⇒ 200, đóng lần hai ⇒ 409", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "DOI_TAC", partyId: `pty-${SALES}` } } })).status, 400);
  const id = (await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "DOI_TAC", partyId: `pty-${DT}` } } })).json.dong.id;
  assert.equal((await w.call("POST", `/api/pricing/hoa-hong/${id}/dong`, { as: KT, body: { denNgay: "2026-12-31" } })).status, 200);
  assert.equal((await w.call("POST", `/api/pricing/hoa-hong/${id}/dong`, { as: KT, body: { denNgay: "2026-12-31" } })).status, 409);
});

test("thử tra: đối tác A + dịch vụ ⇒ mức thắng và bậc", async () => {
  const w = setup();
  await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai });
  const r = await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-10-10`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ketQua.trangThai, "SET");
  assert.equal(r.json.ketQua.bac, 6);
});

test("điều khoản người bán: nhà cung cấp 80% ⇒ 201; nhóm Thuê xe ⇒ 409 X3; Bán hàng không xem được; Quản trị xem được", async () => {
  const w = setup();
  const b = { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" };
  assert.equal((await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: b })).status, 201);
  const x3 = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { ...b, catalogCode: undefined, phamVi: "GROUP", groupCode: "TXE" } });
  assert.equal(x3.status, 409);
  assert.match(x3.json.error.message, /Thuê xe/);
  assert.equal((await w.call("GET", "/api/pricing/cung-ung", { as: SALES })).status, 403);
  assert.equal((await w.call("GET", "/api/pricing/cung-ung", { as: ADM })).status, 200);
});

test("tìm người hưởng theo tên: Bán hàng thấy đại lý, không thấy nhà cung cấp; Đối tác 403", async () => {
  const w = setup();
  const r = await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("Đại")}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.ketQua.some((x: { partyId: string }) => x.partyId === `pty-${DT}`));
  assert.ok(!r.json.ketQua.some((x: { partyId: string }) => x.partyId === "pty-ncc"), "nhà cung cấp không phải người hưởng");
  assert.equal((await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("Đại")}`, { as: DT })).status, 403);
});

test("điều khoản: Tour Đảo bán mà kèm tỷ lệ mua lại, hoặc nhà cung cấp bán mà thiếu tỷ lệ ⇒ 400 câu tiếng Việt (không 500)", async () => {
  const w = setup();
  const tourDao = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: congTyChu(w), tyLeMuaBp: 8000, tuNgay: "2026-10-01" } });
  assert.equal(tourDao.status, 400, tourDao.text);
  assert.match(tourDao.json.error.message, /không ghi tỷ lệ mua lại/);
  const nhaCungCap = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tuNgay: "2026-10-01" } });
  assert.equal(nhaCungCap.status, 400, nhaCungCap.text);
  assert.match(nhaCungCap.json.error.message, /phải ghi/);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_supply_term")[0].n), 1, "chỉ còn dòng gieo sẵn của công ty chủ");
});

test("điều khoản: mã dịch vụ không có trong danh mục ⇒ 400; dòng \"mọi dịch vụ\" của nhà cung cấp ⇒ 400; Tour Đảo bán một dịch vụ không tỷ lệ ⇒ 201", async () => {
  const w = setup();
  const sai = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "KHONGCO", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" } });
  assert.equal(sai.status, 400);
  assert.match(sai.json.error.message, /danh mục/);
  // Đóng dòng gieo "mọi dịch vụ" của công ty chủ trước, để lỗi thấy được là luật "mọi dịch vụ chỉ cho Tour Đảo" chứ không phải lỗi trùng khoảng ngày.
  assert.equal((await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: KT, body: { denNgay: "2026-09-30" } })).status, 200);
  const tatCa = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "ALL", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" } });
  assert.equal(tatCa.status, 400, tatCa.text);
  assert.match(tatCa.json.error.message, /chỉ dành cho Tour Đảo/);
  const ct = await w.call("POST", "/api/pricing/cung-ung", { as: ADM, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: congTyChu(w), tuNgay: "2026-10-01" } });
  assert.equal(ct.status, 201, ct.text);
  assert.equal(ct.headers.get("location"), "/nguoi-ban");
  assert.equal(ct.json.dong.nguoiBan.laCongTy, true);
});

test("đóng điều khoản: dòng gieo sẵn \"công ty chủ bán mọi dịch vụ\" đóng được một lần; Bán hàng 403; id lạ 404; ngày kết thúc trước ngày bắt đầu 400", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: SALES, body: { denNgay: "2026-12-31" } })).status, 403);
  assert.equal((await w.call("POST", "/api/pricing/cung-ung/prc-st-khong-co/dong", { as: KT, body: { denNgay: "2026-12-31" } })).status, 404);
  assert.equal((await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: KT, body: { denNgay: "2024-12-31" } })).status, 400, "dòng gieo bắt đầu 2025-01-01");
  const r = await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: KT, body: { denNgay: "2026-12-31" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.dong.denNgay, "2026-12-31");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'prc_supply_term_closed'")[0].n), 1);
  assert.equal((await w.call("POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", { as: KT, body: { denNgay: "2026-12-31" } })).status, 409);
});

test("danh sách hoa hồng: tên vai bằng tiếng Việt, đối tác có tên hồ sơ; còn hiệu lực theo ngày hôm nay; không lộ số điện thoại", async () => {
  const w = setup();
  await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai });
  await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "DOI_TAC", partyId: `pty-${DT}` }, tyLeBp: 1250, tuNgay: "2020-01-01", denNgay: "2020-12-31" } });
  const r = await w.call("GET", "/api/pricing/hoa-hong", { as: ADM });
  assert.equal(r.status, 200, r.text);
  const vai = r.json.dong.find((d: { doiTuong: { loai: string } }) => d.doiTuong.loai === "VAI");
  assert.equal(vai.doiTuong.ten, "Công ty lữ hành");
  assert.equal(vai.conHieuLuc, true);
  const dt = r.json.dong.find((d: { doiTuong: { loai: string } }) => d.doiTuong.loai === "DOI_TAC");
  assert.equal(dt.doiTuong.ten, "Đại Lý A");
  assert.equal(dt.conHieuLuc, false, "mức đã hết hạn từ 2020");
  assert.ok(r.json.vai.some((v: { code: string; ten: string }) => v.code === "TRAVEL_AGENCY" && v.ten === "Công ty lữ hành"));
  assert.doesNotMatch(r.text, /090000/, "không lộ số điện thoại");
});

test("thử tra: lý do thiếu mức là câu tiếng Việt; đối tác không mang vai được hưởng ⇒ NONE; tham số sai ⇒ 400; Hướng dẫn viên 403", async () => {
  const w = setup();
  const thieu = await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-10-10`, { as: KT });
  assert.equal(thieu.status, 200, thieu.text);
  assert.equal(thieu.json.ketQua.trangThai, "MISSING");
  assert.equal(thieu.json.ketQua.lyDo, "Chưa có mức cho dịch vụ này");
  assert.deepEqual(thieu.json.nguoiHuong, { loai: "HUONG", vai: ["Công ty lữ hành"] });
  const khach = await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${SALES}&dichVu=HONTAM`, { as: KT });
  assert.equal(khach.json.ketQua.trangThai, "NONE");
  assert.equal((await w.call("GET", "/api/pricing/thu-tra?doiTac=x%20y&dichVu=HONTAM", { as: KT })).status, 400);
  assert.equal((await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-02-30`, { as: KT })).status, 400);
  assert.equal((await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM`, { as: HDV })).status, 403);
});

test("tìm người hưởng: ký tự đặc biệt của LIKE được thoát (%, _ không khớp hết); không gõ gì thì liệt kê theo tên; thân trả đúng ba khoá, không SĐT", async () => {
  const w = setup();
  const phanTram = await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("%")}`, { as: SALES });
  assert.equal(phanTram.status, 200, phanTram.text);
  assert.deepEqual(phanTram.json.ketQua, [], "dấu % là ký tự thường, không phải ký tự đại diện");
  const gachDuoi = await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("_")}`, { as: SALES });
  assert.deepEqual(gachDuoi.json.ketQua, []);
  const tatCa = await w.call("GET", "/api/pricing/nguoi-huong", { as: ADM });
  assert.equal(tatCa.status, 200, tatCa.text);
  assert.ok(tatCa.json.ketQua.length >= 1);
  for (const x of tatCa.json.ketQua) assert.deepEqual(Object.keys(x).sort(), ["loai", "partyId", "ten"]);
  assert.doesNotMatch(tatCa.text, /090000/, "không lộ số điện thoại");
});

test("thêm mức cho nhóm dịch vụ không có ⇒ 400 câu tiếng Việt (không 500); dịch vụ không có trong danh mục ⇒ 400", async () => {
  const w = setup();
  const nhom = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, phamVi: "GROUP", groupCode: "KHONGCO" } });
  assert.equal(nhom.status, 400, nhom.text);
  assert.match(nhom.json.error.message, /Nhóm dịch vụ/);
  const dichVu = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, phamVi: "SERVICE", catalogCode: "KHONGCO" } });
  assert.equal(dichVu.status, 400);
  assert.match(dichVu.json.error.message, /danh mục/);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_commission_rule")[0].n), 0, "không dòng nào được ghi");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'prc_commission_rule_added'")[0].n), 0, "không nhật ký thừa");
});

test("tài khoản lai (quyền Đối tác kèm quyền nội bộ) không đọc, không ghi được bảng tỷ lệ ở cả bảy route văn phòng; Kế toán thuần vẫn dùng được", async () => {
  const w = setup();
  const idMuc = (await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai })).json.dong.id;
  const dem = () => ["prc_commission_rule", "prc_supply_term", "audit_log"].map((t) => Number(w.q(`SELECT count(*) AS n FROM ${t}`)[0].n));
  const truoc = dem();
  const thanMuc = { ...mucVai, doiTuong: { loai: "VAI", code: "COLLABORATOR" } }; // thân hợp lệ: nếu cổng hở thì ghi được 201
  const thanDk = { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" };
  const ca: [string, string, string, string, unknown?][] = [
    [SP, "GET", "/api/pricing/hoa-hong", "Bán hàng + Đối tác xem bảng mức"],
    [SP, "GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-10-10`, "Bán hàng + Đối tác thử tra"],
    [KP, "GET", "/api/pricing/cung-ung", "Kế toán + Đối tác xem người bán"],
    [KP, "POST", "/api/pricing/hoa-hong", "Kế toán + Đối tác thêm mức", thanMuc],
    [KP, "POST", `/api/pricing/hoa-hong/${idMuc}/dong`, "Kế toán + Đối tác đóng mức", { denNgay: "2026-12-31" }],
    [KP, "POST", "/api/pricing/cung-ung", "Kế toán + Đối tác thêm điều khoản", thanDk],
    [KP, "POST", "/api/pricing/cung-ung/prc-st-goc-all/dong", "Kế toán + Đối tác đóng điều khoản", { denNgay: "2026-12-31" }],
  ];
  for (const [as, method, path, ten, body] of ca) {
    const r = await w.call(method, path, body === undefined ? { as } : { as, body });
    assert.equal(r.status, 403, `${ten}: phải 403, nhận ${r.status} — ${r.text.slice(0, 120)}`);
    assert.doesNotMatch(r.text, /tyLe|moiKhach/, `${ten}: thân 403 không được chứa tỷ lệ`);
  }
  assert.deepEqual(dem(), truoc, "không dòng mức, điều khoản hay nhật ký nào được ghi thêm");
  // Đối chứng: cùng thân, tài khoản nội bộ thuần (Kế toán) vẫn ghi / đọc được.
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: thanMuc })).status, 201);
  assert.equal((await w.call("GET", "/api/pricing/cung-ung", { as: KT })).status, 200);
  assert.equal((await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-10-10`, { as: SALES })).status, 200);
});

test("dịch lỗi trigger: mức theo vai không được hưởng ⇒ 400; người bán không mang vai Nhà cung cấp ⇒ 400 (câu tiếng Việt, không mã thô)", async () => {
  const w = setup();
  const vai = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "VAI", code: "DRIVER_EXTERNAL" } } });
  assert.equal(vai.status, 400, vai.text);
  assert.match(vai.json.error.message, /Loại đối tác này không nằm trong danh sách được hưởng/);
  assert.doesNotMatch(vai.text, /prc_/);
  const banHang = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: `pty-${SALES}`, tyLeMuaBp: 8000, tuNgay: "2026-10-01" } });
  assert.equal(banHang.status, 400, banHang.text);
  assert.match(banHang.json.error.message, /Người bán phải là Tour Đảo hoặc hồ sơ mang vai Nhà cung cấp/);
  assert.doesNotMatch(banHang.text, /prc_/);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_commission_rule")[0].n), 0);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_supply_term")[0].n), 1, "chỉ còn dòng gieo sẵn");
});
