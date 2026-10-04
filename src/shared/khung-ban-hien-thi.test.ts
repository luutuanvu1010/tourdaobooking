// Luật HIỂN THỊ trang "Lịch xe bận" + dải bận Điều phối xe (ADR-0055 VK2-A; kế hoạch Đợt 3 Task 10; bản vẽ docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html).
// BẮT BUỘC chạy ở ba múi: TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles (múi âm bắt lỗi tính tuần theo giờ máy — sổ hàng rào).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauHoiRut, cauLoiChongChuyen, daiBanTrenLich, docFormKhungBan, luoiTuanXeBan, tuanXem, type FormKhungBan } from "./khung-ban-hien-thi.ts";
import type { KhungBanXeDto, LichXeBanResponse } from "./contracts.ts";

const ms = (d: string, hhmm: string) => Date.parse(`${d}T${hhmm}:00.000+07:00`);
const kb = (id: string, xeId: string, tu: [string, string], den: [string, string], o: Partial<KhungBanXeDto> = {}): KhungBanXeDto => {
  const a = ms(...tu);
  const b = ms(...den);
  return { id, xeId, batDau: new Date(a).toISOString(), ketThuc: new Date(b).toISOString(), batDauMs: a, ketThucMs: b, lyDoMa: "BAN_XE_BAO_DUONG", lyDo: "Bảo dưỡng", daRut: false, daQua: false, version: 1, ...o };
};
const XE = [
  { id: "x1", bienSo: "79A-123.45", soCho: 16, trangThai: "active" as const, chuXe: "Tour Đảo", chuLaCongTy: true },
  { id: "x2", bienSo: "79B-678.90", soCho: 29, trangThai: "maintenance" as const, chuXe: "Tour Đảo", chuLaCongTy: true },
];
const lich = (o: Partial<LichXeBanResponse> = {}): LichXeBanResponse => ({ tu: "2026-09-28", den: "2026-10-04", xe: XE, khung: [], chuyen: [], lyDo: [], ...o });

test("tuanXem: một luật với máy chủ (vnWeekRange) — thứ Hai → Chủ nhật; nhãn '28/09 – 04/10/2026'; truoc / sau lệch đúng 7 ngày; Chủ nhật vẫn cùng tuần", () => {
  assert.deepEqual(tuanXem(null, "2026-10-02"), { tu: "2026-09-28", den: "2026-10-04", truoc: "2026-09-21", sau: "2026-10-05", nhan: "28/09 – 04/10/2026" });
  assert.equal(tuanXem("2026-10-04", "2026-10-02").tu, "2026-09-28", "Chủ nhật");
  assert.equal(tuanXem("2026-10-05", "2026-10-02").tu, "2026-10-05", "thứ Hai — múi âm không được lùi sang tuần trước");
  assert.equal(tuanXem("2026-12-30", "2026-10-02").nhan, "28/12 – 03/01/2027", "qua năm: năm của ngày cuối");
  assert.equal(tuanXem("abc", "2026-10-02").tu, "2026-09-28", "tu sai khuôn → tuần hôm nay");
});

test("luoiTuanXeBan: 7 ngày 'THỨ 2' … 'CN' + 'dd/mm', đánh dấu hôm nay; hàng xe: biển số, 'Xe 16 chỗ', chip 'Bảo dưỡng' khi xe đang bảo dưỡng", () => {
  const g = luoiTuanXeBan(lich(), "2026-10-02", ms("2026-10-02", "09:00"));
  assert.deepEqual(g.ngay.map((n) => n.thu), ["THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7", "CN"]);
  assert.deepEqual(g.ngay.map((n) => n.nhan), ["28/09", "29/09", "30/09", "01/10", "02/10", "03/10", "04/10"]);
  assert.deepEqual(g.ngay.map((n) => n.homNay), [false, false, false, false, true, false, false]);
  assert.deepEqual(g.hang.map((r) => [r.bienSo, r.soChoNhan, r.trangThaiNhan, r.o.length]), [["79A-123.45", "Xe 16 chỗ", null, 7], ["79B-678.90", "Xe 29 chỗ", "Bảo dưỡng", 7]]);
  assert.equal(g.soLichBan, 0);
});

test("Review Focus 1 ở tầng màn: khung 23:00 CN 04/10 → 07:00 T2 05/10 — tuần 28/09 có 'từ 23:00' ở ô 04/10; tuần 05/10 có 'đến 07:00' ở ô 05/10", () => {
  const k = kb("q", "x1", ["2026-10-04", "23:00"], ["2026-10-05", "07:00"]);
  const a = luoiTuanXeBan(lich({ khung: [k] }), "2026-10-02", 0);
  assert.deepEqual(a.hang[0]!.o.map((o) => o.map((m) => m.gio)), [[], [], [], [], [], [], ["từ 23:00"]]);
  const b = luoiTuanXeBan(lich({ tu: "2026-10-05", den: "2026-10-11", khung: [k] }), "2026-10-02", 0);
  assert.deepEqual(b.hang[0]!.o[0]!.map((m) => m.gio), ["đến 07:00"]);
  assert.equal(a.soLichBan, 1);
});

test("'Cả ngày' khi phủ trọn [00:00, 24:00) và chỉ ở ô đó; khung 3 ngày → 3 ô (giữa 'Cả ngày'), đếm 1 lịch bận; khung trong ngày '06:30–16:00'", () => {
  const tron = kb("a", "x1", ["2026-09-29", "00:00"], ["2026-09-30", "00:00"]);
  const ba = kb("b", "x2", ["2026-09-30", "08:00"], ["2026-10-02", "17:00"], { lyDo: "Sửa chữa" });
  const ngan = kb("c", "x1", ["2026-10-01", "06:30"], ["2026-10-01", "16:00"]);
  const g = luoiTuanXeBan(lich({ khung: [tron, ba, ngan] }), "2026-10-02", 0);
  assert.deepEqual(g.hang[0]!.o.map((o) => o.map((m) => m.gio)), [[], ["Cả ngày"], [], ["06:30–16:00"], [], [], []]);
  assert.deepEqual(g.hang[1]!.o.map((o) => o.map((m) => m.gio)), [[], [], ["từ 08:00"], ["Cả ngày"], ["đến 17:00"], [], []]);
  assert.equal(g.hang[1]!.o[2]![0]!.nhan, "Sửa chữa");
  assert.equal(g.soLichBan, 3);
});

test("rutDuoc: khung còn hiệu lực chưa qua → true; khung đã qua → false; mục CHUYEN chỉ mã CX + giờ, mở Chi tiết chuyến, không ✕, danh sách trắng", () => {
  const con = kb("a", "x1", ["2026-10-02", "08:00"], ["2026-10-02", "17:00"]);
  const qua = kb("b", "x1", ["2026-09-29", "08:00"], ["2026-09-29", "17:00"]);
  const g = luoiTuanXeBan(lich({
    khung: [con, qua],
    chuyen: [{ id: "t1", ma: "CX-0110-01", xeId: "x1", batDauMs: ms("2026-10-01", "09:00"), ketThucMs: ms("2026-10-01", "11:00"), trangThai: "PLANNED" }],
  }), "2026-10-02", ms("2026-10-02", "09:00"));
  assert.equal(g.hang[0]!.o[4]![0]!.rutDuoc, true);
  assert.equal(g.hang[0]!.o[4]![0]!.version, 1);
  assert.equal(g.hang[0]!.o[1]![0]!.rutDuoc, false);
  const cx = g.hang[0]!.o[3]![0]!;
  assert.deepEqual(cx, { loai: "CHUYEN", id: "t1", gio: "09:00–11:00", nhan: "CX-0110-01", rutDuoc: false, version: null, href: "/chuyen?id=t1" });
  assert.equal(g.soLichBan, 2, "chỉ đếm khung, không đếm chuyến");
});

test("mục trong một ô xếp theo giờ bắt đầu (khung và chuyến xen nhau)", () => {
  const g = luoiTuanXeBan(lich({
    khung: [kb("k", "x1", ["2026-10-01", "13:00"], ["2026-10-01", "17:00"])],
    chuyen: [{ id: "t", ma: "CX-1", xeId: "x1", batDauMs: ms("2026-10-01", "07:00"), ketThucMs: ms("2026-10-01", "09:00"), trangThai: "ENDED" }],
  }), "2026-10-02", 0);
  assert.deepEqual(g.hang[0]!.o[3]!.map((m) => m.loai), ["CHUYEN", "BAN"]);
});

test("cauHoiRut: câu hỏi xác nhận rút (lệnh vẽ trạng thái 5)", () => {
  assert.equal(cauHoiRut({ loai: "BAN", id: "a", gio: "08:00–17:00", nhan: "Bảo dưỡng", rutDuoc: true, version: 1, href: null }, "2026-10-03"),
    "Rút lịch bận Bảo dưỡng 08:00–17:00 03/10? Xe sẽ xếp chuyến được trong giờ này.");
  assert.equal(cauHoiRut({ loai: "BAN", id: "a", gio: "Cả ngày", nhan: "Đăng kiểm", rutDuoc: true, version: 1, href: null }, "2026-10-03"),
    "Rút lịch bận Đăng kiểm cả ngày 03/10? Xe sẽ xếp chuyến được trong giờ này.");
});

test("daiBanTrenLich: phút trong ngày VN, kẹp [0, 1440]; khung qua nửa đêm có ở D (1380–1440) và D+1 (0–420); nhãn 'Xe bận … · lý do'", () => {
  const ds = [{ id: "k", xeId: "x1", bienSo: "79A", batDau: new Date(ms("2026-10-05", "23:00")).toISOString(), ketThuc: new Date(ms("2026-10-06", "07:00")).toISOString(), lyDo: "Bảo dưỡng" }];
  assert.deepEqual(daiBanTrenLich(ds, "2026-10-05"), [{ xeId: "x1", tuPhut: 1380, denPhut: 1440, gio: "23:00–24:00", nhan: "Xe bận 23:00–24:00 · Bảo dưỡng" }]);
  assert.deepEqual(daiBanTrenLich(ds, "2026-10-06"), [{ xeId: "x1", tuPhut: 0, denPhut: 420, gio: "00:00–07:00", nhan: "Xe bận 00:00–07:00 · Bảo dưỡng" }]);
  assert.deepEqual(daiBanTrenLich(ds, "2026-10-07"), []);
});

test("cauLoiChongChuyen: liệt kê mọi chuyến trùng (mã + giờ)", () => {
  assert.equal(cauLoiChongChuyen({ code: "khung_ban_chong_chuyen", message: "x", chuyen: [{ ma: "CX-0510-01", gio: "09:00 05/10 → 11:00 05/10" }, { ma: "CX-0510-02", gio: "13:00 05/10 → 14:00 05/10" }] }),
    "Xe đang có 2 chuyến trùng: CX-0510-01 (09:00 05/10 → 11:00 05/10), CX-0510-02 (13:00 05/10 → 14:00 05/10) — dời hoặc đổi xe chuyến đó trước.");
});

test("docFormKhungBan: 'Đến ngày' trống → lấy Ngày; Đến ngày trước Ngày → lỗi ô denNgay; thiếu lý do → ô lyDo; khung đã qua → ô denGio; hợp lệ → thân máy chủ", () => {
  const NOW = ms("2026-10-02", "09:00");
  const f = (o: Partial<FormKhungBan> = {}): FormKhungBan => ({ xeId: "x1", ngay: "2026-10-03", denNgay: "", tuGio: "07:00", denGio: "17:00", lyDo: "BAN_XE_BAO_DUONG", ...o });
  assert.deepEqual(docFormKhungBan(f(), NOW), { ok: true, xeId: "x1", value: { batDau: { ngay: "2026-10-03", gio: "07:00" }, ketThuc: { ngay: "2026-10-03", gio: "17:00" }, lyDo: "BAN_XE_BAO_DUONG" } });
  assert.deepEqual(docFormKhungBan(f({ denNgay: "2026-10-05" }), NOW).ok, true);
  const loi = (o: Partial<FormKhungBan>) => { const r = docFormKhungBan(f(o), NOW); assert.equal(r.ok, false, JSON.stringify(o)); return r.ok ? {} : r.loi; };
  assert.match(loi({ denNgay: "2026-10-02" }).denNgay ?? "", /trước/);
  assert.match(loi({ lyDo: "" }).lyDo ?? "", /Chọn lý do/);
  assert.match(loi({ ngay: "2026-10-01", tuGio: "07:00", denGio: "08:00" }).denGio ?? "", /đã qua/);
  assert.match(loi({ tuGio: "17:00", denGio: "07:00" }).denGio ?? "", /sau giờ bắt đầu/);
  assert.match(loi({ xeId: "" }).xeId ?? "", /Chọn xe/);
  assert.match(loi({ tuGio: "" }).tuGio ?? "", /giờ/);
  assert.match(loi({ denNgay: "2026-11-30" }).denNgay ?? "", /31 ngày/);
  // Qua đêm một lần: 23:00 → 07:00 hôm sau.
  assert.deepEqual(docFormKhungBan(f({ tuGio: "23:00", denNgay: "2026-10-04", denGio: "07:00" }), NOW).ok, true);
});
