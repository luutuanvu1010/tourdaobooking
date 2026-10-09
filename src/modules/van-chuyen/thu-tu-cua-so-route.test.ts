// Bài ROUTE của ADR-0096 Đ1 (LC-19) + Đ2 (LC-20) — gói A1 (lộ trình 3/10 V3-A): máy chủ thật (khung thử harness + D1 node:sqlite, đủ migration). Lớp CSDL:
// cua-so-thu-tu-csdl.test.ts. Luật thuần: dieu-phoi-kiem.test.ts, thu-tu-diem.test.ts.
// - LC-20: lệnh xuất bến (tài xế, văn phòng) ngoài cửa sổ → 409 kèm lý do; dòng chính sách áp = dòng hiệu lực TẠI giờ xuất bến (văn phòng khai lùi); màn chi
//   tiết (văn phòng + tài xế) hiện lý do ngay khi đọc, lịch chung không (dự phóng).
// - LC-19: thứ tự đảo → xuất bến 409 TRA_TRUOC_DON; sửa thứ tự (PUT điểm của chuyến kế hoạch) gỡ được; đổi thứ tự khi đang chạy làm đảo mới → 409 thu_tu_dao.
// - Đ1.4 (HT-02): "Đã tới" điểm trả khi còn khách chờ lên mà điểm đón chưa tới → 409; HT-16: "Đã trả" khách còn chờ lên → 409 câu đúng việc.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { batDongHo, chiTiet, chuyenSan, denGio, DRIVER, NGAY, SALES, setup, SUP, tienDo, uuid, vnMs } from "../../../tests/audit/dieu-phoi-khung.mjs";

const ma = (r: any): string[] => (r.json?.error?.lyDo ?? []).map((l: any) => l.ma);
const soSuKien = (w: any, trip: string, kind: string): number => w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = ?", trip, kind)[0].n;
const trangThai = (w: any, trip: string): string => w.q("SELECT status s FROM vc_trip WHERE id = ?", trip)[0].s;

test("ADR-0096 Đ2 LC-20 lệnh xuất bến: chuyến 20:00, bây giờ 06:00 (14 giờ trước) → tài xế / văn phòng 409 + lý do NGOAI_CUA_SO_XUAT_BEN, không ghi; chi tiết văn phòng + tài xế hiện lý do, lịch chung không; 08:00 (đúng 12 giờ) → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "20:00", kt: "22:00", gio: "20:15" });
    for (const [ben, as] of [["tai-xe", DRIVER], ["van-phong", SALES]] as const) {
      const r = await tienDo(w, ben, a.id, "xuat-ben", {}, as);
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "chua_du_dieu_kien_xuat_ben");
      assert.deepEqual(ma(r), ["NGOAI_CUA_SO_XUAT_BEN"], r.text);
      assert.match(r.json.error.lyDo[0].loiNhan, /khởi hành lúc 20:00 ngày 11\/03, được xuất bến từ 08:00 ngày 11\/03\. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến\./);
      assert.equal(r.json.error.lyDo[0].aiXuLy, "VAN_PHONG");
    }
    assert.equal(trangThai(w, a.id), "PLANNED");
    assert.equal(soSuKien(w, a.id, "DEPARTED"), 0, "không ghi");
    // Màn đọc: chi tiết văn phòng + chi tiết tài xế hiện lý do theo GIỜ THẬT; lịch chung (dự phóng xuất bến đúng giờ) không.
    assert.ok((await chiTiet(w, a.id)).chuyen.lyDoGiu.some((l: any) => l.ma === "NGOAI_CUA_SO_XUAT_BEN"));
    const cuoc = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(cuoc.status, 200, cuoc.text);
    assert.deepEqual(cuoc.json.dieuKienConThieu.map((x: any) => x.ma), ["NGOAI_CUA_SO_XUAT_BEN"]);
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    assert.equal(lich.status, 200, lich.text);
    assert.deepEqual(lich.json.chuyen.find((c: any) => c.id === a.id).lyDoGiu, []);
    // Đúng mốc mở cửa sổ (≥): 08:00 = 20:00 − 12 giờ.
    denGio("08:00");
    const ok = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(ok.status, 200, ok.text);
    assert.equal(trangThai(w, a.id), "RUNNING");
  } finally {
    tat();
  }
});

test("ADR-0096 Đ2.2 LC-20: dòng chính sách áp = dòng hiệu lực TẠI giờ xuất bến — Toàn quyền đổi cửa sổ 24 giờ lúc 06:00; văn phòng khai xuất bến 05:00 rơi vào dòng cũ 12 giờ → 409; bấm 06:00 (dòng mới) → 200", async () => {
  const tat = batDongHo(vnMs(NGAY, "04:00"));
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "19:00", kt: "21:00", gio: "19:15" });
    denGio("06:00");
    const cs = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 1440, refuseLeadMinutes: 720, officePhone: null },
    });
    assert.equal(cs.status, 201, cs.text);
    const khai = await tienDo(w, "van-phong", a.id, "xuat-ben", { xayRaLuc: `${NGAY}T05:00:00+07:00` });
    assert.equal(khai.status, 409, khai.text);
    assert.equal(khai.json.error.code, "chua_du_dieu_kien_xuat_ben", "lớp MÁY CHỦ chặn (không phải trigger) — đọc đúng dòng chính sách tại giờ khai");
    assert.deepEqual(ma(khai), ["NGOAI_CUA_SO_XUAT_BEN"]);
    assert.match(khai.json.error.lyDo[0].loiNhan, /được xuất bến từ 07:00 ngày 11\/03/);
    assert.equal(soSuKien(w, a.id, "DEPARTED"), 0);
    const bam = await tienDo(w, "van-phong", a.id, "xuat-ben");
    assert.equal(bam.status, 200, bam.text);
    assert.equal(trangThai(w, a.id), "RUNNING");
  } finally {
    tat();
  }
});

test("ADR-0096 Đ1.2 LC-19 lệnh xuất bến: điểm trả đứng trước điểm đón (dữ liệu cũ) → 409 TRA_TRUOC_DON kèm mã đơn, không ghi; văn phòng sửa thứ tự (PUT điểm — gỡ đảo cũ được) → xuất bến 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    // Dữ liệu cũ (HT-01, trước V1.2): điểm đón bị đẩy ra sau điểm trả.
    w.sqlite.prepare("UPDATE vc_trip_stop SET seq = 3 WHERE id = ?").run(a.diemDon);
    const r = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(r.status, 409, r.text);
    assert.deepEqual(ma(r), ["TRA_TRUOC_DON"]);
    assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(`${a.don.code} \\(điểm trả số 2 đứng trước điểm đón số 3\\)`));
    assert.equal(soSuKien(w, a.id, "DEPARTED"), 0);
    const ct = await chiTiet(w, a.id);
    assert.ok(ct.chuyen.lyDoGiu.some((l: any) => l.ma === "TRA_TRUOC_DON"));
    const sua = await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), diem: [{ id: a.diemDon, thuTu: 1, gioXeToi: null }] } });
    assert.equal(sua.status, 200, sua.text);
    const ok = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(ok.status, 200, ok.text);
  } finally {
    tat();
  }
});

test("ADR-0096 Đ1.3c đổi thứ tự khi ĐANG CHẠY: đưa điểm trả lên trước điểm đón của khách chờ lên → 409 thu_tu_dao (tài xế và văn phòng bấm thay), không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    const seq = () => w.q("SELECT id, seq FROM vc_trip_stop WHERE trip_id = ? ORDER BY id", a.id).map((x: any) => [x.id, x.seq]);
    const truoc = seq();
    const sd = new Map(truoc);
    for (const [ben, as] of [["tai-xe", DRIVER], ["van-phong", SALES]] as const) {
      const r = await tienDo(w, ben, a.id, "thu-tu", { diem: [{ id: a.diemTra, thuTu: sd.get(a.diemDon) }, { id: a.diemDon, thuTu: sd.get(a.diemTra) }] }, as);
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "thu_tu_dao");
      assert.deepEqual(ma(r), ["TRA_TRUOC_DON"]);
      assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(a.don.code));
    }
    assert.deepEqual(seq(), truoc, "không đổi số thứ tự");
    assert.equal(soSuKien(w, a.id, "STOPS_REORDERED"), 0);
  } finally {
    tat();
  }
});

test("ADR-0096 Đ1.4 (HT-02, HT-16): 'Đã tới' điểm trả khi điểm đón chưa tới → 409 con_khach_chua_don (câu chỉ số điểm, không chữ tự do); 'Đã trả' khách chờ lên → 409 khach_chua_len; khách vắng hết → tới điểm trả được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    for (const [ben, as] of [["tai-xe", DRIVER], ["van-phong", SALES]] as const) {
      const r = await tienDo(w, ben, a.id, `diem/${a.diemTra}/da-toi`, {}, as);
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "con_khach_chua_don");
      assert.equal(r.json.error.message, "Còn khách chưa đón ở điểm đón số 1 sẽ xuống ở đây — tới điểm đón trước.");
      assert.doesNotMatch(r.text, /Dò Tìm/, "không chữ tự do của nơi đón / tên khách");
    }
    assert.equal(soSuKien(w, a.id, "STOP_ARRIVED"), 0);
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    const tra = await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/tra`);
    assert.equal(tra.status, 409, tra.text);
    assert.equal(tra.json.error.code, "khach_chua_len");
    assert.match(tra.json.error.message, /Khách chưa lên xe — bấm "Đã đón"/);
    for (const s of a.suat) assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${s}/vang`)).status, 200);
    const toi = await tienDo(w, "tai-xe", a.id, `diem/${a.diemTra}/da-toi`);
    assert.equal(toi.status, 200, toi.text);
  } finally {
    tat();
  }
});
