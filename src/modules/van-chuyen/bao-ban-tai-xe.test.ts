// BÁO BẬN CỦA TÀI XẾ ĐỐI TÁC (ADR-0053 D9; kế hoạch A4 T8 — NT-8, NT-11 vế ban-tai-xe; G-A4-10, G-A4-19, G-A4-20, G-A4-28). Khung thử (cả ứng dụng + SQLite
// thật). Đồng hồ giả NOW_GIA được: trigger khung bận (0071, 0092) KHÔNG so giờ CSDL (đã quét `'now'`) và bài không đi đường Từ chối (§2 "Luật đồng hồ").
// Tên, SĐT, số giấy tờ GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, NGAY, NGAY_SAU, SALES, SUP, batDongHo, chuyenSan, denGio, nhaXeKhung, setup, uuid, vnMs, xeNhaXe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const DRIVER_PARTNER2 = "66666666-6666-4666-8666-666666666669";
const AT = "2026-09-01T00:00:00.000Z";
let so = 0;
function laiChoNhaXe(w: any, staffId: string, carrierId: string) {
  so++;
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${staffId}`, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-bb-${so}`, `pty-${staffId}`, `79550000000${so}`, `79550000000${so}`, AT, AT);
}
function theGioi() {
  const w = setup();
  seedStaff(w.sqlite, { id: DRIVER_PARTNER2, phone: "0900000036", name: "Tài Xế Đối Tác Hai", perms: ["DRIVER_PARTNER"] });
  const nx = nhaXeKhung(w, "Nhà xe Một");
  laiChoNhaXe(w, DRIVER_PARTNER, nx);
  laiChoNhaXe(w, DRIVER_PARTNER2, nx);
  return { w, nx, xe1: xeNhaXe(w, nx) };
}
const ghi = (w: any, as: string, batDau: [string, string], ketThuc: [string, string], lyDo = "BTX_OM") =>
  w.call("POST", "/api/van-chuyen/ban", { as, body: { batDau: { ngay: batDau[0], gio: batDau[1] }, ketThuc: { ngay: ketThuc[0], gio: ketThuc[1] }, lyDo } });
const cuaToi = (w: any, as = DRIVER_PARTNER) => w.call("GET", "/api/van-chuyen/ban/cua-toi", { as });
const rut = (w: any, id: string, version: number, as = DRIVER_PARTNER) => w.call("POST", `/api/van-chuyen/ban/${id}/rut`, { as, body: { version } });
const nhatKy = (w: any) => w.q("SELECT action, detail, staff_id FROM audit_log WHERE action LIKE 'driver_unavailability_%' ORDER BY rowid");

test("A4 T8 NT-8: tài xế đối tác ghi khung bận → 201 + Location /ban; GET của tôi có khung (kèm nhãn lý do của CHÍNH mình); nhật ký chỉ khoảng giờ (không lý do); không cần requestId; danh mục lý do = nhóm BAN_TAI_XE", async () => {
  const tat = batDongHo();
  try {
    const { w } = theGioi();
    const r = await ghi(w, DRIVER_PARTNER, [NGAY_SAU, "08:00"], [NGAY_SAU, "17:00"]);
    assert.equal(r.status, 201, r.text);
    assert.equal(r.headers.get("location"), "/ban");
    assert.equal(r.json.khung.length, 1);
    const k = r.json.khung[0];
    assert.equal(k.batDauMs, vnMs(NGAY_SAU, "08:00"));
    assert.equal(k.ketThucMs, vnMs(NGAY_SAU, "17:00"));
    assert.equal(k.lyDo, "Ốm");
    assert.equal(k.version, 1);
    assert.deepEqual(r.json.lyDo.map((l: any) => l.code).sort(), ["BTX_KHAC", "BTX_OM", "BTX_VIEC_RIENG"]);
    const g = await cuaToi(w);
    assert.equal(g.status, 200, g.text);
    assert.deepEqual(g.json.khung.map((x: any) => x.id), [k.id]);
    const row = w.q("SELECT subject, driver_party_id, vehicle_id, reason_code, created_by FROM vc_unavailability WHERE id = ?", k.id)[0];
    assert.deepEqual({ ...row }, { subject: "DRIVER", driver_party_id: `pty-${DRIVER_PARTNER}`, vehicle_id: null, reason_code: "BTX_OM", created_by: DRIVER_PARTNER });
    const nk = nhatKy(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0].action, "driver_unavailability_added");
    assert.equal(nk[0].staff_id, DRIVER_PARTNER);
    assert.match(nk[0].detail, /08:00 12\/03 → 17:00 12\/03/);
    assert.doesNotMatch(nk[0].detail, /Ốm|BTX_|Tài Xế|0900|\d{8,}/, "G-A4-20: chỉ khoảng giờ — không lý do, không tên, không số");
    // Tài xế khác không thấy khung của người này.
    assert.deepEqual((await cuaToi(w, DRIVER_PARTNER2)).json.khung, []);
  } finally {
    tat();
  }
});

test("A4 T8 NT-8 kiểm thân (G-A4-10): quá 14 ngày, bắt đầu trước đầu phút hiện tại, kết thúc ≤ bắt đầu, lý do thiếu / nhóm xe / không có → 400; bắt đầu ĐÚNG phút hiện tại → 201; 14 ngày đúng → 201", async () => {
  const tat = batDongHo(); // 06:00 ngày NGAY
  try {
    const { w } = theGioi();
    const bad: [[string, string], [string, string], string?][] = [
      [[NGAY, "07:00"], ["2027-03-25", "07:01"]], // 14 ngày + 1 phút
      [[NGAY, "05:59"], [NGAY, "09:00"]], // trước đầu phút hiện tại
      [[NGAY, "09:00"], [NGAY, "09:00"]],
      [[NGAY, "09:00"], [NGAY, "08:00"]],
      [[NGAY, "09:00"], [NGAY, "10:00"], "BAN_XE_BAO_DUONG"],
      [[NGAY, "09:00"], [NGAY, "10:00"], "BTX_KHONG_CO"],
      [[NGAY, "09:00"], [NGAY, "10:00"], ""],
    ];
    for (const [a, b, l] of bad) {
      const r = await ghi(w, DRIVER_PARTNER, a, b, l ?? "BTX_OM");
      assert.equal(r.status, 400, `${JSON.stringify([a, b, l])}: ${r.text}`);
      assert.doesNotMatch(r.json.error.message, /xe bận|xe nằm xưởng/, "câu của tài xế, không câu của xe");
    }
    assert.equal((await ghi(w, DRIVER_PARTNER, [NGAY, "06:00"], [NGAY, "07:00"])).status, 201, "bắt đầu đúng phút hiện tại");
    assert.equal((await ghi(w, DRIVER_PARTNER, [NGAY, "08:00"], ["2027-03-25", "08:00"])).status, 201, "đúng 14 ngày");
    assert.equal(nhatKy(w).length, 2);
  } finally {
    tat();
  }
});

test("A4 T8 NT-8 chồng chuyến: khung chồng chuyến tài xế đang được xếp → 409 khung_ban_chong_chuyen_tai_xe kèm chuyen {id, ma, gio} của CHÍNH người gọi; chuyến người khác cùng giờ không chặn; SQL chèn thẳng → RAISE; văn phòng xếp tài xế đối tác vào khung bận → 409 TRUNG_GIO_TAI_XE không lý do", async () => {
  const tat = batDongHo();
  try {
    const { w, xe1 } = theGioi();
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay: NGAY_SAU, bd: "12:30", kt: "15:00", gio: "13:00" });
    await chuyenSan(w, { taiXe: DRIVER_PARTNER2, xe: xeNhaXe(w, w.q("SELECT owner_party_id o FROM vc_vehicle WHERE id = ?", xe1)[0].o), ngay: NGAY_SAU, bd: "08:00", kt: "10:00", gio: "08:30" });
    const r = await ghi(w, DRIVER_PARTNER, [NGAY_SAU, "14:00"], [NGAY_SAU, "18:00"]);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "khung_ban_chong_chuyen_tai_xe");
    assert.deepEqual(r.json.error.chuyen.map((c: any) => [c.id, c.ma]), [[a.id, a.ma]]);
    assert.match(r.json.error.chuyen[0].gio, /12:30 12\/03 → 15:00 12\/03/);
    assert.ok(!r.text.includes(a.don.code), "không mã đơn");
    assert.equal(nhatKy(w).length, 0);
    assert.equal((await ghi(w, DRIVER_PARTNER, [NGAY_SAU, "08:00"], [NGAY_SAU, "10:00"])).status, 201, "chuyến của tài xế khác cùng giờ không chặn");
    assert.throws(() => w.sqlite.prepare(`INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'DRIVER', NULL, ?, ?, ?, ?, ?, 'BTX_OM', ?, NULL, ?, NULL)`).run(uuid(), `pty-${DRIVER_PARTNER}`, vnMs(NGAY_SAU, "14:00"), vnMs(NGAY_SAU, "18:00"),
      new Date(vnMs(NGAY_SAU, "14:00")).toISOString(), new Date(vnMs(NGAY_SAU, "18:00")).toISOString(), AT, AT), /unavailability_overlaps_driver_trip/);
    // Văn phòng xếp tài xế đối tác 2 vào khung bận 08:00–10:00 của tài xế đối tác 1 → 409 TRUNG_GIO_TAI_XE, câu không lý do.
    const c = await w.call("POST", "/api/van-chuyen/chuyen", {
      as: SALES, body: { requestId: uuid(), xeId: xeNhaXe(w, w.q("SELECT owner_party_id o FROM vc_vehicle WHERE id = ?", xe1)[0].o), taiXePartyId: `pty-${DRIVER_PARTNER}`, batDau: { ngay: NGAY_SAU, gio: "09:00" }, ketThuc: { ngay: NGAY_SAU, gio: "09:30" } },
    });
    assert.equal(c.status, 409, c.text);
    assert.ok(c.json.error.lyDo.some((l: any) => l.ma === "TRUNG_GIO_TAI_XE" && /bận từ 08:00 12\/03 đến 10:00 12\/03/.test(l.loiNhan)), c.text);
    assert.doesNotMatch(c.text, /Ốm|BTX_/);
  } finally {
    tat();
  }
});

test("A4 T8 NT-8 rút + IDOR (NT-2): tài xế khác rút / đọc khung của người này → 404; rút đúng phiên bản → 200, nhật ký driver_unavailability_withdrawn (không lý do); rút lần hai → 409; phiên bản cũ → 409; khung đã qua → 409; khung không có → 404", async () => {
  const tat = batDongHo();
  try {
    const { w } = theGioi();
    const k = (await ghi(w, DRIVER_PARTNER, [NGAY_SAU, "08:00"], [NGAY_SAU, "17:00"], "BTX_VIEC_RIENG")).json.khung[0];
    assert.equal((await rut(w, k.id, k.version, DRIVER_PARTNER2)).status, 404, "IDOR");
    assert.equal((await rut(w, uuid(), 1)).status, 404);
    assert.equal((await rut(w, "khong-phai-uuid", 1)).status, 404);
    assert.equal((await rut(w, k.id, 0)).status, 400, "thiếu phiên bản");
    assert.equal((await rut(w, k.id, k.version + 5)).status, 409, "phiên bản cũ / lạ");
    const r = await rut(w, k.id, k.version);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.khung, [], "khung đã rút không còn trong danh sách");
    assert.equal((await rut(w, k.id, k.version + 1)).status, 409, "rút lần hai");
    const nk = nhatKy(w);
    assert.deepEqual(nk.map((x: any) => x.action), ["driver_unavailability_added", "driver_unavailability_withdrawn"]);
    assert.doesNotMatch(nk[1].detail, /Việc riêng|BTX_/);
    // Khung đã qua → 409 (giữ lịch sử).
    const k2 = (await ghi(w, DRIVER_PARTNER, [NGAY, "07:00"], [NGAY, "08:00"])).json.khung[0];
    denGio("08:30");
    const q = await rut(w, k2.id, k2.version);
    assert.equal(q.status, 409, q.text);
    assert.equal(q.json.error.code, "khung_ban_da_qua");
    // Lớp CSDL: sửa giờ / xoá → RAISE.
    assert.throws(() => w.sqlite.prepare("UPDATE vc_unavailability SET start_ms = start_ms + 60000 WHERE id = ?").run(k2.id));
    assert.throws(() => w.sqlite.prepare("DELETE FROM vc_unavailability WHERE id = ?").run(k2.id));
  } finally {
    tat();
  }
});

test("A4 T8 NT-8 + NT-11 cổng: tài xế công ty ghi / đọc / rút khung → 403 (ô unavailability.self none); Kế toán, tài xế đối tác gọi ban-tai-xe → 403; HR → 403 cả hai phía", async () => {
  const tat = batDongHo();
  try {
    const { w } = theGioi();
    const HR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    seedStaff(w.sqlite, { id: HR, phone: "0900000056", name: "Nhân Sự", perms: ["HR"] });
    assert.equal((await cuaToi(w, HR)).status, 403);
    assert.equal((await w.call("GET", "/api/van-chuyen/ban-tai-xe", { as: HR })).status, 403);
    assert.equal((await cuaToi(w, DRIVER)).status, 403);
    assert.equal((await ghi(w, DRIVER, [NGAY_SAU, "08:00"], [NGAY_SAU, "09:00"])).status, 403);
    assert.equal((await rut(w, uuid(), 1, DRIVER)).status, 403);
    for (const as of [SALES, ACC, ADM]) assert.equal((await cuaToi(w, as)).status, 403, `${as} không có ô báo bận của tôi`);
    for (const as of [ACC, DRIVER_PARTNER, DRIVER]) assert.equal((await w.call("GET", "/api/van-chuyen/ban-tai-xe", { as })).status, 403, as);
    // 403 đứng trước 400 (thân rỗng).
    assert.equal((await w.call("POST", "/api/van-chuyen/ban", { as: DRIVER, body: {} })).status, 403);
    assert.equal((await w.call("POST", "/api/van-chuyen/ban", { as: DRIVER_PARTNER, body: {} })).status, 400);
  } finally {
    tat();
  }
});

test("A4 T8 G-A4-19 dải văn phòng: GET ban-tai-xe (trip.dispatch — Bán hàng, Quản trị, Toàn quyền) trả khung của MỌI tài xế từ ngày xem tới +6 ngày — tên, nhà xe, giờ; KHÔNG lý do (khoá lẫn chữ); khung đã rút không có; tham số sai → 400", async () => {
  const tat = batDongHo();
  try {
    const { w } = theGioi();
    const k1 = (await ghi(w, DRIVER_PARTNER, [NGAY_SAU, "08:00"], [NGAY_SAU, "17:00"], "BTX_OM")).json.khung[0];
    await ghi(w, DRIVER_PARTNER2, ["2027-03-17", "08:00"], ["2027-03-17", "09:00"], "BTX_VIEC_RIENG"); // ngày NGAY + 6
    await ghi(w, DRIVER_PARTNER2, ["2027-03-18", "08:00"], ["2027-03-18", "09:00"], "BTX_KHAC"); // ngoài dải
    const k4 = (await ghi(w, DRIVER_PARTNER2, [NGAY_SAU, "18:00"], [NGAY_SAU, "19:00"], "BTX_KHAC")).json.khung[0];
    assert.equal((await rut(w, k4.id, k4.version, DRIVER_PARTNER2)).status, 200);
    for (const as of [SALES, ADM, SUP]) {
      const r = await w.call("GET", `/api/van-chuyen/ban-tai-xe?tu=${NGAY}`, { as });
      assert.equal(r.status, 200, r.text);
      assert.equal(r.json.tu, NGAY);
      assert.equal(r.json.den, "2027-03-17");
      assert.deepEqual(r.json.khung.map((k: any) => [k.tenTaiXe, k.nhaXe, k.batDauMs]), [
        ["Tài Xế Đối Tác", ["Nhà xe Một"], vnMs(NGAY_SAU, "08:00")],
        ["Tài Xế Đối Tác Hai", ["Nhà xe Một"], vnMs("2027-03-17", "08:00")],
      ]);
      assert.equal(r.json.khung[0].taiXeId, `pty-${DRIVER_PARTNER}`);
      assert.equal(r.json.khung[0].id, k1.id);
      for (const k of r.json.khung) assert.deepEqual(Object.keys(k).sort(), ["batDauMs", "id", "ketThucMs", "nhaXe", "nhan", "taiXeId", "tenTaiXe"]);
      assert.doesNotMatch(r.text, /Ốm|Việc riêng|"Khác"|BTX_|lyDo|reason/i, "lời chủ 6.2: văn phòng chỉ thấy 'bận'");
    }
    const mac = await w.call("GET", "/api/van-chuyen/ban-tai-xe", { as: SALES });
    assert.equal(mac.status, 200);
    assert.equal(mac.json.tu, NGAY, "mặc định hôm nay (giờ VN)");
    for (const q of ["?tu=2027-3-11", "?tu=abc", `?tu=${NGAY}&den=2027-03-10`, `?tu=${NGAY}&den=2027-05-11`]) {
      assert.equal((await w.call("GET", `/api/van-chuyen/ban-tai-xe${q}`, { as: SALES })).status, 400, q);
    }
  } finally {
    tat();
  }
});
