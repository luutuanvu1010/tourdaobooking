// XE ĐANG CHẠY — route văn phòng (ADR-0052 D5.1, D5.2, D5.3a; kế hoạch Đợt 5 Task 4). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 —
// tests/audit/dieu-phoi-khung.mjs). Tên, SĐT GIẢ. Đơn thứ hai tạo lúc 06:00 (ngoài mốc 6 giờ) rồi mới tiến đồng hồ tới lúc xe chạy.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, DRIVER2, LOC, SALES, batDongHo, chiTiet, chuyenSan, denGio, don, setup, tienDo, uuid,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

/** Chuyến A (2 khách có tên, đón 13:00) đã xuất bến lúc 12:40; đơn B (2 khách, 1 có tên, đón 13:30 ở nơi khác) đã xác nhận, CHƯA xếp. */
async function xeDangChay(w: any) {
  const a = await chuyenSan(w);
  const b = await don(w, { gio: "13:30", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
  denGio("12:40");
  const xb = await tienDo(w, "tai-xe", a.id, "xuat-ben");
  assert.equal(xb.status, 200, xb.text);
  // Đồng hồ giả đứng yên: tiến một phút để lệnh văn phòng không trùng ĐÚNG mili-giây xuất bến (R-VC-4 đếm suất mở "≤ lúc chụp").
  denGio("12:41");
  return { a, b };
}
async function themDiem(w: any, tripId: string, as: string, chang: unknown[], extra: Record<string, unknown> = {}) {
  const c = await chiTiet(w, tripId, ADM);
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/them-diem`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang, ...extra } });
}
async function baoHuy(w: any, tripId: string, suatId: string, as: string, lyDo = "BAO_HUY_KHONG_DI") {
  const c = await chiTiet(w, tripId, ADM);
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo/${suatId}/bao-huy`, { as, body: { version: c.chuyen.version, requestId: uuid(), lyDo } });
}
const PHA_LE = { phaLe: { lyDo: "PHA_LE_SU_CO" } };
// Kiểm định kỳ (scripts/audit-checks.mjs) mức fail của vận chuyển chạy trên CSDL sau mỗi ca — dữ liệu do chính các lô thật ghi phải sạch.
const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
function kiemDinhKySach(w: any) {
  const vc = CHECKS.filter((c) => c.code.startsWith("R-VC-") && c.level === "fail");
  assert.ok(vc.some((c) => c.code === "R-VC-24"), "chống bài rỗng: có các câu Đợt 5");
  for (const c of vc) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${c.code} có vi phạm`);
  }
}
const dong = (x: any[]) => x.map((r) => ({ ...r }));
/** Chuỗi nhật ký không được có: tên khách, khoá so sánh nơi, số điện thoại (mã đơn có 8 số ngày — được phép). */
const LO = /Dò Tìm|L:|T:|0\d{9}/;

// NỚI có tên (kế hoạch ADR-0104 §6 N4; ADR-0104 Đ1, Q-1 b; ADR-0052 `:29`, `:192` theo bảng "Câu ADR bị thay"): trước đây Bán hàng thêm khách thường khi xe
// chạy → 409 "cần Quản trị phá lệ", gửi phá lệ → 403. Nay xe đang chạy luôn dưới mốc ⇒ lớp KHAN_CAP: Bán hàng 409 canQuyen true, gửi điều chỉnh khẩn cấp →
// 200. Không có ca "ngoài mốc" cho xe đang chạy nên không có vế 403 của Bán hàng ở đây — rào còn lại: Kế toán 403 (không xếp xe); ghim "xe đang chạy luôn
// dưới mốc" ở src/shared/moc-toi-thieu.test.ts.
test("D5.1 thêm điểm (ADR-0104 Đ1): chặng thường — Bán hàng 409 'cần điều chỉnh khẩn cấp' (lớp KHAN_CAP, canQuyen true); Kế toán 403; Bán hàng điều chỉnh khẩn cấp 200 + cờ + bản chốt + mốc XEP + nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeDangChay(w);
    const r1 = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 2 }]);
    assert.equal(r1.status, 409, r1.text);
    assert.equal(r1.json.error.code, "can_pha_le");
    assert.equal(r1.json.error.canQuyen, true);
    assert.equal(r1.json.error.lop, "KHAN_CAP", "xe đang chạy luôn dưới mốc");
    assert.equal(r1.json.error.message, "Khách không đặt gấp — cần điều chỉnh khẩn cấp kèm lý do.");
    assert.equal((await themDiem(w, a.id, ACC, [{ legId: b.legId, soSuat: 2 }])).status, 403);
    assert.equal((await themDiem(w, a.id, ACC, [{ legId: b.legId, soSuat: 2 }], PHA_LE)).status, 403);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'")[0].n, 0, "từ chối thì không ghi");
    const r = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 2 }], PHA_LE);
    assert.equal(r.status, 200, r.text);
    const moi = r.json.diem.filter((d: any) => d.themKhiChay);
    assert.deepEqual(moi.map((d: any) => [d.loai, d.soNguoi]), [["PICKUP", 2]], "điểm đón mới mang cờ; điểm trả dùng lại (bến) không mang cờ");
    assert.ok(r.json.diem.filter((d: any) => !d.themKhiChay).length >= 2);
    assert.equal(r.json.chuyen.tai, 4);
    assert.ok(r.json.suat.every((s: any) => s.vanPhongBaoHuy === null));
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_stop WHERE trip_id = ? AND added_while_running = 1", a.id)[0].n, 1);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND added_after_departure = 1 AND opened_cmd_id IS NOT NULL", a.id)[0].n, 2);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_manifest WHERE trip_id = ? AND check_id IS NULL AND added_after_departure = 1", a.id)[0].n, 1, "chỉ suất có tên vào bản chốt");
    const ev = w.q("SELECT count, override_rule_code, override_reason_code FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'");
    assert.deepEqual(dong(ev), [{ count: 2, override_rule_code: "MOC_TOI_THIEU", override_reason_code: "PHA_LE_SU_CO" }]);
    assert.deepEqual(dong(w.q("SELECT kind, appt_time FROM vc_leg_appt_ack WHERE leg_id = ?", b.legId)), [{ kind: "XEP", appt_time: "13:30" }]);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_stop_added_running'");
    assert.equal(nk.length, 1);
    assert.match(nk[0].detail, new RegExp(b.code));
    assert.doesNotMatch(nk[0].detail, LO);
    // Task 8 (ADR-0052 D6): tài xế đang lái nhận tin "Văn phòng vừa thêm khách"; Bán hàng không.
    const hop = await w.call("GET", "/api/thong-bao", { as: DRIVER });
    assert.equal(hop.status, 200, hop.text);
    const tin = hop.json.tin.filter((x: any) => x.loai === "chuyen" && /vừa thêm khách/.test(x.cau));
    assert.equal(tin.length, 1, JSON.stringify(hop.json.tin.map((x: any) => x.cau)));
    assert.doesNotMatch(tin[0].cau, /Dò Tìm|0\d{9}/);
    const hopBan = await w.call("GET", "/api/thong-bao", { as: SALES });
    assert.ok(!hopBan.json.tin.some((x: any) => /vừa thêm khách/.test(x.cau)), "Bán hàng không nhận tin xe đang chạy");
    // Chặng đã đủ người trên xe → thêm nữa bị chặn (L-D1).
    const them = await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 1 }], PHA_LE);
    assert.equal(them.status, 409, them.text);
    assert.equal(them.json.error.code, "vuot_so_nguoi_chang");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("D5.1 thêm điểm: chặng ĐẶT GẤP — Bán hàng 200 không phá lệ; quá số người chặng 409; người đi kèm 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeDangChay(w);
    assert.equal((await w.call("POST", `/api/orders/${b.id}/legs/${b.legId}/short-notice`, { as: ADM, body: { lyDo: "KHAC" } })).status, 200);
    const qua = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 3 }]);
    assert.equal(qua.status, 409, qua.text);
    assert.equal(qua.json.error.code, "vuot_so_nguoi_chang");
    const kem = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 1 }], { nguoiDiKem: [`pty-${DRIVER}`] });
    assert.equal(kem.status, 400, kem.text);
    const r = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 2 }]);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(dong(w.q("SELECT override_rule_code FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'")), [{ override_rule_code: null }]);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("D5.2 báo huỷ: suất VẪN chiếm chỗ tới khi tài xế bấm 'Khách đã huỷ'; lần hai 409; lý do ngoài nhóm 400; Kế toán 403; suất đã đón 409; DTO tài xế không người bấm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeDangChay(w);
    assert.equal((await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], PHA_LE)).status, 200);
    const ct = await chiTiet(w, a.id, ADM);
    const suatB = ct.suat.filter((s: any) => s.maDon === b.code).map((s: any) => s.id);
    assert.equal(suatB.length, 2);
    assert.equal((await baoHuy(w, a.id, suatB[0], ACC)).status, 403);
    const sai = await baoHuy(w, a.id, suatB[0], SALES, "PHA_LE_SU_CO");
    assert.equal(sai.status, 400, sai.text);
    const r = await baoHuy(w, a.id, suatB[0], SALES);
    assert.equal(r.status, 200, r.text);
    const s0 = r.json.suat.find((s: any) => s.id === suatB[0]);
    assert.equal(s0.trangThai, "WAITING");
    assert.equal(s0.vanPhongBaoHuy.lyDoNhan, "Khách báo không đi");
    assert.match(s0.vanPhongBaoHuy.luc.gio, /^\d{2}:\d{2}$/);
    assert.equal(r.json.chuyen.tai, 4, "báo huỷ chưa trả chỗ");
    assert.ok(r.json.lyDo.some((l: any) => l.nhom === "BAO_HUY_DIEM" && l.code === "BAO_HUY_KHONG_DI"), "chi tiết văn phòng có nhóm Báo huỷ");
    const lan2 = await baoHuy(w, a.id, suatB[0], SALES);
    assert.equal(lan2.status, 409, lan2.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'ALLOCATION_OFFICE_CANCELLED'")[0].n, 1);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_allocation_office_cancelled'");
    assert.equal(nk.length, 1);
    assert.doesNotMatch(nk[0].detail, LO);
    // DTO tài xế: thấy báo huỷ (giờ + lý do), KHÔNG người bấm; điểm có cờ thêm khi chạy.
    const tx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(tx.status, 200, tx.text);
    const txS = tx.json.suat.find((s: any) => s.id === suatB[0]);
    assert.deepEqual(Object.keys(txS.vanPhongBaoHuy).sort(), ["luc", "lyDoNhan"]);
    assert.ok(tx.json.diem.some((d: any) => d.themKhiChay === true));
    assert.ok(tx.json.diem.every((d: any) => typeof d.themKhiChay === "boolean"));
    // Tài xế tới điểm rồi bấm "Khách đã huỷ" → hết chiếm chỗ.
    const diemB = r.json.diem.find((d: any) => d.themKhiChay && d.loai === "PICKUP").id;
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${diemB}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${suatB[0]}/khach-huy`)).status, 200);
    assert.equal((await chiTiet(w, a.id, ADM)).chuyen.tai, 3);
    // Suất đã đón → báo huỷ 409.
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${suatB[1]}/don`)).status, 200);
    assert.equal((await baoHuy(w, a.id, suatB[1], SALES)).status, 409);
    // Văn phòng rút suất trên xe đang chạy → 409 (giữ — chỉ báo huỷ).
    const c = await chiTiet(w, a.id, ADM);
    const rut = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/rut`, { as: ADM, body: { version: c.chuyen.version, requestId: uuid(), suatIds: [a.suat[0]] } });
    assert.equal(rut.status, 409, rut.text);
    assert.equal(rut.json.error.code, "xe_dang_chay");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("ADR-0104 Đ2.7 (T2.16): đơn huỷ còn khách CHỜ ĐÓN trên xe ĐANG CHẠY → lịch chung + chi tiết chuyến trả coKhachDonHuy (máy không ghi lên xe đang chạy); văn phòng Báo huỷ hết suất đó → false; chuyến khác → false", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a } = await xeDangChay(w);
    const lich = async () => (await w.call("GET", "/api/van-chuyen/lich?ngay=2027-03-11", { as: SALES })).json.chuyen as any[];
    assert.ok((await lich()).every((c) => c.coKhachDonHuy === false), "chống bài rỗng: trước khi huỷ đơn không chuyến nào nhắc");
    const huy = await w.call("POST", `/api/orders/${a.don.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(huy.status, 200, huy.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND status = 'WAITING'", a.id)[0].n, 2, "máy không ghi lên xe đang chạy");
    assert.equal((await lich()).find((c) => c.id === a.id).coKhachDonHuy, true, "lịch chung: xe đang chạy có khách của đơn huỷ");
    assert.equal((await chiTiet(w, a.id, ADM)).chuyen.coKhachDonHuy, true, "chi tiết chuyến cùng kết luận");
    assert.equal((await baoHuy(w, a.id, a.suat[0], SALES)).status, 200);
    assert.equal((await lich()).find((c) => c.id === a.id).coKhachDonHuy, true, "còn một suất chưa báo huỷ");
    assert.equal((await baoHuy(w, a.id, a.suat[1], SALES)).status, 200);
    assert.equal((await lich()).find((c) => c.id === a.id).coKhachDonHuy, false, "đã báo huỷ mọi suất → hết nhắc");
    assert.equal((await chiTiet(w, a.id, ADM)).chuyen.coKhachDonHuy, false);
  } finally {
    tat();
  }
});

test("Chuyến CHƯA chạy: thêm điểm 409 (dùng Xếp khách), báo huỷ 409 (dùng Rút) — không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const d2 = await don(w, { gio: "13:30", soNguoi: 1 });
    const t = await themDiem(w, a.id, ADM, [{ legId: d2.legId, soSuat: 1 }], PHA_LE);
    assert.equal(t.status, 409, t.text);
    assert.equal(t.json.error.code, "chuyen_chua_chay");
    const r = await baoHuy(w, a.id, a.suat[0], SALES);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "chuyen_chua_chay");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE office_cancel_at IS NOT NULL")[0].n, 0);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("D5.3a cập nhật điểm khi xe đang chạy: chỉ suất WAITING ở điểm PENDING đổi; suất ở điểm đã tới → boQua; số chỗ không đổi; nhật ký không khoá nơi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeDangChay(w);
    assert.equal((await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], PHA_LE)).status, 200);
    // Xe tới điểm đón của A, đón một khách; khách kia vẫn chờ ở điểm ĐÃ TỚI.
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).status, 200);
    for (const d of [a.don, b]) {
      const o = (await w.call("GET", `/api/orders/${d.id}`, { as: ADM })).json.order;
      const l = o.services[0].legs[0];
      const sua = await w.call("PUT", `/api/orders/${d.id}/legs/${l.id}`, {
        as: ADM, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: `Nhà riêng Khách Dò Tìm 1 gọi 0905123456 ${d.code}`, dropoffLocationId: LOC, dropoffPlace: "" }, datGap: { lyDo: "KHAC" } },
      });
      assert.equal(sua.status, 200, sua.text);
    }
    const truoc = await chiTiet(w, a.id, ADM);
    const r = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/cap-nhat-diem`, { as: SALES, body: { version: truoc.chuyen.version, requestId: uuid() } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 2, "hai suất của B (WAITING, điểm PENDING)");
    assert.equal(r.json.boQua, 2, "hai suất của A: một đã đón, một chờ ở điểm đã tới");
    assert.equal(r.json.chuyen.tai, truoc.chuyen.tai);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_stop WHERE trip_id = ? AND status = 'SKIPPED'", a.id)[0].n, 0, "xe đang chạy: không tự bỏ qua điểm");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND close_reason = 'STOP_CHANGED' AND closed_cmd_id IS NOT NULL", a.id)[0].n, 2);
    // Nơi đón mới là chữ tự do có tên + SĐT (Review Focus 4): nhật ký chỉ "nơi tự do", không tên, không số, không khoá nơi.
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_stops_synced'");
    assert.equal(nk.length, 1);
    assert.doesNotMatch(nk[0].detail, LO);
    assert.doesNotMatch(nk[0].detail, /0905123456|Nhà riêng/);
    assert.match(nk[0].detail, /nơi tự do/, "chống bài rỗng: nhật ký có nhắc nơi đổi");
    // Không còn suất đổi được → 200 daCapNhat 0, không ghi.
    const sau = await chiTiet(w, a.id, ADM);
    const r2 = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/cap-nhat-diem`, { as: SALES, body: { version: sau.chuyen.version, requestId: uuid() } });
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.daCapNhat, 0);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_stops_synced'")[0].n, 1);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("D5.1 chặng về 'chưa xếp' sau khi xe kia kết thúc gián đoạn → thêm vào xe đang chạy KHÁC vẫn theo luật mốc (Bán hàng 409, Quản trị phá lệ 200); văn phòng dời khách khỏi xe đang chạy → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const a2 = await chuyenSan(w, { taiXe: DRIVER2 });
    const b = await don(w, { gio: "13:30", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
    denGio("12:40");
    for (const [t, tx] of [[a, DRIVER], [a2, DRIVER2]] as const) assert.equal((await tienDo(w, "tai-xe", t.id, "xuat-ben", {}, tx)).status, 200);
    denGio("12:41");
    assert.equal((await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], PHA_LE)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" })).status, 200);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_allocation WHERE leg_id = ? AND valid_to_at IS NULL", b.legId)[0].n, 0, "chặng B về 'chưa xếp'");
    const ban = await themDiem(w, a2.id, SALES, [{ legId: b.legId, soSuat: 2 }]);
    assert.equal(ban.status, 409, ban.text);
    assert.equal(ban.json.error.code, "can_pha_le");
    const r = await themDiem(w, a2.id, ADM, [{ legId: b.legId, soSuat: 2 }], PHA_LE);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.suat.filter((s: any) => s.maDon === b.code).length, 2);
    const c = await chiTiet(w, a2.id, ADM);
    const doi = await w.call("POST", `/api/van-chuyen/chuyen/${a2.id}/doi`, {
      as: ADM, body: { version: c.chuyen.version, requestId: uuid(), denChuyenId: a.id, denVersion: 1, suatIds: [a2.suat[0]] },
    });
    assert.equal(doi.status, 409, doi.text);
    assert.equal(doi.json.error.code, "xe_dang_chay");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

// ADR-0128 Q2 (chủ 2026-10-17): xe riêng KHÔNG phá lệ được → ống dẫn chạy bằng SỐ CHỖ TỐI THIỂU (chặng B đòi ≥ 16 chỗ, xe 15); đầu bài canh luật mới: xe riêng thì chặn cứng.
test("Đợt 7 (THEM_KHI_CHAY — ADR-0056 VK3-A, ruling điều phối): thêm chặng đơn B đòi ≥ 16 chỗ vào xe đang chạy — Quản trị chỉ phá lệ mốc → 409 can_pha_le_cam_ket; kèm camKetPhaLe → 200, sự kiện mang MOC_TOI_THIEU (C6), cột phá lệ cam kết ghi, nhật ký hai đoạn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeDangChay(w);
    // ADR-0128 Q2: xe đang chạy chở XE RIÊNG của A — thêm chặng B: chặn cứng, Quản trị gửi đủ hai cờ cũng 409 (không còn can_pha_le_cam_ket), không ghi sự kiện, cột phá lệ trống.
    w.sqlite.prepare("UPDATE ord_transfer_leg SET exclusive_vehicle = 1 WHERE id = ?").run(a.don.legId);
    const chan = await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], { ...PHA_LE, camKetPhaLe: { lyDo: "PHA_LE_KHAC" } });
    assert.equal(chan.status, 409, chan.text);
    assert.equal(chan.json.error.code, "chang_khong_hop_le", chan.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'")[0].n, 0);
    assert.equal(w.q("SELECT commitment_override_reason_code r FROM vc_trip WHERE id = ?", a.id)[0].r, null);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET exclusive_vehicle = 0 WHERE id = ?").run(a.don.legId);
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 16 WHERE id = ?").run(b.legId); // chặng B đòi xe ≥ 16 chỗ, xe 15 chỗ ⇒ vượt cam kết (phá lệ được)
    const r1 = await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], PHA_LE);
    assert.equal(r1.status, 409, r1.text);
    assert.equal(r1.json.error.code, "can_pha_le_cam_ket");
    assert.equal(r1.json.error.canQuyen, true);
    const r = await themDiem(w, a.id, ADM, [{ legId: b.legId, soSuat: 2 }], { ...PHA_LE, camKetPhaLe: { lyDo: "PHA_LE_KHAC" } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(dong(w.q("SELECT override_rule_code, override_reason_code FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'")), [{ override_rule_code: "MOC_TOI_THIEU", override_reason_code: "PHA_LE_SU_CO" }]);
    const t = w.q("SELECT commitment_override_reason_code r, commitment_override_key k FROM vc_trip WHERE id = ?", a.id)[0];
    assert.equal(t.r, "PHA_LE_KHAC");
    assert.ok(t.k.includes(`${b.legId}:CX:0:16`), t.k);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_stop_added_running'")[0].detail as string;
    // ADR-0104 Đ1 mục 4 (đổi có tên — chữ nhật ký): xe đang chạy luôn dưới mốc ⇒ cả hai luật lớp KHAN_CAP; đuôi " · xe đang chạy" một lần.
    assert.match(nk, / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành · điều chỉnh khẩn cấp cam kết: Khác · xe đang chạy$/);
    assert.doesNotMatch(nk, /phá lệ|còn \d+ phút/);
    assert.ok(!nk.includes(t.k) && !r.text.includes(t.k), "C4: khoá không ra nhật ký / phản hồi");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

// Phiếu kiểm D1 THẤP-5 (ca thay thế cho N4 — đột biến V1b: cổng cờ ở /them-diem tính "dưới mốc" theo giờ dự kiến thay vì "xe đang chạy"): xe xuất bến SỚM nên
// giờ dự kiến còn cách hơn 6 giờ, vẫn là xe đang chạy ⇒ dưới mốc ⇒ cờ cam kết lớp KHAN_CAP — Bán hàng gửi { phaLe, camKetPhaLe } → 200.
test("Phiếu D1 THẤP-5 (N4): xe ĐANG CHẠY có giờ dự kiến còn cách hơn 6 giờ (xuất bến sớm) — Bán hàng thêm chặng vượt cam kết: thiếu cờ cam kết 409 lớp KHAN_CAP (canQuyen true); gửi { phaLe, camKetPhaLe } → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "13:00", kt: "17:00", gio: "13:30" });
    const b = await don(w, { gio: "14:00", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(b.legId); // chặng đòi xe ≥ 30 chỗ, xe 15 chỗ ⇒ vượt cam kết
    const xb = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(xb.status, 200, xb.text);
    denGio("06:01");
    const [c] = w.q("SELECT status, planned_start_ms FROM vc_trip WHERE id = ?", a.id);
    assert.equal(c.status, "RUNNING");
    assert.ok(c.planned_start_ms - Date.now() > 6 * 3_600_000, "giờ dự kiến còn cách hơn 6 giờ");
    const r0 = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 2 }], PHA_LE);
    assert.equal(r0.status, 409, r0.text);
    assert.equal(r0.json.error.code, "can_pha_le_cam_ket");
    assert.equal(r0.json.error.lop, "KHAN_CAP", "xe đang chạy luôn dưới mốc — kể cả khi giờ dự kiến còn xa");
    assert.equal(r0.json.error.canQuyen, true);
    const r = await themDiem(w, a.id, SALES, [{ legId: b.legId, soSuat: 2 }], { ...PHA_LE, camKetPhaLe: { lyDo: "PHA_LE_SU_CO" } });
    assert.equal(r.status, 200, r.text);
    const ev = w.q("SELECT override_rule_code, override_reason_code, created_by FROM vc_trip_event WHERE kind = 'STOP_ADDED_RUNNING'");
    assert.deepEqual(dong(ev), [{ override_rule_code: "MOC_TOI_THIEU", override_reason_code: "PHA_LE_SU_CO", created_by: SALES }]);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});
