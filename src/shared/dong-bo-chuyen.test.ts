// Luật thuần ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.6; kế hoạch T2.2, NT-5). Một hàm cho máy (lệnh đơn) và nút tay "Cập nhật khách theo đơn".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAU_NHAC_XE_DANG_CHAY, TRAN_CAU_CHUYEN, changChoNutTay, changTheoSau, demCau, dongBoChuyenTheoDon, moTaKhuc, tongCauChuyen,
  type ChangDongBo, type ChuyenDongBo, type KhucDongBo,
} from "./dong-bo-chuyen.ts";
import type { DiemVao, SuatVao } from "./dieu-phoi-kieu.ts";
import { LENH_DONG_SUAT } from "./dieu-phoi-kieu.ts";

const suat = (id: string, tripId: string, legId: string | null, personKey: string | null, o: Partial<SuatVao> = {}): SuatVao => ({
  id, tripId, loai: legId === null ? "CREW" : "PASSENGER", legId, personKey, crewPartyId: legId === null ? "pty-hdv" : null,
  boardStopId: `${tripId}-don`, alightStopId: `${tripId}-tra`, trangThai: "WAITING", mo: true, moTuMs: 0, ...o,
});
const diem = (id: string, tripId: string, loai: "PICKUP" | "DROPOFF"): DiemVao => ({ id, tripId, seq: 1, loai, trangThai: "PENDING", placeKey: "k", gioXeToiMs: null });
const chuyen = (id: string, ma: string, ds: SuatVao[], o: Partial<ChuyenDongBo> = {}): ChuyenDongBo => ({
  id, ma, trangThai: "PLANNED", xeId: `xe-${id}`, soCho: 16, suat: ds, diem: [diem(`${id}-don`, id, "PICKUP"), diem(`${id}-tra`, id, "DROPOFF")],
  camKetPhaLeKhoa: null, changCamKet: new Map(), ...o,
});
const chang = (legId: string, o: Partial<ChangDongBo> = {}): ChangDongBo => ({ legId, orderId: "o1", orderCode: "TD-1", dong: null, soNguoi: null, nguoi: [], tang: 0, ...o });
function idMoi(): () => string {
  let n = 0;
  return () => `moi-${++n}`;
}
/** Suất mở của các chặng trên MỌI chuyến — như `allocsOpenByLegs`. */
const moCuaChang = (cs: readonly ChuyenDongBo[], them: readonly SuatVao[] = []) => [...cs.flatMap((c) => c.suat), ...them].filter((s) => s.mo && s.legId !== null);
const chay = (ch: ChangDongBo[], cs: ChuyenDongBo[], them: SuatVao[] = []) => dongBoChuyenTheoDon({ chang: ch, chuyen: cs, suatMoCuaChang: moCuaChang(cs, them), newId: idMoi() });

test("(i) đơn huỷ: đóng MỌI suất mở của chặng trên chuyến, mã REMOVED; điểm hết khách bỏ qua; không mở suất nào (vị từ lc09 sai)", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", null), suat("a3", "T1", "L1", "p2")]);
  const kq = chay([chang("L1", { dong: "DON_HUY", soNguoi: 3, nguoi: ["p1", "p2"], tang: 2 })], [t]);
  assert.equal(kq.khuc.length, 1);
  const k = kq.khuc[0]!;
  assert.deepEqual(k.dong, ["a1", "a2", "a3"].map((suatId) => ({ suatId, lyDo: "REMOVED" })));
  assert.equal(LENH_DONG_SUAT.DONG_BO_THEO_DON, "REMOVED", "phán quyết G7: mã đóng của máy = REMOVED");
  assert.deepEqual(k.mo, []);
  assert.deepEqual(k.diemBoQua.sort(), ["T1-don", "T1-tra"]);
  assert.deepEqual(k.theoDon, [{ orderCode: "TD-1", nguyenNhan: ["DON_HUY"], tra: 3, them: 0 }]);
  assert.equal(kq.nhacXeDangChay, false);
});

test("(i) chặng đóng và đơn không còn xác nhận (G9 — đã giao / hoàn thành) cũng đóng REMOVED; suất người đi kèm (CREW) không đụng", () => {
  for (const dong of ["BO_CHANG", "DON_KHONG_XAC_NHAN"] as const) {
    const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", null), suat("c1", "T1", null, null)]);
    const k = chay([chang("L1", { dong, soNguoi: 1 })], [t]).khuc[0]!;
    assert.deepEqual(k.dong, [{ suatId: "a1", lyDo: "REMOVED" }], dong);
    assert.deepEqual(k.diemBoQua, [], "suất CREW còn giữ điểm");
    assert.deepEqual(k.theoDon[0]!.nguyenNhan, [dong]);
  }
});

test("(ii) khoá người không còn trong đơn: đóng PASSENGER_CHANGED rồi mở lại CÙNG điểm, khoá rảnh theo thứ tự; số người không biết → mở lại một-đổi-một", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", "cu")]);
  const k = chay([chang("L1", { nguoi: ["p1", "p9", "p3"] })], [t]).khuc[0]!;
  assert.deepEqual(k.dong, [{ suatId: "a2", lyDo: "PASSENGER_CHANGED" }]);
  assert.deepEqual(k.mo, [{ id: "moi-1", tripId: "T1", legId: "L1", personKey: "p3", boardStopId: "T1-don", alightStopId: "T1-tra" }]);
  assert.deepEqual(k.theoDon, [{ orderCode: "TD-1", nguyenNhan: ["DOI_NGUOI"], tra: 1, them: 1 }]);
});

test("(ii) số người đã biết và giảm: mở lại tới số người (moLaiSauDoiKhach — đếm trên mọi chuyến), hết khoá rảnh → null", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", "cu1"), suat("a3", "T1", "L1", "cu2")]);
  const k = chay([chang("L1", { soNguoi: 2, nguoi: ["p1"] })], [t]).khuc[0]!;
  assert.deepEqual(k.dong.map((d) => d.lyDo), ["PASSENGER_CHANGED", "PASSENGER_CHANGED"]);
  assert.deepEqual(k.mo.map((m) => m.personKey), [null], "1 suất còn + 1 mở lại = 2 người");
});

test("(iii) thừa suất: đóng suất CHƯA TÊN trước, theo mã suất tăng dần, REMOVED; suất mang tên người còn trong đơn không đụng", () => {
  const t = chuyen("T1", "CX-01", [suat("a9", "T1", "L1", "p1"), suat("u2", "T1", "L1", null), suat("u1", "T1", "L1", null), suat("a8", "T1", "L1", "p2")]);
  const kq = chay([chang("L1", { soNguoi: 3, nguoi: ["p1", "p2"] })], [t]);
  assert.deepEqual(kq.khuc[0]!.dong, [{ suatId: "u1", lyDo: "REMOVED" }]);
  assert.deepEqual(kq.khuc[0]!.theoDon[0]!.nguyenNhan, ["BOT_KHACH"]);
  assert.deepEqual(kq.giu, []);
});

test("(iii) còn thừa mà mọi suất còn lại mang tên người vẫn trong đơn → KHÔNG đoán, giữ THUA_SUAT (không khúc nào)", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", "p2"), suat("u1", "T1", "L1", null)]);
  const kq = chay([chang("L1", { soNguoi: 1, nguoi: ["p1", "p2"] })], [t]);
  assert.deepEqual(kq.khuc[0]!.dong, [{ suatId: "u1", lyDo: "REMOVED" }]);
  assert.deepEqual(kq.giu, [{ tripId: "T1", legId: "L1", lyDo: "THUA_SUAT" }]);
  const kq2 = chay([chang("L1", { soNguoi: 1, nguoi: ["p1", "p2"] })], [chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", "p2")])]);
  assert.deepEqual(kq2.khuc, []);
  assert.deepEqual(kq2.giu, [{ tripId: "T1", legId: "L1", lyDo: "THUA_SUAT" }]);
});

test("(iii) chặng có suất mở trên HƠN MỘT chuyến → không đoán, giữ (không đóng suất thừa nào)", () => {
  const t1 = chuyen("T1", "CX-01", [suat("u1", "T1", "L1", null), suat("u2", "T1", "L1", null)]);
  const t2 = chuyen("T2", "CX-02", [suat("u3", "T2", "L1", null)]);
  const kq = chay([chang("L1", { soNguoi: 1 })], [t1, t2]);
  assert.deepEqual(kq.khuc, []);
  assert.deepEqual(kq.giu, [{ tripId: null, legId: "L1", lyDo: "NHIEU_CHUYEN" }]);
});

test("(iv) tăng người, chặng chỉ trên chuyến này: mở thêm ĐÚNG số vừa tăng, cùng điểm suất hiện có, khoá rảnh; không lấp phần thiếu cũ", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", "p2")]);
  // Trước: 4 người, 2 suất (thiếu 2 từ trước); lệnh tăng 1 → 5 người. Chỉ mở 1.
  const k = chay([chang("L1", { soNguoi: 5, nguoi: ["p1", "p2", "p3"], tang: 1 })], [t]).khuc[0]!;
  assert.deepEqual(k.dong, []);
  assert.deepEqual(k.mo, [{ id: "moi-1", tripId: "T1", legId: "L1", personKey: "p3", boardStopId: "T1-don", alightStopId: "T1-tra" }]);
  assert.deepEqual(k.theoDon, [{ orderCode: "TD-1", nguyenNhan: ["THEM_KHACH"], tra: 0, them: 1 }]);
  // Tăng 3 khi chỉ còn thiếu 1 so với số người mới → mở 1 (không vượt số người).
  const k2 = chay([chang("L1", { soNguoi: 3, nguoi: [], tang: 3 })], [chuyen("T1", "CX-01", [suat("a1", "T1", "L1", null), suat("a2", "T1", "L1", null)])]).khuc[0]!;
  assert.equal(k2.mo.length, 1);
  assert.equal(k2.mo[0]!.personKey, null);
});

test("(iv) hết chỗ (LC-02 — đếm suất WAITING/BOARDED mọi loại của chuyến): mở tới số chỗ còn, phần thiếu giữ THIEU_SUAT", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", null), suat("b1", "T1", "L2", null), suat("c1", "T1", null, null)], { soCho: 4 });
  const kq = chay([chang("L1", { soNguoi: 4, tang: 3 })], [t]);
  assert.equal(kq.khuc[0]!.mo.length, 1);
  assert.deepEqual(kq.giu, [{ tripId: "T1", legId: "L1", lyDo: "THIEU_SUAT" }]);
  const day = chay([chang("L1", { soNguoi: 4, tang: 3 })], [chuyen("T1", "CX-01", t.suat, { soCho: 3 })]);
  assert.deepEqual(day.khuc, []);
  assert.deepEqual(day.giu, [{ tripId: "T1", legId: "L1", lyDo: "THIEU_SUAT" }]);
  const khongXe = chay([chang("L1", { soNguoi: 4, tang: 3 })], [chuyen("T1", "CX-01", t.suat, { soCho: null })]);
  assert.deepEqual(khongXe.khuc, [], "không đọc được xe → không mở thêm");
});

test("(iv) kiemCamKet vi phạm CHƯA phá lệ → không mở, giữ THIEU_SUAT; vi phạm ĐÃ phá lệ (khoá khớp) → mở như thường (khuôn kiemXep)", () => {
  const ds = [suat("a1", "T1", "L1", null), suat("b1", "T1", "LX", null)];
  const cam = new Map([
    ["L1", { legId: "L1", orderId: "o1", orderCode: "TD-1", xeRieng: false, choToiThieu: null }],
    ["LX", { legId: "LX", orderId: "o2", orderCode: "TD-2", xeRieng: true, choToiThieu: null }],
  ]);
  const kq = chay([chang("L1", { soNguoi: 2, tang: 1 })], [chuyen("T1", "CX-01", ds, { changCamKet: cam })]);
  assert.deepEqual(kq.khuc, []);
  assert.deepEqual(kq.giu, [{ tripId: "T1", legId: "L1", lyDo: "THIEU_SUAT" }]);
  const khoa = "xe:xe-T1|L1:XR:0:-|LX:XR:1:-";
  const da = chay([chang("L1", { soNguoi: 2, tang: 1 })], [chuyen("T1", "CX-01", ds, { changCamKet: cam, camKetPhaLeKhoa: khoa })]);
  assert.equal(da.khuc[0]!.mo.length, 1);
});

test("(iv) chặng trên hơn một chuyến → không mở thêm; tăng mà số người không biết → không mở", () => {
  const t1 = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", null)]);
  const t2 = chuyen("T2", "CX-02", [suat("a2", "T2", "L1", null)]);
  assert.deepEqual(chay([chang("L1", { soNguoi: 4, tang: 2 })], [t1, t2]).khuc, []);
  assert.deepEqual(chay([chang("L1", { soNguoi: null, tang: 2 })], [t1]).khuc, []);
});

test("cam kết xét lại sau giảm: chuyến đang có cột phá lệ mà hết vi phạm → xoá cột; còn vi phạm → giữ cột", () => {
  const cam = new Map([
    ["L1", { legId: "L1", orderId: "o1", orderCode: "TD-1", xeRieng: false, choToiThieu: null }],
    ["LX", { legId: "LX", orderId: "o2", orderCode: "TD-2", xeRieng: true, choToiThieu: null }],
  ]);
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", null), suat("b1", "T1", "LX", null)], { changCamKet: cam, camKetPhaLeKhoa: "xe:xe-T1|L1:XR:0:-|LX:XR:1:-" });
  const k = chay([chang("L1", { dong: "DON_HUY" })], [t]).khuc[0]!;
  assert.equal(k.xoaCamKet, true);
  const cam2 = new Map([...cam, ["L2", { legId: "L2", orderId: "o3", orderCode: "TD-3", xeRieng: false, choToiThieu: null }]]);
  const t2 = chuyen("T1", "CX-01", [...t.suat, suat("c1", "T1", "L2", null)], { changCamKet: cam2, camKetPhaLeKhoa: "x" });
  assert.equal(chay([chang("L1", { dong: "DON_HUY" })], [t2]).khuc[0]!.xoaCamKet, false);
  assert.equal(chay([chang("L1", { dong: "DON_HUY" })], [chuyen("T1", "CX-01", t.suat, { changCamKet: cam, camKetPhaLeKhoa: "x", soCho: null })]).khuc[0]!.xoaCamKet, false, "không đọc được xe → giữ cột");
});

test("chuyến ĐANG CHẠY: không câu nào; cờ nhắc khi luật sẽ đóng suất khách CHỜ ĐÓN; chuyến đã kết thúc / huỷ: không gì", () => {
  const chayT = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1")], { trangThai: "RUNNING" });
  const kq = chay([chang("L1", { dong: "DON_HUY" })], [chayT]);
  assert.deepEqual(kq.khuc, []);
  assert.equal(kq.nhacXeDangChay, true);
  assert.equal(CAU_NHAC_XE_DANG_CHAY, "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ");
  const daLen = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1", { trangThai: "BOARDED" })], { trangThai: "RUNNING" });
  assert.equal(chay([chang("L1", { dong: "DON_HUY" })], [daLen]).nhacXeDangChay, false, "khách đã lên xe: không còn Báo huỷ được");
  const doiNguoi = chay([chang("L1", { nguoi: [] })], [chayT]);
  assert.equal(doiNguoi.nhacXeDangChay, true);
  for (const trangThai of ["ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const) {
    const r = chay([chang("L1", { dong: "DON_HUY" })], [chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1")], { trangThai })]);
    assert.deepEqual([r.khuc, r.nhacXeDangChay], [[], false], trangThai);
  }
});

test("khoá người tính CHUNG cho mọi khúc: cùng chặng trên hai chuyến, đổi hai người → khoá mở lại khác nhau (chỉ mục duy nhất chặng + người)", () => {
  const t1 = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "cu1")]);
  const t2 = chuyen("T2", "CX-02", [suat("a2", "T2", "L1", "cu2"), suat("a3", "T2", "L1", "p1")]);
  const kq = chay([chang("L1", { nguoi: ["p1", "n1", "n2"] })], [t2, t1]);
  assert.deepEqual(kq.khuc.map((k) => k.ma), ["CX-01", "CX-02"], "khúc sắp theo mã chuyến");
  const khoa = kq.khuc.flatMap((k) => k.mo.map((m) => m.personKey));
  assert.deepEqual(khoa, ["n1", "n2"]);
  // Khoá đã có suất mở ở chuyến KHÔNG ghi (đọc qua suatMoCuaChang) cũng không được cấp lại.
  const ngoai = suat("x1", "T9", "L1", "n1");
  const kq2 = dongBoChuyenTheoDon({ chang: [chang("L1", { nguoi: ["n1", "n2"] })], chuyen: [t1], suatMoCuaChang: moCuaChang([t1], [ngoai]), newId: idMoi() });
  assert.deepEqual(kq2.khuc[0]!.mo.map((m) => m.personKey), ["n2"]);
});

test("(ii) rồi (iv) trên CÙNG chặng: khoá đã cấp cho suất mở lại không cấp lại cho suất mở thêm", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "cu"), suat("a2", "T1", "L1", "p1")]);
  const k = chay([chang("L1", { nguoi: ["p1", "n1", "n2"], soNguoi: 4, tang: 2 })], [t]).khuc[0]!;
  assert.deepEqual(k.mo.map((m) => m.personKey), ["n1", "n2", null]);
});

test("không có gì đổi → không khúc nào (không ghi kể cả version — I42)", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "p1")]);
  assert.deepEqual(chay([chang("L1", { soNguoi: 1, nguoi: ["p1"] })], [t]).khuc, []);
  assert.deepEqual(chay([chang("LZ", { dong: "DON_HUY" })], [t]).khuc, [], "chặng không có suất trên chuyến");
});

test("đếm câu: 3 đầu (cổng, nhật ký, sự kiện) + đóng + mở + bỏ điểm + cam kết; trần phần chuyến 74 (ADR-0104 Đ2.5)", () => {
  const k: KhucDongBo = {
    tripId: "T1", ma: "CX-01", dong: [{ suatId: "a", lyDo: "REMOVED" }, { suatId: "b", lyDo: "REMOVED" }],
    mo: [{ id: "m", tripId: "T1", legId: "L1", personKey: null, boardStopId: null, alightStopId: null }], diemBoQua: ["d"], xoaCamKet: true, theoDon: [],
  };
  assert.equal(demCau(k), 3 + 2 + 1 + 1 + 1);
  assert.equal(tongCauChuyen([k, { ...k, xoaCamKet: false }]), 8 + 7);
  assert.equal(TRAN_CAU_CHUYEN, 74);
  // Đơn 30 khách, chặng đi + về, mỗi chặng một xe, huỷ: 2 × (3 + 30 + 2 + 1) = 72 — vừa dưới trần (ADR "Đếm câu").
  const ba0 = (n: number, id: string) => Array.from({ length: n }, (_x, i) => suat(`${id}-${String(i).padStart(2, "0")}`, id, `L-${id}`, null));
  const cam = (id: string) => new Map([[`L-${id}`, { legId: `L-${id}`, orderId: "o1", orderCode: "TD-1", xeRieng: true, choToiThieu: null }], ["LX", { legId: "LX", orderId: "o2", orderCode: "TD-2", xeRieng: false, choToiThieu: null }]]);
  const kq = chay([chang("L-T1", { dong: "DON_HUY" }), chang("L-T2", { dong: "DON_HUY" })], [
    chuyen("T1", "CX-01", ba0(30, "T1"), { changCamKet: cam("T1"), camKetPhaLeKhoa: "x" }), chuyen("T2", "CX-02", ba0(30, "T2"), { changCamKet: cam("T2"), camKetPhaLeKhoa: "x" }),
  ]);
  assert.equal(tongCauChuyen(kq.khuc), 72);
});

test("changTheoSau: chồng trạng thái SAU lệnh (route) lên dữ liệu đọc — vắng = không đổi so với dữ liệu đọc", () => {
  const doc = [
    { legId: "L1", orderId: "o1", orderCode: "TD-1", moTruoc: true },
    { legId: "L2", orderId: "o1", orderCode: "TD-1", moTruoc: true },
    { legId: "L3", orderId: "o1", orderCode: "TD-1", moTruoc: false },
  ];
  const huy = changTheoSau({ doc, sau: { trangThai: "cancelled" }, nguoiDoc: ["p1"] });
  assert.deepEqual(huy.map((c) => c.dong), ["DON_HUY", "DON_HUY", "DON_HUY"]);
  const giao = changTheoSau({ doc, sau: { trangThai: "delivered" }, nguoiDoc: [] });
  assert.deepEqual(giao.map((c) => c.dong), ["DON_KHONG_XAC_NHAN", "DON_KHONG_XAC_NHAN", "DON_KHONG_XAC_NHAN"]);
  const bo = changTheoSau({ doc, sau: { trangThai: "confirmed", changDong: ["L2"] }, nguoiDoc: ["p1"] });
  assert.deepEqual(bo.map((c) => c.dong), [null, "BO_CHANG", "BO_CHANG"], "chặng đã đóng từ trước cũng là bỏ chặng");
  const so = changTheoSau({ doc, sau: { trangThai: "confirmed", soNguoiTheoChang: { L1: 4 }, nguoi: ["p2"] }, nguoiDoc: ["p1"], tangTheoChang: { L1: 2, L2: -1 } });
  assert.deepEqual(so.map((c) => [c.soNguoi, c.nguoi, c.tang]), [[4, ["p2"], 2], [null, ["p2"], 0], [null, ["p2"], 0]]);
  const doc0 = changTheoSau({ doc, sau: { trangThai: "confirmed" }, nguoiDoc: ["p1"] });
  assert.deepEqual(doc0[0]!.nguoi, ["p1"], "vắng nguoi → khoá người đọc được");
});

test("LC-18: mô tả khúc chỉ mã chuyến, mã đơn, nhãn nguyên nhân cố định, con số — không khoá người", () => {
  const t = chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "khoa-bi-mat"), suat("a2", "T1", "L1", null)]);
  const k = chay([chang("L1", { dong: "DON_HUY" })], [t]).khuc[0]!;
  assert.equal(moTaKhuc(k), "CX-01: máy cập nhật theo đơn — TD-1 (đơn huỷ): trả 2 ghế");
  const k2 = chay([chang("L1", { nguoi: ["n1"], soNguoi: 3, tang: 1 })], [chuyen("T1", "CX-01", [suat("a1", "T1", "L1", "cu"), suat("a2", "T1", "L1", null)])]).khuc[0]!;
  assert.equal(moTaKhuc(k2), "CX-01: máy cập nhật theo đơn — TD-1 (đổi người, thêm khách): trả 1 ghế, thêm 2 ghế");
  assert.doesNotMatch(moTaKhuc(k2), /khoa-bi-mat|n1|cu/);
});

test("S12 (kế hoạch mục 6): đơn KHÔNG còn `confirmed` (huỷ, nháp, đã giao, hoàn thành) → không bao giờ chèn suất, dù lệnh vừa tăng người hay đổi người (vị từ lc09)", () => {
  const doc = [{ legId: "L1", orderId: "o1", orderCode: "TD-1", moTruoc: true }];
  for (const trangThai of ["cancelled", "draft", "delivered", "completed"]) {
    const kq = dongBoChuyenTheoDon({
      chang: changTheoSau({ doc, sau: { trangThai, soNguoiTheoChang: { L1: 4 }, nguoi: ["p9", "p8", "p7", "p6"] }, nguoiDoc: [], tangTheoChang: { L1: 2 } }),
      chuyen: [chuyen("T1", "CX-1", [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", null)])],
      suatMoCuaChang: [suat("a1", "T1", "L1", "p1"), suat("a2", "T1", "L1", null)],
      newId: () => "moi",
    });
    assert.equal(kq.khuc.flatMap((k) => k.mo).length, 0, `${trangThai}: không mở suất nào`);
    assert.deepEqual(kq.khuc.flatMap((k) => k.dong.map((d) => d.lyDo)), ["REMOVED", "REMOVED"], `${trangThai}: đóng hết (luật (i))`);
  }
});

test("changChoNutTay (Đ2.11): chặng trong lịch theo cờ — huỷ → không xác nhận → bỏ chặng (cùng thứ tự lý do giữ); chặng rơi khỏi lịch theo I38; chỉ dời ngày / không đọc được cờ → bỏ qua", () => {
  const vao = (o: Partial<{ donDaHuy: boolean; donDaXacNhan: boolean; changMo: boolean }>) => ({
    orderId: "o1", orderCode: "TD-1", donDaHuy: false, donDaXacNhan: true, changMo: true, soNguoi: 2, nguoiCuaDon: ["p1", "p2"], ...o,
  });
  const chang = new Map([
    ["L1", vao({})], ["L2", vao({ donDaHuy: true, donDaXacNhan: false, changMo: false })], ["L3", vao({ donDaXacNhan: false, changMo: false })], ["L4", vao({ changMo: false })],
  ]);
  const changNgoai = [
    { legId: "N1", orderId: "o2", orderCode: "TD-2", lyDo: "DON_DA_HUY" as const }, { legId: "N2", orderId: "o2", orderCode: "TD-2", lyDo: "CHANG_DA_DONG" as const },
    { legId: "N3", orderId: "o2", orderCode: "TD-2", lyDo: "CHANG_KHONG_HOP_LE" as const }, { legId: "N4", orderId: "o2", orderCode: "TD-2", lyDo: "GIO_HEN_NGOAI_CHUYEN" as const },
  ];
  const kq = changChoNutTay({ legIds: ["L1", "L2", "L3", "L4", "N1", "N2", "N3", "N4", "LA"], chang, changNgoai });
  assert.deepEqual(kq.map((c) => [c.legId, c.dong, c.soNguoi, c.tang]), [
    ["L1", null, 2, 0], ["L2", "DON_HUY", 2, 0], ["L3", "DON_KHONG_XAC_NHAN", 2, 0], ["L4", "BO_CHANG", 2, 0],
    ["N1", "DON_HUY", null, 0], ["N2", "BO_CHANG", null, 0], ["N3", "DON_KHONG_XAC_NHAN", null, 0],
  ], "N4 (chỉ dời ngày) và LA (không đọc được cờ) bị bỏ qua — không đoán");
  assert.deepEqual(kq[0]!.nguoi, ["p1", "p2"]);
});
