# ADR-0149 — Đưa đón theo từng dịch vụ (riêng thắng chung) và khoá «dịch vụ» trong biểu phí đón

- **Trạng thái:** **accepted** 2026-10-29 — chủ dự án trong chat, nguyên văn: *«Duyệt ADR-0149»* (bấm nút trả lời sau tin trình bản đề xuất đã qua người kiểm độc lập). AI soạn và chép, không tự duyệt (Hiến pháp N3). Từ khi duyệt chỉ sửa dòng trạng thái.
- **Số và nguồn:** đề xuất `docs/superpowers/specs/2026-10-29-dua-don-theo-dich-vu/DE-XUAT-ADR.md` (hồ sơ có ngày, không sửa), trang ghép `TRANG-GHEP.md` cùng thư mục. Số 0149 kiểm còn trống ở mọi nhánh ngày 29/10 (0148 dùng ở nhánh `claude/pricing-age-discount-config-328499` chưa gộp). Người kiểm độc lập chỉ đọc soát sự thật bản đề xuất ngày 29/10: ĐẠT CÓ ĐIỀU KIỆN, hai câu viết quá tay đã sửa trước khi trình.
- **Ngày:** 2026-10-29. **Loại:** việc lớn (dữ liệu; Đ2 chạm tiền ở mức thiết kế). **Cửa:** dữ liệu một chiều mềm (bảng chỉ thêm, ở lại); luật và mã đảo được; về «Theo nhóm» bằng cách kết thúc dòng.
- **Lời chủ (29/10, chat, không hỏi lại):** «tùy chọn đón hay không đón theo từng dịch vụ cụ thể (kèm thêm điều kiện là nhóm) … quy tắc riêng sẽ thắng quy tắc chung (Ví dụ: Bật đưa đón cho nhóm nhưng nếu 1 dịch vụ thuộc nhóm mà không đón, thì quy tắc đó sẽ thắng) . và thiết kế luôn biểu phí dịch vụ đưa đón». Hộp chọn cùng ngày, chủ chọn cả ba khuyến nghị: ô dịch vụ **ba lựa chọn**; biểu phí **có** mức riêng theo dịch vụ; bước tiếp **soạn văn bản, chưa viết mã**.
- **Quan hệ với ADR cũ:** **mở rộng** ADR-0118 (cờ nhóm giữ nguyên, thêm tầng dịch vụ đè lên); **thêm một khoá điều kiện** vào ADR-0147 Đ2 (đúng đường «thêm khoá bằng một dòng tra cứu và một bộ tính, kèm ADR, không đổi bảng»); giữ ADR-0047 (chặng không mang tiền), ADR-0134 Đ7 + lệch R-M (form ghi «Không đón» khi dịch vụ không được đón), R-T (chặn đổi ngày) — hai luật này ghi ở `docs/superpowers/plans/2026-10-14-dot-2-luot-1-thi-cong-nhat-ky.md`, không ở chữ ADR-0118.
- **Xây trên lỗ đang hở:** Đ1 **không** (không tiền). Đ2 nằm trong phí đón nên mang đúng điều kiện của ADR-0147: **TNV-G1** chưa đóng ⇒ không phát hành phần phí; mã phí chỉ viết sau sổ vàng Kế toán.

## Tóm tắt cho chủ (lời thường)
1. Mỗi dịch vụ có ô **«Đưa đón»**: **Theo nhóm** (mặc định, y như hôm nay) — **Luôn đón** — **Không đón**. Ô của dịch vụ thắng công tắc của nhóm, cả hai chiều.
2. Quản trị và Toàn quyền đặt ô này ở màn **Danh mục**, cạnh công tắc nhóm; mỗi lần đổi có nhật ký. Ô này **không** nằm trong Google Sheet nên đồng bộ Sheet không xoá nó.
3. Dịch vụ không được đón thì form không hiện khối đưa đón và máy chủ từ chối ghi chặng — đúng như luật nhóm hôm nay. Đơn cũ đã có chặng: xem được, chỉ đóng được chặng.
4. Biểu phí đón (đã duyệt 28/10) có thêm điều kiện **«dịch vụ»**: dòng phí đặt cho một dịch vụ thắng dòng của cả nhóm. Muốn miễn phí thì đặt 0 đồng rõ ràng.

## Quyết định (hai điều chạm dữ liệu/tiền, dưới trần 3)
**Đ1 — Ô đưa đón của dịch vụ (dữ liệu, phân hệ `catalog`).**
- Bảng mới `ctl_service_transfer_rule` do `catalog` sở hữu: mã dịch vụ, `mode` ∈ {`ALWAYS`, `NEVER`}, ngày hiệu lực từ/đến, dấu vết người đặt. «Theo nhóm» = **không có dòng hiệu lực** (không lưu thành giá trị). Chỉ thêm; đổi = kết thúc dòng cũ, chèn dòng mới (không xoá cứng).
- Mỗi mã dịch vụ có **tối đa một dòng đang hiệu lực** (chỉ mục duy nhất một phần), để view vẫn ra đúng một dòng mỗi mã; thiếu chỉ mục này thì phép nối nhân dòng.
- Không thêm cột vào `catalog_item` [người soạn]: đồng bộ Sheet chỉ ghi các cột lấy từ Sheet (`catalog/repository.ts`, `ON CONFLICT … DO UPDATE SET` liệt kê từng cột), nên cột mới **không** bị xoá. Lý do chọn bảng riêng: `catalog_item` là bảng của đồng bộ, còn ô này cần lịch sử chỉ thêm, có hiệu lực, có người đặt. Phương án khác: dùng bảng `catalog_override` đã có, vốn không bị đồng bộ đụng tới. Người thi công so hai cách trong kế hoạch.
- View `v_ctl_service_transfer` (hợp đồng đã có, `orders` đọc) đổi cách tính: dòng hiệu lực của dịch vụ nếu có, nếu không thì luật ADR-0118 hiện tại. Tên cột không đổi ⇒ sáu cửa ghi chặng và cửa xác nhận của `orders` **không sửa**.
- **Bẫy hai luật** [người soạn]: DTO của form hôm nay tự tính cờ từ nhóm (`catalog/index.ts`, theo `nhomChoForm`), **không** đọc view. Thi công phải để form và view dùng **một** nguồn (một hàm thuần hoặc cùng đọc view), kèm bài so khớp form ↔ máy chủ cho cả ba lựa chọn.
- Dịch vụ nhập tay (không mã danh mục) vẫn **luôn cho đón** như ADR-0118.
- Ghi: ô `admin.manage` (Quản trị, Toàn quyền) qua route của `catalog`, khoá lạc quan, nhật ký `catalog_service_transfer_set` (mã dịch vụ, cũ → mới; không thông tin cá nhân).

**Đ2 — Khoá «dịch vụ» trong biểu phí đón (tiền, phân hệ `pricing`, thiết kế).**
- Thêm một dòng vào bảng tra cứu khoá điều kiện của ADR-0147 Đ2: khoá **dịch vụ** (giá trị = mã danh mục), và một bộ tính ở danh sách đăng ký. Không đổi bảng phí.
- «Dòng cụ thể nhất thắng» giữ nguyên cách **đếm số điều kiện** của ADR-0147. Hệ quả cần nói rõ:
  - dòng «vùng + nhóm + dịch vụ» thắng dòng «vùng + nhóm» (3 > 2) — đây là trường hợp riêng thắng chung chủ muốn;
  - nhưng dòng «vùng + dịch vụ» (2) **thua** dòng «vùng + nhóm + xe riêng» (3), và hai dòng cùng bậc khác số thì báo xung đột, không dòng nào tự thắng.
  - Vì vậy màn biểu phí, khi Quản trị đặt dòng có khoá dịch vụ, tự điền sẵn nhóm hiện hành của dịch vụ [người soạn], và Thử tra hiện dòng nào đang thắng.
- Dịch vụ `NEVER` không có chặng ⇒ không có phí; dịch vụ `ALWAYS` trong nhóm tắt vẫn cần mức phí khớp, không có thì «thiếu mức» như ADR-0147 (không bao giờ lấy 0).
- Thời điểm: cùng lượt thi công phí đón; sổ vàng `golden/phi-dua-don.json` thêm ít nhất ba ca (dòng nhóm + dịch vụ thắng dòng nhóm; dòng chỉ dịch vụ gặp dòng nhóm + xe riêng; dịch vụ `ALWAYS` trong nhóm tắt).

## Không làm [người soạn]
- Đón theo vai/loại tài khoản (thuộc chính sách bán ADR-0146).
- Cột «Đưa đón» trong Google Sheet.
- Tự đóng chặng của đơn cũ khi dịch vụ chuyển sang «Không đón».

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)
1. Nhóm bật + dịch vụ `NEVER`: lập đơn có chặng cho dịch vụ đó ⇒ 409 `transfer_disabled`; dịch vụ khác cùng nhóm ghi được.
2. Nhóm tắt + dịch vụ `ALWAYS`: ghi chặng được và xác nhận được.
3. Kết thúc dòng (về «Theo nhóm»): hành vi trở lại đúng cờ nhóm.
4. Form và máy chủ cho cùng đáp án ở mọi tổ hợp nhóm bật/tắt × ba lựa chọn (bài so khớp).
5. Đồng bộ Sheet không đổi dòng nào của `ctl_service_transfer_rule`.
6. Bán hàng, Đối tác, Thực tập, Kế toán đặt ô ⇒ 403; Quản trị, Toàn quyền ⇒ được, có nhật ký.
7. `orders` không đọc `ctl_service_transfer_rule` trực tiếp (bài kiến trúc sẵn có mở rộng).
8. (Đ2, khi làm phí) dòng phí theo dịch vụ thắng dòng theo nhóm; Thử tra trả cùng số với đơn thật.

## Điều chưa kiểm
- Chưa đếm trên dữ liệu thật dịch vụ nào của Hòn Tằm cần «Không đón»; danh sách do chủ/văn phòng đặt sau khi phát hành.
- Số migration lấy lúc thi công.
