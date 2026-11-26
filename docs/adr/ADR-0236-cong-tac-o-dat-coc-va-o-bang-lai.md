# ADR-0236 — Bật lại ô «Khách đặt cọc cho đối tác» thành công tắc; ô bằng lái hiện ở bảng cài đặt nhưng khoá

- **Trạng thái:** **proposed** — AI soạn 26/11/2026 theo lệnh chủ, chờ chủ duyệt (AI không tự duyệt, Hiến pháp N3). Lệnh chủ 26/11/2026 trong phiên điều phối «Đánh giá thị giác», nguyên văn: «1- bật lại đi. 2- giữ nguyên như vậy, nhưng cho cả 2 tùy chọn này vào trong bảng điều khiển của Admin , Super Admin nhé». «1» = bật lại ô đặt cọc của đối tác; «2» = ô bằng lái giữ ẩn; «cả 2 tùy chọn» = hai công tắc thành tuỳ chọn của Quản trị và Toàn quyền (hồ sơ bàn giao `docs/superpowers/plans/2026-11-26-ban-giao-phien-dieu-phoi-giao-dien.md` mục 3, nhánh `claude/tour-booking-ui-audit-b8c386`).
- **Ngày:** 2026-11-26. **Số:** 0236 (0234, 0235 đã có trên các nhánh).
- **Loại:** việc lớn — dữ liệu (migration 0193), quyền (ô mới `settings.form_fields`), tiền (lời khai đặt cọc). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều. Đổi công tắc là chèn dòng mới; bảng chỉ thêm, gỡ được bằng cách để yên. Lời khai đã lưu không bị đụng ở cả hai chiều.
- **Xây trên lỗ đang hở:** HC-5.19 (chưa diễn tập khôi phục; có migration mới). Cần chủ cho phép kèm lý do như các lần trước — **chưa có khoá trong `docs/quyen-hoan.json`**. Lý do đề nghị: một bảng cài đặt chỉ-thêm, gieo một dòng, không đổi dòng dữ liệu nào, không chạm sổ tiền.
- **Quan hệ với ADR cũ:**
  - **Sửa ADR-0225 Đ1** (đã duyệt 22/11, ghi chính Đ1 là cửa hai chiều): thay hằng `HIEN_O_DAT_COC_DOI_TAC = false` bằng công tắc lưu CSDL, mặc định BẬT. ADR-0225 không bị sửa chữ; dòng mục lục trỏ sang đây.
  - **Giữ ADR-0225 Đ2** (đơn đối tác chỉ thu hộ tiền mặt) nguyên vẹn. Hệ quả: chữ gợi ý «vd: nội dung chuyển khoản» vẫn bỏ khỏi form Đối tác.
  - **Khôi phục ADR-0197 Đ1 / ADR-0159 Đ1 mục 1** ở mức giao diện khi công tắc bật; mọi luật máy chủ của hai ADR đó giữ nguyên.
  - **Không đổi ADR-0212 Đ8** (ô bằng lái trên phiếu đăng ký — chưa thi công).
  - **Lệch nhẹ với khuôn ADR-0038** (việc cài đặt chung chỉ Toàn quyền, ô `settings.ops`): theo lời chủ, Quản trị cũng đổi được hai tuỳ chọn này. Không nới `settings.ops`; thêm một ô riêng hẹp.

## Đ1 — Ô «Khách đặt cọc cho đối tác» theo công tắc, mặc định BẬT (đã thi công trên nhánh)

1. Bảng `ord_partner_deposit_field_policy` (module `orders`, migration 0193): chỉ thêm, trigger cấm sửa / xoá, gieo một dòng `hien = 1`. Dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét; không có dòng nào ⇒ BẬT.
2. **Form Tạo đơn** của tài khoản giữ quyền Đối tác (kể cả tài khoản lai) hỏi `GET /api/cai-dat/o-dat-coc-doi-tac` (`apChoToi`) rồi mới quyết hiện ô. Lỗi mạng ⇒ ẩn. Nhãn nút gập theo ô: «Giải thích giảm giá, đặt cọc» khi có ô, «Giải thích giảm giá» khi không.
3. **Máy chủ tuân theo** (cổng `congLoiKhaiKhiLuu`, cả lập đơn lẫn lưu nháp): công tắc TẮT mà tài khoản Đối tác gửi lời khai > 0 ⇒ 409 `o_dat_coc_dang_tat`, câu «Văn phòng đã tắt ô «Khách đặt cọc cho đối tác». Tải lại trang rồi lưu lại đơn; cần ghi tiền khách đặt cọc thì nhờ văn phòng.» Không gửi khoá hoặc gửi 0 ⇒ giữ số đang lưu (như ADR-0225 Đ1 mục 5). Người không giữ quyền Đối tác: luật 403 cũ không đổi.
4. **Lời khai đã lưu** lúc bật, xác nhận lúc tắt: vẫn thành đúng một khoản thu tiền mặt (ADR-0159 Đ1 mục 3) — khớp ADR-0225 Đ2 vì khoản đó vốn là tiền mặt (bài `o-dat-coc-cai-dat-route.test.ts`).
5. Hướng dẫn Đối tác bước 6 nói lại ô đặt cọc, kèm «nếu văn phòng bật».

## Đ2 — Ai đổi được: Quản trị và Toàn quyền (đã thi công trên nhánh)

1. Ô quyền mới `settings.form_fields` = Quản trị, Toàn quyền (`quanTri()`); mọi vai khác `none`. Route `POST /api/cai-dat/o-dat-coc-doi-tac` cổng `admin`, thân hỏi ô này; MỘT lô: dòng chính sách + nhật ký `partner_deposit_field_policy_changed` («Bật / Tắt ô khách đặt cọc cho đối tác», không gắn đơn). Trùng mốc ⇒ 409 `stale`, cả lô lui. Gửi đúng trạng thái đang có ⇒ 200, không ghi.
2. Thẻ «Ô khách đặt cọc cho đối tác» ở trang **Tôi**, cuối nhóm «Cài đặt lập đơn» (không đổi cấu trúc menu; phiên tái cấu trúc menu sẽ xếp lại). Nhóm này trước chỉ Toàn quyền thấy; nay Quản trị thấy nhóm với đúng hai thẻ mới.

## Đ3 — Ô bằng lái: hiện ở bảng cài đặt, khoá (đã thi công trên nhánh)

1. Phiếu đăng ký **chưa có** ô bằng lái và hạng (ADR-0212 Đ8 chưa thi công). Một công tắc «bật» lúc này sẽ mở vai Tài xế đối tác mà không có ô nào để khai — sai. Nên thẻ «Ô bằng lái trên phiếu đăng ký» chỉ đọc: «Đang tắt», nút «Bật ô bằng lái trên phiếu đăng ký» bị khoá, câu «Chưa bật được: phiếu đăng ký chưa có ô bằng lái và hạng…». Không bảng, không route, không lưu gì (không có trạng thái thật để lưu).
2. Hằng `CO_O_BANG_LAI` giữ `false`. Bài `src/o-bang-lai-cai-dat.test.ts` đỏ ngay khi hằng đổi sang `true`: lúc làm Đ8 phải đổi thẻ này sang công tắc thật (bảng CSDL, POST, nhật ký).

## Đối chiếu (Oracle, MWG)

- **Oracle:** cấu hình là dữ liệu có ngày hiệu lực, không sửa lõi (Oracle 5); đổi qua một lệnh có kiểm quyền, cùng lô với dấu vết (Oracle 2); máy chủ chặn tại nguồn, không tin giao diện (Oracle 3). → Bảng chỉ-thêm có `valid_from_at`, lô ghi kèm nhật ký, cổng máy chủ đọc công tắc.
- **MWG:** người vận hành gần việc được tự chỉnh điều hay đổi (T5 phân quyền theo vai), từng bước nhỏ (T4). → Quản trị được đổi theo lời chủ; ô bằng lái không làm giả công tắc khi chưa có ô thật.
- **Chọn:** khuôn công tắc sẵn có (0157, 0181, 0182) — không thêm khái niệm mới; đúng quy mô một người cùng AI.
- **Kernel 18:** không đổi dòng nào của tờ khai (`docs/kernel-18.md`): thêm một bảng cấu hình trong module có sẵn, một ô quyền trong bảng quyền có sẵn.

## Trang ghép (CLAUDE.md §9)

(1) Bảng mới `ord_partner_deposit_field_policy` chỉ chứa một loại: dòng chính sách «ô cọc hiện / ẩn». (2) Ô `settings.form_fields` chỉ chạm bảng này (ghi) — Quản trị, Toàn quyền; ô `order.create` đọc qua GET để form biết `apChoToi`. (3) Cổng: route ghi cổng `admin` + ô ở thân; cổng lời khai `congLoiKhaiKhiLuu` cho hai đường lập / lưu nháp; giao diện ẩn / hiện thẻ ở trang Tôi theo `can(staff, "settings.form_fields")`, ô cọc ở form theo `apChoToi` của máy chủ.

## Hệ quả

- Đối tác lại khai được tiền khách đặt cọc trên form (mặc định). Quản trị và Toàn quyền tắt được ngay ở trang Tôi; tắt không làm mất số đã khai.
- Kịch bản Chrome `docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs` đổi theo: bật ⇒ có ô; Quản trị tắt ⇒ ẩn; thẻ cài đặt của Quản trị.
- Hàng rào: `src/o-dat-coc-doi-tac.test.ts` (thay `an-o-coc-doi-tac.test.ts`), `src/modules/orders/o-dat-coc-cai-dat-route.test.ts`, `src/migrations-cong-tac-o-dat-coc.test.ts`, `src/o-bang-lai-cai-dat.test.ts`; `src/route-write-guard.test.ts` nhận thêm ô `settings.form_fields` là ô quản trị (nới có tên).

## Điều chủ cần duyệt

1. Văn bản này (Đ1–Đ3), gồm việc Quản trị cũng đổi được (khác các công tắc cũ chỉ Toàn quyền).
2. Cho phép xây trên lỗ HC-5.19 với lý do ở dòng đầu.
3. Tên hai nút «Tắt ô khách đặt cọc cho đối tác / Bật ô khách đặt cọc cho đối tác» (bảng tham chiếu đang ghi «chờ chủ chọn»).
