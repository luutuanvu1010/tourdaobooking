// ADR-0125 (lát H-4 Gói 2, việc 3): hàng chờ xác minh, chi tiết phiếu và "xem đủ số" qua route thật (tests/audit/harness.mjs, SQLite thật). Hai ô quyền
// party.verify / party.verify.attachment, cổng `accounts` (Quản trị, Toàn quyền, Nhân sự — HR vẫn KHÔNG vào Danh bạ). Mọi giá trị (số giấy tờ) là GIẢ.
// Phá thử: bỏ `if (!can(staff, "party.verify"))` khỏi một route → (r1) đỏ; bỏ lọc cấp bậc → (r3), (r6) đỏ; ghi số TRƯỚC nhật ký → (r8) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { NHAN_LY_DO_CHAN, nhanLyDoTuChoi } from "../../shared/xac-minh-hien-thi.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const DRVP = "66666666-6666-4666-8666-666666666666";
const HR = "99999999-9999-4999-8999-999999999999";
const HR2 = "99999999-9999-4999-8999-999999999992";
const QT = "33333333-3333-4333-8333-333333333332"; // Quản trị khác — chủ một phiếu (HR không quản được, cấp bậc)
const NV = "11111111-1111-4111-8111-111111111112"; // Bán hàng do HR TẠO (staff_created) — HR bị tách nhiệm vụ
const NV2 = "11111111-1111-4111-8111-111111111113"; // Bán hàng thường — ai cũng xác minh được
const DT = "55555555-5555-4555-8555-555555555552"; // Đối tác
const AT = "2026-10-10T00:00:00.000Z";
const GUI = "2026-10-16T08:00:00.000Z";
const SO = "079 000 000 111";
const KHOA_SO = "079000000111";
const uid = () => crypto.randomUUID();
const pty = (id: string) => `pty-${id}`;

function setup() {
  const w = world();
  const them = (id: string, phone: string, name: string, perms: string[]) => seedStaff(w.sqlite, { id, phone, name, perms });
  them(SALES, "0900000001", "An", ["SALES"]);
  them(ACC, "0900000002", "Kế Toán", ["ACCOUNTING"]);
  them(ADM, "0900000003", "Quản Trị", ["ADMIN"]);
  them(SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]);
  them(PARTNER, "0900000010", "Đối Tác Một", ["PARTNER"]);
  them(DRVP, "0900000011", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]);
  them(HR, "0900000013", "Nhân Sự", ["HR"]);
  them(HR2, "0900000015", "Nhân Sự Hai", ["HR"]);
  them(QT, "0900000016", "Quản Trị Hai", ["ADMIN"]);
  them(NV, "0900000017", "Nhân Viên Hai", ["SALES"]);
  them(NV2, "0900000018", "Nhân Viên Ba", ["SALES"]);
  them(DT, "0900000019", "Đối Tác Hai", ["PARTNER"]);
  w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  return w;
}
/** Đồng ý chính sách của chủ (trigger 0105 đòi) rồi chèn phiếu CHỜ thẳng vào bảng. loai: NGAY_SINH | DIA_CHI | GIAY_TO. */
function phieu(w: any, o: { owner: string; loai?: "NGAY_SINH" | "DIA_CHI" | "GIAY_TO"; id?: string; at?: string }): string {
  const id = o.id ?? uid();
  const loai = o.loai ?? "NGAY_SINH";
  const at = o.at ?? GUI;
  const daDongY = w.q("SELECT count(*) n FROM pty_consent WHERE party_id = ?", pty(o.owner))[0].n > 0;
  if (!daDongY) w.sqlite.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'pol', 'DONG_Y', ?, ?, ?, ?)").run(uid(), pty(o.owner), AT, o.owner, AT, o.owner);
  w.sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date,
      status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, 'pol', ?, ?, ?, ?, ?, ?, ?, ?, 'CHO_XAC_MINH', ?, ?, ?, ?)`).run(
    id, pty(o.owner), loai, loai === "NGAY_SINH" ? "1990-05-06" : null, loai === "DIA_CHI" ? "12 Đường Thử, Nha Trang" : null,
    loai === "GIAY_TO" ? "CCCD" : null, loai === "GIAY_TO" ? SO : null, loai === "GIAY_TO" ? KHOA_SO : null,
    loai === "GIAY_TO" ? "2021-01-02" : null, loai === "GIAY_TO" ? "Cục thử" : null, loai === "GIAY_TO" ? "2040-01-02" : null, at, o.owner, at, o.owner);
  return id;
}
function nhatKyCham(w: any, actor: string, account: string, action = "staff_created", at = AT): void {
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, 'staff', ?, NULL, ?)").run(uid(), actor, action, account, at);
}
const ds = (w: any, as: string, trang = "cho") => w.call("GET", `/api/parties/xac-minh?trang=${trang}`, { as });
const ct = (w: any, as: string, pid: string) => w.call("GET", `/api/parties/xac-minh/${pid}`, { as });
const xemSo = (w: any, as: string, pid: string) => w.call("POST", `/api/parties/xac-minh/${pid}/xem-so`, { as });
const soDongXem = (w: any): number => Number(w.q("SELECT count(*) n FROM audit_log WHERE action = 'self_submission_number_viewed'")[0].n);
const soNhatKy = (w: any): number => Number(w.q("SELECT count(*) n FROM audit_log")[0].n);
const idsCho = async (w: any, as: string): Promise<string[]> => {
  const r = await ds(w, as);
  assert.equal(r.status, 200, r.text);
  return r.json.phieu.map((p: any) => p.id);
};

test("(r1) cổng accounts: Bán hàng, Kế toán, Đối tác, Tài xế đối tác → 403 ở cả ba route; Nhân sự, Quản trị, Toàn quyền → 200", async () => {
  const w = setup();
  const p = phieu(w, { owner: NV2, loai: "GIAY_TO" });
  const n0 = soNhatKy(w);
  for (const as of [SALES, ACC, PARTNER, DRVP]) {
    for (const r of [await ds(w, as), await ds(w, as, "da-xu-ly"), await ct(w, as, p), await xemSo(w, as, p)]) assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(soNhatKy(w), n0, "không dòng nhật ký nào");
  for (const as of [HR, ADM, SUP]) assert.equal((await ds(w, as)).status, 200, as);
});

test("(r2) Nhân sự vẫn KHÔNG vào Danh bạ: GET /api/parties và GET /api/parties/:id của chủ phiếu → 403", async () => {
  const w = setup();
  phieu(w, { owner: DT });
  assert.equal((await w.call("GET", "/api/parties", { as: HR })).status, 403);
  assert.equal((await w.call("GET", `/api/parties/${pty(DT)}`, { as: HR })).status, 403);
  assert.equal((await ds(w, HR)).status, 200, "nhưng hàng chờ thì được");
});

test("(r3) hàng chờ của Nhân sự: thấy phiếu Đối tác; KHÔNG thấy phiếu Quản trị / Nhân sự khác (cấp bậc); phiếu của tài khoản do chính mình tạo → không xác minh được, kèm lý do", async () => {
  const w = setup();
  nhatKyCham(w, HR, NV);
  const pDT = phieu(w, { owner: DT });
  const pQT = phieu(w, { owner: QT });
  const pHR2 = phieu(w, { owner: HR2 });
  const pNV = phieu(w, { owner: NV });
  const pNV2 = phieu(w, { owner: NV2 });
  const r = await ds(w, HR);
  assert.equal(r.status, 200, r.text);
  const ids = r.json.phieu.map((p: any) => p.id).sort();
  assert.deepEqual(ids, [pDT, pNV, pNV2].sort());
  const theo = (id: string) => r.json.phieu.find((p: any) => p.id === id);
  assert.equal(theo(pDT).xacMinhDuoc, true);
  assert.equal(theo(pDT).lyDoKhong, null);
  assert.equal(theo(pNV2).xacMinhDuoc, true);
  assert.equal(theo(pNV).xacMinhDuoc, false);
  assert.equal(theo(pNV).lyDoKhong, NHAN_LY_DO_CHAN.da_cham);
  // Toàn quyền thấy đủ năm phiếu và xác minh được tất cả (là chốt cuối).
  const s = await ds(w, SUP);
  assert.deepEqual(s.json.phieu.map((p: any) => p.id).sort(), [pDT, pQT, pHR2, pNV, pNV2].sort());
  assert.ok(s.json.phieu.every((p: any) => p.xacMinhDuoc === true), "Toàn quyền xác minh được mọi phiếu của người khác");
  // Quản trị thấy phiếu cấp dưới, KHÔNG thấy phiếu Quản trị / Nhân sự khác.
  assert.deepEqual((await idsCho(w, ADM)).sort(), [pDT, pNV, pNV2].sort());
});

test("(r3b) R23 chống đói hàng chờ: 50 phiếu CŨ của tài khoản do Nhân sự tạo + 1 phiếu MỚI xác minh được ⇒ phiếu xác minh được nằm trong 50 dòng, ở ĐẦU", async () => {
  const w = setup();
  for (let i = 0; i < 50; i++) {
    const id = `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `0910000${String(i).padStart(3, "0")}`, name: `Cũ ${i}`, perms: ["SALES"] });
    nhatKyCham(w, HR, id);
    phieu(w, { owner: id, at: `2026-10-01T00:${String(i).padStart(2, "0")}:00.000Z` });
  }
  const moi = phieu(w, { owner: NV2, at: "2026-10-16T09:00:00.000Z" });
  const r = await ds(w, HR);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.phieu.length, 50);
  assert.equal(r.json.phieu[0].id, moi, "phiếu xác minh được nằm ĐẦU danh sách");
  assert.equal(r.json.phieu[0].xacMinhDuoc, true);
  assert.ok(r.json.phieu.slice(1).every((p: any) => p.xacMinhDuoc === false));
  // Trong các phiếu không xác minh được, phiếu cũ nhất đứng trước.
  const guiLuc = r.json.phieu.slice(1).map((p: any) => p.guiLuc);
  assert.deepEqual(guiLuc, [...guiLuc].sort());
});

test("(r4) Review Focus 4: chủ phiếu đổi quyền thành Quản trị sau khi gửi ⇒ chuyenToanQuyen = true; Toàn quyền vẫn thấy và xác minh được; Nhân sự / Quản trị không thấy nữa", async () => {
  const w = setup();
  const p = phieu(w, { owner: NV2 });
  const truoc = await ds(w, HR);
  assert.equal(truoc.json.phieu.find((x: any) => x.id === p).chuyenToanQuyen, false, "còn người cấp dưới xác minh được");
  w.sqlite.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'ADMIN', ?, ?, ?)").run(uid(), NV2, AT, AT, AT);
  const s = await ds(w, SUP);
  const dong = s.json.phieu.find((x: any) => x.id === p);
  assert.ok(dong, "Toàn quyền thấy phiếu");
  assert.equal(dong.chuyenToanQuyen, true);
  assert.equal(dong.xacMinhDuoc, true);
  assert.ok(!(await idsCho(w, HR)).includes(p), "Nhân sự không thấy phiếu của người nay là Quản trị");
  assert.ok(!(await idsCho(w, ADM)).includes(p));
  assert.equal((await ct(w, HR, p)).status, 404);
  assert.equal((await ct(w, SUP, p)).status, 200);
});

test("(r5) DTO hàng chờ / chi tiết: tập khoá ĐÚNG như contracts; không có số đủ, SĐT, email, vai; số che = cheSo(number_key); cờ trùng hồ sơ khác / đã có dòng cùng loại", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  const hang = await ds(w, HR);
  assert.equal(hang.status, 200, hang.text);
  assert.deepEqual(Object.keys(hang.json), ["phieu"]);
  assert.deepEqual(Object.keys(hang.json.phieu[0]).sort(), ["chuyenToanQuyen", "guiLuc", "id", "loai", "lyDoKhong", "tenHoSo", "xacMinhDuoc"]);
  assert.equal(hang.json.phieu[0].tenHoSo, "Đối Tác Hai");
  const c = await ct(w, HR, p);
  assert.equal(c.status, 200, c.text);
  assert.deepEqual(Object.keys(c.json).sort(), ["coAnh", "daGop", "diaChi", "giayTo", "guiLuc", "id", "loai", "lyDoKhong", "ngaySinh", "tenHoSo", "xacMinhDuoc"]);
  assert.deepEqual(Object.keys(c.json.giayTo).sort(), ["coDongHienHanhCungLoai", "hang", "hetHan", "ngayCap", "noiCap", "soChe", "tenLoai", "trungHoSoKhac"]);
  assert.equal(c.json.giayTo.soChe, "••••0111");
  assert.equal(c.json.giayTo.coDongHienHanhCungLoai, false);
  assert.equal(c.json.giayTo.trungHoSoKhac, false);
  assert.equal(c.json.coAnh, false, "R4: chưa có ảnh nối với phiếu");
  assert.equal(c.json.daGop, false);
  for (const r of [hang, c]) {
    assert.ok(!r.text.includes(KHOA_SO) && !r.text.includes(SO), "không số đủ");
    assert.doesNotMatch(r.text, /0900000\d{3}|@|DRIVER|SALES|PARTNER/, "không SĐT, email, vai");
  }
  // Có dòng cùng loại đang hiện hành + số này đang ở hồ sơ khác.
  w.sqlite.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES (?, ?, 'CCCD', '079000000999', '079000000999', ?, ?)").run(uid(), pty(DT), AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES (?, ?, 'CCCD', ?, ?, ?, ?)").run(uid(), pty(NV2), SO, KHOA_SO, AT, AT);
  const c2 = await ct(w, HR, p);
  assert.equal(c2.json.giayTo.coDongHienHanhCungLoai, true);
  assert.equal(c2.json.giayTo.trungHoSoKhac, true);
  // Phiếu ngày sinh / địa chỉ: giá trị khai nằm ở chi tiết, không có khối giấy tờ.
  const n = await ct(w, HR, phieu(w, { owner: DT, loai: "NGAY_SINH" }));
  assert.equal(n.json.ngaySinh, "1990-05-06");
  assert.equal(n.json.giayTo, null);
  const d = await ct(w, HR, phieu(w, { owner: DT, loai: "DIA_CHI" }));
  assert.equal(d.json.diaChi, "12 Đường Thử, Nha Trang");
});

test("(r6) chi tiết: phiếu đã rút / đã xử lý → 403 submission_processed; không tồn tại hoặc id lạ → 404; ngoài cấp bậc → 404 (không lộ có phiếu)", async () => {
  const w = setup();
  const rut = phieu(w, { owner: NV2 });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, NV2, GUI, rut);
  const tuChoi = phieu(w, { owner: DT });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_DOC_DUOC', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, HR, GUI, tuChoi);
  for (const id of [rut, tuChoi]) {
    const r = await ct(w, HR, id);
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json.error.code, "submission_processed");
  }
  assert.equal((await ct(w, HR, uid())).status, 404);
  assert.equal((await ct(w, HR, "khong-phai-ma")).status, 404);
  const ngoai = phieu(w, { owner: QT });
  assert.equal((await ct(w, HR, ngoai)).status, 404, "ngoài cấp bậc");
  assert.equal((await ct(w, HR, uid())).json.error.code, (await ct(w, HR, ngoai)).json.error.code, "cùng một câu — không lộ có phiếu");
  assert.equal((await ct(w, SUP, ngoai)).status, 200, "Toàn quyền thấy");
});

test("(r6b) hàng đã xử lý: thấy kết luận, lý do là chữ trong danh sách đóng, người xử lý là nhãn; lọc cấp bậc như hàng chờ; trang lạ → 400", async () => {
  const w = setup();
  const a = phieu(w, { owner: DT });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_DOC_DUOC', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, HR, GUI, a);
  const b = phieu(w, { owner: QT });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_DOC_DUOC', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, SUP, GUI, b);
  const r = await ds(w, HR, "da-xu-ly");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.phieu.length, 1, "phiếu của Quản trị ngoài cấp bậc");
  assert.deepEqual(Object.keys(r.json.phieu[0]).sort(), ["coChamTaiKhoan", "id", "ketLuan", "loai", "luc", "lyDo", "nguoiXuLy"]);
  assert.deepEqual({ ...r.json.phieu[0] }, { id: a, loai: "NGAY_SINH", ketLuan: "TU_CHOI", lyDo: nhanLyDoTuChoi("KHONG_DOC_DUOC"), nguoiXuLy: "Nhân Sự", luc: GUI, coChamTaiKhoan: false });
  assert.equal((await ds(w, SUP, "da-xu-ly")).json.phieu.length, 2);
  assert.equal((await ds(w, HR, "khac")).status, 400);
});

test("(r7) xem đủ số: Nhân sự hợp lệ → 200 { so } và ĐÚNG MỘT dòng nhật ký không chứa số, ghi trước lúc trả lời; bị tách nhiệm vụ → 409 verify_conflict; phiếu đã xử lý → 403; không có số → 404; ngoài cấp bậc → 404", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  const r = await xemSo(w, HR, p);
  const luc = new Date().toISOString();
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { so: SO });
  assert.equal(soDongXem(w), 1);
  const nk = w.q("SELECT staff_id, target_type, target_id, detail, created_at FROM audit_log WHERE action = 'self_submission_number_viewed'")[0];
  assert.equal(nk.staff_id, HR);
  assert.equal(nk.target_type, "party");
  assert.equal(nk.target_id, pty(DT));
  assert.ok(String(nk.detail).includes(p) && String(nk.detail).includes("Căn cước công dân"), `chi tiết = phiếu + tên loại: ${nk.detail}`);
  assert.ok(!String(nk.detail).includes(KHOA_SO) && !String(nk.detail).includes(SO) && !String(nk.detail).includes("079"), "nhật ký không chứa số");
  assert.ok(String(nk.created_at) <= luc, "nhật ký có trước lúc trả lời");
  assert.equal((await xemSo(w, ADM, p)).status, 200, "Quản trị cũng được");
  assert.equal(soDongXem(w), 2);

  // Tách nhiệm vụ: tài khoản do HR tạo; HR tự xem phiếu của mình.
  nhatKyCham(w, HR, NV);
  const pNV = phieu(w, { owner: NV, loai: "GIAY_TO" });
  const pHR2 = phieu(w, { owner: HR2, loai: "GIAY_TO" });
  const n1 = soDongXem(w);
  for (const [as, id] of [[HR, pNV], [HR2, pHR2]] as const) {
    const x = await xemSo(w, as, id);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "verify_conflict");
    assert.ok(!x.text.includes(KHOA_SO) && !x.text.includes(SO));
  }
  assert.equal(soDongXem(w), n1, "bị chặn thì 0 dòng nhật ký");
  assert.equal((await xemSo(w, SUP, pNV)).status, 200, "Toàn quyền là chốt cuối");

  // Phiếu đã xử lý, phiếu không có số, phiếu ngoài cấp bậc.
  const xong = phieu(w, { owner: NV2, loai: "GIAY_TO" });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_DOC_DUOC', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, HR, GUI, xong);
  const khongSo = phieu(w, { owner: NV2, loai: "NGAY_SINH" });
  const ngoai = phieu(w, { owner: QT, loai: "GIAY_TO" });
  const n2 = soDongXem(w);
  const a = await xemSo(w, HR, xong);
  assert.equal(a.status, 403, a.text);
  assert.equal(a.json.error.code, "submission_processed");
  assert.equal((await xemSo(w, HR, khongSo)).status, 404);
  assert.equal((await xemSo(w, HR, ngoai)).status, 404);
  assert.equal((await xemSo(w, HR, uid())).status, 404);
  assert.equal(soDongXem(w), n2, "0 dòng nhật ký cho mọi ca bị chặn");
});

test("(r8) nhật ký TRƯỚC: ghi nhật ký lỗi thì route 500 và KHÔNG trả số", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  w.sqlite.exec("ALTER TABLE audit_log RENAME TO audit_log_tam");
  try {
    const r = await xemSo(w, HR, p);
    assert.equal(r.status, 500, r.text);
    assert.ok(!r.text.includes(KHOA_SO) && !r.text.includes(SO), "thân 500 không có số");
  } finally {
    w.sqlite.exec("ALTER TABLE audit_log_tam RENAME TO audit_log");
  }
});

test("(r9) chi tiết phiếu và xem đủ số có Cache-Control: no-store", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  assert.equal((await ct(w, HR, p)).headers.get("cache-control"), "no-store");
  assert.equal((await xemSo(w, HR, p)).headers.get("cache-control"), "no-store");
  assert.equal((await ds(w, HR)).headers.get("cache-control"), "no-store");
});

// ======== Việc 4 (lát H-4): chấp nhận nguyên văn, từ chối theo danh sách đóng, đánh dấu "cần xác minh lại" ========
const chapNhan = (w: any, as: string, pid: string) => w.call("POST", `/api/parties/xac-minh/${pid}/chap-nhan`, { as, body: {} });
const tuChoi = (w: any, as: string, pid: string, body: unknown = { lyDo: "KHONG_DOC_DUOC" }) => w.call("POST", `/api/parties/xac-minh/${pid}/tu-choi`, { as, body });
const trangThai = (w: any, pid: string): string => String(w.q("SELECT status FROM pty_self_submission WHERE id = ?", pid)[0].status);
const soXacMinh = (w: any): number => Number(w.q("SELECT count(*) n FROM pty_verification")[0].n);
const nhatKyQuyet = (w: any): { action: string; detail: string }[] =>
  w.q("SELECT action, detail FROM audit_log WHERE action IN ('self_submission_accepted', 'self_submission_rejected') ORDER BY rowid").map((r: any) => ({ ...r }));
const khongGhi = (w: any, pid: string) => {
  assert.equal(trangThai(w, pid), "CHO_XAC_MINH");
  assert.equal(soXacMinh(w), 0);
  assert.deepEqual(nhatKyQuyet(w), []);
};
const ngay = (iso: string, soNgay: number): string => new Date(Date.parse(iso) - soNgay * 86_400_000).toISOString();

test("(w1) Nhân sự chấp nhận NGAY_SINH ⇒ 200; ngày sinh chép nguyên văn; phiếu DA_CHAP_NHAN; một dòng xác minh cờ 0; nhật ký không có ngày sinh; xem lại → 403", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  const r = await chapNhan(w, HR, p);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });
  assert.equal(w.q("SELECT birth_date b FROM pty_person WHERE party_id = ?", pty(DT))[0].b, "1990-05-06");
  const s = w.q("SELECT status, decided_by FROM pty_self_submission WHERE id = ?", p)[0];
  assert.deepEqual({ ...s }, { status: "DA_CHAP_NHAN", decided_by: HR });
  const v = w.q("SELECT party_id, target_kind, target_id, attribute_code, outcome, verifier_touched_account c, created_by FROM pty_verification WHERE id = ?", p);
  assert.equal(v.length, 1);
  assert.deepEqual({ ...v[0] }, { party_id: pty(DT), target_kind: "ATTRIBUTE", target_id: null, attribute_code: "NGAY_SINH", outcome: "DA_XAC_MINH", c: 0, created_by: HR });
  assert.deepEqual(nhatKyQuyet(w), [{ action: "self_submission_accepted", detail: `phiếu ${p} · Ngày sinh` }]);
  const xem = await ct(w, HR, p);
  assert.equal(xem.status, 403);
  assert.equal(xem.json.error.code, "submission_processed");
});

test("(w1b) chấp nhận DIA_CHI ⇒ thêm đúng một liên hệ địa chỉ nguyên văn, dòng xác minh trỏ liên hệ đó; nhật ký không có địa chỉ", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "DIA_CHI" });
  const truoc = Number(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ?", pty(DT))[0].n);
  const r = await chapNhan(w, ADM, p);
  assert.equal(r.status, 200, r.text);
  const lh = w.q("SELECT id, value, is_primary FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", pty(DT));
  assert.equal(lh.length, 1);
  assert.equal(Number(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ?", pty(DT))[0].n), truoc + 1);
  assert.equal(lh[0].value, "12 Đường Thử, Nha Trang");
  const v = w.q("SELECT target_kind, target_id FROM pty_verification WHERE id = ?", p)[0];
  assert.deepEqual({ ...v }, { target_kind: "CONTACT", target_id: lh[0].id });
  assert.ok(!JSON.stringify(nhatKyQuyet(w)).includes("Đường Thử"));
});

test("(w2) Quản trị từ chối DIA_CHI với KHONG_KHOP_GIAY_TO ⇒ 200; TU_CHOI + mã lý do; không dòng xác minh, không liên hệ mới; nhật ký có mã lý do, không địa chỉ", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "DIA_CHI" });
  const r = await tuChoi(w, ADM, p, { lyDo: "KHONG_KHOP_GIAY_TO" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(w.q("SELECT status, reason_code, decided_by FROM pty_self_submission WHERE id = ?", p).map((x: any) => ({ ...x })), [{ status: "TU_CHOI", reason_code: "KHONG_KHOP_GIAY_TO", decided_by: ADM }]);
  assert.equal(soXacMinh(w), 0);
  assert.equal(Number(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", pty(DT))[0].n), 0);
  const nk = nhatKyQuyet(w);
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.action, "self_submission_rejected");
  assert.ok(nk[0]!.detail.includes(p) && nk[0]!.detail.includes("KHONG_KHOP_GIAY_TO") && !nk[0]!.detail.includes("Đường Thử"), nk[0]!.detail);
});

test("(w3) từ chối với lý do ngoài danh sách, có khoá ghiChu, thiếu thân ⇒ 400, không ghi", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  for (const body of [{ lyDo: "TU_NHIEN" }, { lyDo: "KHONG_DOC_DUOC", ghiChu: "số 079000000111" }, {}, { lyDo: 5 }]) {
    const r = await tuChoi(w, HR, p, body);
    assert.equal(r.status, 400, JSON.stringify(body) + r.text);
    assert.equal(r.json.error.code, "invalid_input");
  }
  khongGhi(w, p);
});

test("(w4) người khai tự chấp nhận / từ chối (tài khoản lai Quản trị + Đối tác) ⇒ 409 verify_self, không ghi", async () => {
  const w = setup();
  const LAI = "44444444-4444-4444-8444-444444444444";
  seedStaff(w.sqlite, { id: LAI, phone: "0900000040", name: "Lai", perms: ["ADMIN", "PARTNER"] });
  const p = phieu(w, { owner: LAI });
  for (const r of [await chapNhan(w, LAI, p), await tuChoi(w, LAI, p)]) {
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "verify_self");
  }
  khongGhi(w, p);
});

test("(w5) Nhân sự đã TẠO tài khoản chủ phiếu ⇒ chấp nhận và từ chối đều 409 verify_conflict (R13), không ghi", async () => {
  const w = setup();
  nhatKyCham(w, HR, NV);
  const p = phieu(w, { owner: NV });
  for (const r of [await chapNhan(w, HR, p), await tuChoi(w, HR, p)]) {
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "verify_conflict");
  }
  khongGhi(w, p);
  assert.equal((await chapNhan(w, ADM, p)).status, 200, "người khác không dính thì được");
});

test("(w6) đặt lại PIN cho chủ phiếu 400 ngày trước lúc gửi vẫn chặn (vĩnh viễn); mở khoá đăng nhập 31 ngày trước lúc gửi thì không", async () => {
  const w = setup();
  nhatKyCham(w, ADM, NV, "pin_reset", ngay(GUI, 400));
  nhatKyCham(w, ADM, NV2, "login_unlocked", ngay(GUI, 31));
  const pNV = phieu(w, { owner: NV });
  const pNV2 = phieu(w, { owner: NV2 });
  const a = await chapNhan(w, ADM, pNV);
  assert.equal(a.status, 409, a.text);
  assert.equal(a.json.error.code, "verify_conflict");
  assert.equal(trangThai(w, pNV), "CHO_XAC_MINH");
  const b = await chapNhan(w, ADM, pNV2);
  assert.equal(b.status, 200, b.text);
});

test("(w7) Toàn quyền từng đặt lại PIN ⇒ 200, dòng xác minh cờ 1, hàng đã xử lý coChamTaiKhoan = true, nhật ký có \"cờ chạm tài khoản\"; Toàn quyền từ chối thì không có dòng xác minh (Q5)", async () => {
  const w = setup();
  nhatKyCham(w, SUP, NV2, "pin_reset", ngay(GUI, 5));
  const p = phieu(w, { owner: NV2 });
  const r = await chapNhan(w, SUP, p);
  assert.equal(r.status, 200, r.text);
  assert.equal(Number(w.q("SELECT verifier_touched_account c FROM pty_verification WHERE id = ?", p)[0].c), 1);
  const xong = await ds(w, SUP, "da-xu-ly");
  assert.equal(xong.json.phieu.find((x: any) => x.id === p).coChamTaiKhoan, true);
  assert.ok(nhatKyQuyet(w)[0]!.detail.includes("cờ chạm tài khoản"));
  const q = phieu(w, { owner: NV });
  nhatKyCham(w, SUP, NV, "staff_created");
  assert.equal((await tuChoi(w, SUP, q)).status, 200);
  assert.equal(soXacMinh(w), 1, "từ chối không sinh dòng xác minh");
  assert.ok(!nhatKyQuyet(w).find((x) => x.action === "self_submission_rejected")!.detail.includes("cờ chạm"), "Q5: từ chối chỉ ghi nhật ký, không cờ");
});

test("(w8) Review Focus 1: chấp nhận lần hai (người khác) ⇒ 409 submission_not_pending; vẫn đúng một dòng xác minh", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  assert.equal((await chapNhan(w, HR, p)).status, 200);
  const r = await chapNhan(w, ADM, p);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "submission_not_pending");
  assert.equal((await tuChoi(w, ADM, p)).status, 409);
  assert.equal(soXacMinh(w), 1);
  assert.equal(nhatKyQuyet(w).length, 1);
});

test("(w9) Review Focus 3: người dùng rút phiếu rồi người xác minh bấm chấp nhận / từ chối / xem số ⇒ 409 / 409 / 403, không ghi", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(GUI, DT, GUI, p);
  assert.equal((await chapNhan(w, HR, p)).status, 409);
  assert.equal((await tuChoi(w, HR, p)).status, 409);
  assert.equal((await xemSo(w, HR, p)).status, 403);
  assert.equal(soXacMinh(w), 0);
  assert.deepEqual(nhatKyQuyet(w), []);
  assert.equal(soDongXem(w), 0);
});

test("(w10) R18: chấp nhận phiếu GIAY_TO ⇒ 409 can_anh_giay_to, không ghi; từ chối TRUNG_HO_SO_KHAC ⇒ 200", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT, loai: "GIAY_TO" });
  const a = await chapNhan(w, HR, p);
  assert.equal(a.status, 409, a.text);
  assert.equal(a.json.error.code, "can_anh_giay_to");
  khongGhi(w, p);
  assert.equal(Number(w.q("SELECT count(*) n FROM pty_person_document WHERE party_id = ?", pty(DT))[0].n), 0);
  const b = await tuChoi(w, HR, p, { lyDo: "TRUNG_HO_SO_KHAC" });
  assert.equal(b.status, 200, b.text);
  assert.equal(trangThai(w, p), "TU_CHOI");
  assert.ok(!JSON.stringify(nhatKyQuyet(w)).includes(KHOA_SO));
});

test("(w11) R20: phiếu của hồ sơ đã gộp ⇒ chấp nhận 409 ho_so_da_gop, không ghi; từ chối HO_SO_DA_GOP ⇒ 200", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('gop-dich', 'PERSON', 'Hồ Sơ Chính', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('gop-dich', 'Hồ Sơ Chính', '${AT}', '${AT}')`);
  w.sqlite.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'gop-dich', merged_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, pty(DT));
  const a = await chapNhan(w, HR, p);
  assert.equal(a.status, 409, a.text);
  assert.equal(a.json.error.code, "ho_so_da_gop");
  khongGhi(w, p);
  const b = await tuChoi(w, HR, p, { lyDo: "HO_SO_DA_GOP" });
  assert.equal(b.status, 200, b.text);
});

test("(w12) chủ phiếu ngoài cấp bậc (Nhân sự khác) ⇒ 404 cho cả chấp nhận và từ chối, không ghi; id lạ ⇒ 404", async () => {
  const w = setup();
  const p = phieu(w, { owner: HR2 });
  for (const r of [await chapNhan(w, HR, p), await tuChoi(w, HR, p), await chapNhan(w, HR, uid()), await tuChoi(w, HR, "khong-phai-ma")]) assert.equal(r.status, 404, r.text);
  khongGhi(w, p);
});

test("(w12b) cổng: Bán hàng, Kế toán, Đối tác, Tài xế đối tác ⇒ 403 ở hai route quyết, không ghi", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  for (const as of [SALES, ACC, PARTNER, DRVP]) for (const r of [await chapNhan(w, as, p), await tuChoi(w, as, p)]) assert.equal(r.status, 403, `${as}: ${r.text}`);
  khongGhi(w, p);
});

test("(w13) R16: sau khi xác minh ngày sinh, Quản trị đổi ngày sinh qua PUT ⇒ thêm đúng một dòng CAN_XAC_MINH_LAI cùng lô; PUT không đổi / chưa từng xác minh / đã cần xác minh lại ⇒ không thêm", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  assert.equal((await chapNhan(w, HR, p)).status, 200);
  const sua = (id: string, body: Record<string, unknown>) => {
    const cur = w.q("SELECT updated_at u, active a, display_name n FROM pty_party WHERE id = ?", id)[0];
    return w.call("PUT", `/api/parties/${id}`, { as: ADM, body: { fullName: cur.n, active: cur.a === 1, expectedUpdatedAt: cur.u, ...body } });
  };
  const dem = (party: string, outcome: string) => Number(w.q("SELECT count(*) n FROM pty_verification WHERE party_id = ? AND outcome = ?", party, outcome)[0].n);
  assert.equal((await sua(pty(DT), { birthDate: "1990-05-06" })).status, 200, "không đổi");
  assert.equal(dem(pty(DT), "CAN_XAC_MINH_LAI"), 0);
  const r = await sua(pty(DT), { birthDate: "1991-01-01" });
  assert.equal(r.status, 200, r.text);
  assert.equal(dem(pty(DT), "CAN_XAC_MINH_LAI"), 1);
  const d = w.q("SELECT target_kind, attribute_code, created_by, verifier_touched_account c FROM pty_verification WHERE outcome = 'CAN_XAC_MINH_LAI'")[0];
  assert.deepEqual({ ...d }, { target_kind: "ATTRIBUTE", attribute_code: "NGAY_SINH", created_by: ADM, c: 0 });
  assert.equal((await sua(pty(DT), { birthDate: "1992-02-02" })).status, 200);
  assert.equal(dem(pty(DT), "CAN_XAC_MINH_LAI"), 1, "đã cần xác minh lại thì không thêm");
  assert.equal((await sua(pty(NV2), { birthDate: "1993-03-03" })).status, 200);
  assert.equal(dem(pty(NV2), "CAN_XAC_MINH_LAI"), 0, "chưa từng xác minh");
});

test("(w13b) PUT lỗi thời (expectedUpdatedAt cũ) ⇒ 409 stale và KHÔNG thêm dòng CAN_XAC_MINH_LAI", async () => {
  const w = setup();
  const p = phieu(w, { owner: DT });
  assert.equal((await chapNhan(w, HR, p)).status, 200);
  const cur = w.q("SELECT active a, display_name n FROM pty_party WHERE id = ?", pty(DT))[0];
  const r = await w.call("PUT", `/api/parties/${pty(DT)}`, { as: ADM, body: { fullName: cur.n, active: cur.a === 1, expectedUpdatedAt: "2000-01-01T00:00:00.000Z", birthDate: "1991-01-01" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(Number(w.q("SELECT count(*) n FROM pty_verification WHERE outcome = 'CAN_XAC_MINH_LAI'")[0].n), 0);
});
