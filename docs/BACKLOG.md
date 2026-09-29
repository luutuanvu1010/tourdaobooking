# Sổ tồn đọng (backlog) — ý tưởng, ý kiến, ý định CHƯA làm

> Chỗ lưu những điều chủ dự án đã nói/đã nghĩ tới nhưng **chưa thi công**, để không bị quên giữa các phiên.
> Đây là tài liệu **mô tả** (không chuẩn tắc): một mục ở đây KHÔNG phải lời duyệt; muốn làm vẫn theo quy trình CLAUDE.md §9 (đặc tả/ADR → kế hoạch → thi công).
> Nợ kỹ thuật chi tiết của từng lần thi công vẫn ở `docs/superpowers/plans/*-thi-cong-nhat-ky.md`; việc treo của triển khai ở `docs/HANDOFF-N1.md`.

**Cách ghi:** mỗi mục một khối: tiêu đề ngắn · ngày · ai nêu · trạng thái (`ý tưởng` / `đã duyệt, chưa làm` / `tạm gác`) · đã có gì (ADR, kế hoạch) · còn vướng gì. Làm xong thì xoá mục khỏi sổ (lịch sử còn trong git), ghi bản phát hành vào commit.

---

## 1. Đính kèm ảnh/tệp trong tin thông báo của Toàn quyền

- **Ngày:** 2026-09-28 · **Chủ nêu:** *"thêm trường gửi ảnh/đính kèm ảnh và/hoặc tệp PDF, doc, docx, txt, md trong phần Tạo Thông Báo của Super Admin"* · **Trạng thái:** `đã duyệt, chưa làm`.
- **Đã có:** ADR-0041 (accepted — chủ chọn phương án "a": kho R2 của Cloudflare); kế hoạch `docs/superpowers/plans/2026-09-28-dinh-kem-tep-thong-bao.md` (4 task).
- **Nội dung đã chốt:** tối đa 5 tệp/tin, mỗi tệp ≤ 10MB; JPG, PNG, HEIC, PDF, DOC, DOCX, TXT, MD — kiểm theo nội dung thật của tệp; chỉ người nhận tin và người gửi tải được; tin bị thu hồi thì tệp khoá theo; ảnh xem trước, tệp khác có nút tải; màn hình khoá không mang tệp.
- **Còn vướng trước khi làm:**
  - Kế hoạch ghi migration `0028` → **phải đổi thành `0029_ntf_attachment.sql`** (`0028_vai_it.sql` đã lên main). Kiểm lại số trên mọi nhánh chưa gộp trước khi đặt.
  - Chủ phải tạo kho một lần trước khi triển khai: `npx wrangler r2 bucket create tourdao-sales-tep`.
  - **Câu chờ chủ:** một Toàn quyền KHÁC (không nằm trong nhóm nhận) có được tải tệp trong tin do người kia gửi (từ màn "Đã gửi") không? Mặc định đang để **không**.
  - Việc lớn (dữ liệu + quyền) → cần người kiểm độc lập cho task dữ liệu/quyền.

## 2. Báo Quản trị/Toàn quyền mọi đơn vừa xác nhận

- **Ngày:** 2026-09-28 · **Chủ hỏi** vì sao đơn nhân viên tự lập, tự xác nhận không báo lên máy mình · **Trạng thái:** `tạm gác` — chủ chọn **giữ như hiện tại**.
- **Hiện tại (ADR-0045):** chỉ báo khi đơn được xác nhận mà **chưa có người phụ trách**; đơn đã có người thì chỉ báo chủ đơn + người phụ trách.
- **Hai hướng đã trình nếu muốn mở lại:** (B) mọi Quản trị được báo mọi đơn xác nhận; (C) chỉ tài khoản Toàn quyền được báo mọi đơn xác nhận (AI khuyến nghị C). Đổi = một dòng luật ở `src/shared/thong-bao.ts` + ADR mới.

## 3. HDV bấm "Từ chối" thì chuông báo

- **Ngày:** 2026-09-27 · **Chủ nói:** *"HDV bấm từ chối thì chuông chưa báo, để sau"* (K7) · **Trạng thái:** `tạm gác`.
- **Khi làm:** thêm `order_handler_refused` vào view hộp thông báo = migration mới + đổi test khoá (xem nhật ký `docs/superpowers/plans/2026-09-27-thong-bao-luot-1-thi-cong-nhat-ky.md`).

## 4. Quản trị ghi và "xem đủ số" giấy tờ của tài khoản cấp trên

- **Ngày:** 2026-09-28 · **Chủ trả lời:** *"Có, cho mọi người"* (Quản trị được nhập / gia hạn / sửa sai và xem đủ số giấy tờ của mọi người, kể cả Quản trị khác và tài khoản Toàn quyền), rồi chọn *"Đưa lên bản hiện tại, sửa sau"* · **Trạng thái:** `đã duyệt, chưa làm`.
- **Hiện tại (bản 1.35, Vận chuyển 1a):** Quản trị KHÔNG làm được giấy tờ của tài khoản cấp trên. Đây là luật cấp bậc có sẵn, Ruling R8. Quản trị vẫn làm được cho mọi tài xế, nhân viên thường và người không có tài khoản.
- **Khi làm (Ruling R24, sổ `docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md` mục 11.11, 12):**
  - Máy chủ: bỏ 4 lời kiểm cấp bậc `acc.linked && !acc.manageable` ở route giấy tờ 4–7 (`src/modules/parties/index.ts`). Ô quyền giữ nguyên.
  - Test: lật hai bài R8 ở `giay-to-route.test.ts`.
  - Giao diện: bỏ "chỉ xem" giấy tờ ở hồ sơ cấp trên (`web/parties.ts`, chỉ phần giấy tờ). Chạy lại `giay-to-nguoi-smoke`.
  - Việc lớn (quyền) nên cần người kiểm độc lập.
  - Người làm phải nhận lời duyệt TRỰC TIẾP từ chủ trong phiên của mình. Hàng rào an toàn chặn việc nới quyền dựa trên tin chuyển lại.

## 5. Ô ghi chú gõ tự do trong chuyến xe

- **Ngày:** 2026-09-29 · **Chủ chọn:** *"Chưa làm"* cho câu "Bản vẽ có ô ghi chú gõ tự do trong chuyến xe ("Ghi chú cho tài xế", ghi chú khi phá lệ, khi kết thúc gián đoạn). Lượt này có làm không?" · **Trạng thái:** `tạm gác`.
- **Bản vẽ:** `docs/design/van-chuyen-dieu-phoi/project/03 Tao sua chuyen.dc.html` (ô "Ghi chú cho tài xế"), `01 Dieu phoi xe.dc.html` (ghi chú khi phá lệ), `05 Chuyen dang chay.dc.html` (ghi chú khi kết thúc gián đoạn) — đối chiếu `docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md` mục 2.10.
- **Vì sao gác:** lệnh vận chuyển chỉ nhận mã lý do (kế hoạch ADR-0049 I18), vì chữ tự do có thể chứa tên / SĐT khách và lọt vào nhật ký chuyến nhiều người xem.
- **Khi làm:** cột mới trên bảng chuyến / sự kiện chuyến (migration mới), che dãy số như ghi chú đặt gấp (`maskLongDigits`, tối đa 120 ký tự), không đưa vào DTO tài xế ngoài ngày chạy; cần ADR bổ sung ADR-0049 + người kiểm độc lập (dữ liệu).
