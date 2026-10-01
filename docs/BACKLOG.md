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

## 6. Tài xế mất mạng: máy tự gửi lại thao tác chờ

- **Ngày:** 2026-09-30 · **Chủ chọn:** *"Giữ vậy, tự gửi lại để lượt sau"* (lần 15, sổ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`) · **Trạng thái:** `để lượt sau`.
- **Hiện tại (Bảng điều phối lượt 1):** thao tác chưa gửi được (Đã đón, Vắng, Đã trả…) chỉ nằm trong bộ nhớ trang (`web/cuoc-chuyen.ts`, `Map choGui`). Tài xế thấy dòng "Chưa gửi được" và bấm lại; nếu đóng app trước khi bấm lại thì thao tác mất. Văn phòng bấm thay được. Bản vẽ 5a của chủ ghi "máy tự gửi lại khi có mạng". Đây là điều phối tự chốt khác bản vẽ khi thi công; chủ đã được nói rõ ở lần 15.
- **Khi làm:** hàng đợi bền (IndexedDB), gửi lại khi có mạng và khi mở lại app. `requestId` đã có sẵn nên gửi lại không ghi kép. Cần kịch bản Chrome "tắt mạng → đóng trang → mở lại → tự gửi" và thử trên iPhone thật.

## 7. Việc nhỏ còn lại của Bảng điều phối lượt 1 (người kiểm K2b xếp "để lượt sau")

- **Ngày:** 2026-09-30 · **Trạng thái:** `để lượt sau`. Nguồn: nhật ký giao diện `docs/superpowers/plans/2026-09-29-adr-0049-giao-dien-nhat-ky.md`.
- Q-B-15: văn phòng sắp lại thứ tự điểm dừng khi chuyến đang chạy (route 39). Bản vẽ chưa vẽ.
- Q-B-7: ô chọn tài xế chưa hiện hạng bằng lái (DTO thiếu trường).
- Q-B-10: huy hiệu số ở mục menu "Điều phối xe" (chưa có nguồn số).
- Q-B-12: danh sách cuốc của tài xế chưa có giờ kết thúc dự kiến.
- Q-B-13: một lệnh "trả hết" ở máy chủ. Hiện giao diện gửi nhiều lệnh nối nhau.
- Q-B-17: câu từ chối giờ khai lùi chưa nêu số phút tối đa (DTO thiếu số phút).
- Kịch bản cũ `docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` đỏ sẵn trên `main`. Kịch bản dùng tài khoản Quản trị, nhưng bật bảo trì cần Toàn quyền (ADR-0038). Sửa: đổi tài khoản sang Toàn quyền như `dot-c-smoke`.
- Kịch bản `help-smoke` đôi khi đỏ thoáng qua do bộ nhớ đệm trang của Chrome (bfcache): đỏ một lần, chạy lại thì xanh. Người kiểm K2b (T3) nêu, K2c xác nhận còn tồn.
- Máy chủ trả `canhBaoPhut` nhưng giao diện chưa đọc. Vô hại; người kiểm K2b (T4) nêu, K2c xác nhận còn tồn.
- Tên khách trong một nhóm ở Chi tiết chuyến hiện theo thứ tự ngẫu nhiên, vì suất sắp theo mã ngẫu nhiên. Muốn theo đúng thứ tự trong đơn thì máy chủ phải trả thứ tự dòng hành khách, mà bảng `ord_passenger` chưa có cột vị trí. Chỉ ảnh hưởng hiển thị. Phiên giao diện vòng 5d nêu (30/9).

## 8. Góp ý người dùng 30/9 — việc đã chốt hướng, chưa làm

- **Ngày:** 2026-09-30 · **Nguồn:** 12 phiếu Góp ý (YC-0001…0012) + chủ trả lời trong chat · **Trạng thái:** `đã duyệt hướng, chưa làm`.
- **Chi tiết + thứ tự:** `docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md` mục 7 (đợt giao diện G1; ADR D1 biển số xe trên đơn, D2 dấu "đã nhập phần mềm kế toán" + số hoá đơn, D3 mở lại Dịch vụ nhập tay cho nội bộ; lượt sau D4 "Đã xuất vé", C2 Kế toán sửa số lượng thực tế, người phụ trách trong bộ lọc; chủ vẽ Claude Design cho tối ưu điện thoại theo vai).

## 9. Bản nhớ khung (td-khung-v1) không theo tài khoản

- **Ngày:** 2026-09-30 · **Người thi công phát hiện** khi thi công ADR-0058 (Task A7, sửa kịch bản `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/danh-muc-lap-don-smoke.mjs` bước 4) · **Trạng thái:** `ý tưởng`.
- **Hiện tượng:** bản nhớ khung (`td-khung-v1`, `web/khung-nho.ts` — ADR-0035) không theo tài khoản: đổi tài khoản trên cùng máy thì form đơn gọi sớm danh mục một lần và nhận 403 (vô hại, bị nuốt). Đổi tài khoản qua `/login` thì không bị (bản nhớ bị xoá); chỉ gặp khi phiên đổi mà không qua `/login`.
- **Nếu muốn sạch:** chỉ gọi sớm khi bản nhớ khớp tài khoản.
- **Đã có:** kịch bản Chrome đã tự xoá bản nhớ trước khi mở form của Kế toán; mã app chưa sửa.

## 10. Phiếu ý kiến Giám đốc 30/9 — việc để sau

- **Ngày:** 2026-10-01 · **Nguồn:** phiếu Google Form Giám đốc trả lời 30/9; đối chiếu ở `docs/superpowers/specs/2026-10-01-doi-chieu-phieu-giam-doc.md` (số câu dưới đây = số câu hỏi ở mục 6 tài liệu đó) · **Chủ nói (1/10):** *"ghi nợ vào trong backlog để làm sau. Trước hết là làm những phần bắt buộc để xe chạy được"* · **Trạng thái:** `ý tưởng` — mọi câu **chưa được chủ quyết**; ADR đã duyệt và lời chủ §10 sổ câu hỏi Vận chuyển vẫn có hiệu lực.
- **Đang làm trước (KHÔNG thuộc mục này):** màn nhập danh sách khách + điểm trả khách (ADR-0047 Phần B, kèm câu 14 nơi trả mặc định theo dịch vụ và câu 17 nhắc thiếu tên nếu chủ chọn); sổ tiền đối tác/đại lý và HDV tại cảng (câu 10, có thể kéo theo 11–13).
- **Trái ADR đã duyệt — chờ chủ quyết có mở lại không:**
  - Câu 4 + 5: bỏ quy tắc 6 giờ (ADR-0049 D2, CSDL chặn tắt) / thông báo "Đặt gấp cần duyệt".
  - Câu 6: "Trưởng ca điều phối" tự đổi tài xế trong 6 giờ không cần Quản trị (ADR-0049 ĐP3) — cần vai + quyền mới.
  - Câu 7: chỉ bắt buộc Kiểm định, bỏ Bảo hiểm (ADR-0050 VK1-C; bảo hiểm TNDS bắt buộc theo luật — **không ai đóng điều kiện này trong app** trước khi chủ quyết).
  - Câu 8: một người trực phụ trách mọi đơn (ADR-0018/0020/0025).
  - Câu 9: huỷ đơn đã xếp xe → máy tự rút khách + báo tài xế (ADR-0049 LC-09).
- **Thứ tự / mâu thuẫn trong phiếu:** câu 1 tiền xe thuê "Để sau" (chủ đã chọn "Làm trước"); câu 3 xe hỏng giữa đường (hiếm vs tháng tới); câu 15 chiều về tự tạo vs nhân viên tự ghi.
- **Chưa có trong kế hoạch:** câu 11 trần giảm giá nhân viên (vượt thì Quản trị duyệt); câu 12 nghĩa "giá riêng từng đại lý"; câu 13 giá theo mùa; câu 16 chặn đơn trùng (chủ 22/9 chọn chỉ cảnh báo — đặc tả ở nhánh `canh-bao-don-trung`, chưa gộp); câu 18 giờ lái tối đa 10 giờ (ADR-0055 đang 8 giờ, chỉ cảnh báo); câu 19 nhiên liệu + số km xe công ty; câu 20 máy tự xếp thứ tự điểm đón (chờ hỏi pháp lý ghép khách xe hợp đồng).
- **Giao diện:** câu 21 thẻ đơn hiện mã đơn + tổng tiền ở phần luôn thấy, màu chuyến gộp về 3 màu đỏ/vàng/xanh, Bảng điều phối 3 cột trên iPad dựng đứng, biển số trên thẻ danh sách (cần ADR mở rộng ADR-0059); câu 22 trang bị + thử iPad thật cho điều phối (Phần D — CSV phiếu không có câu nào của Phần D).
