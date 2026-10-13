// HÀNG RÀO «giờ xấu nhất trong ngày» cho khung thử điều phối (nối vào `don()` / `taoChuyen()` của dieu-phoi-khung.mjs; bài ghim: src/khung-thu-dong-ho-gio-xau.test.ts).
// Mốc tối thiểu 6 giờ của ADR-0049 tính theo đồng hồ của máy chủ. Khi bài bật `batDongHo(<giờ thật>)` thì đồng hồ giả ĐỨNG YÊN ở giờ thật lúc bài bắt đầu, nên một
// bài gieo chuyến / chặng gần giờ thật sẽ xanh vào ban ngày và ĐỎ vào một giờ nào đó trong ngày (13–14/10/2026: tu-choi.test.ts đỏ từ ~23 giờ đêm).
// Công thức: giờ hẹn nằm ở ngày cách ngày gốc của đồng hồ k ngày, lúc T. Đồng hồ có thể ở BẤT KỲ giờ nào trong ngày gốc, giờ muộn nhất là sát nửa đêm, nên khoảng cách
// nhỏ nhất tới giờ hẹn = giờ hẹn − nửa đêm kết thúc ngày gốc = (k − 1) × 24 giờ + T. Hàng rào ném lỗi khi giá trị ấy < mốc + lề: k = 0 luôn bị chặn; k = 1 chỉ qua khi
// T ≥ mốc + lề (06:30 với mốc 360 phút); k ≥ 2 luôn qua.
// CHỈ áp cho đồng hồ chạy theo GIỜ THẬT (không gọi `batDongHo`, hoặc gọi với giờ thật ± 5 phút như bài `tre` của tu-choi.test.ts). Đồng hồ CỐ ĐỊNH (NOW_GIA
// 2027-03-11 06:00, `vnMs("2027-03-10", "22:00")`…) là hằng, kết quả không đổi theo giờ chạy nên được bỏ qua — các bài mốc / khoảng nghỉ cố tình dùng giờ sớm với đồng hồ
// cố định. Không phải công tắc: hàng rào luôn bật; ca hợp lệ nào cũng qua bằng cách chọn ngày / giờ / đồng hồ, không bằng cách tắt.
// File này thuần (không import mã ứng dụng, không I/O) để bài canh gọi thẳng.

/** Lề an toàn (phút) cộng vào mốc: thời gian bài chạy thật + làm tròn phút. Đúng mốc + lề là qua (khớp ghi chú «đón từ 06:30» ở tests/e2e/lib.mjs). */
export const LE_PHUT = 30;
/** Mốc dùng khi không đọc được chính sách của thế giới thử (chính sách gieo 360 phút, ADR-0049 D2). */
export const MOC_MAC_DINH_PHUT = 360;
/** Đồng hồ giả lệch giờ thật không quá số phút này thì coi là «chạy theo giờ thật» (bài `tre` của tu-choi.test.ts chậm 2 phút). */
export const DUNG_SAI_GIO_THAT_PHUT = 5;

const PHUT = 60_000;
const NGAY_MS = 86_400_000;
// Giờ thật ước tính = giờ lúc nạp tệp (TRƯỚC mọi `mock.timers`) + thời gian trôi do đồng hồ đơn điệu `performance.now()` (không bị mock Date đụng tới). Lấy `Date.now()`
// một lần lúc nạp nên vẫn đúng khi nạp trước một bộ lệch đồng hồ (`node --import`) để tái hiện giờ khác trong ngày.
const GOC_DATE = Date.now();
const GOC_PERF = performance.now();
export const gioThatMs = () => GOC_DATE + (performance.now() - GOC_PERF);

const vnMs = (ngay, gio) => Date.parse(`${ngay}T${gio}:00+07:00`);
const ngayVn = (ms) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
const hhmm = (phut) => `${String(Math.floor(phut / 60)).padStart(2, "0")}:${String(phut % 60).padStart(2, "0")}`;
const theoGioThat = (ms) => Math.abs(ms - gioThatMs()) <= DUNG_SAI_GIO_THAT_PHUT * PHUT;

let ghiNho = null;
/** `batDongHo(ms)` gọi hàm này: nhớ giờ GỐC của đồng hồ giả và nó có theo giờ thật không. Giờ gốc (không phải giờ hiện tại sau `denGio`) mới là mốc tính k. */
export function ghiNhanDongHo(ms) {
  ghiNho = { ms, theoGioThat: theoGioThat(ms) };
}
/** Tắt đồng hồ giả (hàm tắt của `batDongHo`): quay về «đồng hồ thật». */
export function xoaDongHo() {
  ghiNho = null;
}
/** Đồng hồ đang áp: giờ gốc + có theo giờ thật không. Chưa ai gọi `batDongHo` thì đồng hồ là giờ hiện tại (thật, trừ khi bài tự mock Date và lệch xa). */
export function dongHoHienTai() {
  if (ghiNho) return ghiNho;
  const ms = Date.now();
  return { ms, theoGioThat: theoGioThat(ms) };
}

/**
 * Ném lỗi (AssertionError-có-chữ) nếu việc gieo `nhan` cho ngày `ngay` giờ `gio` (giờ VN) có thể rơi vào mốc `mocPhut` ở MỘT giờ nào đó trong ngày gốc của đồng hồ.
 * Đồng hồ cố định → không làm gì. `dongHo` mặc định lấy từ `dongHoHienTai()`; bài canh truyền riêng để thử công thức không cần bật đồng hồ.
 */
export function kiemGioTheoDongHo({ nhan, ngay, gio, mocPhut = MOC_MAC_DINH_PHUT, lePhut = LE_PHUT, dongHo = dongHoHienTai() }) {
  if (!dongHo.theoGioThat) return;
  const ngayGoc = ngayVn(dongHo.ms);
  const k = Math.round((vnMs(ngay, "00:00") - vnMs(ngayGoc, "00:00")) / NGAY_MS);
  const nuaDemCuoiNgayGoc = vnMs(ngayGoc, "00:00") + NGAY_MS;
  const phutXauNhat = Math.floor((vnMs(ngay, gio) - nuaDemCuoiNgayGoc) / PHUT);
  if (phutXauNhat >= mocPhut + lePhut) return;
  const gioAnToan = mocPhut + lePhut - (k - 1) * 1440;
  const cach = k >= 1 && gioAnToan < 1440 ? `hoặc giữ ngày mai nhưng đón / bắt đầu từ ${hhmm(gioAnToan)} trở đi` : "ngày mai không còn đủ chỗ cho mốc này";
  throw new Error(
    `Hàng rào giờ xấu nhất: ${nhan} gieo cho ngày ${ngay} lúc ${gio} (k = ${k} ngày sau ngày gốc ${ngayGoc} của đồng hồ giả) trong khi đồng hồ giả chạy theo GIỜ THẬT. ` +
      `Nếu bài chạy vào cuối ngày thì giờ hẹn chỉ còn cách ${phutXauNhat} phút, dưới mốc tối thiểu ${mocPhut} phút + lề ${lePhut} phút — bài xanh ban ngày nhưng ĐỎ theo giờ trong ngày ` +
      `(xếp khách 409 can_pha_le, xác nhận đơn 409 short_notice_required). Sửa: dùng ngày thật + 2 (luôn cách ≥ 24 giờ), ${cach}, ` +
      `hoặc bật đồng hồ CỐ ĐỊNH (batDongHo() không tham số).`,
  );
}
