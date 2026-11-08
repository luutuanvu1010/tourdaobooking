// ADR-0184 việc 2 — cổng xuất bến dùng «dòng cho phép chạy thiếu giấy tờ». Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 — tests/audit/dieu-phoi-khung.mjs).
// Dòng cho phép chèn THẲNG vào bảng (lệnh «Cho chạy dù thiếu giấy tờ» là việc 3). Xe thử thiếu đúng MỘT loại giấy (Kiểm định) — khung thử `xe()` gieo đủ hai loại nên tự dựng xe.
// Kiểm: thiếu + không cho phép → giữ; có cho phép → qua, dòng con trỏ dòng cho phép, nhật ký nêu loại; thu hồi rồi xuất bến lại → giữ (Trọng tâm 2); giấy gia hạn → qua như thường (Trọng tâm 4);
// màn văn phòng (chi tiết chuyến, lịch chung) và cổng thật cho CÙNG kết quả. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, SALES, SUP, NGAY, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const AT = "2026-09-01T00:00:00.000Z";
let so = 900;
/** Xe công ty chủ 15 chỗ, chỉ có Bảo hiểm còn hạn — THIẾU Kiểm định. */
function xeThieuKiemDinh(w: any): string {
  const id = uuid();
  const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id;
  const bien = `79T${String(++so).padStart(5, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Xe thử thiếu giấy', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`).run(id, bien, bien, `KHUNGT${so}`, `KHUNGT${so}`, chu, AT, AT);
  w.sqlite.prepare("INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'TPL_INSURANCE', '2030-12-31', ?, ?)").run(uuid(), id, AT, AT);
  return id;
}
/** Chèn thẳng một dòng cho phép (người ghi = Toàn quyền, không lý do). Trả id. */
function choPhep(w: any, tripId: string, xeId: string, loai = "INSPECTION"): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO vc_trip_departure_waiver (id, trip_id, cmd_id, vehicle_id, document_type_code, expiry_date, reason_code, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?)`).run(id, tripId, uuid(), xeId, loai, AT, SUP, AT, SUP);
  return id;
}
async function chuyenThieu(w: any) {
  const xeId = xeThieuKiemDinh(w);
  const t = await chuyenSan(w, { xe: xeId });
  return { t, xeId };
}
const lyDoMa = async (w: any, tripId: string): Promise<string[]> => (await chiTiet(w, tripId, ADM)).chuyen.lyDoGiu.map((l: any) => l.ma);
const lichGiu = async (w: any, tripId: string): Promise<string[]> => {
  const r = await w.call("GET", `/api/van-chuyen/lich?tuNgay=${NGAY}&denNgay=${NGAY}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  const c = r.json.chuyen.find((x: any) => x.id === tripId);
  assert.ok(c, "chuyến có trong lịch chung");
  return c.lyDoGiu.map((l: any) => l.ma);
};

test("thiếu Kiểm định, chưa ai cho phép → màn và cổng đều GIỮ DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN (Toàn quyền xử lý); tài xế bấm xuất bến 409, không ghi bản chụp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t } = await chuyenThieu(w);
    denGio("12:40");
    assert.deepEqual(await lyDoMa(w, t.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"]);
    assert.deepEqual(await lichGiu(w, t.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"]);
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.deepEqual(x.json.error.lyDo.map((l: any) => [l.ma, l.aiXuLy]), [["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN", "TOAN_QUYEN"]]);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check WHERE trip_id = ?", t.id)[0].n, 0);
  } finally {
    tat();
  }
});

test("có dòng cho phép đúng xe → màn và cổng cùng ĐẠT; xuất bến 200; dòng con DIEU_KIEN trỏ dòng cho phép; bản chụp vẫn ĐẠT; nhật ký nêu «cho chạy dù thiếu Kiểm định»", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t, xeId } = await chuyenThieu(w);
    const wid = choPhep(w, t.id, xeId);
    denGio("12:40");
    assert.deepEqual(await lyDoMa(w, t.id), [], "chi tiết chuyến không còn giữ");
    assert.deepEqual(await lichGiu(w, t.id), [], "lịch chung không còn giữ (một luật)");
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", t.id)[0].s, "RUNNING");
    const ck = w.q("SELECT id, ket_qua FROM vc_trip_departure_check WHERE trip_id = ?", t.id);
    assert.equal(ck.length, 1);
    assert.equal(ck[0].ket_qua, "DAT");
    const dk = w.q("SELECT document_type_code d, waiver_id w, item_kind k FROM vc_trip_departure_check_item WHERE check_id = ? AND item_kind = 'DIEU_KIEN'", ck[0].id);
    assert.deepEqual(dk.map((r: any) => [r.d, r.w]), [["INSPECTION", wid]]);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_departed' ORDER BY rowid DESC LIMIT 1")[0].detail as string;
    assert.match(nk, /cho chạy dù thiếu Kiểm định/);
    assert.doesNotMatch(nk, /INSPECTION/, "nêu tên loại giấy, không mã");
  } finally {
    tat();
  }
});

test("Trọng tâm 2: thu hồi xuất bến rồi xuất bến lại, giấy vẫn thiếu → GIỮ lại (dòng cho phép đã dùng, không hiện lại); màn và cổng cùng kết quả", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t, xeId } = await chuyenThieu(w);
    choPhep(w, t.id, xeId);
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", t.id, "xuat-ben")).status, 200);
    const version = (await chiTiet(w, t.id, ADM)).chuyen.version;
    const th = await w.call("POST", `/api/van-chuyen/chuyen/${t.id}/thu-hoi-xuat-ben`, { as: SALES, body: { version, requestId: uuid(), lyDo: "DIEU_CHINH_BAM_NHAM" } });
    assert.ok(th.status === 200 || th.status === 201, th.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", t.id)[0].s, "PLANNED");
    assert.deepEqual(await lyDoMa(w, t.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"]);
    assert.deepEqual(await lichGiu(w, t.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"]);
    const lai = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(lai.status, 409, lai.text);
    assert.deepEqual(lai.json.error.lyDo.map((l: any) => l.ma), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"]);
  } finally {
    tat();
  }
});

test("Trọng tâm 4: có dòng cho phép nhưng Kiểm định được gia hạn trước giờ chạy → xuất bến như thường, dòng con không trỏ dòng cho phép, nhật ký không có «cho chạy dù thiếu»", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t, xeId } = await chuyenThieu(w);
    choPhep(w, t.id, xeId);
    w.sqlite.prepare("INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'INSPECTION', '2030-12-31', ?, ?)").run(uuid(), xeId, AT, AT);
    denGio("12:40");
    assert.deepEqual(await lyDoMa(w, t.id), []);
    const x = await tienDo(w, "tai-xe", t.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check_item WHERE waiver_id IS NOT NULL")[0].n, 0);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_departed' ORDER BY rowid DESC LIMIT 1")[0].detail as string;
    assert.doesNotMatch(nk, /cho chạy dù thiếu/);
  } finally {
    tat();
  }
});

test("văn phòng bấm thay xuất bến đi CÙNG cổng với tài xế: có dòng cho phép → 200, dòng con trỏ dòng cho phép", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { t, xeId } = await chuyenThieu(w);
    choPhep(w, t.id, xeId);
    denGio("12:40");
    const x = await tienDo(w, "van-phong", t.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check_item WHERE waiver_id IS NOT NULL")[0].n, 1);
  } finally {
    tat();
  }
});

test("T1 (đợt sửa 1): hai chuyến CÙNG XE thiếu Kiểm định — cho phép chuyến 1 KHÔNG mở chuyến 2: màn (chi tiết, lịch chung) vẫn giữ, xuất bến chuyến 2 → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const xeId = xeThieuKiemDinh(w);
    const t1 = await chuyenSan(w, { xe: xeId });
    const t2 = await chuyenSan(w, { xe: xeId, bd: "15:30", kt: "17:00", gio: "16:00" });
    choPhep(w, t1.id, xeId); // Toàn quyền cho phép CHUYẾN 1
    denGio("15:20");
    assert.deepEqual(await lyDoMa(w, t1.id), [], "chuyến 1 đã được cho phép");
    assert.deepEqual(await lyDoMa(w, t2.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"], "chi tiết chuyến 2 vẫn giữ");
    assert.deepEqual(await lichGiu(w, t2.id), ["DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN"], "lịch chung chuyến 2 vẫn giữ");
    const x = await tienDo(w, "tai-xe", t2.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", t2.id)[0].s, "PLANNED");
  } finally {
    tat();
  }
});

test("L3 (đợt sửa 1): cho phép Đăng ký xe cho xe X, ĐỔI sang xe Y (cũng thiếu Đăng ký xe) bằng route đổi chuyến thật → xuất bến bằng route thật bị 409, không nhãn vàng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    w.sqlite.prepare(`INSERT INTO vc_departure_rule (id, min_capacity, subject, vehicle_document_type_code, valid_from_at, created_at, updated_at) VALUES (?, 1, 'VEHICLE', 'REGISTRATION', ?, ?, ?)`).run(uuid(), AT, AT, AT);
    const xeDu2 = (): string => {
      const id = xeThieuKiemDinh(w); // chỉ có Bảo hiểm
      w.sqlite.prepare("INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, 'INSPECTION', '2030-12-31', ?, ?)").run(uuid(), id, AT, AT);
      return id; // Bảo hiểm + Kiểm định, thiếu Đăng ký xe
    };
    const xeX = xeDu2();
    const xeY = xeDu2();
    const t = await chuyenSan(w, { xe: xeX }); // đổi xe làm TRƯỚC khi vào vùng mốc 6 giờ (không cần điều chỉnh khẩn cấp)
    const cho = await w.call("POST", `/api/van-chuyen/chuyen/${t.id}/cho-chay-thieu-giay`, {
      as: ADM, body: { version: (await chiTiet(w, t.id, ADM)).chuyen.version, requestId: uuid(), loaiGiayTo: ["REGISTRATION"], lyDo: "THIEU_GIAY_GIA_HAN", ghiChu: null },
    });
    assert.ok(cho.status === 200 || cho.status === 201, cho.text);
    assert.deepEqual((await chiTiet(w, t.id, ADM)).chuyen.choChayThieu, [{ ten: "Đăng ký xe" }], "xe X: có nhãn vàng");
    const doi = await w.call("PUT", `/api/van-chuyen/chuyen/${t.id}`, { as: SALES, body: { version: (await chiTiet(w, t.id, ADM)).chuyen.version, requestId: uuid(), xeId: xeY } });
    assert.equal(doi.status, 200, doi.text);
    denGio("12:40");
    const sau = (await chiTiet(w, t.id, ADM)).chuyen;
    assert.deepEqual(sau.choChayThieu, [], "xe Y: không nhãn vàng");
    assert.deepEqual(sau.lyDoGiu.map((l: any) => l.ma), ["DIEU_KIEN_GIAY_TO_XE"], "xe Y bị giữ vì thiếu Đăng ký xe");
    const x = await tienDo(w, "van-phong", t.id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", t.id)[0].s, "PLANNED");
  } finally {
    tat();
  }
});
