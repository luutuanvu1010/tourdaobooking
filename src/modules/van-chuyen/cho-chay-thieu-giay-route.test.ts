// ADR-0184 việc 3 — lệnh «Cho chạy dù thiếu giấy tờ» (POST /api/van-chuyen/chuyen/:id/cho-chay-thieu-giay). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11).
// Kiểm: Quản trị + loại mềm có lý do → 200 và dòng ghi đúng; Quản trị không lý do → 400; Quản trị + Kiểm định / Bảo hiểm → 403 không ghi gì; Toàn quyền → qua, có hay không lý do;
// Bán hàng 403; chuyến đang chạy 409; loại không thiếu 409; cho lại cùng loại 409; gửi lại cùng requestId; ghi chú chỉ khoảng trắng (Trọng tâm 5); nhật ký KHÔNG chứa ghi chú tự do (P5).
// Lớp máy chủ chặn ĐỘC LẬP với lớp CSDL: hai bài gỡ trigger waiver_* của bản thử rồi gọi lại (nếu chỉ còn lưới CSDL thì bài đỏ). Tên, ghi chú GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, SALES, SUP, NGAY, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const AT = "2026-09-01T00:00:00.000Z";
let so = 700;
/** Xe công ty chủ 15 chỗ; `con` = các loại giấy còn hạn. Thêm điều kiện xuất bến cho Đăng ký xe (bản thử chỉ có sẵn Kiểm định + Bảo hiểm). */
function xeCo(w: any, con: string[]): string {
  const id = uuid();
  const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id;
  const bien = `79V${String(++so).padStart(5, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Xe thử cho chạy', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`).run(id, bien, bien, `KHUNGV${so}`, `KHUNGV${so}`, chu, AT, AT);
  for (const loai of con) w.sqlite.prepare("INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, '2030-12-31', ?, ?)").run(uuid(), id, loai, AT, AT);
  return id;
}
function themDieuKienDangKy(w: any): void {
  w.sqlite.prepare(`INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, valid_from_at, created_at, updated_at) VALUES (?, 1, 'VEHICLE', 'REGISTRATION', ?, ?, ?)`).run(uuid(), AT, AT, AT);
}
const DU = ["INSPECTION", "TPL_INSURANCE", "REGISTRATION"];
async function chuyenXe(w: any, con: string[]) {
  const xeId = xeCo(w, con);
  const t = await chuyenSan(w, { xe: xeId });
  return { t, xeId };
}
const choChay = async (w: any, tripId: string, as: string, body: Record<string, unknown>) => {
  const version = body.version ?? (await chiTiet(w, tripId, as)).chuyen.version;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/cho-chay-thieu-giay`, { as, body: { version, requestId: uuid(), lyDo: null, ghiChu: null, ...body } });
};
const dongCho = (w: any, tripId: string) => w.q("SELECT * FROM vc_trip_departure_waiver WHERE trip_id = ? ORDER BY document_type_code", tripId);
const khongGhiGi = (w: any, tripId: string) => {
  assert.equal(dongCho(w, tripId).length, 0, "không dòng cho phép nào");
  assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'DOCS_WAIVED'")[0].n, 0, "không sự kiện");
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_departure_waived'")[0].n, 0, "không nhật ký");
};

test("Quản trị + Đăng ký xe + lý do «Giấy đang gia hạn» + ghi chú → 201; một dòng cho phép đúng chuyến, xe, loại, người; một sự kiện; một nhật ký KHÔNG chứa ghi chú; xuất bến sau đó đạt", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t, xeId } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    denGio("12:40");
    const ghiChu = "Đang chờ cấp lại cà vẹt tại đăng kiểm";
    const r = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_GIA_HAN", ghiChu });
    assert.ok(r.status === 200 || r.status === 201, r.text);
    const d = dongCho(w, t.id);
    assert.equal(d.length, 1);
    assert.equal(d[0].vehicle_id, xeId);
    assert.equal(d[0].document_type_code, "REGISTRATION");
    assert.equal(d[0].reason_code, "THIEU_GIAY_GIA_HAN");
    assert.equal(d[0].note, ghiChu);
    assert.equal(d[0].expiry_date, null);
    assert.equal(d[0].created_by, ADM);
    const ev = w.q("SELECT kind, trip_id FROM vc_trip_event WHERE kind = 'DOCS_WAIVED'");
    assert.equal(ev.length, 1);
    assert.equal(ev[0].trip_id, t.id);
    const nk = w.q("SELECT detail, target_id FROM audit_log WHERE action = 'trip_departure_waived'");
    assert.equal(nk.length, 1);
    assert.equal(nk[0].target_id, t.id);
    assert.match(nk[0].detail, /cho chạy dù thiếu giấy tờ · xe 79V\d+ · Đăng ký xe \(REGISTRATION, hạn chưa có\) · lý do Giấy đang gia hạn · có ghi chú$/);
    assert.doesNotMatch(nk[0].detail, /cà vẹt|đăng kiểm/, "ghi chú tự do không vào nhật ký (P5)");
    assert.equal(r.json.chuyen.id, t.id, "phản hồi là chi tiết chuyến");
    // dòng cho phép được cổng xuất bến dùng
    assert.deepEqual((await chiTiet(w, t.id, ADM)).chuyen.lyDoGiu.map((l: any) => l.ma), []);
    assert.equal((await tienDo(w, "tai-xe", t.id, "xuat-ben")).status, 200);
  } finally {
    tat();
  }
});

test("Quản trị không chọn lý do → 400, không ghi gì (máy chủ chặn)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const r = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"] });
    assert.equal(r.status, 400, r.text);
    assert.match(r.json.error.message, /Chọn lý do/);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("Quản trị chọn lý do ngoài nhóm → 400; chọn «Khác» mà không ghi chú → 400; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const a = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"], lyDo: "DIEU_CHINH_BAM_NHAM" });
    assert.equal(a.status, 400, a.text);
    const b = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_KHAC", ghiChu: "ngắn" });
    assert.equal(b.status, 400, b.text);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("Quản trị + Kiểm định / Bảo hiểm → 403, không ghi gì (kể cả chọn kèm loại mềm)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["TPL_INSURANCE"]); // thiếu Kiểm định + Đăng ký xe
    const a = await choChay(w, t.id, ADM, { loaiGiayTo: ["INSPECTION"], lyDo: "THIEU_GIAY_GIA_HAN" });
    assert.equal(a.status, 403, a.text);
    assert.equal(a.json.error.message, "Thiếu Kiểm định hoặc Bảo hiểm chỉ Toàn quyền cho chạy được.");
    const b = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION", "INSPECTION"], lyDo: "THIEU_GIAY_GIA_HAN" });
    assert.equal(b.status, 403, b.text);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("lớp máy chủ chặn ĐỘC LẬP với CSDL: gỡ trigger quyền / lý do của bản thử → Quản trị vẫn bị 403 (Kiểm định) và 400 (không lý do), không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["TPL_INSURANCE"]);
    w.sqlite.exec("DROP TRIGGER vc_trip_departure_waiver_toan_quyen_only; DROP TRIGGER vc_trip_departure_waiver_reason_required;");
    assert.equal((await choChay(w, t.id, ADM, { loaiGiayTo: ["INSPECTION"], lyDo: "THIEU_GIAY_GIA_HAN" })).status, 403);
    assert.equal((await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"] })).status, 400);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("Toàn quyền + Bảo hiểm, không lý do → 200; dòng ghi không có lý do; nhật ký «không nêu lý do»; hạn = hạn dòng giấy gần nhất khi giấy hết hạn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t, xeId } = await chuyenXe(w, ["INSPECTION"]);
    // Bảo hiểm có nhưng đã hết hạn trước ngày chạy → vẫn là «thiếu», hạn ghi lại để nhãn nói đúng.
    w.sqlite.prepare("INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'TPL_INSURANCE', '2027-03-01', ?, ?)").run(uuid(), xeId, AT, AT);
    const r = await choChay(w, t.id, SUP, { loaiGiayTo: ["TPL_INSURANCE"] });
    assert.ok(r.status === 200 || r.status === 201, r.text);
    const d = dongCho(w, t.id);
    assert.equal(d.length, 1);
    assert.equal(d[0].document_type_code, "TPL_INSURANCE");
    assert.equal(d[0].reason_code, null);
    assert.equal(d[0].expiry_date, "2027-03-01");
    assert.equal(d[0].created_by, SUP);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_departure_waived'")[0].detail as string;
    assert.match(nk, /Bảo hiểm trách nhiệm dân sự \(TPL_INSURANCE, hạn 01\/03\/2027\) · lý do không nêu lý do$/);
  } finally {
    tat();
  }
});

test("Toàn quyền cho cả Kiểm định và Bảo hiểm một lần → hai dòng, MỘT sự kiện, MỘT nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t } = await chuyenXe(w, []);
    const r = await choChay(w, t.id, SUP, { loaiGiayTo: ["INSPECTION", "TPL_INSURANCE"] });
    assert.ok(r.status === 200 || r.status === 201, r.text);
    assert.deepEqual(dongCho(w, t.id).map((d: any) => d.document_type_code), ["INSPECTION", "TPL_INSURANCE"]);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'DOCS_WAIVED'")[0].n, 1);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_departure_waived'")[0].n, 1);
  } finally {
    tat();
  }
});

test("Trọng tâm 5: Toàn quyền gửi ghi chú chỉ khoảng trắng → coi như không ghi chú (200, cột ghi chú trống)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t } = await chuyenXe(w, ["INSPECTION"]);
    const r = await choChay(w, t.id, SUP, { loaiGiayTo: ["TPL_INSURANCE"], ghiChu: "      " });
    assert.ok(r.status === 200 || r.status === 201, r.text);
    assert.equal(dongCho(w, t.id)[0].note, null);
    assert.doesNotMatch(w.q("SELECT detail FROM audit_log WHERE action = 'trip_departure_waived'")[0].detail, /có ghi chú/);
  } finally {
    tat();
  }
});

test("Toàn quyền chọn «Khác» mà không ghi chú → 400 (đã chọn «Khác» thì phải ghi chú)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t } = await chuyenXe(w, ["INSPECTION"]);
    const r = await choChay(w, t.id, SUP, { loaiGiayTo: ["TPL_INSURANCE"], lyDo: "THIEU_GIAY_KHAC" });
    assert.equal(r.status, 400, r.text);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("Bán hàng → 403 dù chọn loại mềm có lý do (chỉ ô trip.override mới qua cổng; CSDL không chặn nên đây là lớp máy chủ), không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const r = await choChay(w, t.id, SALES, { loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_GIA_HAN" });
    assert.equal(r.status, 403, r.text);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("chuyến ĐANG CHẠY → 409; loại xe không thiếu → 409; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t } = await chuyenXe(w, DU);
    const khong = await choChay(w, t.id, SUP, { loaiGiayTo: ["INSPECTION"] });
    assert.equal(khong.status, 409, khong.text);
    assert.equal(khong.json.error.message, "Xe không còn thiếu loại giấy này — tải lại trang.");
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", t.id, "xuat-ben")).status, 200);
    const r = await choChay(w, t.id, SUP, { loaiGiayTo: ["INSPECTION"] });
    assert.equal(r.status, 409, r.text);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});

test("cho lại cùng loại khi dòng chưa dùng → 409 «Chuyến này đã được cho chạy dù thiếu <tên>.»; vẫn một dòng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const a = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_XE_THAY" });
    assert.ok(a.status === 200 || a.status === 201, a.text);
    const b = await choChay(w, t.id, ADM, { loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_XE_THAY" });
    assert.equal(b.status, 409, b.text);
    assert.equal(b.json.error.message, "Chuyến này đã được cho chạy dù thiếu Đăng ký xe.");
    assert.equal(dongCho(w, t.id).length, 1);
  } finally {
    tat();
  }
});

test("gửi lại cùng requestId → trả lại kết quả cũ (200), không ghi thêm dòng, sự kiện, nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const version = (await chiTiet(w, t.id, ADM)).chuyen.version;
    const body = { version, requestId: uuid(), loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_GIA_HAN", ghiChu: null };
    const a = await w.call("POST", `/api/van-chuyen/chuyen/${t.id}/cho-chay-thieu-giay`, { as: ADM, body });
    assert.equal(a.status, 201, a.text);
    const b = await w.call("POST", `/api/van-chuyen/chuyen/${t.id}/cho-chay-thieu-giay`, { as: ADM, body });
    assert.equal(b.status, 200, b.text);
    assert.equal(dongCho(w, t.id).length, 1);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'DOCS_WAIVED'")[0].n, 1);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_departure_waived'")[0].n, 1);
  } finally {
    tat();
  }
});

test("phiên bản chuyến cũ → 409 (cổng version), không ghi gì; thân sai (không loại giấy, mã lạ) → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themDieuKienDangKy(w);
    const { t } = await chuyenXe(w, ["INSPECTION", "TPL_INSURANCE"]);
    const cu = await choChay(w, t.id, ADM, { version: 1, loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_GIA_HAN" });
    assert.equal(cu.status, 409, cu.text);
    assert.equal((await choChay(w, t.id, ADM, { loaiGiayTo: [] })).status, 400);
    assert.equal((await choChay(w, t.id, ADM, { loaiGiayTo: ["registration; DROP"] })).status, 400);
    khongGhiGi(w, t.id);
  } finally {
    tat();
  }
});
