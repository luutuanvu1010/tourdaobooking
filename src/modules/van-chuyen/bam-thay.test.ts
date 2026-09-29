// VĂN PHÒNG BẤM THAY (ADR-0049 D3; R-P1 — route 31–39 cổng office; ADR-0050 VK1-A — khai giờ xảy ra; ruling R-P14 — Task A15; TC-38 ý cuối, TC-47). Chạy CẢ
// ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 — tests/audit/dieu-phoi-khung.mjs). Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, NGAY, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, vnMs, xe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

const LENH_VP = ["xuat-ben", "diem/x/da-toi", "phan-bo/x/don", "phan-bo/x/vang", "phan-bo/x/khach-huy", "phan-bo/x/tra", "ket-thuc", "ket-thuc-gian-doan", "thu-tu"];

test("route 31–39: Kế toán (trip.progress none) → 403 ĐẦU thân, không ghi; Bán hàng, Quản trị, Toàn quyền qua cổng + ô (lỗi sau đó là của lệnh, không phải 403)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    for (const d of LENH_VP) {
      const r = await tienDo(w, "van-phong", a.id, d, {}, ACC);
      assert.equal(r.status, 403, `${d}: ${r.text}`);
      assert.match(r.json.error.message, /không bấm thay/);
    }
    for (const as of [SALES, ADM, SUP]) {
      const r = await tienDo(w, "van-phong", a.id, "ket-thuc", {}, as);
      assert.equal(r.status, 409, `${as}: ${r.text}`);
      assert.equal(r.json.error.code, "chua_xuat_ben");
    }
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind NOT IN ('CREATED', 'ALLOCATED')")[0].n, 0);
  } finally {
    tat();
  }
});

/** Chạy trọn luồng tiến độ qua MỘT bên (tài xế hoặc văn phòng) — trả ảnh trạng thái (không gồm người bấm / id). */
async function chayLuong(ben: "tai-xe" | "van-phong") {
  const w = setup();
  const a = await chuyenSan(w, { soNguoi: 3 });
  denGio("12:40");
  const buoc: [string, Record<string, unknown>][] = [
    ["xuat-ben", {}], [`diem/${a.diemDon}/da-toi`, {}], [`phan-bo/${a.suat[0]}/don`, {}], [`phan-bo/${a.suat[1]}/vang`, {}], [`phan-bo/${a.suat[2]}/khach-huy`, {}],
    ["thu-tu", { diem: [{ id: a.diemTra, thuTu: 4 }] }], [`diem/${a.diemTra}/da-toi`, {}], [`phan-bo/${a.suat[0]}/tra`, {}], ["ket-thuc", {}],
  ];
  for (const [d, body] of buoc) {
    const r = await tienDo(w, ben, a.id, d, body);
    assert.equal(r.status, 200, `${ben} ${d}: ${r.text}`);
  }
  const anh = {
    chuyen: w.q("SELECT status, departed_at IS NOT NULL AS xb, ended_at IS NOT NULL AS kt FROM vc_trip WHERE id = ?", a.id),
    suat: w.q("SELECT status, valid_to_at IS NULL AS mo FROM vc_trip_allocation WHERE trip_id = ? ORDER BY valid_from_at, id", a.id).map((x: any) => ({ ...x })),
    diem: w.q("SELECT kind, seq, status FROM vc_trip_stop WHERE trip_id = ? ORDER BY kind", a.id).map((x: any) => ({ ...x })),
    suKien: w.q("SELECT kind, occurred_source FROM vc_trip_event WHERE trip_id = ? ORDER BY created_at, rowid", a.id).map((x: any) => ({ ...x })),
    nhatKy: w.q("SELECT action FROM audit_log WHERE target_type = 'trip' ORDER BY rowid").map((x: any) => x.action),
  };
  return { w, a, anh };
}

test("TC-38 ý cuối (R-P1): MỖI lệnh tiến độ qua route văn phòng cho CÙNG kết quả như route tài xế (trạng thái suất / điểm / chuyến, loại sự kiện, hành động nhật ký) — chỉ khác người bấm; nhật ký ghi 'văn phòng bấm thay'", async () => {
  const tat = batDongHo();
  let taiXe: Awaited<ReturnType<typeof chayLuong>>;
  try {
    taiXe = await chayLuong("tai-xe");
  } finally {
    tat();
  }
  const tat2 = batDongHo();
  try {
    const vp = await chayLuong("van-phong");
    assert.deepEqual(vp.anh, taiXe.anh);
    const nguoi = vp.w.q("SELECT DISTINCT created_by FROM vc_trip_event WHERE kind NOT IN ('CREATED', 'ALLOCATED')").map((x: any) => x.created_by);
    assert.deepEqual(nguoi, [SALES], "created_by của sự kiện = người bấm (Bán hàng)");
    const nk = vp.w.q("SELECT detail FROM audit_log WHERE action IN ('trip_departed', 'trip_passenger_boarded', 'trip_ended', 'trip_stops_reordered')");
    for (const x of nk) assert.match(x.detail, /văn phòng bấm thay/);
    const nkTx = taiXe.w.q("SELECT detail FROM audit_log WHERE action = 'trip_departed'")[0].detail;
    assert.doesNotMatch(nkTx, /văn phòng bấm thay/);
  } finally {
    tat2();
  }
});

test("TC-47: Bán hàng bấm thay 'đã đón' kèm xayRaLuc hợp lệ → 200; sự kiện VAN_PHONG_KHAI, giờ xảy ra = giờ khai, giờ ghi nhận = lúc bấm, có chính sách; nhật ký 'xảy ra lúc HH:MM'; chuỗi '+07:00' lưu đúng khuôn toISOString", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("12:40");
    await tienDo(w, "van-phong", a.id, "xuat-ben");
    denGio("12:58");
    await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`);
    denGio("13:10");
    const r = await tienDo(w, "van-phong", a.id, `phan-bo/${a.suat[0]}/don`, { xayRaLuc: `${NGAY}T13:01:00+07:00` });
    assert.equal(r.status, 200, r.text);
    const e = w.q("SELECT occurred_at, occurred_ms, occurred_source, created_at, policy_id FROM vc_trip_event WHERE kind = 'PASSENGER_BOARDED'")[0];
    assert.equal(e.occurred_source, "VAN_PHONG_KHAI");
    assert.equal(e.occurred_at, new Date(vnMs(NGAY, "13:01")).toISOString(), "khuôn toISOString (không lưu chuỗi của trình duyệt)");
    assert.equal(e.occurred_ms, vnMs(NGAY, "13:01"));
    assert.equal(e.created_at, new Date(vnMs(NGAY, "13:10")).toISOString());
    assert.ok(e.policy_id);
    assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_passenger_boarded'")[0].detail, /văn phòng bấm thay · xảy ra lúc 13:01/);
    // DTO (R-P11): mốc đã đón có vanPhongKhai + nguoiBam là TÊN (chuỗi); ở cả chi tiết văn phòng lẫn DTO tài xế.
    const ct = await chiTiet(w, a.id);
    const s = ct.suat.find((x: any) => x.id === a.suat[0]);
    assert.deepEqual(s.daDon, { gioXayRa: { ngay: NGAY, gio: "13:01" }, gioGhiNhan: { ngay: NGAY, gio: "13:10" }, vanPhongKhai: true, nguoiBam: "An" });
    const tx = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER })).json;
    assert.deepEqual(tx.suat.find((x: any) => x.id === a.suat[0]).daDon.nguoiBam, "An");
    // xayRaLuc sai khuôn / không múi giờ → 400; route 39 (đổi thứ tự) → 400 xay_ra_khong_nhan.
    for (const bad of ["13:05", `${NGAY}T13:05:00`, `${NGAY} 13:05+07:00`]) {
      const x = await tienDo(w, "van-phong", a.id, `phan-bo/${a.suat[1]}/don`, { xayRaLuc: bad });
      assert.equal(x.status, 400, bad);
      assert.equal(x.json.error.code, "invalid_input", bad);
    }
    const t39 = await tienDo(w, "van-phong", a.id, "thu-tu", { diem: [{ id: a.diemTra, thuTu: 3 }], xayRaLuc: `${NGAY}T13:05:00+07:00` });
    assert.deepEqual([t39.status, t39.json.error.code], [400, "xay_ra_khong_nhan"]);
  } finally {
    tat();
  }
});

test("TC-47 + R-P14: giờ khai ngoài khoảng → 409 gio_xay_ra_ngoai_khoang + mã + giờ sớm nhất + mốc gây chặn, KHÔNG ghi gì; GET chi tiết trả gioSomNhatKhai khớp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("12:40");
    // Chưa chạy: có giờ sớm nhất cho xuất bến — sau lần xếp cuối (06:00) và sau kẹp lùi 180 phút (09:40) → 09:40.
    let ct = await chiTiet(w, a.id);
    assert.deepEqual(ct.gioSomNhatKhai.xuatBen, { ngay: NGAY, gio: "09:40" });
    assert.equal(ct.gioSomNhatKhai.ketThuc, null);
    const n0 = w.q("SELECT count(*) n FROM vc_trip_event")[0].n;
    const lui = await tienDo(w, "van-phong", a.id, "xuat-ben", { xayRaLuc: `${NGAY}T09:00:00+07:00` });
    assert.equal(lui.status, 409, lui.text);
    assert.deepEqual([lui.json.error.code, lui.json.error.maGio, lui.json.error.somNhat], ["gio_xay_ra_ngoai_khoang", ["LUI_QUA_KEP"], { ngay: NGAY, gio: "09:40" }]);
    assert.equal(lui.json.error.mocChan.loai, "KEP");
    const tuongLai = await tienDo(w, "van-phong", a.id, "xuat-ben", { xayRaLuc: `${NGAY}T12:50:00+07:00` });
    assert.deepEqual(tuongLai.json.error.maGio, ["TUONG_LAI"]);
    assert.equal(tuongLai.json.error.mocChan, null, "giờ khai SAU giờ sớm nhất — không có mốc chặn dưới");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event")[0].n, n0, "không ghi gì");
    // Khai 12:20 → được; vc_trip.departed_at/_ms = ĐÚNG cặp giờ xảy ra (chuỗi lẫn ms).
    const ok = await tienDo(w, "van-phong", a.id, "xuat-ben", { xayRaLuc: `${NGAY}T12:20:00+07:00` });
    assert.equal(ok.status, 200, ok.text);
    const t = w.q("SELECT departed_at, departed_ms FROM vc_trip WHERE id = ?", a.id)[0];
    const e = w.q("SELECT occurred_at, occurred_ms FROM vc_trip_event WHERE kind = 'DEPARTED'")[0];
    assert.deepEqual([t.departed_at, t.departed_ms], [e.occurred_at, e.occurred_ms]);
    assert.equal(t.departed_ms, vnMs(NGAY, "12:20"));
    // Đang chạy: đã tới điểm đón không sớm hơn xuất bến 12:20.
    ct = await chiTiet(w, a.id);
    assert.deepEqual(ct.gioSomNhatKhai.diem.find((d: any) => d.id === a.diemDon).daToi, { ngay: NGAY, gio: "12:20" });
    assert.equal(ct.gioSomNhatKhai.xuatBen, null);
    const som = await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`, { xayRaLuc: `${NGAY}T12:10:00+07:00` });
    assert.deepEqual([som.status, som.json.error.maGio], [409, ["DAO_THU_TU"]]);
    assert.deepEqual([som.json.error.somNhat, som.json.error.mocChan.loai, som.json.error.mocChan.nhan], [{ ngay: NGAY, gio: "12:20" }, "SU_KIEN", "Xuất bến"]);
  } finally {
    tat();
  }
});

test("TC-47 (I37): khoảng nghỉ đo từ giờ XẢY RA — chuyến trước cùng xe kết thúc (khai) 12:50, nghỉ 30 phút: xuất bến khai 13:10 → 409 NGHI_THIEU; khai 13:20 → đạt; R-P14 mốc gây chặn là chuyến trước", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const a = await chuyenSan(w, { xe: x, bd: "12:10", kt: "12:40", gio: "12:15" });
    const b = await chuyenSan(w, { xe: x, bd: "13:30", kt: "15:00", gio: "13:35", taiXe: "66666666-6666-4666-8666-666666666668" });
    denGio("12:05");
    assert.equal((await tienDo(w, "van-phong", a.id, "xuat-ben")).status, 200);
    denGio("12:15");
    await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`);
    for (const s of a.suat) await tienDo(w, "van-phong", a.id, `phan-bo/${s}/don`);
    await tienDo(w, "van-phong", a.id, `diem/${a.diemTra}/da-toi`);
    for (const s of a.suat) await tienDo(w, "van-phong", a.id, `phan-bo/${s}/tra`);
    denGio("13:25");
    const kt = await tienDo(w, "van-phong", a.id, "ket-thuc", { xayRaLuc: `${NGAY}T12:50:00+07:00` });
    assert.equal(kt.status, 200, kt.text);
    // Xuất bến chuyến sau khai 12:45 → chồng chuyến trước (kết thúc 12:50): 409 + mốc gây chặn = mã chuyến trước.
    const chong = await tienDo(w, "van-phong", b.id, "xuat-ben", { xayRaLuc: `${NGAY}T12:45:00+07:00` });
    assert.equal(chong.status, 409, chong.text);
    assert.ok(chong.json.error.maGio.includes("CHONG_CHUYEN_TRUOC"));
    assert.deepEqual([chong.json.error.mocChan.loai, chong.json.error.mocChan.maChuyen], ["CHUYEN_TRUOC", a.ma]);
    const thieu = await tienDo(w, "van-phong", b.id, "xuat-ben", { xayRaLuc: `${NGAY}T13:10:00+07:00` });
    assert.equal(thieu.status, 409, thieu.text);
    assert.equal(thieu.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.ok(thieu.json.error.lyDo.some((l: any) => l.ma === "NGHI_THIEU"), JSON.stringify(thieu.json.error.lyDo));
    const du = await tienDo(w, "van-phong", b.id, "xuat-ben", { xayRaLuc: `${NGAY}T13:20:00+07:00` });
    assert.equal(du.status, 200, du.text);
  } finally {
    tat();
  }
});
