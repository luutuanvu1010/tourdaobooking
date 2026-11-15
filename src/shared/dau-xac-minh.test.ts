// Dấu xác minh của hồ sơ (ADR-0210): MỘT bảng ca chạy cho HÀM THUẦN (dữ kiện viết tay) và cho VIEW `v_pty_verification_facts` (dựng trạng thái thật trên SQLite
// dựng từ migrations/*.sql, đọc view, đưa qua cùng hàm). Hai bên phải ra cùng kết luận và cùng dữ kiện. Mọi giá trị là GIẢ.
// Phá thử (đã làm, xem task-10-report): đổi `>=` thành `>` ở so ngày hết hạn → ca «hôm nay là ngày hết hạn» đỏ; bỏ trigger đổi họ tên → ca «sửa họ tên» đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { openDb } from "../../tests/audit/harness.mjs";
import { dkienTuView, tinhDauXacMinh, type DuKienXacMinh, type DauXacMinh } from "./dau-xac-minh.ts";

type Db = ReturnType<typeof openDb>;
const HOM_NAY = "2026-11-15";
let dem = 0;
const luc = (): string => new Date(Date.parse("2026-11-01T00:00:00.000Z") + ++dem * 1000).toISOString();

function hoSo(db: Db, id: string, ten = "Nguyễn Văn Thử"): void {
  const t = luc();
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', 1, '${t}', '${t}')`);
  db.exec(`INSERT INTO pty_person (party_id, family_name, given_name, created_at, updated_at) VALUES ('${id}', 'Nguyễn', 'Thử', '${t}', '${t}')`);
}
function xm(db: Db, party: string, kind: "ATTRIBUTE" | "PERSON_DOCUMENT", target: string, outcome: "DA_XAC_MINH" | "TU_CHOI" | "CAN_XAC_MINH_LAI"): void {
  const t = luc();
  db.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ng', ?, 'ng')`).run(`xm-${++dem}`, party, kind, kind === "ATTRIBUTE" ? null : target, kind === "ATTRIBUTE" ? target : null, outcome, outcome === "TU_CHOI" ? "KHONG_KHOP" : null, t, t);
}
function giayTo(db: Db, party: string, id: string, hetHan: string | null, extra: { truoc?: string; huy?: boolean } = {}): void {
  const t = luc();
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, previous_id, voided_at, created_at, updated_at)
    VALUES (?, ?, 'CCCD', ?, ?, ?, ?, ?, ?, ?)`).run(id, party, `000${id}`, `000${id}`.toUpperCase(), hetHan, extra.truoc ?? null, extra.huy ? t : null, t, t);
}
const datDu = (db: Db, p: string, doc: string): void => { xm(db, p, "ATTRIBUTE", "HO_TEN", "DA_XAC_MINH"); xm(db, p, "ATTRIBUTE", "NGAY_SINH", "DA_XAC_MINH"); xm(db, p, "PERSON_DOCUMENT", doc, "DA_XAC_MINH"); };

interface Ca { ten: string; lap: (db: Db) => void; coTaiKhoan?: boolean; mong: DauXacMinh | null; hoSo?: string }
const MUC = (ma: string, kind: "ATTRIBUTE" | "DOCUMENT", o: Partial<DuKienXacMinh> = {}): DuKienXacMinh => ({
  loaiMuc: kind, maMuc: ma, ketLuanMoiNhat: null, tungDat: false, maGiayTo: null, hetHan: null, laDoiTac: false, anDanh: false, ...o,
});
const DAT = { ketLuanMoiNhat: "DA_XAC_MINH", tungDat: true } as const;
const HAN = "2027-01-01";

// Mỗi ca: trạng thái dựng thật (lap) + dữ kiện viết tay (dk) mà view PHẢI trả đúng; hàm phải ra `mong` cả hai đường.
const CA: (Ca & { dk: DuKienXacMinh[] })[] = [
  { ten: "chưa có kết luận nào ⇒ Chưa", lap: (db) => giayTo(db, "p", "d1", HAN), coTaiKhoan: true, mong: "CHUA",
    dk: [MUC("HO_TEN", "ATTRIBUTE"), MUC("NGAY_SINH", "ATTRIBUTE"), MUC("CCCD", "DOCUMENT", { maGiayTo: "d1", hetHan: HAN })] },
  { ten: "đủ mục, căn cước còn hạn ⇒ Đã", lap: (db) => { giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); }, coTaiKhoan: true, mong: "DA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })] },
  { ten: "căn cước không có hạn ⇒ Đã", lap: (db) => { giayTo(db, "p", "d1", null); datDu(db, "p", "d1"); }, coTaiKhoan: true, mong: "DA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: null })] },
  { ten: "sửa ngày sinh sau khi xác minh ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); xm(db, "p", "ATTRIBUTE", "NGAY_SINH", "CAN_XAC_MINH_LAI"); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", { ketLuanMoiNhat: "CAN_XAC_MINH_LAI", tungDat: true }), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })] },
  { ten: "sửa họ tên sau khi xác minh (đổi cột tên) ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); db.exec("UPDATE pty_person SET given_name = 'Đổi', updated_at = '2026-11-14T00:00:00.000Z' WHERE party_id = 'p'"); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", { ketLuanMoiNhat: "CAN_XAC_MINH_LAI", tungDat: true }), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })] },
  { ten: "ghi lại đúng họ tên cũ thì KHÔNG đánh dấu ⇒ Đã", lap: (db) => { giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); db.exec("UPDATE pty_person SET given_name = given_name, family_name = 'Nguyễn', updated_at = '2026-11-14T00:00:00.000Z' WHERE party_id = 'p'"); }, coTaiKhoan: true, mong: "DA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })] },
  { ten: "căn cước hết hạn (hôm qua) ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", "2026-11-14"); datDu(db, "p", "d1"); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: "2026-11-14" })] },
  { ten: "hôm nay là ngày cuối còn hạn ⇒ Đã (so ngày giờ Việt Nam truyền vào)", lap: (db) => { giayTo(db, "p", "d1", HOM_NAY); datDu(db, "p", "d1"); }, coTaiKhoan: true, mong: "DA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HOM_NAY })] },
  { ten: "gia hạn căn cước mà dòng mới chưa xác minh ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", "2026-12-01"); datDu(db, "p", "d1"); giayTo(db, "p", "d2", "2030-01-01", { truoc: "d1" }); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { tungDat: true, maGiayTo: "d2", hetHan: "2030-01-01" })] },
  { ten: "căn cước đã huỷ ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); db.exec("UPDATE pty_person_document SET voided_at = '2026-11-14T00:00:00.000Z' WHERE id = 'd1'"); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { tungDat: true })] },
  { ten: "mục bắt buộc mới (căn cước) chưa có kết luận trong khi họ tên, ngày sinh đã đạt ⇒ Cần lại", lap: (db) => { giayTo(db, "p", "d1", HAN); xm(db, "p", "ATTRIBUTE", "HO_TEN", "DA_XAC_MINH"); xm(db, "p", "ATTRIBUTE", "NGAY_SINH", "DA_XAC_MINH"); }, coTaiKhoan: true, mong: "CAN_LAI",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { maGiayTo: "d1", hetHan: HAN })] },
  { ten: "chỉ có lời từ chối, chưa từng đạt ⇒ Chưa", lap: (db) => { giayTo(db, "p", "d1", HAN); xm(db, "p", "ATTRIBUTE", "HO_TEN", "TU_CHOI"); }, coTaiKhoan: true, mong: "CHUA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", { ketLuanMoiNhat: "TU_CHOI" }), MUC("NGAY_SINH", "ATTRIBUTE"), MUC("CCCD", "DOCUMENT", { maGiayTo: "d1", hetHan: HAN })] },
  { ten: "khách lẻ (không tài khoản, không vai đối tác) ⇒ không có dấu", lap: () => {}, coTaiKhoan: false, mong: null,
    dk: [MUC("HO_TEN", "ATTRIBUTE"), MUC("NGAY_SINH", "ATTRIBUTE"), MUC("CCCD", "DOCUMENT")] },
  { ten: "không tài khoản nhưng đang mang vai đối tác ⇒ có dấu", lap: (db) => {
      db.exec("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('DT_THU', 'Đối tác thử', 90, 'OTHER', 1)");
      db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r1', 'p', 'DT_THU', '2026-01-01', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
    }, coTaiKhoan: false, mong: "CHUA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", { laDoiTac: true }), MUC("NGAY_SINH", "ATTRIBUTE", { laDoiTac: true }), MUC("CCCD", "DOCUMENT", { laDoiTac: true })] },
  { ten: "hồ sơ đã gộp lấy trạng thái của hồ sơ chính", hoSo: "m", lap: (db) => {
      giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1"); hoSo(db, "m");
      db.exec("UPDATE pty_party SET merged_into_id = 'p', merged_at = '2026-11-10T00:00:00.000Z', active = 0 WHERE id = 'm'");
    }, coTaiKhoan: true, mong: "DA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })] },
  { ten: "hồ sơ đã ẩn danh theo yêu cầu xoá ⇒ Chưa", lap: (db) => {
      giayTo(db, "p", "d1", HAN); datDu(db, "p", "d1");
      db.exec(`INSERT INTO pty_erasure_request (id, party_id, status, created_at, created_by, updated_at, updated_by) VALUES ('x1', 'p', 'CHO_XU_LY', '2026-11-11T00:00:00.000Z', 'p', '2026-11-11T00:00:00.000Z', 'p')`);
      db.exec(`UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = '2026-11-12T00:00:00.000Z', decided_by = 'ng', name_kept = 0, retained_codes = 'KHONG', updated_at = '2026-11-12T00:00:00.000Z', updated_by = 'ng' WHERE id = 'x1'`);
    }, coTaiKhoan: true, mong: "CHUA",
    dk: [MUC("HO_TEN", "ATTRIBUTE", { ...DAT, anDanh: true }), MUC("NGAY_SINH", "ATTRIBUTE", { ...DAT, anDanh: true }), MUC("CCCD", "DOCUMENT", { ...DAT, anDanh: true, maGiayTo: "d1", hetHan: HAN })] },
];

for (const c of CA) {
  test(`bảng ca chung: ${c.ten}`, () => {
    // đường 1: hàm thuần với dữ kiện viết tay
    assert.equal(tinhDauXacMinh(c.dk, HOM_NAY, c.coTaiKhoan ?? false), c.mong, "hàm thuần");
    // đường 2: view trên CSDL thật, cùng hàm
    const db = openDb();
    hoSo(db, "p");
    c.lap(db);
    const hang = db.prepare("SELECT * FROM v_pty_verification_facts WHERE party_id = ? ORDER BY item_kind DESC, item_code").all(c.hoSo ?? "p") as Record<string, unknown>[];
    const tuView = hang.map(dkienTuView);
    const sapXep = (a: DuKienXacMinh[]) => [...a].sort((x, y) => `${y.loaiMuc}${x.maMuc}`.localeCompare(`${x.loaiMuc}${y.maMuc}`) || String(x.maMuc).localeCompare(String(y.maMuc)));
    const khoa = (d: DuKienXacMinh) => `${d.loaiMuc}:${d.maMuc}`;
    assert.deepEqual(tuView.sort((a, b) => khoa(a).localeCompare(khoa(b))), [...c.dk].sort((a, b) => khoa(a).localeCompare(khoa(b))), "dữ kiện view lệch dữ kiện viết tay");
    assert.equal(tinhDauXacMinh(tuView, HOM_NAY, c.coTaiKhoan ?? false), c.mong, "view → hàm");
    void sapXep;
  });
}

test("hàm thuần: thêm một mục bắt buộc mới thì hồ sơ đang Đã thành Cần lại", () => {
  const du = [MUC("HO_TEN", "ATTRIBUTE", DAT), MUC("NGAY_SINH", "ATTRIBUTE", DAT), MUC("CCCD", "DOCUMENT", { ...DAT, maGiayTo: "d1", hetHan: HAN })];
  assert.equal(tinhDauXacMinh(du, HOM_NAY, true), "DA");
  assert.equal(tinhDauXacMinh([...du, MUC("MUC_MOI", "ATTRIBUTE")], HOM_NAY, true), "CAN_LAI");
});

test("hàm thuần: danh sách mục bắt buộc rỗng (tổ chức chưa đặt) ⇒ Chưa, không bao giờ Đã", () => {
  assert.equal(tinhDauXacMinh([{ loaiMuc: null, maMuc: null, ketLuanMoiNhat: null, tungDat: false, maGiayTo: null, hetHan: null, laDoiTac: false, anDanh: false }], HOM_NAY, true), "CHUA");
  assert.equal(tinhDauXacMinh([], HOM_NAY, true), "CHUA");
});

test("hàm thuần: không có hàng nào và không tài khoản ⇒ null", () => {
  assert.equal(tinhDauXacMinh([], HOM_NAY, false), null);
});
