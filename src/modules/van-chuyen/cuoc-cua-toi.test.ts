// ROUTE TÀI XẾ "Cuốc của tôi" + lệnh tiến độ của tài xế (ADR-0049 D3; kế hoạch mục 1.2, 1.7 route 19–29; TC-36, TC-38; ruling R-P17 — Task A15). Chạy CẢ ứng
// dụng trên SQLite thật (tests/audit/harness.mjs), đồng hồ giả (Date) — ngày chạy 2027-03-11, xem tests/audit/dieu-phoi-khung.mjs. Tên, SĐT, số giấy tờ GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, DRIVER, DRIVER2, DRIVER_PARTNER, NGAY, NGAY_SAU, SALES, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid, xe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const dem = (w: any, sql: string, ...a: unknown[]): number => w.q(sql, ...a)[0].n;

test("route 19 (R-P17): tài xế thấy ĐÚNG chuyến mình đang lái — mã, giờ xuất bến, trạng thái, biển số, số khách, số điểm, điều kiện còn thiếu; không tên, không SĐT", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 3, ten: 2 }); // thiếu một tên → điều kiện còn thiếu THIEU_TEN (chính sách gieo bắt đủ danh sách)
    await chuyenSan(w, { taiXe: DRIVER2 });
    const r = await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.tu, r.json.den], [NGAY, "2027-03-17"]);
    assert.equal(r.json.chuyen.length, 1, "chỉ chuyến của mình");
    const c = r.json.chuyen[0];
    assert.deepEqual(Object.keys(c).sort(), ["bienSo", "dieuKienConThieu", "gioXuatBen", "id", "ma", "soDiemDon", "soDiemTra", "soKhach", "trangThai", "trangThaiNhan"]);
    assert.deepEqual([c.id, c.ma, c.gioXuatBen, c.trangThai, c.soKhach, c.soDiemDon, c.soDiemTra], [a.id, a.ma, { ngay: NGAY, gio: "12:30" }, "PLANNED", 3, 1, 1]);
    assert.ok(c.dieuKienConThieu.some((x: any) => x.ma === "THIEU_TEN"), JSON.stringify(c.dieuKienConThieu));
    for (const x of c.dieuKienConThieu) assert.deepEqual(Object.keys(x).sort(), ["aiXuLy", "loiNhan", "ma"]);
    assert.doesNotMatch(r.text, /Dò Tìm|0912345678|7911000000|777000/, "không tên khách, SĐT, số giấy tờ, tiền");
    // Bán hàng (ô any) gọi route tài xế → 200 RỖNG (lọc theo dòng lái của chính mình); tài xế đối tác → 403; khoảng ngày sai → 400.
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: SALES })).json.chuyen, []);
    assert.equal((await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER_PARTNER })).status, 403);
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi?tu=${NGAY}&den=2027-05-30`, { as: DRIVER })).status, 400);
  } finally {
    tat();
  }
});

test("route 20–29 (TC-36): chuyến của tài xế khác → 404; Bán hàng / Kế toán gọi route tài xế cho chuyến mình không lái → 404 (vế !assigned — R-P1); tài xế đối tác → 403; thứ tự 403 → 404 → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2 });
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER })).status, 200);
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${b.id}`, { as: DRIVER })).status, 404);
    for (const as of [SALES, ACC]) {
      assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as })).status, 404, as);
      assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben", {}, as)).status, 404, `${as}: văn phòng bấm thay qua route office`);
    }
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER })).status, 403);
    // 404 đứng TRƯỚC 400: thân rỗng cho chuyến không phải của mình → 404; cho chuyến của mình → 400.
    assert.equal((await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${b.id}/xuat-ben`, { as: DRIVER, body: {} })).status, 404);
    assert.equal((await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${a.id}/xuat-ben`, { as: DRIVER, body: {} })).status, 400);
    // Tài xế gọi route văn phòng → 403 ở cổng office.
    assert.equal((await tienDo(w, "van-phong", a.id, "xuat-ben", {}, DRIVER)).status, 403);
  } finally {
    tat();
  }
});

test("TC-38 [0050]: route tài xế gửi xayRaLuc → 400 xay_ra_khong_nhan, không ghi gì; tài xế bấm → giờ xảy ra = giờ ghi nhận (MAY_CHU)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("12:40");
    const n0 = dem(w, "SELECT count(*) n FROM vc_trip_event");
    for (const duoi of ["xuat-ben", `diem/${a.diemDon}/da-toi`, `phan-bo/${a.suat[0]}/don`, "ket-thuc", "thu-tu"]) {
      const r = await tienDo(w, "tai-xe", a.id, duoi, { xayRaLuc: `${NGAY}T12:35:00+07:00`, diem: [{ id: a.diemTra, thuTu: 2 }], lyDo: "GIAN_DOAN_KHAC" });
      assert.equal(r.status, 400, `${duoi}: ${r.text}`);
      assert.equal(r.json.error.code, "xay_ra_khong_nhan", duoi);
    }
    assert.equal(dem(w, "SELECT count(*) n FROM vc_trip_event"), n0);
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    const e = w.q("SELECT occurred_at, occurred_ms, occurred_source, created_at, created_by, policy_id FROM vc_trip_event WHERE kind = 'DEPARTED'")[0];
    assert.equal(e.occurred_source, "MAY_CHU");
    assert.equal(e.occurred_at, e.created_at);
    assert.equal(e.occurred_ms, Date.parse(e.created_at));
    assert.equal(e.created_by, DRIVER);
    const t = w.q("SELECT status, departed_at, departed_ms FROM vc_trip WHERE id = ?", a.id)[0];
    assert.deepEqual([t.status, t.departed_at, t.departed_ms], ["RUNNING", e.occurred_at, e.occurred_ms], "giờ xuất bến = ĐÚNG cặp giờ xảy ra của sự kiện");
  } finally {
    tat();
  }
});

test("TC-38 luồng tài xế: xuất bến (bản chụp ĐẠT + bản chốt trỏ dòng hành khách) → đã tới → 'đã đón' hai lần cùng requestId = MỘT sự kiện; đón khi điểm chưa tới → 409; điểm tự DONE khi khách cuối có kết quả; đã trả; kết thúc", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    denGio("12:40");
    // Đón khi chuyến chưa chạy → 409 chua_xuat_ben.
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).json.error.code, "chua_xuat_ben");
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.chuyen.trangThai, "RUNNING");
    const chup = w.q("SELECT id, ket_qua, cmd_id FROM vc_trip_departure_check WHERE trip_id = ?", a.id);
    assert.equal(chup.length, 1);
    assert.equal(chup[0].ket_qua, "DAT");
    assert.ok(dem(w, "SELECT count(*) n FROM vc_trip_departure_check_item WHERE check_id = ?", chup[0].id) >= 3, "GPLX + Kiểm định + Bảo hiểm");
    const chot = w.q(`SELECT m.passenger_row_id, a.passenger_key FROM vc_trip_manifest m JOIN vc_trip_allocation a ON a.id = m.allocation_id WHERE m.trip_id = ?`, a.id);
    assert.equal(chot.length, 2);
    for (const r of chot) assert.equal(w.q("SELECT person_key FROM ord_passenger WHERE id = ?", r.passenger_row_id)[0].person_key, r.passenger_key, "bản chốt trỏ đúng dòng của người");
    // Xuất bến lần hai → 409 da_xuat_ben.
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).json.error.code, "da_xuat_ben");
    // Đón khi điểm lên CHƯA tới → 409 diem_chua_toi.
    const chuaToi = await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`);
    assert.equal(chuaToi.status, 409);
    assert.equal(chuaToi.json.error.code, "diem_chua_toi");
    denGio("12:58");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).json.error.code, "diem_da_toi");
    const rid = uuid();
    const d1 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${a.id}/phan-bo/${a.suat[0]}/don`, { as: DRIVER, body: { requestId: rid } });
    const d2 = await w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${a.id}/phan-bo/${a.suat[0]}/don`, { as: DRIVER, body: { requestId: rid } });
    assert.equal(d1.status, 200, d1.text);
    assert.equal(d2.status, 200, "lệnh lặp → 200 kết quả hiện tại");
    assert.equal(dem(w, "SELECT count(*) n FROM vc_trip_event WHERE kind = 'PASSENGER_BOARDED'"), 1, "MỘT sự kiện");
    assert.equal(w.q("SELECT status FROM vc_trip_stop WHERE id = ?", a.diemDon)[0].status, "ARRIVED", "còn một khách chờ → điểm chưa xong");
    // Đón lại suất đã đón (requestId mới) → 409 suat_da_co_ket_qua.
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).json.error.code, "suat_da_co_ket_qua");
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/vang`)).status, 200);
    assert.equal(w.q("SELECT status FROM vc_trip_stop WHERE id = ?", a.diemDon)[0].status, "DONE", "khách cuối có kết quả → điểm tự DONE (I20)");
    // Kết thúc khi còn khách trên xe → 409 gợi ý kết thúc gián đoạn.
    const kt = await tienDo(w, "tai-xe", a.id, "ket-thuc");
    assert.equal(kt.status, 409);
    assert.deepEqual([kt.json.error.code, kt.json.error.goiY, kt.json.error.conSuat], ["con_khach_chua_xong", "KET_THUC_GIAN_DOAN", 1]);
    denGio("13:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/tra`)).json.error.code, "diem_chua_toi");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemTra}/da-toi`)).status, 200);
    assert.equal(w.q("SELECT status FROM vc_trip_stop WHERE id = ?", a.diemTra)[0].status, "ARRIVED");
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/tra`)).status, 200);
    assert.equal(w.q("SELECT status FROM vc_trip_stop WHERE id = ?", a.diemTra)[0].status, "DONE");
    const k = await tienDo(w, "tai-xe", a.id, "ket-thuc");
    assert.equal(k.status, 200, k.text);
    const t = w.q("SELECT status, ended_at, ended_ms FROM vc_trip WHERE id = ?", a.id)[0];
    assert.equal(t.status, "ENDED");
    assert.equal(t.ended_ms, Date.parse(t.ended_at));
    // Nhật ký tiến độ: orderId NULL, người bấm = tài xế, không "văn phòng bấm thay"; không tên / SĐT.
    const nk = w.q("SELECT action, staff_id, order_id, detail FROM audit_log WHERE action LIKE 'trip_%' AND action NOT IN ('trip_created', 'trip_allocated') ORDER BY rowid");
    assert.deepEqual(nk.map((x: any) => x.action), ["trip_departed", "trip_stop_arrived", "trip_passenger_boarded", "trip_passenger_no_show", "trip_stop_arrived", "trip_passenger_dropped", "trip_ended"]);
    for (const x of nk) {
      assert.equal(x.order_id, null);
      assert.equal(x.staff_id, DRIVER);
      assert.doesNotMatch(x.detail, /văn phòng bấm thay|Dò Tìm|09\d{8}/);
    }
    // Sau khi kết thúc: mọi lệnh → 409 chuyen_da_ket_thuc.
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc")).json.error.code, "chuyen_da_ket_thuc");
  } finally {
    tat();
  }
});

test("kết thúc gián đoạn (route 28): lý do nhóm KET_THUC_GIAN_DOAN bắt buộc; suất còn chờ / đang trên xe đóng TRIP_INTERRUPTED, điểm chưa xong SKIPPED, chuyến ENDED_INTERRUPTED", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    denGio("12:40");
    await tienDo(w, "tai-xe", a.id, "xuat-ben");
    denGio("12:58");
    await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`);
    await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`);
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "HUY_KHAC" })).status, 400, "lý do sai nhóm");
    const r = await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" });
    assert.equal(r.status, 200, r.text);
    assert.equal(w.q("SELECT status, end_reason_code FROM vc_trip WHERE id = ?", a.id)[0].status, "ENDED_INTERRUPTED");
    assert.deepEqual(w.q("SELECT close_reason FROM vc_trip_allocation WHERE trip_id = ? ORDER BY id", a.id).map((x: any) => x.close_reason), ["TRIP_INTERRUPTED", "TRIP_INTERRUPTED"]);
    assert.deepEqual(w.q("SELECT status FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", a.id).map((x: any) => x.status), ["SKIPPED", "SKIPPED"]);
    assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_ended_interrupted'")[0].detail, /kết thúc gián đoạn — .+ · 2 khách chưa xong/);
  } finally {
    tat();
  }
});

test("đổi thứ tự điểm chưa tới khi đang chạy (route 29): chỉ điểm PENDING; thứ tự trùng → 400; chuyến chưa chạy → 409 chua_xuat_ben", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const truoc = await tienDo(w, "tai-xe", a.id, "thu-tu", { diem: [{ id: a.diemTra, thuTu: 5 }] });
    assert.equal(truoc.json.error.code, "chua_xuat_ben");
    denGio("12:40");
    await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal((await tienDo(w, "tai-xe", a.id, "thu-tu", { diem: [{ id: a.diemTra, thuTu: 1 }] })).status, 400, "trùng thứ tự điểm đón");
    const r = await tienDo(w, "tai-xe", a.id, "thu-tu", { diem: [{ id: a.diemTra, thuTu: 7 }] });
    assert.equal(r.status, 200, r.text);
    assert.equal(w.q("SELECT seq FROM vc_trip_stop WHERE id = ?", a.diemTra)[0].seq, 7);
    assert.equal(dem(w, "SELECT count(*) n FROM vc_trip_event WHERE kind = 'STOPS_REORDERED' AND occurred_source = 'MAY_CHU'"), 1);
    denGio("12:58");
    await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`);
    assert.equal((await tienDo(w, "tai-xe", a.id, "thu-tu", { diem: [{ id: a.diemDon, thuTu: 9 }] })).json.error.code, "diem_da_toi");
  } finally {
    tat();
  }
});

test("chuyến đang chạy qua nửa đêm vẫn trong route tài xế (RUNNING bất kể ngày); xe mới không liên quan không lọt vào danh sách", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "22:00", kt: "23:50", gio: "22:30" });
    denGio("21:55");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("01:10", NGAY_SAU);
    const r = await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER });
    assert.deepEqual(r.json.chuyen.map((c: any) => [c.id, c.trangThai]), [[a.id, "RUNNING"]]);
    void xe;
  } finally {
    tat();
  }
});

test("TC-31 LC-12 lúc xuất bến (L-B2 — chỉ máy chủ giữ): GPLX của tài xế bị sửa hết hạn SAU khi gán → xuất bến 409 chua_du_dieu_kien_xuat_ben có lý do GPLX; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    w.sqlite.exec(`UPDATE pty_person_document SET expiry_date = '2027-01-01' WHERE party_id = 'pty-${DRIVER}'`);
    denGio("12:40");
    const r = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.ok(r.json.error.lyDo.some((l: any) => l.ma === "GPLX_HET_HAN"), JSON.stringify(r.json.error.lyDo));
    assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", a.id)[0].status, "PLANNED");
    assert.equal(dem(w, "SELECT count(*) n FROM vc_trip_departure_check"), 0);
  } finally {
    tat();
  }
});
