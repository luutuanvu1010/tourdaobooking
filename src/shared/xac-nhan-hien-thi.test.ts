// ADR-0136 Task 3.5: chữ hiển thị của bước xác nhận — thuần, đồng hồ TIÊM (`nowMs`), không tính lại hạn (hạn do máy chủ gửi, `hanXacNhan`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_NHO_DAT_GAP, CAU_THIEU_GIO_LUOT, CAU_TIEN_KHOA_KHI_CHO, NHAN_CAN_DAT_GAP, NHAN_QUA_HAN, dongChoXacNhan, dongGioConVe, nhanGhiChuDichVu, nhanGioLuot, nhanLyDoCanXacNhan, NHAN_NUT_XAC_NHAN, NHAN_KET_QUA, cauLoiGuiDon } from "./xac-nhan-hien-thi.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { LegDto } from "./contracts.ts";

const HAN = "2026-10-26T03:15:00.000Z"; // 10:15 giờ Việt Nam

test("dải chờ: còn N phút (làm tròn LÊN), đúng hạn chưa quá, sau hạn = Quá hạn", () => {
  const han = Date.parse(HAN);
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han - 14 * 60_000 }), { text: "Chờ xác nhận · còn 14 phút", quaHan: false });
  assert.equal(dongChoXacNhan({ hanLuc: HAN, nowMs: han - 30_000 }).text, "Chờ xác nhận · còn 1 phút");
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han }), { text: "Chờ xác nhận · còn 0 phút", quaHan: false });
  assert.deepEqual(dongChoXacNhan({ hanLuc: HAN, nowMs: han + 1 }), { text: "Chờ xác nhận · Quá hạn", quaHan: true });
});

test("dải chờ qua đêm (22:00–06:00 không tính): còn hơn 1 giờ thì nói GIỜ HẠN theo giờ Việt Nam, không nói «còn 500 phút»", () => {
  const han = Date.parse("2026-10-26T23:10:00.000Z"); // 06:10 sáng 27/10 giờ VN
  const r = dongChoXacNhan({ hanLuc: new Date(han).toISOString(), nowMs: han - 8 * 3600_000 });
  assert.equal(r.text, "Chờ xác nhận · hạn 06:10 27/10/2026");
  assert.equal(r.quaHan, false);
});

test("không lộ mã thô: lý do cần xác nhận và kết quả đều là chữ đời thường", () => {
  assert.equal(nhanLyDoCanXacNhan(["DICH_VU"]), "Có dịch vụ cần xác nhận còn vé.");
  assert.equal(nhanLyDoCanXacNhan(["DAT_GAP"]), "Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.");
  assert.equal(nhanLyDoCanXacNhan(["DICH_VU", "DAT_GAP"]), "Có dịch vụ cần xác nhận còn vé. Có lượt đón dưới hạn chốt, cần Quản trị đặt gấp.");
  assert.equal(nhanLyDoCanXacNhan([]), "");
  assert.deepEqual(NHAN_KET_QUA, { CON_VE: "Còn vé, xác nhận đơn", HET_VE: "Hết vé", HUY: "Huỷ" });
  assert.equal(NHAN_NUT_XAC_NHAN.send, "Gửi kiểm vé");
  assert.equal(NHAN_NUT_XAC_NHAN.withdraw, "Rút lại");
  assert.equal(NHAN_NUT_XAC_NHAN.submit, "Gửi đơn");
  for (const v of Object.values(NHAN_NUT_XAC_NHAN)) assert.ok(!/[A-Z_]{4,}/.test(v), v);
});

test("nhãn thẻ danh sách chờ đúng chữ kế hoạch", () => {
  assert.equal(NHAN_CAN_DAT_GAP, "Cần Quản trị đặt gấp");
  assert.equal(NHAN_QUA_HAN, "Quá hạn");
});

test("đơn đang chờ: tiền chỉ đọc — câu giải thích nói cách đổi tiền theo Hướng 2 (Huỷ rồi lập lại)", () => {
  assert.match(CAU_TIEN_KHOA_KHI_CHO, /Huỷ/);
  assert.match(CAU_TIEN_KHOA_KHI_CHO, /tiền/);
});

test("lỗi gửi đơn sau khi lưu: câu báo ở trang nháp nói rõ đơn ĐÃ LƯU và lý do máy chủ", () => {
  assert.equal(cauLoiGuiDon("Giá danh mục vừa đổi."), "Đơn đã được lưu nháp nhưng chưa gửi được: Giá danh mục vừa đổi.");
  assert.equal(cauLoiGuiDon(""), "Đơn đã được lưu nháp nhưng chưa gửi được. Hãy mở đơn và bấm Gửi đơn lại.");
});

// ---- Đợt 3 (ADR-0154 Đ1.3, Đ1.4; kế hoạch lượt 2 Task 3.3): bảng Còn vé liệt kê MỌI lượt mở; lượt bắt buộc chỉ khi yêu cầu mang cờ «cần chốt giờ» và là LƯỢT ĐẦU theo changDauCuaDichVu ----
let dem = 0;
const leg = (direction: "OUT" | "RETURN", pickupDate: string | null, pickupTime: string | null): LegDto => ({
  id: `l${++dem}`, direction, pickupDate, pickupTime, pickupLocationId: null, pickupPlace: "KS", pickupLabel: "KS", dropoffLocationId: null, dropoffPlace: null, dropoffLabel: null,
  updatedAt: "t", flightCode: null, paxOverride: null, exclusiveVehicle: false, minVehicleSeats: null, pickupSlotEnd: null, datGap: null,
});
const dv = (id: string, name: string, legs: LegDto[], note: string | null = null) => ({ id, name, note, legs });
const NGAY = "2026-11-10";

test("dongGioConVe: yêu cầu mang cờ — chiều đi trống giờ là lượt bắt buộc, chiều về có giờ 16:00 thì không; nhãn chiều là «Chiều đi» / «Chiều về»", () => {
  const di = leg("OUT", NGAY, null);
  const ve = leg("RETURN", NGAY, "16:00");
  const r = dongGioConVe([dv("s1", "Tour 4 đảo", [di, ve])], true);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.serviceId, "s1");
  assert.deepEqual(r[0]!.luot.map((x) => [x.leg.id, x.batBuoc, x.nhanChieu]), [[di.id, true, "Chiều đi"], [ve.id, false, "Chiều về"]]);
});

test("dongGioConVe: không cờ — không lượt nào bắt buộc nhưng vẫn liệt kê lượt trống giờ", () => {
  const di = leg("OUT", NGAY, null);
  const ve = leg("RETURN", NGAY, null);
  const r = dongGioConVe([dv("s1", "Tour", [di, ve])], false);
  assert.deepEqual(r[0]!.luot.map((x) => [x.leg.id, x.batBuoc]), [[di.id, false], [ve.id, false]], "đơn văn phòng không cờ: ô giờ hiện để sửa, không bắt buộc");
});

test("dongGioConVe: lượt đầu đã có giờ thì không lượt nào bắt buộc dù chiều về trống; lượt đầu theo chiều đi trước chiều về (không theo thứ tự mảng), kể cả chiều về nằm trước", () => {
  const ve = leg("RETURN", NGAY, null);
  const di = leg("OUT", NGAY, "07:30");
  assert.deepEqual(dongGioConVe([dv("s1", "Tour", [ve, di])], true)[0]!.luot.map((x) => x.batBuoc), [false, false]);
  const ve2 = leg("RETURN", "2026-11-09", "16:00");
  const di2 = leg("OUT", NGAY, null);
  assert.deepEqual(dongGioConVe([dv("s1", "Tour", [ve2, di2])], true)[0]!.luot.map((x) => [x.leg.id, x.batBuoc]), [[ve2.id, false], [di2.id, true]], "chiều đi trước chiều về bất kể ngày (ruling R7)");
  const chiVe = leg("RETURN", NGAY, null);
  assert.deepEqual(dongGioConVe([dv("s1", "Tour", [chiVe])], true)[0]!.luot.map((x) => x.batBuoc), [true], "chỉ có chiều về: lượt đầu là chiều về");
});

test("dongGioConVe: đơn hai dịch vụ — mỗi dịch vụ một lượt bắt buộc; dịch vụ có giờ rồi thì không", () => {
  const a = leg("OUT", NGAY, null);
  const b = leg("OUT", NGAY, null);
  const c = leg("OUT", NGAY, "08:00");
  const r = dongGioConVe([dv("s1", "Tour A", [a]), dv("s2", "Tour B", [b]), dv("s3", "Tour C", [c])], true);
  assert.deepEqual(r.map((x) => [x.serviceId, x.luot.filter((l) => l.batBuoc).length]), [["s1", 1], ["s2", 1], ["s3", 0]]);
});

test("dongGioConVe: ghi chú đi đúng dịch vụ; dịch vụ không lượt và không ghi chú (Không đón) không có khối; ghi chú chỉ có khoảng trắng coi như không có", () => {
  const r = dongGioConVe([dv("s1", "Tour A", [leg("OUT", NGAY, null)], "Đón 7h cổng khách sạn"), dv("s2", "Tour B", [leg("OUT", NGAY, null)], "  "), dv("s3", "Phao", []), dv("s4", "Cano", [], "Khách đi riêng")], true);
  assert.deepEqual(r.map((x) => [x.serviceId, x.ghiChu]), [["s1", "Đón 7h cổng khách sạn"], ["s2", null], ["s4", "Khách đi riêng"]]);
});

test("chữ của bảng Còn vé: nhãn giờ theo tên đã chọn, câu thiếu giờ, câu nhờ đặt gấp, nhãn ghi chú — không «chặng», không «mốc»", () => {
  assert.equal(nhanGioLuot("Chiều đi", "Tour 4 đảo", true), "Giờ đón · Chiều đi · Tour 4 đảo (bắt buộc)");
  assert.equal(nhanGioLuot("Chiều về", "Tour 4 đảo", false), "Giờ đón · Chiều về · Tour 4 đảo");
  assert.equal(nhanGhiChuDichVu("Tour 4 đảo"), "Ghi chú · Tour 4 đảo");
  assert.equal(CAU_THIEU_GIO_LUOT, "Chọn giờ đón cho lượt này.");
  assert.equal(CAU_NHO_DAT_GAP, "Giờ này đã qua hạn chốt. Nhờ Bán hàng hoặc Quản trị bấm Còn vé, xác nhận đơn kèm đặt gấp.");
});

const doc = (tep: string): string => readFileSync(fileURLToPath(new URL(`../../${tep}`, import.meta.url)), "utf8");

test("nối dây bảng Còn vé: web/xac-nhan-don-ui.ts đi qua dongGioConVe, không còn lọc lượt có giờ, gửi datGap theo lượt, không thêm confirm(", () => {
  const ui = doc("web/xac-nhan-don-ui.ts");
  assert.doesNotMatch(ui, /l\.pickupTime\s*!==\s*null/, "không còn chỉ liệt kê lượt đã có giờ");
  assert.match(ui, /dongGioConVe\(\s*order\.services\s*,\s*y\.vi\.includes\("CHOT_GIO"\)\s*\)/, "cờ «cần chốt giờ» lấy từ lý do của yêu cầu (máy chủ chụp)");
  assert.match(ui, /canhBaoChangForm\(/, "câu dưới hạn chốt dùng luật thuần chung với form lập đơn");
  assert.match(ui, /taoKhungDatGap\(\{[^}]*nutDuyetPhu:\s*true/, "khung đặt gấp của người có ô order.leg.short_notice");
  assert.match(ui, /datGap:\s*giay/, "giấy đặt gấp đi kèm gioDon của đúng lượt");
  assert.match(ui, /can\(c\.staff,\s*"order\.leg\.short_notice"\)/, "hiện khung đặt gấp theo bảng quyền, không theo mã quyền");
  assert.match(ui, /CAU_NHO_DAT_GAP/, "người không có ô được nhắc nhờ Bán hàng hoặc Quản trị");
  assert.match(ui, /CAU_THIEU_GIO_LUOT/, "thiếu lượt bắt buộc thì báo tại chỗ");
  assert.equal(ui.match(/\bconfirm\(/g)?.length, 2, "đúng hai confirm( cũ (Rút lại, Hết vé) — không thêm");
});

