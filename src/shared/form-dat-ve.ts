// Đặt vé của đối tác, lượt 1 (đặc tả docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md §4.1, §4.2): form Tạo đơn GỌN cho tài khoản giữ quyền Đối tác — ô «Giảm giá cho khách» thay
// nhãn nổi, khối «Thông tin chuyến» ẩn, thay bằng MỘT dòng «Ghi chú». Luật THUẦN dùng ở giao diện (web/order-form.ts, web/service-card.ts); máy chủ không dựa vào đây (giao diện chỉ
// ẩn / hiện, máy chủ luôn kiểm lại — validateTrip không đòi ô nào bị ẩn). Có bài cạnh tệp (form-dat-ve.test.ts) và bài nối dây (src/form-dat-ve-noi-day.test.ts). Import kèm đuôi .ts.
import { holdsPartner, type PermissionHolder } from "./permissions.ts";

/** Chữ mờ trong ô giảm giá của form gọn (thay nhãn nổi «Giảm giá (₫)»). */
export const GOI_Y_GIAM_GIA_DOI_TAC = "Giảm giá cho khách";
/** Nhãn của dòng ghi chú gọn (nhãn nổi, luôn ở vị trí thu nhỏ). */
export const NHAN_GHI_CHU_DOI_TAC = "Ghi chú đưa đón"; // đặc tả 2026-11-20: nhãn nói đúng nội dung ô (trước là «Ghi chú» kèm gợi ý «Thời gian đón»)
/** Chữ mờ trong dòng ghi chú gọn: nhắc đối tác gõ giờ đón vào đây (đặc tả QĐ-B1: đối tác không nhập giờ đón riêng, dòng này ghi vào ghi chú dịch vụ `trip.note`). */
export const GOI_Y_GHI_CHU_DOI_TAC = "Ví dụ: đón lúc 7 giờ 30 tại sảnh";
/** Trần độ dài ghi chú dịch vụ — CÙNG trần với `validateTrip` của máy chủ (src/modules/orders/service-rules.ts: `cleanText(s.note, …, 1000, true)`). */
export const MAX_GHI_CHU_DICH_VU = 1000;

/**
 * Form Tạo đơn gọn áp cho MỌI tài khoản có quyền Đối tác, kể cả tài khoản lai (Bán hàng + Đối tác) — cùng nghĩa "có quyền Đối tác là áp" (`holdsPartner`, chủ dự án 2026-09-26).
 * Tài khoản không giữ quyền Đối tác: form KHÔNG đổi một ký tự.
 */
export const formGonDoiTac = (who: Pick<PermissionHolder, "permissions">): boolean => holdsPartner(who);

/**
 * Chữ hiện trong ô Ghi chú MỘT dòng của form gọn. Ghi chú cũ (nhập ở form đầy đủ, ô nhiều dòng) có thể chứa xuống dòng; ô `<input type="text">` bỏ xuống dòng khi gán `value`,
 * nên «Đón 7h↵30 khách» hiện thành «Đón 7h30 khách», đổi nghĩa giờ đón. Mỗi cụm xuống dòng (kể cả khoảng trắng hai bên, `\r\n`) thành «, », cụm ở đầu hoặc cuối thì bỏ; chuỗi không có
 * xuống dòng giữ nguyên. Chỉ để HIỆN: dữ liệu cũ trong nháp giữ nguyên tới khi người dùng gõ vào ô.
 */
export const ghiChuMotDong = (note: string): string => note.replace(/^\s*[\r\n]\s*|\s*[\r\n]\s*$/g, "").replace(/\s*[\r\n]\s*/g, ", ");

/**
 * H2 phương án nhẹ (đặc tả docs/superpowers/specs/2026-11-20-sua-giao-dien-bon-y-cua-chu.md; chủ duyệt 20/11/2026, đổi một phần ADR-0154 Đ1.1 ở mức giao diện): khối Đưa đón của form Đối tác
 * chỉ còn «Đón / Không đón», MỘT ô «Nơi đón» và ghi chú — ẩn Nơi trả, «Đón khác ngày», «Thêm chi tiết», «Thêm chiều về», «Thêm lượt», «Bỏ lượt» (bỏ đón thì bấm «Không đón»).
 * Máy chủ không đổi: lượt vẫn bắt buộc có nơi đón, nơi trả vẫn gửi theo gợi ý của dịch vụ (hoặc trống).
 * LUẬT AN TOÀN: chỉ thu gọn khi không giấu dữ liệu nào đang có — đúng MỘT lượt, chiều đi, ngày đón trống hoặc trùng ngày đi, không cam kết xe, không số hiệu chuyến bay, nơi trả trống hoặc còn là gợi ý của dịch vụ. Nháp cũ có chiều về,
 * nhiều lượt, đón khác ngày… thì hiện đủ như trước (ADR-0154), để đối tác thấy và sửa được thứ sẽ gửi đi.
 */
export function duaDonChiNoiDon(
  legs: readonly { direction: "OUT" | "RETURN"; pickupDate: string; xeRieng: boolean; choToiThieu: string; flightCode: string; tra: string; traTuDo: string; goiYTra: boolean }[],
  ngayDi: string,
): boolean {
  if (legs.length !== 1) return false;
  const l = legs[0]!;
  // Nơi trả (người kiểm độc lập 20/11): chỉ ẩn khi trống hoặc vẫn là GỢI Ý của dịch vụ (điểm trong danh mục, `goiYTra`); nơi trả đối tác tự gõ thì phải hiện để thấy và sửa được.
  const traAnDuoc = l.traTuDo.trim() === "" && (l.tra === "" || l.goiYTra);
  return l.direction === "OUT" && (l.pickupDate === "" || l.pickupDate === ngayDi) && !l.xeRieng && l.choToiThieu === "" && l.flightCode === "" && traAnDuoc;
}

/**
 * ADR-0221 Đ2 (chủ duyệt 21/11/2026): công tắc «Đối tác không nhập nơi đón» đang áp cho người dùng (`apChoToi` của `GET /api/cai-dat/noi-don-doi-tac`) ⇒ khối Đưa đón chỉ còn hai nút
 * «Đón», «Không đón» và ô ghi chú; KHÔNG ô nào của lượt hiện ra. Hàm này chỉ trả lời vế AN TOÀN (nơi gọi tự ghép với `apChoToi`): `duaDonChiNoiDon` đúng VÀ lượt CHƯA có nơi đón
 * (chưa chọn điểm, chưa chọn «Gõ tự do», chữ rỗng). Nháp cũ đã có nơi đón, chiều về, nhiều lượt… ⇒ sai: giao diện rơi về chế độ đang có (`duaDonChiNoiDon` hoặc đủ) để người dùng thấy
 * và sửa được thứ sẽ gửi đi. Lượt gửi lên với nơi đón rỗng (`legInput`); máy chủ ghi chữ tạm khi người gọi giữ quyền Đối tác và công tắc bật.
 */
export function duaDonAnHetLuot(
  legs: readonly { direction: "OUT" | "RETURN"; pickupDate: string; xeRieng: boolean; choToiThieu: string; flightCode: string; tra: string; traTuDo: string; goiYTra: boolean; don: string; donTuDo: string }[],
  ngayDi: string,
): boolean {
  if (!duaDonChiNoiDon(legs, ngayDi)) return false;
  const l = legs[0]!;
  return l.don === "" && l.donTuDo.trim() === "";
}
