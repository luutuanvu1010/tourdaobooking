// ADR-0139 (chủ duyệt 2026-10-24): tài xế CÔNG TY, chuyến mình lái, TRONG NGÀY CHẠY, ở GET chi tiết cuốc thấy thêm SĐT người đi kèm (suất `CREW` — số liên hệ
// chính của hồ sơ trong Danh bạ, không phải SĐT đăng nhập) và tên dịch vụ của suất khách. Tài xế đối tác không bao giờ có hai khoá này. Chạy cả ứng dụng trên
// SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). SĐT, tên GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  DRIVER, DRIVER_PARTNER, FIELD, NGAY_SAU, SALES, batDongHo, chiTiet, chuyenSan, denGio, nhaXeKhung, setup, tienDo, uuid, xeNhaXe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const SDT_HO_SO = "0913555666"; // SĐT liên hệ chính trên hồ sơ HDV (Danh bạ)
const SDT_DANG_NHAP_HDV = "0900000004"; // seedStaff — SĐT đăng nhập, KHÔNG được lộ
const AT = "2026-09-01T00:00:00.000Z";

function soHoSo(w: any, partyId: string, sdt = SDT_HO_SO) {
  w.sqlite.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
    VALUES (?, ?, 'PHONE', ?, ?, NULL, 1, '2026-09-01', ?, ?)`).run(uuid(), partyId, sdt, sdt, AT, AT);
}
async function xepDiKem(w: any, tripId: string) {
  const c = await chiTiet(w, tripId);
  const r = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), nguoiDiKem: [`pty-${FIELD}`] } });
  assert.equal(r.status, 200, r.text);
}
const cuoc = (w: any, id: string, as: string) => w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as });
const crew = (r: any) => r.json.suat.filter((s: any) => s.loai === "CREW");
const khach = (r: any) => r.json.suat.filter((s: any) => s.loai === "PASSENGER");

test("ADR-0139 TC1, TC6: tài xế công ty trong ngày chạy thấy SĐT người đi kèm (số hồ sơ, không số đăng nhập) + tên dịch vụ của suất khách; nhật ký không SĐT", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    soHoSo(w, `pty-${FIELD}`);
    const a = await chuyenSan(w);
    await xepDiKem(w, a.id);
    const r = await cuoc(w, a.id, DRIVER);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, true, "chống bài rỗng: đúng ca trong ngày chạy");
    assert.deepEqual(crew(r).map((s: any) => [s.tenNguoiDiKem, s.sdtNguoiDiKem]), [["Hướng Dẫn", SDT_HO_SO]]);
    assert.ok(khach(r).length > 0);
    for (const s of khach(r)) assert.equal(s.tenDichVu, "Tour đảo", "tên dịch vụ của chặng");
    for (const s of crew(r)) assert.equal("tenDichVu" in s, false, "suất người đi kèm không có tên dịch vụ");
    assert.ok(!r.text.includes(SDT_DANG_NHAP_HDV), "không bao giờ lộ SĐT đăng nhập");
    assert.doesNotMatch(r.text, /777000|Ghi chú đơn Dò Tìm|Thanh toán Dò Tìm/, "không giá, không ghi chú đơn");
    // văn phòng không đổi: chi tiết chuyến không thêm SĐT
    assert.ok(!JSON.stringify(await chiTiet(w, a.id)).includes(SDT_HO_SO));
    for (const n of w.q("SELECT detail FROM audit_log")) assert.ok(!String(n.detail).includes(SDT_HO_SO), `nhật ký không SĐT: ${n.detail}`);
  } finally {
    tat();
  }
});

test("ADR-0139 TC2: ngoài ngày chạy (chuyến ngày mai) — tài xế công ty không có SĐT người đi kèm, không có tên dịch vụ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    soHoSo(w, `pty-${FIELD}`);
    const a = await chuyenSan(w, { ngay: NGAY_SAU });
    await xepDiKem(w, a.id);
    const r = await cuoc(w, a.id, DRIVER);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, false, "chống bài rỗng: đúng ca ngoài ngày");
    assert.deepEqual(crew(r).map((s: any) => s.tenNguoiDiKem), ["Hướng Dẫn"], "tên vẫn có mọi lúc");
    for (const s of r.json.suat) {
      assert.equal("sdtNguoiDiKem" in s, false);
      assert.equal("tenDichVu" in s, false);
    }
    assert.ok(!r.text.includes(SDT_HO_SO));
  } finally {
    tat();
  }
});

test("ADR-0139 TC4: tài xế ĐỐI TÁC — kể cả trong khung xem khách — không bao giờ có SĐT người đi kèm hay tên dịch vụ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    soHoSo(w, `pty-${FIELD}`);
    const nx = nhaXeKhung(w, "Nhà xe Một");
    w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
      VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${DRIVER_PARTNER}`, nx, AT, AT);
    w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
      VALUES ('g-dt-sdt', ?, 'GPLX', '793300000099', '793300000099', 'Nơi cấp', 'D', '2030-12-31', ?, ?)`).run(`pty-${DRIVER_PARTNER}`, AT, AT);
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xeNhaXe(w, nx), ngay: NGAY_SAU });
    await xepDiKem(w, a.id);
    denGio("00:31", NGAY_SAU); // qua hạn Từ chối trong ngày chạy ⇒ trong khung xem khách
    const r = await cuoc(w, a.id, DRIVER_PARTNER);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, true, "chống bài rỗng: đúng ca trong khung");
    assert.deepEqual(crew(r).map((s: any) => s.tenNguoiDiKem), ["Hướng Dẫn"]);
    for (const s of r.json.suat) {
      assert.equal("sdtNguoiDiKem" in s, false);
      assert.equal("tenDichVu" in s, false);
    }
    assert.ok(!r.text.includes(SDT_HO_SO) && !r.text.includes(SDT_DANG_NHAP_HDV));
  } finally {
    tat();
  }
});

test("ADR-0139 TC3, TC5: hồ sơ người đi kèm không có SĐT ⇒ không khoá, không lỗi; tài xế công ty khác (không lái) ⇒ 404", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    await xepDiKem(w, a.id);
    const r = await cuoc(w, a.id, DRIVER);
    assert.equal(r.status, 200, r.text);
    assert.equal(crew(r).length, 1);
    assert.equal("sdtNguoiDiKem" in crew(r)[0], false);
    for (const s of khach(r)) assert.equal(s.tenDichVu, "Tour đảo", "tên dịch vụ không phụ thuộc SĐT");
    const khac = "66666666-6666-4666-8666-666666666670";
    seedStaff(w.sqlite, { id: khac, phone: "0900000046", name: "Tài Xế Ba", perms: ["DRIVER"] });
    assert.equal((await cuoc(w, a.id, khac)).status, 404);
  } finally {
    tat();
  }
});

test("ADR-0139 (Hệ quả 1): phản hồi lệnh tiến độ của tài xế công ty — kể cả trong ngày chạy — không kèm SĐT người đi kèm hay tên dịch vụ (chỉ GET chi tiết)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    soHoSo(w, `pty-${FIELD}`);
    const a = await chuyenSan(w, { bd: "12:10", kt: "12:40", gio: "12:15" });
    await xepDiKem(w, a.id);
    denGio("12:05");
    const r = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, true, "chống bài rỗng: trong ngày chạy");
    assert.ok(r.json.suat.some((s: any) => s.tenNguoiDiKem), "chống bài rỗng: phản hồi có suất người đi kèm");
    for (const s of r.json.suat) {
      assert.equal("sdtNguoiDiKem" in s, false);
      assert.equal("tenDichVu" in s, false);
    }
    assert.ok(!r.text.includes(SDT_HO_SO));
  } finally {
    tat();
  }
});
