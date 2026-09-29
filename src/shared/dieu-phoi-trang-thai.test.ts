// Trạng thái của một chặng — HÌNH CHIẾU tính lúc đọc ([TK] §2.5, phần lượt 1 — chưa có "đang chuyển"; kế hoạch Task A4, TC-16). Mỗi trạng thái có ít nhất
// một ca; nhãn mốc (sát / quá mốc), đặt gấp, xếp một phần, vắng, khách huỷ; xe gián đoạn → phần chưa đi quay về "Chưa xếp".
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChangVao, ChinhSachVao, SuatVao, TrangThaiChuyen } from "./dieu-phoi-kieu.ts";
import { NHAN_TRANG_THAI_CHANG, TRANG_THAI_CHANG, trangThaiChang } from "./dieu-phoi-trang-thai.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const CS: ChinhSachVao = { id: "cs-1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false };
const LEG = ms("2026-09-30", "06:30");
const XA = LEG - 20 * 3600e3; // còn 20 giờ — bình thường
const chang = (v: Partial<ChangVao> = {}): ChangVao => ({
  legId: "leg-1", orderId: "don-1", orderCode: "ĐH-1024", chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true,
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: 4, nguoiCuaDon: ["p1", "p2", "p3", "p4"], datGap: false,
  khoaNoiDon: "L:noi-d1", khoaNoiTra: "L:noi-d9", ...v, // khoá so sánh nơi GIẢ (ADR-0050 VK1-B)
});
const suat = (id: string, trangThai: SuatVao["trangThai"], v: Partial<SuatVao> = {}): SuatVao => ({
  id, tripId: "cx-07", loai: "PASSENGER", legId: "leg-1", personKey: null, crewPartyId: null, boardStopId: "d1", alightStopId: "d9", trangThai, mo: true,
  moTuMs: LEG - 24 * 3600e3, ...v, // giờ ghi nhận mở suất GIẢ (ADR-0050 VK1-A vế 5)
});
const chuyen = (trangThai: TrangThaiChuyen, id = "cx-07") => ({ id, trangThai, batDauMs: LEG - 40 * PHUT, ketThucMs: LEG + 2 * 3600e3 });
const bon = (st: SuatVao["trangThai"][]) => st.map((s, i) => suat(`s${i}`, s));

test("TC-16 mỗi trạng thái của [TK] §2.5 (lượt 1) có ít nhất một ca; có nhãn tiếng Việt", () => {
  const ca: [string, ReturnType<typeof trangThaiChang>["trangThai"]][] = [
    ["nháp", trangThaiChang(chang({ donDaXacNhan: false }), [], [], CS, XA).trangThai],
    ["chưa xếp", trangThaiChang(chang(), [], [], CS, XA).trangThai],
    ["đã xếp", trangThaiChang(chang(), bon(["WAITING", "WAITING", "WAITING", "WAITING"]), [chuyen("PLANNED")], CS, XA).trangThai],
    ["chờ đón", trangThaiChang(chang(), bon(["WAITING", "WAITING", "WAITING", "WAITING"]), [chuyen("RUNNING")], CS, XA).trangThai],
    ["đã đón", trangThaiChang(chang(), bon(["BOARDED", "BOARDED", "WAITING", "WAITING"]), [chuyen("RUNNING")], CS, XA).trangThai],
    ["đã trả", trangThaiChang(chang(), bon(["DROPPED", "DROPPED", "DROPPED", "NO_SHOW"]), [chuyen("RUNNING")], CS, XA).trangThai],
    ["xong", trangThaiChang(chang(), bon(["DROPPED", "DROPPED", "DROPPED", "DROPPED"]), [chuyen("ENDED")], CS, XA).trangThai],
    ["giữ", trangThaiChang(chang({ donDaHuy: true }), bon(["WAITING"]), [chuyen("PLANNED")], CS, XA).trangThai],
    ["đã bỏ", trangThaiChang(chang({ changMo: false }), [], [], CS, XA).trangThai],
  ];
  assert.deepEqual(ca.map(([, t]) => t), ["DON_NHAP", "CHUA_XEP", "DA_XEP", "CHO_DON", "DA_DON", "DA_TRA", "XONG", "GIU", "DA_BO"]);
  assert.deepEqual([...TRANG_THAI_CHANG].sort(), [...ca.map(([, t]) => t)].sort(), "mọi trạng thái đều có ca");
  for (const t of TRANG_THAI_CHANG) assert.ok(NHAN_TRANG_THAI_CHANG[t].trim().length > 0, t);
});

test("đếm: đã đón n/N = đã lên + đã trả; vắng, khách huỷ có nhãn; suất đã đóng và suất của chuyến huỷ không tính", () => {
  const r = trangThaiChang(chang(), [...bon(["BOARDED", "DROPPED", "NO_SHOW", "CANCELLED_AT_STOP"]), suat("dong", "WAITING", { mo: false }), suat("huy", "WAITING", { tripId: "cx-huy" })], [chuyen("RUNNING"), chuyen("CANCELLED", "cx-huy")], CS, XA);
  assert.deepEqual({ tt: r.trangThai, soNguoi: r.soNguoi, xep: r.soDaXep, don: r.soDaDon, tra: r.soDaTra, vang: r.soVang, huy: r.soKhachHuy }, { tt: "DA_DON", soNguoi: 4, xep: 4, don: 2, tra: 1, vang: 1, huy: 1 });
  assert.deepEqual(r.nhan, ["VANG", "KHACH_HUY"]);
});

test("TC-16 nhãn mốc cho phần CHƯA xếp: quá mốc (359 phút) đỏ, đúng mốc 360 phút → sát mốc (vàng), xa → không nhãn; đặt gấp có nhãn; chưa chốt giờ", () => {
  assert.deepEqual(trangThaiChang(chang(), [], [], CS, LEG - 359 * PHUT).nhan, ["QUA_MOC"]);
  assert.deepEqual(trangThaiChang(chang(), [], [], CS, LEG - 360 * PHUT).nhan, ["SAT_MOC"]);
  assert.deepEqual(trangThaiChang(chang(), [], [], CS, LEG - 480 * PHUT).nhan, []);
  assert.deepEqual(trangThaiChang(chang({ datGap: true }), [], [], CS, LEG - 100 * PHUT).nhan, ["QUA_MOC", "DAT_GAP"]);
  assert.deepEqual(trangThaiChang(chang({ gioDon: null }), [], [], CS, XA).nhan, ["CHUA_CHOT_GIO"]);
  assert.deepEqual(trangThaiChang(chang(), [], [], null, LEG - 100 * PHUT).nhan, [], "chính sách rỗng: không đoán mốc");
  // Đã xếp đủ → không còn cảnh báo mốc.
  assert.deepEqual(trangThaiChang(chang(), bon(["WAITING", "WAITING", "WAITING", "WAITING"]), [chuyen("PLANNED")], CS, LEG - 100 * PHUT).nhan, []);
  // Đơn nháp dưới mốc (chờ Quản trị duyệt đặt gấp) cũng có nhãn.
  assert.deepEqual(trangThaiChang(chang({ donDaXacNhan: false }), [], [], CS, LEG - 100 * PHUT).nhan, ["QUA_MOC"]);
});

test("xếp một phần (tách đoàn chưa đủ), thừa suất; xe gián đoạn → suất đóng TRIP_INTERRUPTED không tính → quay về 'Chưa xếp'", () => {
  const motPhan = trangThaiChang(chang(), bon(["WAITING", "WAITING"]), [chuyen("PLANNED")], CS, XA);
  assert.deepEqual([motPhan.trangThai, motPhan.nhan], ["DA_XEP", ["XEP_MOT_PHAN"]]);
  const thua = trangThaiChang(chang({ soNguoi: 3 }), bon(["WAITING", "WAITING", "WAITING", "WAITING"]), [chuyen("PLANNED")], CS, XA);
  assert.deepEqual(thua.nhan, ["THUA_SUAT"]);
  const gianDoan = trangThaiChang(chang(), [suat("a", "BOARDED", { mo: false }), suat("b", "WAITING", { mo: false })], [chuyen("ENDED_INTERRUPTED")], CS, XA);
  assert.equal(gianDoan.trangThai, "CHUA_XEP");
  // Hai chuyến (tách đoàn): một đang chạy chờ đón, một chưa chạy → "chờ đón"; một phần đã xong, phần kia chưa → "đã trả" chưa phải "xong".
  const tach = trangThaiChang(chang(), [suat("a", "WAITING"), suat("b", "WAITING"), suat("c", "WAITING", { tripId: "cx-04" }), suat("d", "WAITING", { tripId: "cx-04" })], [chuyen("RUNNING"), chuyen("PLANNED", "cx-04")], CS, XA);
  assert.equal(tach.trangThai, "CHO_DON");
  const traMotXe = trangThaiChang(chang(), [suat("a", "DROPPED"), suat("b", "DROPPED"), suat("c", "DROPPED", { tripId: "cx-04" }), suat("d", "DROPPED", { tripId: "cx-04" })], [chuyen("ENDED"), chuyen("RUNNING", "cx-04")], CS, XA);
  assert.equal(traMotXe.trangThai, "DA_TRA");
});
