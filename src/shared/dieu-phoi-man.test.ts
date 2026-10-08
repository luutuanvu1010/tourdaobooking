// Luật thuần của ba màn văn phòng B1 (Điều phối xe), B2 (Chi tiết chuyến), B3 (Tạo / sửa chuyến) — src/shared/dieu-phoi-man.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cauKhoaMoc, changChuaXep, chipChang, dieuKienXuatBen, gioHien, hinhDongThoiGian, idChoLenh, thanPhaLe, kieuChuyen, nhanDiem, dongNhatKy, soLieuDieuPhoi, truongLoiChuyen,
  viecCanXuLy, thayDieuPhoiXe, tuyenChuyen, nhanNgayXem, chuyenXepDuoc, dongGoiBao, dongBanChup, nhomKhach,
} from "./dieu-phoi-man.ts";
import type { ChangLichDto, ChuyenTomTatDto, LichChungResponse, LyDoGiuDto, NhatKyChuyenDto } from "./contracts.ts";
import type { PermissionCode } from "./permissions.ts";
import { vnLocalToMs } from "./vn-date.ts";

const NGAY = "2026-09-30";
const ms = (gio: string, ngay = NGAY) => vnLocalToMs(ngay, gio)!;
const g = (gio: string, ngay = NGAY) => ({ ngay, gio });
const ly = (ma: string, loiNhan: string, aiXuLy: LyDoGiuDto["aiXuLy"] = "VAN_PHONG"): LyDoGiuDto => ({ ma, loiNhan, aiXuLy, aiXuLyNhan: { VAN_PHONG: "Văn phòng", QUAN_TRI: "Quản trị", TOAN_QUYEN: "Toàn quyền" }[aiXuLy] });
const chang = (o: Partial<ChangLichDto> = {}): ChangLichDto => ({
  legId: "l1", orderId: "o1", maDon: "TD-1", tenDichVu: "Tour", chieu: "OUT", ngayDon: NGAY, gioDon: "10:15", noiDon: "Sunrise Nha Trang", noiTra: "Ga cáp treo Vinpearl", soNguoi: 4,
  soNguoiCoTen: 4, soHieuChuyenBay: null, xeRieng: false, choToiThieu: null, datGap: false, trangThai: "CHUA_XEP", trangThaiNhan: "Chưa xếp", nhan: [], soDaXep: 0, soDaDon: 0, soDaTra: 0, soVang: 0, soKhachHuy: 0, chuyen: [], ...o,
});
const chuyen = (o: Partial<ChuyenTomTatDto> = {}): ChuyenTomTatDto => ({
  id: "t1", ma: "CX-3009-07", trangThai: "PLANNED", trangThaiNhan: "Lên kế hoạch", version: 1, ngayChay: NGAY, batDau: g("09:00"), ketThuc: g("10:45"), batDauMs: ms("09:00"), ketThucMs: ms("10:45"),
  xe: { id: "x1", bienSo: "79B-123.45", soCho: 15, chuXe: "Tour Đảo", chuLaCongTy: true }, taiXe: { partyId: "p1", ten: "Nguyễn Văn An", loai: "CONG_TY" }, tai: 12, lyDoGiu: [],
  khoaMoc: { dangKhoa: false, tuLuc: g("03:00"), tuLucMs: ms("03:00") }, xuatBen: null, ketThucThat: null, diem: [], ...o,
});
const lich = (o: Partial<LichChungResponse> = {}): LichChungResponse => ({
  ngay: NGAY, mocToiThieuPhut: 360, canhBaoPhut: 120, chang: [], chuyen: [], soNhap: 0, nhapChoDatGap: [], canhBao: [], lyDo: [], xe: [], taiXe: [], ...o,
});

test("gioHien Kiểu D (V1.5b): khác NĂM ngày đang xem → kèm năm (chuyến qua giao thừa)", () => {
  assert.equal(gioHien({ ngay: "2027-01-01", gio: "06:00" }, "2026-12-31"), "06:00 01/01/2027");
  assert.equal(gioHien({ ngay: "2026-12-31", gio: "23:00" }, "2027-01-01"), "23:00 31/12/2026");
});
test("gioHien: 'HH:MM' cùng ngày; khác ngày thêm 'dd/mm'", () => {
  assert.equal(gioHien(g("09:00"), NGAY), "09:00");
  assert.equal(gioHien(g("00:40", "2026-10-01"), NGAY), "00:40 01/10");
});

test("chipChang: nhãn tiếng Việt theo mã (quá mốc đỏ, sát mốc cát, đặt gấp, xếp một phần), 'Thiếu tên' khi chưa đủ tên — không lộ mã", () => {
  assert.deepEqual(chipChang(chang({ nhan: ["QUA_MOC", "DAT_GAP"] })), [{ nhan: "Quá mốc", tone: "danger" }, { nhan: "Đặt gấp", tone: "unit" }]);
  assert.deepEqual(chipChang(chang({ nhan: ["SAT_MOC"], soNguoiCoTen: 1 })), [{ nhan: "Sát mốc", tone: "warn" }, { nhan: "Thiếu tên", tone: "warn" }]);
  assert.deepEqual(chipChang(chang({ nhan: ["XEP_MOT_PHAN", "CHUA_CHOT_GIO", "LA_MA"] })), [{ nhan: "Xếp một phần", tone: "warn" }, { nhan: "Chưa chốt giờ", tone: "muted" }]);
});

test("changChuaXep: chặng chưa xếp hoặc xếp một phần, còn lại = số người − đã xếp, xếp theo giờ đón; bỏ chặng đã xếp đủ / đã bỏ / nháp / giữ", () => {
  const ds = changChuaXep(lich({
    chang: [
      chang({ legId: "b", gioDon: "14:20" }),
      chang({ legId: "a", gioDon: "10:15" }),
      chang({ legId: "c", trangThai: "DA_XEP", soDaXep: 4 }),
      chang({ legId: "d", trangThai: "DA_XEP", soDaXep: 1, nhan: ["XEP_MOT_PHAN"] }),
      chang({ legId: "e", trangThai: "DA_BO" }),
      chang({ legId: "f", trangThai: "GIU" }),
      chang({ legId: "g", gioDon: null }),
    ],
  }));
  assert.deepEqual(ds.map((x) => [x.chang.legId, x.conLai]), [["a", 4], ["d", 3], ["b", 4], ["g", 4]]);
});

test("soLieuDieuPhoi: số liệu đầu màn (chặng, đã xếp, chưa xếp + sát / quá mốc, chuyến + bị giữ, cần xử lý, đơn nháp + chờ duyệt)", () => {
  const s = soLieuDieuPhoi(lich({
    chang: [chang({ legId: "a", nhan: ["QUA_MOC"] }), chang({ legId: "b", nhan: ["SAT_MOC"] }), chang({ legId: "c", trangThai: "DA_XEP", soDaXep: 4 }), chang({ legId: "d", trangThai: "DA_BO" })],
    chuyen: [chuyen({ lyDoGiu: [ly("THIEU_TEN", "Chưa đủ tên khách")] }), chuyen({ id: "t2" }), chuyen({ id: "t3", trangThai: "CANCELLED" })],
    soNhap: 2, nhapChoDatGap: [{ legId: "n", orderId: "o", maDon: "TD-9", ngayDon: NGAY, gioDon: "11:40" }],
  }), 5);
  assert.deepEqual(s, { chang: 3, daXep: 1, chuaXep: 2, satMoc: 1, quaMoc: 1, chuyen: 2, biGiu: 1, canXuLy: 5, nhap: 2, choDatGap: 1 });
});

test("viecCanXuLy: chuyến bị giữ (lý do + Ai xử lý theo NHAN_AI_XU_LY + nút theo cờ), cảnh báo lịch có nhãn, đơn nháp chờ duyệt; bỏ CHUYEN_GIU / NHAP_CHO_DAT_GAP / CHANG_SAT_MOC / CHINH_SACH_RONG; không nút Gọi / Đã gọi báo", () => {
  const L = lich({
    chang: [chang({ legId: "l1", nhan: ["QUA_MOC"], datGap: true }), chang({ legId: "l2", nhan: ["QUA_MOC"], gioDon: "11:00", noiTra: null })],
    chuyen: [
      chuyen({ lyDoGiu: [ly("NOI_HEN_DOI", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: TD-8")] }),
      chuyen({ id: "t2", ma: "CX-3009-04", batDau: g("08:30"), batDauMs: ms("08:30"), xe: { id: "x2", bienSo: "79B-678.90", soCho: 29, chuXe: "Tour Đảo", chuLaCongTy: true }, lyDoGiu: [ly("DIEU_KIEN_GIAY_TO_XE", "Xe thiếu hoặc hết hạn giấy tờ bắt buộc: 79B-678.90", "QUAN_TRI")] }),
      chuyen({ id: "t3", ma: "CX-3009-09", taiXe: null, lyDoGiu: [ly("CHUA_CO_TAI_XE", "Chuyến chưa có tài xế: CX-3009-09")] }),
      chuyen({ id: "t4", ma: "CX-3009-02", trangThai: "RUNNING" }),
    ],
    canhBao: [
      { loai: "CHANG_QUA_MOC", nhan: "Chặng đã quá mốc tối thiểu mà chưa xếp", legId: "l1", tripId: null, maDon: "TD-1" },
      { loai: "CHANG_QUA_MOC", nhan: "Chặng đã quá mốc tối thiểu mà chưa xếp", legId: "l2", tripId: null, maDon: "TD-2" },
      { loai: "CHANG_SAT_MOC", nhan: "Chặng sát mốc", legId: "l1", tripId: null, maDon: "TD-1" },
      { loai: "CHUYEN_GIU", nhan: "Chuyến đang bị giữ", legId: null, tripId: "t1", maDon: null },
      { loai: "NHAP_CHO_DAT_GAP", nhan: "Đơn nháp…", legId: "n", tripId: null, maDon: "TD-9" },
      { loai: "CHINH_SACH_RONG", nhan: "Chưa có chính sách", legId: null, tripId: null, maDon: null },
      { loai: "NOI_HEN_KHAC_DIEM", nhan: "Nơi đón / trả của đơn khác điểm của xe", legId: "l1", tripId: "t4", maDon: "TD-1" },
      { loai: "GIO_XE_TOI_MUON_HON_HEN", nhan: "Giờ xe tới muộn hơn giờ hẹn", legId: "l1", tripId: "t4", maDon: "TD-1" },
    ],
    nhapChoDatGap: [{ legId: "n", orderId: "o9", maDon: "TD-9", ngayDon: NGAY, gioDon: "11:40" }],
  });
  const v = viecCanXuLy(L, { dieuPhoi: true, phaLe: false, quanLyXe: false });
  assert.deepEqual(v.map((x) => x.loai), [
    "Chuyến bị giữ", "Chuyến bị giữ", "Chưa có tài xế", "Chặng quá mốc", "Chặng quá mốc", "Nơi đón / trả của đơn khác điểm của xe", "Giờ xe tới muộn hơn giờ hẹn", "Đơn nháp chờ duyệt đặt gấp",
  ]);
  assert.deepEqual([v[0]!.tieuDe, v[0]!.noiDung, v[0]!.aiXuLy], ["CX-3009-07 · 09:00 · 79B-123.45", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: TD-8", "Văn phòng"]);
  assert.deepEqual(v[0]!.hanhDong, [{ nhan: "Cập nhật điểm theo đơn", kieu: "cap-nhat-diem", tripId: "t1" }]);
  assert.deepEqual(v[1]!.hanhDong, [], "không quản lý xe → không lối sang giấy tờ xe");
  assert.equal(v[1]!.aiXuLy, "Quản trị");
  assert.deepEqual(v[2]!.hanhDong, [{ nhan: "Chọn tài xế", kieu: "link", href: "/chuyen-sua?id=t3" }]);
  // Chặng quá mốc: đặt gấp → không cần phá lệ (đối chiếu 2.1); chưa đặt gấp + không có ô phá lệ → dòng khoá.
  assert.deepEqual([v[3]!.tieuDe, v[3]!.khoa], ["10:15 · Sunrise Nha Trang → Ga cáp treo Vinpearl", null]);
  assert.match(v[3]!.noiDung, /TD-1 · 4 khách · đã duyệt đặt gấp$/);
  assert.deepEqual([v[4]!.tieuDe, v[4]!.khoa], ["11:00 · Sunrise Nha Trang → nơi trả chưa chốt", "Cần Quản trị phá lệ"]);
  assert.equal(v[5]!.tieuDe, "CX-3009-02 · TD-1");
  assert.ok(v.slice(5, 7).every((x) => x.hanhDong.length === 0), "không nút Gọi tài xế / Đã gọi báo");
  assert.deepEqual([v[7]!.tieuDe, v[7]!.hanhDong], ["TD-9 · đón 11:40", [{ nhan: "Xem đơn", kieu: "link", href: "/order?id=o9" }]]);
  assert.ok(!JSON.stringify(v).match(/[A-Z]{2,}_[A-Z]/), "không lộ mã");
  // Kế toán (không điều phối): không nút nào; Quản trị có ô quản lý xe → "Mở giấy tờ xe"; có ô phá lệ → không dòng khoá.
  assert.ok(viecCanXuLy(L, { dieuPhoi: false, phaLe: false, quanLyXe: false }).every((x) => x.hanhDong.every((h) => h.kieu === "link" && h.href.startsWith("/order"))));
  const qt = viecCanXuLy(L, { dieuPhoi: true, phaLe: true, quanLyXe: true });
  assert.deepEqual(qt[1]!.hanhDong, [{ nhan: "Mở giấy tờ xe", kieu: "link", href: "/xe-chi-tiet?id=x2" }]);
  assert.equal(qt[4]!.khoa, null);
});

test("kieuChuyen: màu theo trạng thái — bị giữ / chưa có tài xế / lên kế hoạch / đang chạy / xong", () => {
  assert.deepEqual(kieuChuyen(chuyen()), { kieu: "plan", nhan: "Lên kế hoạch" });
  assert.deepEqual(kieuChuyen(chuyen({ lyDoGiu: [ly("THIEU_TEN", "x")] })), { kieu: "held", nhan: "Bị giữ" });
  assert.deepEqual(kieuChuyen(chuyen({ taiXe: null, lyDoGiu: [ly("CHUA_CO_TAI_XE", "x")] })), { kieu: "nodrv", nhan: "Chưa có tài xế" });
  assert.deepEqual(kieuChuyen(chuyen({ trangThai: "RUNNING", trangThaiNhan: "Đang chạy" })), { kieu: "run", nhan: "Đang chạy" });
  assert.deepEqual(kieuChuyen(chuyen({ trangThai: "ENDED", trangThaiNhan: "Kết thúc" })), { kieu: "done", nhan: "Kết thúc" });
});

test("hinhDongThoiGian: khoảng giờ theo dữ liệu (ít nhất 06–21, mở rộng qua nửa đêm), nhóm xe công ty rồi từng nhà xe, vạch bây giờ / mốc chỉ khi trong khung", () => {
  const L = lich({
    xe: [
      { id: "x3", bienSo: "79B-555.66", soCho: 45, trangThai: "active", chuXe: "Minh Phát", chuLaCongTy: false },
      { id: "x1", bienSo: "79B-123.45", soCho: 15, trangThai: "active", chuXe: "Tour Đảo", chuLaCongTy: true },
    ],
    chuyen: [
      chuyen(),
      chuyen({ id: "t9", ma: "CX-3009-12", batDau: g("22:00"), ketThuc: g("00:40", "2026-10-01"), batDauMs: ms("22:00"), ketThucMs: ms("00:40", "2026-10-01") }),
      chuyen({ id: "tc", trangThai: "CANCELLED" }),
    ],
  });
  const h = hinhDongThoiGian(L, ms("07:50"));
  assert.deepEqual([h.gioDau, h.gioCuoi], [6, 25]);
  assert.equal(h.nhanGio[0]!.nhan, "07");
  assert.equal(h.nhanGio.at(-1)!.nhan, "00");
  assert.deepEqual(h.nhom.map((n) => [n.tieuDe, n.hang.map((r) => r.bienSo)]), [["XE CÔNG TY", ["79B-123.45"]], ["NHÀ XE MINH PHÁT", ["79B-555.66"]]]);
  const r = h.nhom[0]!.hang[0]!;
  assert.deepEqual([r.soCho, r.taiXe], ["15 chỗ", "Nguyễn Văn An"]);
  assert.deepEqual(r.khoi.map((k) => [k.id, k.trai, k.dai]), [["t1", 3, 1.75], ["t9", 16, 2.6667]], "làm tròn 4 chữ số (tránh sai số dấu phẩy động)");
  assert.equal(h.nhom[1]!.hang[0]!.khoi.length, 0);
  assert.deepEqual([h.bayGio, h.moc], [{ x: 1.8333, nhan: "07:50" }, { x: 7.8333, nhan: "Mốc 6 giờ · 13:50" }]);
  // Ngày khác hôm nay → không vạch.
  const h2 = hinhDongThoiGian(L, ms("07:50", "2026-09-28"));
  assert.deepEqual([h2.bayGio, h2.moc], [null, null]);
  // Không có mốc (chính sách rỗng) → chỉ vạch bây giờ.
  assert.equal(hinhDongThoiGian({ ...L, mocToiThieuPhut: null }, ms("07:50")).moc, null);
});

test("cauKhoaMoc: câu khoá theo ô của người xem (phá lệ được / cần Quản trị / chỉ xem)", () => {
  assert.equal(cauKhoaMoc(360, { phaLe: true, dieuPhoi: true }), "Trong 6 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Bạn có thể phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ."); // vòng 5e
  assert.equal(cauKhoaMoc(360, { phaLe: false, dieuPhoi: true }), "Trong 6 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Cần Quản trị phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ."); // vòng 5e
  assert.equal(cauKhoaMoc(2880, { phaLe: false, dieuPhoi: false }), "Trong 48 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế.");
  assert.equal(cauKhoaMoc(null, { phaLe: false, dieuPhoi: false }), "Trong mốc tối thiểu trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế.");
});

test("dieuKienXuatBen: danh mục cố định, ✕ kèm câu + ai xử lý từ lý do giữ, ✓ không kèm chi tiết (DTO không có chi tiết đạt)", () => {
  const dk = dieuKienXuatBen([ly("THIEU_TEN", "Chưa đủ tên khách: TD-8 thiếu 2 tên"), ly("NOI_HEN_DOI", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: TD-8")]);
  assert.deepEqual(dk.map((d) => [d.nhan, d.dat]), [
    ["Giấy tờ xe", true], ["Giấy phép lái xe", true], ["Đủ tên khách", false], ["Không có đơn đã huỷ", true], ["Điểm khớp đơn", false], ["Đủ chỗ", true], ["Đủ giờ nghỉ", true],
    ["Đón trước trả", true], ["Trong giờ được xuất bến", true],
  ]);
  assert.equal(dk[2]!.chiTiet, "Chưa đủ tên khách: TD-8 thiếu 2 tên · Ai xử lý: Văn phòng");
  assert.equal(dk[0]!.chiTiet, "");
  // Mã không thuộc danh mục nào → thêm dòng "Khác".
  assert.equal(dieuKienXuatBen([ly("CHINH_SACH_RONG", "Chưa có chính sách", "TOAN_QUYEN")]).at(-1)!.nhan, "Khác");
});

test("nhanDiem: trạng thái điểm dừng + lệch đơn (R-P16) + muộn hơn hẹn", () => {
  const d = { id: "s", thuTu: 2, loai: "PICKUP" as const, tenNoi: "Amiana", diemDanhMucId: null, gioHen: g("09:30"), gioXeToi: g("09:32"), trangThai: "PENDING" as const, soNguoi: 4, lechDon: true, daToi: null };
  assert.deepEqual(nhanDiem(d), { nhan: "Lệch đơn", tone: "warn", ghiChu: "Nơi của đơn đã đổi — cần cập nhật điểm theo đơn", muon: "muộn 2 phút", loai: "Đón", so: "2" });
  assert.deepEqual(nhanDiem({ ...d, lechDon: false, trangThai: "SKIPPED", gioXeToi: null }), { nhan: "Bỏ qua", tone: "muted", ghiChu: "bỏ qua — không còn khách", muon: "", loai: "Đón", so: "–" });
  assert.equal(nhanDiem({ ...d, lechDon: false, loai: "DROPOFF", gioHen: null }).loai, "Trả");
});

test("dongNhatKy: giờ (hai giờ khi văn phòng khai), ai bấm (tên hoặc 'máy'), nội dung + số người + phá lệ", () => {
  const n = (o: Partial<NhatKyChuyenDto>): NhatKyChuyenDto => ({ id: "e", loai: "ALLOCATED", nhan: "Xếp khách lên xe", gioXayRa: g("06:10"), gioGhiNhan: g("06:10"), vanPhongKhai: false, nguoiBam: "Phạm Thu Hoa", may: false, soNguoi: 4, phaLe: null, ...o });
  assert.deepEqual(dongNhatKy(n({}), NGAY), { gio: "06:10", ai: "Phạm Thu Hoa", laMay: false, noiDung: "Xếp khách lên xe · 4 khách", vanPhongKhai: false });
  assert.deepEqual(dongNhatKy(n({ may: true, nguoiBam: null, soNguoi: null, nhan: "Bỏ qua điểm" }), NGAY).ai, "máy");
  assert.equal(dongNhatKy(n({ phaLe: { luat: "MOC_TOI_THIEU", lyDoNhan: "Sự cố vận hành" } }), NGAY).noiDung, "Xếp khách lên xe · 4 khách · phá lệ: Sự cố vận hành");
  assert.equal(dongNhatKy(n({ vanPhongKhai: true, gioXayRa: g("07:31"), gioGhiNhan: g("07:45"), nguoiBam: "Hoa" }), NGAY).gio, "07:31 · ghi lúc 07:45");
  assert.equal(dongNhatKy(n({ gioXayRa: g("17:05", "2026-09-29") }), NGAY).gio, "17:05 29/09");
});

test("truongLoiChuyen: 409 → câu dưới đúng ô (Xe / Tài xế / Giờ); mốc chỉ ở ô đang đổi; mã khác → dải chung", () => {
  const r = truongLoiChuyen([
    ly("HANG_BANG_KHONG_DU", "Hạng bằng lái không đủ chở số chỗ của xe"), ly("TRUNG_GIO_XE", "Xe trùng giờ với chuyến khác: CX-3009-11"), ly("KHOANG_NGHI", "Chưa đủ khoảng nghỉ…", "QUAN_TRI"),
    ly("MOC_TOI_THIEU", "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ", "QUAN_TRI"), ly("CHINH_SACH_RONG", "Chưa có chính sách", "TOAN_QUYEN"),
  ], { doiXe: false, doiTaiXe: true });
  assert.deepEqual(r, {
    xe: [], taiXe: ["Hạng bằng lái không đủ chở số chỗ của xe", "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ"],
    gioBatDau: ["Chưa đủ khoảng nghỉ…"], gioKetThuc: ["Xe trùng giờ với chuyến khác: CX-3009-11"], khac: ["Chưa có chính sách"],
  });
  assert.deepEqual(truongLoiChuyen([ly("MOC_TOI_THIEU", "m")], { doiXe: true, doiTaiXe: true }).xe, ["m"]);
  assert.deepEqual(truongLoiChuyen([ly("VUOT_SO_CHO", "Vượt số chỗ của xe: 16/15"), ly("CHEO_XE_TAI_XE", "c")], { doiXe: false, doiTaiXe: false }), {
    xe: ["Vượt số chỗ của xe: 16/15"], taiXe: ["c"], gioBatDau: [], gioKetThuc: [], khac: [],
  });
});

test("idChoLenh: lệnh lặp sau mất mạng dùng lại requestId khi thân không đổi; thân đổi hoặc chưa có lệnh chờ → id mới", () => {
  let n = 0;
  const tao = () => `id${++n}`;
  const a = idChoLenh(null, "k1", tao);
  assert.deepEqual(a, { id: "id1", khoa: "k1" });
  assert.deepEqual(idChoLenh(a, "k1", tao), a, "bấm lại sau mất mạng — cùng id");
  assert.deepEqual(idChoLenh(a, "k2", tao), { id: "id2", khoa: "k2" }, "đổi ý (thân khác) — id mới, không bị máy chủ coi là lệnh lặp");
});

test("viecCanXuLy: 'nơi hẹn khác điểm' của chuyến CHƯA chạy đã bị giữ 'nơi đón / trả đã đổi' → không thành mục thứ hai (mục chuyến bị giữ đã có nút)", () => {
  const L = lich({
    chuyen: [
      chuyen({ id: "t1", lyDoGiu: [ly("NOI_HEN_DOI", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: TD-8")] }),
      chuyen({ id: "t4", ma: "CX-3009-02", trangThai: "RUNNING" }),
    ],
    canhBao: [
      { loai: "NOI_HEN_KHAC_DIEM", nhan: "Nơi đón / trả của đơn khác điểm của xe", legId: "l8", tripId: "t1", maDon: "TD-8" },
      { loai: "NOI_HEN_KHAC_DIEM", nhan: "Nơi đón / trả của đơn khác điểm của xe", legId: "l9", tripId: "t4", maDon: "TD-9" },
    ],
  });
  assert.deepEqual(viecCanXuLy(L, { dieuPhoi: true, phaLe: false, quanLyXe: false }).map((x) => x.tieuDe), ["CX-3009-07 · 09:00 · 79B-123.45", "CX-3009-02 · TD-9"]);
});

test("thayDieuPhoiXe: mục 'Điều phối xe' cho mọi mã có ô trip.view = any (Bán hàng, Kế toán, Quản trị, Toàn quyền); tài xế (assigned) và mã khác → không", () => {
  const ai = (permissions: PermissionCode[]) => thayDieuPhoiXe({ id: "s1", permissions });
  assert.deepEqual((["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as PermissionCode[]).map((p) => ai([p])), [true, true, true, true]);
  assert.deepEqual((["FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER"] as PermissionCode[]).map((p) => ai([p])), [false, false, false, false, false]);
  assert.equal(ai(["DRIVER", "SALES"]), true);
});

test("hinhDongThoiGian: khối mang cờ khoá của MÁY CHỦ (khoaMoc.dangKhoa) — không tự tính theo giờ hiện tại", () => {
  const L = lich({
    xe: [{ id: "x1", bienSo: "79B-123.45", soCho: 15, trangThai: "active", chuXe: "Tour Đảo", chuLaCongTy: true }],
    chuyen: [chuyen({ id: "a", khoaMoc: { dangKhoa: true, tuLuc: g("03:00"), tuLucMs: ms("03:00") } }), chuyen({ id: "b", batDau: g("20:00"), ketThuc: g("21:00"), batDauMs: ms("20:00"), ketThucMs: ms("21:00") })],
  });
  // "bây giờ" = 23:00: tự tính theo giờ hiện tại thì cả hai chuyến đã qua giờ — kết quả phải đúng cờ máy chủ (a khoá, b không), không theo đồng hồ.
  assert.deepEqual(hinhDongThoiGian(L, ms("23:00")).nhom[0]!.hang[0]!.khoi.map((k) => [k.id, k.khoa]), [["a", true], ["b", false]]);
});

test("tuyenChuyen: điểm đón theo thứ tự rồi điểm trả (bỏ điểm đã bỏ qua / đã chuyển)", () => {
  const d = (thuTu: number, loai: "PICKUP" | "DROPOFF", tenNoi: string, trangThai = "PENDING") => ({ id: `d${thuTu}`, thuTu, loai, tenNoi, trangThai, daToi: null });
  assert.deepEqual(tuyenChuyen([d(3, "PICKUP", "Mường Thanh"), d(1, "PICKUP", "Sheraton"), d(4, "DROPOFF", "Cảng Vinpearl"), d(2, "PICKUP", "Amiana", "SKIPPED"), d(5, "DROPOFF", "Bến Tàu"), d(6, "DROPOFF", "Cũ", "MOVED")]), {
    don: ["Sheraton", "Mường Thanh"], tra: ["Cảng Vinpearl", "Bến Tàu"],
  });
  assert.deepEqual(tuyenChuyen([]), { don: [], tra: [] });
});

test("nhanNgayXem: thứ trong tuần + hôm nay / ngày mai / hôm qua theo lịch Việt Nam", () => {
  assert.equal(nhanNgayXem("2026-09-30", "2026-09-30"), "Thứ Tư · hôm nay");
  assert.equal(nhanNgayXem("2026-10-01", "2026-09-30"), "Thứ Năm · ngày mai");
  assert.equal(nhanNgayXem("2026-09-29", "2026-09-30"), "Thứ Ba · hôm qua");
  assert.equal(nhanNgayXem("2026-10-04", "2026-09-30"), "Chủ nhật");
});

test("chuyenXepDuoc: chỉ chuyến lên kế hoạch, theo giờ xuất bến; nhãn có giờ, xe, tải; 'khoa' theo khoaMoc (không tự tính)", () => {
  const L = lich({
    chuyen: [
      chuyen({ id: "b", ma: "CX-3009-11", batDau: g("14:30"), ketThuc: g("16:15"), batDauMs: ms("14:30"), tai: 10 }),
      chuyen({ id: "a", khoaMoc: { dangKhoa: true, tuLuc: g("03:00"), tuLucMs: ms("03:00") } }),
      chuyen({ id: "c", trangThai: "RUNNING" }),
      chuyen({ id: "d", trangThai: "CANCELLED" }),
    ],
  });
  assert.deepEqual(chuyenXepDuoc(L).map((x) => [x.chuyen.id, x.nhan, x.khoa]), [
    ["a", "CX-3009-07 · 09:00–10:45 · 79B-123.45 · tải 12/15", true],
    ["b", "CX-3009-11 · 14:30–16:15 · 79B-123.45 · tải 10/15", false],
  ]);
});

// ADR-0051 (B-GB): mục "Giờ hẹn đổi — gọi báo khách" ở cột Cần xử lý (danh sách riêng GET /nhac-goi-khach, hiện ở MỌI ngày đang xem) + dòng ở chi tiết chuyến.
const muc = (o: Partial<{ baoDuoc: boolean; ngayChuyen: string; moi: { ngay: string; gio: string | null } }> = {}) => ({
  legId: "lg1", orderCode: "TD-20260930-0018", chieu: "OUT" as const, noiDon: "Sheraton Nha Trang", ngayChuyen: o.ngayChuyen ?? NGAY,
  gioHenDoi: { cu: { ngay: NGAY, gio: "09:00" }, moi: o.moi ?? { ngay: NGAY, gio: "09:15" }, phienBan: 3, maChuyen: ["CX-3009-07"], baoDuoc: o.baoDuoc ?? true },
});
test("viecCanXuLy + nhắc gọi báo: mục 'Giờ hẹn đổi — gọi báo khách' (nhãn hằng goi-bao.ts), sau chặng quá mốc, trước cảnh báo khác; nút 'Đã gọi báo' CHỈ khi baoDuoc; khác ngày xem → 'Chuyến dd/mm'; không SĐT", () => {
  const L = lich({
    chang: [chang({ legId: "l2", nhan: ["QUA_MOC"], gioDon: "11:00" })],
    chuyen: [chuyen({ id: "t4", ma: "CX-3009-02", trangThai: "RUNNING" })],
    canhBao: [
      { loai: "GIO_XE_TOI_MUON_HON_HEN", nhan: "Giờ xe tới muộn hơn giờ hẹn", legId: "l1", tripId: "t4", maDon: "TD-1" },
      { loai: "CHANG_QUA_MOC", nhan: "Chặng đã quá mốc tối thiểu mà chưa xếp", legId: "l2", tripId: null, maDon: "TD-2" },
    ],
  });
  const v = viecCanXuLy(L, { dieuPhoi: true, phaLe: false, quanLyXe: false }, [muc(), muc({ baoDuoc: false, ngayChuyen: "2026-10-02", moi: { ngay: "2026-10-02", gio: null } })]);
  assert.deepEqual(v.map((x) => x.loai), ["Chặng quá mốc", "Giờ hẹn đổi — gọi báo khách", "Giờ hẹn đổi — gọi báo khách", "Giờ xe tới muộn hơn giờ hẹn"]);
  assert.deepEqual([v[1]!.tieuDe, v[1]!.noiDung, v[1]!.aiXuLy, v[1]!.bieuTuong, v[1]!.tone], ["TD-20260930-0018 · Sheraton Nha Trang", "Giờ hẹn đón đổi 09:00 → 09:15 · CX-3009-07", "Người phụ trách đơn", "handset", "warn"]);
  assert.deepEqual(v[1]!.hanhDong, [{ nhan: "Đã gọi báo", kieu: "goi-bao", legId: "lg1", phienBan: 3, gioMoi: { ngay: NGAY, gio: "09:15" }, maDon: "TD-20260930-0018" }]);
  assert.equal(v[2]!.noiDung, "Giờ hẹn đón đổi 30/09 09:00 → 02/10 chưa chốt giờ · CX-3009-07 · Chuyến 02/10");
  assert.deepEqual(v[2]!.hanhDong, [], "baoDuoc = false (Kế toán, Bán hàng không phụ trách): không nút");
  assert.deepEqual(v[3]!.hanhDong, [], "thẻ 'xe tới muộn' KHÔNG có nút Đã gọi báo (Q-GB-1 = b)");
});

test("dongGoiBao (chi tiết chuyến): 'Giờ hẹn đổi … — chưa gọi báo' + 'Đã gọi báo' khi baoDuoc; '— đã gọi báo khách (tên, HH:MM)' + 'Bỏ đánh dấu' khi boDuoc", () => {
  const cu = { ngay: NGAY, gio: "09:00" };
  const moi = { ngay: NGAY, gio: "09:15" };
  assert.deepEqual(dongGoiBao({ legId: "lg1", maDon: "TD-9", gioHenDoi: { cu, moi, phienBan: 3, maChuyen: ["CX-1"], baoDuoc: true }, daGoiBao: null }), {
    chu: "TD-9 · Giờ hẹn đổi 09:00 → 09:15 — chưa gọi báo", nut: { kieu: "da-goi", nhan: "Đã gọi báo", phienBan: 3, gioMoi: moi },
  });
  assert.equal(dongGoiBao({ legId: "lg1", maDon: "TD-9", gioHenDoi: { cu, moi, phienBan: 3, maChuyen: [], baoDuoc: false }, daGoiBao: null })!.nut, null);
  assert.deepEqual(dongGoiBao({ legId: "lg1", maDon: "TD-9", gioHenDoi: null, daGoiBao: { cu, moi, luc: "07:52", nguoiBam: "Lan", phienBan: 4, boDuoc: true } }), {
    chu: "TD-9 · Giờ hẹn đổi 09:00 → 09:15 — đã gọi báo khách (Lan, 07:52)", nut: { kieu: "bo", nhan: "Bỏ đánh dấu", phienBan: 4 },
  });
  assert.equal(dongGoiBao({ legId: "lg1", maDon: null, gioHenDoi: null, daGoiBao: { cu, moi, luc: "07:52", nguoiBam: null, phienBan: 4, boDuoc: false } })!.chu, "Giờ hẹn đổi 09:00 → 09:15 — đã gọi báo khách (07:52)");
  assert.equal(dongGoiBao({ legId: "lg1", maDon: null, gioHenDoi: null, daGoiBao: null }), null);
});

test("dongBanChup: dòng 'Bản chụp lúc xuất bến' — nhãn tiếng Việt theo loại, KHÔNG BAO GIỜ hiện mã (lỗi bắt được: 'GIAY_TO_XE' lộ ra ở màn chuyến đang chạy)", () => {
  assert.deepEqual(dongBanChup({ loai: "GIAY_TO_XE", hang: null, hetHan: "2027-03-14" }), { nhan: "Giấy tờ xe", phu: "hạn 14/03/2027" });
  assert.deepEqual(dongBanChup({ loai: "GPLX", hang: "D2", hetHan: "2029-06-20" }), { nhan: "Giấy phép lái xe", phu: "hạng D2 · hạn 20/06/2029" });
  assert.deepEqual(dongBanChup({ loai: "GIAY_TO_NGUOI", hang: null, hetHan: null }), { nhan: "Giấy tờ của tài xế", phu: "" });
  assert.equal(dongBanChup({ loai: "MA_LA", hang: null, hetHan: null }).nhan, "Điều kiện khác");
});

// Vòng 5b (chủ trả lời lần 15 — "Làm ngay, thợ tự đặt nút"): "Rút khỏi xe" / "Chuyển sang xe khác" trên từng nhóm khách của Chi tiết chuyến.
test("nhomKhach: gom suất đang mở theo chặng (một đơn một nhóm), người đi kèm một nhóm riêng; tuyến lấy tên điểm; tên theo DTO; suất chưa gắn khoá người (DTO không có tên — máy chủ gắn khi xếp có khoá / khi xuất bến) chỉ đếm 'N khách chưa gắn tên'; bỏ suất đã có kết quả", () => {
  const diem = [
    { id: "d1", thuTu: 1, loai: "PICKUP" as const, tenNoi: "Sheraton Nha Trang" },
    { id: "d2", thuTu: 2, loai: "PICKUP" as const, tenNoi: "Amiana Resort" },
    { id: "d3", thuTu: 3, loai: "DROPOFF" as const, tenNoi: "Bến tàu du lịch Nha Trang" },
  ];
  const s = (id: string, legId: string | null, maDon: string | null, len: string | null, xuong: string | null, x: Partial<{ loai: "PASSENGER" | "CREW"; trangThai: string; hoTen: string; namSinh: number; tenNguoiDiKem: string }> = {}) => ({
    id, loai: x.loai ?? "PASSENGER", maDon, legId, chieu: legId ? "OUT" as const : null, diemLen: len, diemXuong: xuong, trangThai: (x.trangThai ?? "WAITING") as "WAITING", coTen: !!x.hoTen,
    ...(x.hoTen ? { hoTen: x.hoTen, namSinh: x.namSinh ?? 1990 } : {}), ...(x.tenNguoiDiKem ? { tenNguoiDiKem: x.tenNguoiDiKem } : {}), daDon: null, daTra: null,
  });
  const g = nhomKhach([
    s("a", "l1", "TD-1", "d1", "d3", { hoTen: "Nguyễn Thị Lan", namSinh: 1990 }),
    s("b", "l2", "TD-2", "d2", "d3", { hoTen: "Lê Hoàng Yến" }),
    s("c", "l1", "TD-1", "d1", "d3"),
    s("e", null, null, null, null, { loai: "CREW", tenNguoiDiKem: "Trần Văn Phụ" }),
    s("f", "l1", "TD-1", "d1", "d3", { trangThai: "DROPPED", hoTen: "Đã Trả" }),
  ], diem);
  assert.deepEqual(g.map((x) => [x.khoa, x.tieuDe, x.tuyen, x.ten, x.suatIds]), [
    ["l1", "TD-1 · 2 khách", "Sheraton Nha Trang → Bến tàu du lịch Nha Trang", "Nguyễn Thị Lan 1990 · 1 khách chưa gắn tên", ["a", "c"]],
    ["l2", "TD-2 · 1 khách", "Amiana Resort → Bến tàu du lịch Nha Trang", "Lê Hoàng Yến 1990", ["b"]],
    ["CREW", "Người đi kèm · 1", "", "Trần Văn Phụ", ["e"]],
  ]);
  assert.equal(nhomKhach([s("x", "l9", "TD-9", "d1", "d3"), s("y", "l9", "TD-9", "d1", "d3")], diem)[0]!.ten, "2 khách chưa gắn tên");
  assert.deepEqual(nhomKhach([], diem), []);
});

// ---- Vòng 5e (R-P29, chủ lần 16): "Cập nhật khách theo đơn" — khuôn "Cập nhật điểm theo đơn" ---------------------------------------------------------------
test("vòng 5e: KHACH_DA_DOI → hành động 'Cập nhật khách theo đơn' ở Cần xử lý (chỉ khi có ô điều phối), cạnh 'Cập nhật điểm theo đơn'", () => {
  const cauKhach = "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: TD-8";
  const L = lich({
    chuyen: [
      chuyen({ lyDoGiu: [ly("KHACH_DA_DOI", cauKhach)] }),
      chuyen({ id: "t2", ma: "CX-3009-04", lyDoGiu: [ly("NOI_HEN_DOI", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: TD-9"), ly("KHACH_DA_DOI", cauKhach)] }),
    ],
  });
  const v = viecCanXuLy(L, { dieuPhoi: true, phaLe: false, quanLyXe: false });
  const t1 = v.find((x) => x.href === "/chuyen?id=t1")!;
  assert.deepEqual(t1.hanhDong, [{ nhan: "Cập nhật khách theo đơn", kieu: "cap-nhat-khach", tripId: "t1" }]);
  assert.deepEqual([t1.noiDung, t1.aiXuLy], [cauKhach, "Văn phòng"]);
  assert.deepEqual(v.find((x) => x.href === "/chuyen?id=t2")!.hanhDong.map((a) => a.kieu), ["cap-nhat-diem", "cap-nhat-khach"]);
  // Không có ô điều phối (Kế toán) → không nút.
  assert.deepEqual(viecCanXuLy(L, { dieuPhoi: false, phaLe: false, quanLyXe: false }).flatMap((x) => x.hanhDong), []);
});

test("vòng 5e: câu khoá nói cả hai lệnh 'theo đơn' không cần phá lệ; KHACH_DA_DOI thuộc dòng 'Đủ tên khách'", () => {
  assert.equal(cauKhoaMoc(360, { phaLe: false, dieuPhoi: true }), "Trong 6 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Cần Quản trị phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ.");
  assert.equal(cauKhoaMoc(360, { phaLe: true, dieuPhoi: true }), "Trong 6 giờ trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế. Bạn có thể phá lệ. Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ.");
  const dk = dieuKienXuatBen([ly("KHACH_DA_DOI", "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: TD-8")]);
  assert.deepEqual(dk.filter((d) => !d.dat).map((d) => [d.nhan, d.chiTiet]), [["Đủ tên khách", "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: TD-8 · Ai xử lý: Văn phòng"]]);
  assert.equal(dk.some((d) => d.nhan === "Khác"), false, "không rơi vào dòng 'Khác'");
});

test("vòng 5g (K2e VỪA-1): CẢ THIEU_TEN lẫn KHACH_DA_DOI → dòng 'Đủ tên khách' mang ĐỦ hai câu (theo thứ tự máy chủ), không mất câu nào", () => {
  const khach = "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: TD-8";
  const thieu = "Chưa đủ tên khách: TD-8 thiếu 1 tên";
  const dong = (ds: LyDoGiuDto[]) => dieuKienXuatBen(ds).filter((d) => !d.dat);
  assert.deepEqual(dong([ly("KHACH_DA_DOI", khach), ly("THIEU_TEN", thieu)]), [{ nhan: "Đủ tên khách", dat: false, chiTiet: `${khach}; ${thieu} · Ai xử lý: Văn phòng` }]);
  assert.deepEqual(dong([ly("THIEU_TEN", thieu), ly("KHACH_DA_DOI", khach)]), [{ nhan: "Đủ tên khách", dat: false, chiTiet: `${thieu}; ${khach} · Ai xử lý: Văn phòng` }]);
});

test("viecCanXuLy + giờ lái (ADR-0055 VK2-B): GIO_LAI_VUOT / CHUYEN_DAI_CAN_NGHI → mục nhãn tiếng Việt, biểu tượng đồng hồ, tone vàng, không nút, mở Chi tiết chuyến", () => {
  const L = lich({
    chuyen: [chuyen({ id: "t1" })],
    canhBao: [
      { loai: "GIO_LAI_VUOT", nhan: "Tài xế lái quá giờ tối đa trong ngày", legId: null, tripId: "t1", maDon: null },
      { loai: "CHUYEN_DAI_CAN_NGHI", nhan: "Chuyến dài — nhớ cho tài xế nghỉ giữa chuyến", legId: null, tripId: "t1", maDon: null },
    ],
  });
  const v = viecCanXuLy(L, { dieuPhoi: true, phaLe: false, quanLyXe: false }).filter((x) => x.bieuTuong === "clock");
  assert.deepEqual(v.map((x) => [x.loai, x.tone, x.tieuDe, x.href, x.hanhDong.length]), [
    ["Tài xế lái quá giờ tối đa trong ngày", "warn", "CX-3009-07", "/chuyen?id=t1", 0],
    ["Chuyến dài — nhớ cho tài xế nghỉ giữa chuyến", "warn", "CX-3009-07", "/chuyen?id=t1", 0],
  ]);
});

test("thanPhaLe (Đợt 7 Task 8a): mỗi mã lý do còn thiếu → đúng khoá phá lệ; CAM_KET → camKetPhaLe, không bao giờ tràn sang phaLe / nghiPhaLe", () => {
  // đường sửa chuyến (ba khoá riêng)
  assert.deepEqual(thanPhaLe(["CAM_KET"], "PHA_LE_SU_CO", true), { camKetPhaLe: { lyDo: "PHA_LE_SU_CO" } });
  assert.deepEqual(thanPhaLe(["MOC_TOI_THIEU"], "X", true), { phaLe: { lyDo: "X" } });
  assert.deepEqual(thanPhaLe(["KHOANG_NGHI"], "X", true), { nghiPhaLe: { lyDo: "X" } });
  assert.deepEqual(thanPhaLe(["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"], "X", true), { phaLe: { lyDo: "X" }, nghiPhaLe: { lyDo: "X" }, camKetPhaLe: { lyDo: "X" } });
  // đường xếp / dời / thêm điểm (một khoá `phaLe` cho mốc; cam kết riêng)
  assert.deepEqual(thanPhaLe(["CAM_KET"], "X", false), { camKetPhaLe: { lyDo: "X" } });
  assert.deepEqual(thanPhaLe(["MOC_TOI_THIEU"], "X", false), { phaLe: { lyDo: "X" } });
  assert.deepEqual(thanPhaLe(["MOC_TOI_THIEU", "CAM_KET"], "X", false), { phaLe: { lyDo: "X" }, camKetPhaLe: { lyDo: "X" } });
  assert.deepEqual(thanPhaLe([], "X", false), { phaLe: { lyDo: "X" } }, "không biết mã: giữ hành vi cũ (phaLe)");
});

test("ADR-0096 (gói A1): TRA_TRUOC_DON → dòng 'Đón trước trả', NGOAI_CUA_SO_XUAT_BEN → dòng 'Trong giờ được xuất bến' (không rơi 'Khác'); kieuChuyen KHÔNG coi 'chưa tới giờ' là bị giữ (chip lên kế hoạch), còn lý do khác thì vẫn giữ", () => {
  const tra = ly("TRA_TRUOC_DON", "Điểm trả đứng trước điểm đón — đổi thứ tự điểm rồi xuất bến: TD-8 (điểm trả số 1 đứng trước điểm đón số 2)");
  const cuaSo = ly("NGOAI_CUA_SO_XUAT_BEN", "Chưa tới giờ được xuất bến: chuyến khởi hành lúc 07:00 ngày 12/03, được xuất bến từ 19:00 ngày 11/03. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến.");
  const dk = dieuKienXuatBen([tra, cuaSo]).filter((d) => !d.dat).map((d) => d.nhan);
  assert.deepEqual(dk, ["Đón trước trả", "Trong giờ được xuất bến"]);
  assert.deepEqual(kieuChuyen(chuyen({ lyDoGiu: [cuaSo] })), { kieu: "plan", nhan: "Lên kế hoạch" });
  assert.deepEqual(kieuChuyen(chuyen({ lyDoGiu: [cuaSo, tra] })), { kieu: "held", nhan: "Bị giữ" });
  assert.deepEqual(kieuChuyen(chuyen({ taiXe: null, lyDoGiu: [cuaSo, ly("CHUA_CO_TAI_XE", "x")] })), { kieu: "nodrv", nhan: "Chưa có tài xế" });
});
