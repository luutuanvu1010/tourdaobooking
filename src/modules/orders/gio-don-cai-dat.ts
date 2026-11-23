// Công tắc «Bắt buộc giờ đón cho đơn đối tác» (ADR-0193): luật THUẦN của cờ (không I/O, không import — bài kiểm chạy thẳng bằng `node --test`).
// SQL ở `xac-nhan-repo.ts` (tệp nửa nghiêm); lô ghi công tắc ở `xac-nhan-route.ts` (`lenhGhiBatBuocGioDon`).

/**
 * ADR-0193 câu (i): cờ «cần chốt giờ» chụp vào yêu cầu xác nhận (`pickup_time_required`) và lý do `CHOT_GIO` = «đi nhánh A vì thiếu giờ» (`canChotGioCuaNguoiLap`) VÀ công tắc Bật.
 * Công tắc KHÔNG đổi nhánh: Tắt thì đơn Đối tác chưa giờ vẫn qua văn phòng xét (nhánh A), chỉ không bị đòi giờ ở Còn vé. Không thêm tham số công tắc vào `canChotGioCuaNguoiLap`
 * (làm vậy thì Tắt đẩy đơn sang nhánh B — phương án khác của câu (i), không phải phương án chủ duyệt).
 */
export const coChotGio = (diNhanhAViThieuGio: boolean, batBuoc: boolean): boolean => diNhanhAViThieuGio && batBuoc;

/**
 * ADR-0228 Đ3 (công tắc «Đơn đối tác không cần giờ đón»): đơn Đối tác có lượt đầu Đón chưa giờ (`thieuGio` = `canChotGioCuaNguoiLap`) có phải đi nhánh A VÌ THIẾU GIỜ không.
 * Tắt (gieo) ⇒ như hôm nay: luôn nhánh A. Bật ⇒ không còn là lý do — TRỪ khi một lượt chưa giờ đã vào hạn chốt (`satHanChot`, cùng luật `chanChuaGioSatNgay` của ADR-0193 (ii)): đối tác không có
 * ô giờ nên nhánh B sẽ 409 mà họ không tự sửa được ⇒ vẫn để văn phòng chốt giờ (câu 3 của bản đề xuất). Công tắc «Bắt buộc giờ đón» vẫn quyết cờ chụp (`coChotGio`) khi đơn đi nhánh A vì thiếu giờ.
 */
export const diNhanhAViThieuGio = (thieuGio: boolean, khongCanGio: boolean, satHanChot: boolean): boolean => thieuGio && (!khongCanGio || satHanChot);
