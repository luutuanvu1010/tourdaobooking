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

- **Mã nợ:** `BL-GHI-CHU-CHUYEN` (gắn 2026-10-03 khi ADR-0097 nháp trích mục này; nội dung mục không đổi).

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
- ~~Q-B-15: văn phòng sắp lại thứ tự điểm dừng khi chuyến đang chạy~~ — **xong bản 1.65** (nút lên / xuống ở Chi tiết chuyến, khuôn màn tài xế).
- Q-B-7: ô chọn tài xế chưa hiện hạng bằng lái (DTO thiếu trường).
- Q-B-10: huy hiệu số ở mục menu "Điều phối xe" (chưa có nguồn số).
- Q-B-12: danh sách cuốc của tài xế chưa có giờ kết thúc dự kiến.
- Q-B-13: một lệnh "trả hết" ở máy chủ. Hiện giao diện gửi nhiều lệnh nối nhau.
- Q-B-17: câu từ chối giờ khai lùi chưa nêu số phút tối đa (DTO thiếu số phút).
- Kịch bản cũ `docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` đỏ sẵn trên `main`. Kịch bản dùng tài khoản Quản trị, nhưng bật bảo trì cần Toàn quyền (ADR-0038). Sửa: đổi tài khoản sang Toàn quyền như `dot-c-smoke`.
- Kịch bản `help-smoke` đôi khi đỏ thoáng qua do bộ nhớ đệm trang của Chrome (bfcache): đỏ một lần, chạy lại thì xanh. Người kiểm K2b (T3) nêu, K2c xác nhận còn tồn.
- Máy chủ trả `canhBaoPhut` nhưng giao diện chưa đọc. Vô hại; người kiểm K2b (T4) nêu, K2c xác nhận còn tồn.
- ~~Tên khách trong một nhóm ở Chi tiết chuyến hiện theo thứ tự ngẫu nhiên, vì suất sắp theo mã ngẫu nhiên. Muốn theo đúng thứ tự trong đơn thì máy chủ phải trả thứ tự dòng hành khách, mà bảng `ord_passenger` chưa có cột vị trí. Chỉ ảnh hưởng hiển thị. Phiên giao diện vòng 5d nêu (30/9).~~ — **xong bản 1.63** ("Danh sách hành khách hiện đúng thứ tự đã nhập").

## 8. Góp ý người dùng 30/9 — việc đã chốt hướng, chưa làm

- **Ngày:** 2026-09-30 · **Nguồn:** 12 phiếu Góp ý (YC-0001…0012) + chủ trả lời trong chat · **Trạng thái:** `đã duyệt hướng, chưa làm`.
- **Chi tiết + thứ tự:** `docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md` mục 7 (đợt giao diện G1; ADR D1 biển số xe trên đơn, D2 dấu "đã nhập phần mềm kế toán" + số hoá đơn, D3 mở lại Dịch vụ nhập tay cho nội bộ; lượt sau D4 "Đã xuất vé", C2 Kế toán sửa số lượng thực tế, người phụ trách trong bộ lọc; chủ vẽ Claude Design cho tối ưu điện thoại theo vai).

## 9. Bản nhớ khung (td-khung-v1) không theo tài khoản

- **Ngày:** 2026-09-30 · **Người thi công phát hiện** khi thi công ADR-0058 (Task A7, sửa kịch bản `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/danh-muc-lap-don-smoke.mjs` bước 4) · **Trạng thái:** `ý tưởng`.
- **Hiện tượng:** bản nhớ khung (`td-khung-v1`, `web/khung-nho.ts` — ADR-0035) không theo tài khoản: đổi tài khoản trên cùng máy thì form đơn gọi sớm danh mục một lần và nhận 403 (vô hại, bị nuốt). Đổi tài khoản qua `/login` thì không bị (bản nhớ bị xoá); chỉ gặp khi phiên đổi mà không qua `/login`.
- **Nếu muốn sạch:** chỉ gọi sớm khi bản nhớ khớp tài khoản.
- **Đã có:** kịch bản Chrome đã tự xoá bản nhớ trước khi mở form của Kế toán; mã app chưa sửa.

## 10. Chặn hồ sơ trùng khi đồng bộ nhân viên từ Google Sheet

- **Ngày:** 2026-10-01 · **Nguồn:** ADR-0068 / đặc tả gộp hồ sơ C3 · **Trạng thái:** `ý tưởng`.
- **Hiện tại:** "Đồng bộ danh sách từ Google Sheet" tạo tài khoản + hồ sơ mới như trước, KHÔNG kiểm hồ sơ khớp tên / SĐT (chỉ `POST /api/staff` thủ công bị chặn — C2). Đồng bộ Sheet vẫn có thể tạo hồ sơ trùng.
- **Còn vướng:** màn xem trước đồng bộ cần cột "hồ sơ khớp" và lựa chọn dùng hồ sơ có sẵn cho từng dòng; hàm dùng chung `createAccountWithRolesStatements` không được đổi hành vi ngầm.

## 11. Báo cáo theo khách / sổ công nợ theo người gom qua hồ sơ đã gộp

- **Ngày:** 2026-10-01 · **Nguồn:** ADR-0068 mục Hệ quả · **Trạng thái:** `ý tưởng` (nợ cho module báo cáo / billing lượt sau).
- **Hiện tại:** sau khi gộp, đơn đã giao, chuyến, phiếu thu, công nợ, nhật ký vẫn trỏ hồ sơ phụ; sổ "theo người" của hồ sơ chính không thấy chúng. Xem trước gộp hiện số dòng công nợ giữ lại.
- **Cần:** mọi báo cáo / sổ "theo người" đi theo `merged_into_id` một bước (không chuỗi — trigger bảo đảm).

## 12. Thêm tài khoản: hai hồ sơ cùng tên, chưa có vai nhìn như nhau

- **Ngày:** 2026-10-01 · **Nguồn:** ADR-0068 C1 · **Trạng thái:** `ý tưởng`.
- **Hiện tại:** danh sách hồ sơ khớp ở "Thêm tài khoản" hiện tên, lý do khớp, vai. Hai hồ sơ cùng tên mà đều chưa có vai thì nhìn y hệt nhau, khó chọn đúng.
- **Cần:** thêm liên kết "Xem hồ sơ" (mở Danh bạ ở hồ sơ đó) cạnh nút "Dùng hồ sơ này".

## 13. Gộp hồ sơ tổ chức (đại lý, nhà xe)

- **Ngày:** 2026-10-01 · **Nguồn:** ADR-0068 (ngoài phạm vi bản đầu, chủ đồng ý) · **Trạng thái:** `tạm gác`.
- **Còn vướng:** tổ chức chạm xe (`vc_vehicle.owner_party_id`), công ty chủ, công nợ đại lý — cần ADR riêng.

## 14. Nút "Không phải trùng" ở màn Hồ sơ nghi trùng

- **Ngày:** 2026-10-01 · **Nguồn:** ADR-0068 (ngoài phạm vi bản đầu) · **Trạng thái:** `tạm gác`.
- **Hiện tại:** cặp trùng tên thật sự là hai người khác nhau vẫn hiện mãi trong danh sách nghi trùng.
- **Cần:** bảng ghi cặp đã xác nhận khác người (không gộp) để màn nghi trùng bỏ qua.

## 15. Phiếu ý kiến Giám đốc 30/9 — việc để sau

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

## 16. Bảo mật hai lớp — đợt 2: gửi mã qua Zalo ZNS

- **Ngày:** 2026-10-01 · **Chủ nêu:** *"tăng cường lớp bảo mật 2 lớp 2FA cho phần đăng nhập … Gửi về Zalo qua ZNS, Ứng dụng Google Authenticator, gửi về email"*; chủ chọn đợt 1 = ứng dụng xác thực + email, đợt 2 = Zalo ZNS · **Trạng thái:** `ý tưởng` (đợt 1 đang ở bản nháp đặc tả).
- **Đã có:** đặc tả `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` §8; ADR-0074 bản nháp điều 8.
- **Còn vướng (phía chủ):** Zalo OA của công ty đã xác minh doanh nghiệp; đăng ký ZNS + mẫu tin OTP được Zalo duyệt; phí mỗi tin; khoá truy cập ứng dụng Zalo. Sau đó cần ADR/sửa đổi riêng.

## 17. Nghiên cứu sâu 33 loại hook của Claude Code để tối ưu việc lập kế hoạch và lập trình

- **Ngày:** 2026-10-01 · **Chủ nêu:** *"ghi backlog để nghiên cứu sau, về việc tìm hiểu sâu hơn 33 loại hook này để tối ưu quá trình lên kế hoạch, lập trình phần mềm với Anthropic"* · **Trạng thái:** `ý tưởng` (việc NGHIÊN CỨU, chưa phải việc thi công).
- **Đã có:** kho dùng 3/33 loại sự kiện — `PreToolUse` (chặn lệnh nguy hiểm, tệp cấm sửa, không sửa luật bằng dòng lệnh), `Stop` (cổng xanh), `Notification` (báo tin, đặt ở cấu hình cá nhân của chủ, ngoài kho). Đặc tả `docs/superpowers/specs/2026-10-01-ba-hook-moi.md`; ba dòng ở `docs/SO-HANG-RAO.md`. Nguồn: `code.claude.com/docs/en/hooks` (bảng "Hook lifecycle") và `…/hooks-guide` — đếm 33 loại ngày 1/10; con số đổi theo phiên bản, lúc nghiên cứu phải đếm lại.
- **Phạm vi nghiên cứu gợi ý:** với từng nhóm sự kiện, trả lời "nó giúp gì cho khâu LẬP KẾ HOẠCH hay khâu LẬP TRÌNH của kho này, và đã có chốt nào làm việc đó chưa": (1) đầu/cuối phiên và lúc nén ngữ cảnh (`SessionStart`, `SessionEnd`, `PreCompact`, `PostCompact`) — nạp sổ điều phối, nhắc vai của phiên; (2) lúc chủ gửi lệnh (`UserPromptSubmit`, `UserPromptExpansion`); (3) trợ lý con và nhóm AI (`SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`) — gồm cổng xanh cho trợ lý con (phải giải I-1: báo cáo đi qua `SubagentHandback`); (4) sau khi sửa tệp (`PostToolUse`, `PostToolBatch`, `FileChanged`); (5) xin quyền (`PermissionRequest`, `PermissionDenied`); (6) môi trường (`ConfigChange`, `CwdChanged`, `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded`). Kèm ba loại hook không phải lệnh (`prompt`, `agent`, `http`).
- **Tiêu chí đã dùng 1/10 (giữ khi nghiên cứu, tránh làm thừa):** một hook chỉ đáng thêm khi (a) đã có sự cố thật hoặc hậu quả không sửa lại được, (b) máy kiểm được chắc chắn và rẻ, (c) chưa có chốt nào phía sau bắt được. Theo tiêu chí đó, ngày 1/10 AI khuyến nghị CHƯA làm: nhắc lại sau khi nén ngữ cảnh, kiểm ngay sau mỗi lần sửa tệp, cổng xanh cho trợ lý con.
- **Còn vướng:** hook là LUẬT (`.claude/`) — thêm cái nào cũng phải qua đặc tả, người kiểm độc lập, sổ hàng rào và chủ duyệt (CLAUDE.md §3); hook mới chỉ có hiệu lực với phiên mở sau khi gộp nên chưa quan sát được ba hook 1/10 chạy trong phiên thật — nên dùng một hai tuần rồi mới nghiên cứu tiếp.

## 18. Trang chủ riêng cho Hướng dẫn viên và Đối tác ("mỗi vai là một nội dung")

- **Ngày:** 2026-10-02 · **Chủ nêu** (trả lời câu 1 sau bản Trang chủ điện thoại 1.66): *"HDV và đối tác sử dụng Trang chủ riêng của họ, hiển thị những gì trực tiếp liên quan đến nghiệp vụ và công việc của họ và hỗ trợ cho công việc của họ (Đúng phương châm mỗi vai là một nội dung)"* · **Trạng thái:** `đã duyệt hướng, chưa làm` — chủ chọn làm thành **đợt riêng**.
- **Đã có:** bản vẽ 2a (Hướng dẫn viên) và 2b (Đối tác) trong `~/Desktop/Phone home screen redesign/Trang chu dien thoai.dc.html` (Claude Design 2026-09-30): cùng khung Trang chủ điện thoại 1.66 (dải chào, ô tìm, lưới ô theo quyền, thẻ Chuyến đón) nhưng KHÔNG có số liệu toàn công ty, KHÔNG "Cần xem lại"; chuyến đón = đơn mình phụ trách (HDV) / mình lập (Đối tác). Khung giao diện dùng lại được: `oTrangChu()` (`src/shared/trang-chu-o.ts`), khối `.dash-*` điện thoại của `public/app.css`.
- **Còn vướng (cần đặc tả + ADR, chủ duyệt — chạm quyền và dữ liệu):**
  - Trang khởi đầu: hai vai này hôm nay được đưa thẳng sang `/orders` (`homeRedirect`, `src/shared/start-page.ts`); đổi thì cũng phải đổi thanh tab / menu của họ (HDV hôm nay chỉ có tab "Tôi").
  - Nguồn dữ liệu: `GET /api/orders/dashboard` trả 403 với họ (cổng `seesAllOrders`) — cần route / nhánh mới chỉ trả chuyến của chính họ.
  - Nội dung theo vai: mỗi vai thấy gì "trực tiếp liên quan" (HDV: việc chờ nhận, chuyến mình phụ trách, số tiền mình thu trước chuyến?; Đối tác: đơn mình lập, còn phải thu?) — đặc tả liệt kê, chủ chọn.
  - Tiền: ô `money.view` của HDV hôm nay = `assigned` (xem tiền đơn mình phụ trách) — bản vẽ 2a có hiện "còn lại"; xác nhận lại trong đặc tả.

## 19. Núm "Màu nhấn (xanh ngọc)" ở màn Giao diện

- **Ngày:** 2026-10-02 · **AI nêu** khi thi công thị giác 1.70 (đặc tả `docs/superpowers/specs/2026-10-02-thi-giac-nen-tang-design.md` §4) · **Trạng thái:** ý tưởng.
- **Vì sao:** bản 1.70 thêm màu ngọc (`--c-lagoon*`: vạch mục đang chọn, viền ô đang gõ, ô nhóm Vận chuyển, đầu cuối dải tóm tắt đơn) nhưng màn Giao diện (ADR-0087) CHƯA có núm cho nó — Toàn quyền đổi "Màu chính" thì màu ngọc đứng yên.
- **Làm khi chủ cần:** theo công thức z9 của `docs/CHANGE-GUIDE.md` (một dòng `NUM`, một giá trị `MAC_DINH`, cặp tương phản cho ngọc đậm trên ngọc nhạt và vàng "Còn lại" trên ngọc đậm). Không cần migration.
- **Cùng đợt nên làm (kiểm độc lập 1.70, TH-1/TH-2):** màu rê chuột nút lưu đặc là hằng `#0b5c84` — Toàn quyền đổi "Màu chính" thì nút đổi màu nhưng rê chuột vẫn xanh biển; nên dẫn xuất màu rê từ nền nút và thêm cặp tương phản "chữ nút lưu / màu rê". Vàng "Còn lại" `#fcd34d` đang viết ở hai nơi (`app.css` và `CAP_TUONG_PHAN`) — nối bằng một bài kiểm.

## 21. Kiểm theo vai 2/10 — nợ đã hoãn và câu chờ chủ (mã `BL-…`)

- **Ngày:** 2026-10-03 · **Nguồn:** `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` (gốc M2: "hoãn có chủ ý không có mã nợ" nên không ai quay lại) và bảng truy vết §10 của `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` · **AI ghi** khi soạn đợt V0 · **Trạng thái chung:** `tạm gác` — mỗi mục dưới có câu gốc và nơi sẽ xử lý.
- **Cách dùng mã:** mọi câu "hoãn / để sau / lượt 1 chưa / giả định bề mặt" trong tài liệu soạn từ 3/10 phải kèm một mã `BL-…` có ở mục này (đề xuất V7.3 của lộ trình sẽ có bài kiểm quét). Làm xong mục nào thì xoá dòng đó (lịch sử còn trong git) và ghi bản phát hành vào commit.

**Năm mục hoãn có chủ ý trong ADR / đặc tả đã có (lộ trình §2.6):**

- **BL-TIEN-KT — Kế toán không có tin về tiền, chỉ làm mới màn.** Câu gốc ADR-0025 `:71`: *"Loại thông báo: chỉ làm mới màn hình … giả định bề mặt, đảo được; chủ muốn hiện nổi cho người lập/Kế toán thì thêm một dòng."* Lỗi: VP-11. Xử lý ở đợt **V5** (ma trận sự kiện × vai).
- **BL-CREW-TIN — HDV đi kèm (suất `CREW`) không nhận tin chuyến, không biết giờ / điểm hẹn.** Câu gốc ADR-0052 `:165`: *"người lập / phụ trách đơn là Đối tác, Hướng dẫn viên, Thực tập (không có `trip.view`) không nhận tin chuyến nào … đúng lời chủ Q1"* — duyệt trước khi HDV thành suất `CREW` (ADR-0056). Lỗi: HT-23. Xử lý ở **V5** (tách "được báo" khỏi "được xem").
- **BL-MST-UNIQUE — hai tổ chức cùng mã số thuế tạo được.** Câu gốc bản nháp `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md:80`: *"LỆCH — HOÃN … Chủ dự án (2026-09-21): hệ thống là CRM lập đơn, MST không phải khoá nhận dạng → không làm bây giờ."* Lỗi: VP-08. **V6** thêm bất biến cảnh báo `R-PTY-8`; câu hỏi mở lại cho chủ: nay có đại lý thật, MST có thành khoá duy nhất (UNIQUE từng phần theo hồ sơ đang hoạt động) không.
- **BL-GIA-SHEET — giá danh mục (đồng bộ Sheet và ghi đè của Quản trị) áp ngay, không ngưỡng, không xác nhận.** Câu gốc: không có quyết định nào (chưa ai hỏi) — `catalog/rules.ts:54-60` chỉ chặn Sheet rỗng / ẩn > 50 %. Lỗi: VP-07. **V6** thêm cảnh báo `R-CAT-1` (giá đổi > 50 % hoặc về 0); bước duyệt giá: chờ chủ.
- **BL-SDT-QT — chuẩn hoá số điện thoại quốc tế.** Câu gốc `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md:120`: *"Mở rộng chuẩn hoá số quốc tế là việc riêng."* Lỗi: BH-02. **Chủ chọn 3/10 phương án B, "ghi mã nợ chuẩn hoá số quốc tế"**: ADR-0098 Đ4 nhận số "+mã nước" khác 84 (8–15 chữ số) nhưng **không** tra trùng, **không** gắn hồ sơ. Nợ còn lại: chuẩn hoá số quốc tế (dạng E.164 theo mã nước), rồi tra trùng và gắn hồ sơ cho số nước ngoài như số Việt Nam. Làm sau V4.

**Câu chờ chủ phát sinh khi xếp 78 lỗi (bảng §10 của lộ trình):**

- **BL-QUYEN-BH06 — Bán hàng đang phụ trách đơn đồng nghiệp ghi lần thu.** **Đã quyết 3/10** (chủ: *"cho ghi như HDV phụ trách (ADR riêng)"*) ⇒ ADR-0099 accepted; trạng thái `đã duyệt, chưa làm` — thi công cùng hoặc sau V2 (chạm sổ giữ hộ). Xoá dòng này khi thi công xong.
- **BL-QUYEN-BH08 — Thực tập chỉ giá danh mục, không giảm.** **Đã quyết 3/10** (chủ: *"Thực tập như Đối tác, chỉ giá danh mục, không giảm"*) ⇒ ADR-0100 accepted; trạng thái `đã duyệt, chưa làm` — thi công sau Đợt 1 (vùng `orders`). Xoá dòng này khi thi công xong.
- **BL-QUYEN-BH09 — Đối tác tự xác nhận đơn mình lập.** **Chủ chọn 3/10:** *"giữ như hôm nay tới ADR-0018 giai đoạn 2"* (ADR-0014 điều 6 tiếp tục áp). Trạng thái `tạm gác` — mở lại khi lập kế hoạch ADR-0018 giai đoạn 2 (người nhận đơn; Đối tác không bao giờ là người nhận).
- **BL-NHAN-NHAP — chính sách "Nhận" đơn nháp của đồng nghiệp** (BH-19: người nhận sửa được tên khách, số khách, tổng tiền; người lập chỉ được báo "vừa nhận đơn"). Phần báo tin đi V5; phần chính sách cần ADR (báo cáo gợi ý: chỉ người lập / Quản trị giao nháp, hoặc người nhận không sửa nội dung nháp).
- **BL-HDV-TEN — HDV phụ trách có được nhập tên khách vừa tăng tại hiện trường không** (HT-13; ô `order.passenger.write`). Phần báo văn phòng đi Đợt 4 (ADR-0062); phần quyền cần ADR.
- **BL-TACH-DOAN — tách đoàn: thứ tự người lên xe và ô chọn người** (HT-09). Chạm luật xếp / bản chốt khách ⇒ hỏi chủ trước; khi có lời chủ làm ở V3-A.
- **BL-NK-TIEN — nhật ký có ghi số tiền không** (VP-04; quy ước ADR-0025 "nhật ký không ghi số tiền chi tiết"). Phần lệnh nộp để vết theo đơn đi Đợt 2.
- **BL-NHAP-MAY — lưu tạm nội dung form lập đơn trên máy khi bị đăng xuất** (BH-04). Đặt dữ liệu khách lên thiết bị ⇒ chủ duyệt phạm vi và thời hạn; khi có lời chủ làm ở V8.
- **BL-NGAY-DON-CHANG — danh sách đơn hiện ngày đón của chặng khi khác ngày đi** (VP-09). Đổi dữ liệu tóm tắt đơn (hợp đồng máy chủ ↔ giao diện) ⇒ chủ duyệt; khi có lời chủ làm ở V8. Trang chủ giữ theo ngày đi (lời chủ Q3, đặc tả 23/9).
- **BL-GIO-HEN-SOM — giữ chuyến khi giờ hẹn đón sớm hơn giờ xuất bến** (HT-06). **Đã quyết 3/10** (chủ: *"HT-06: chặn, gộp vào ADR-0096"*) ⇒ ADR-0096 Đ3 (LC-21); trạng thái `đã duyệt, chưa làm` — thi công ở V3-A. Phần tin MQ-07 đi V5. Xoá dòng này khi V3-A xong.
- **BL-TEN-TRUOC-XB — màn tài xế trong ngày chạy giấu tên khách và SĐT liên hệ tới khi bấm Xuất bến** (HT-07; chủ ý của bản 1.39, có kịch bản Chrome ghim). Chủ quyết có mở trước khi xuất bến không.
- **BL-BIEN-NHAN-LAN-THU — biên nhận gửi khách liệt kê từng lần thu** (VP-24). Biên nhận là danh sách trắng `ReceiptDto` (ADR-0026) ⇒ thêm trường cần chủ duyệt.
- **BL-GHI-CHU-CHUYEN — ô chữ tự do trong chuyến xe** (ghi chú cho tài xế, khi phá lệ, khi kết thúc gián đoạn, khi chọn lý do "Khác" của ADR-0097 nháp): chủ chọn *"Chưa làm"* 2026-09-29 — chi tiết ở mục 5 sổ này.
- **BL-THAY-CTY-NHAN — cặp lệnh "Công ty đã nhận" × "Thay lần thu" (ADR-0088) trên cùng một khoản chuyển khoản chưa phân tích** (trang ghép lượt V0-A mục 4). Người soạn kế hoạch V2 điền quan hệ (độc lập / loại trừ / có thứ tự) trước khi thi công; nếu cần luật mới thì trình chủ cùng lượt duyệt 2a.
- **BL-CUOC-XA — "Cuốc của tôi" xem trước quá ngày kia và xem lại cuốc cũ** (HT-15). Phạm vi ngày tài xế thấy chuyến là quyết định ADR-0049 D3 / ADR-0053 D7.2 ⇒ cần chủ.

## 22. Vận chuyển — lộ trình ĐÃ KHOÁ 5/10: phần chưa làm và nợ kỹ thuật (mã `BL-VC-…`)

- **Ngày:** 2026-10-05 · **Chủ quyết** (chat 5/10, sau Đợt 7): *"khoá sự thay đổi, không vẽ thêm nữa. những nợ kỹ thuật sẽ ghi nhanh vào backlog"* · **Trạng thái chung:** `tạm gác`.
- **Nghĩa là:** lộ trình `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` dừng ở Đợt 7 (Đợt 1–5 trên production 1.65 → 1.80; Đợt 7 đã gộp `main`, phát hành 1.81). Không vẽ thêm màn Vận chuyển, không mở đợt mới; muốn làm mục nào dưới đây thì mở lại theo CLAUDE.md §9 (ADR / kế hoạch riêng). Nợ chi tiết từng đợt vẫn ở nhật ký thi công (`docs/superpowers/plans/2026-10-05-van-chuyen-dot-7-nhat-ky.md` mục "Nợ / để sau" cho Đợt 7).

**Phần của lộ trình chưa làm:**

- **BL-VC-D6 — Đợt 6: tài xế đối tác dùng Nền tảng + chia doanh thu taxi.** Kế hoạch `…-06-tai-xe-doi-tac.md`; chủ đã trả lời câu 0.2 (a–c) ngày 5/10; còn thiếu ADR riêng cho sổ chia doanh thu và câu hoá đơn / thuế (d — hỏi Kế toán). **Mở lại 8/10, chỉ một phần** (nhiệm vụ "Vận chuyển & Bán hàng Gói A & C", Giai đoạn 3 mục A4): tài xế đối tác dùng Nền tảng + báo bận (ADR-0053 D7.1, D8, D9). Phần chia doanh thu taxi và câu (d) **vẫn hoãn**. Sổ: `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`. **Phần A4 đã thi công 9/10** trên nhánh `a4-tai-xe-doi-tac` (CHƯA gộp; Cuốc của tôi cho tài xế đối tác, Từ chối chuyến trước hạn, Báo bận của tôi, dải "Tài xế bận" của văn phòng — migration `0092`); chia doanh thu taxi, câu (d) và các điểm e–h vẫn hoãn.
- **BL-VC-C25-CTY — báo bận cho TÀI XẾ CÔNG TY; văn phòng ghi / rút thay khung bận của tài xế** (ADR-0053 :143, Q3 c; phần còn lại của C25). A4 chỉ làm cho tài xế đối tác (ô `unavailability.self` cột DRIVER = `none`). Cần ADR mới (ai ghi thay, có lý do không, văn phòng có thấy lý do không) trước khi mở ô.
- **BL-VC-A4-NO — nợ nhỏ sau A4** (phiếu kiểm độc lập 12/10, mức THẤP): (1) `POST /api/van-chuyen/ban` không có `requestId` — bấm đúp tạo hai khung trùng (ADR-0053 B9.5 cho phép khung trùng; chưa chặn lặp); (2) chính sách hạn Từ chối 60–2880 phút không đối chiếu với cửa sổ xuất bến (hạn dài hơn cửa sổ ⇒ có khoảng tài xế chưa thấy khách mà Xuất bến đã mở — chỉ câu gốc, không lộ); (3) đường đổi tài xế / giờ khác (khẩn cấp, cứu hộ, A5) chạm trigger B9.3 trả 409 không có câu riêng; (4) Trợ giúp văn phòng chưa có chữ về dải "Tài xế bận", nhãn "Bận", tin "đã từ chối".
- **BL-VC-TAXI-GIA — taxi đối tác qua cổng "thiếu giá" (`THIEU_GIA`) và các điểm e–h** (`docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md` dòng "Còn mở"): mọi chuyến của tài xế đối tác là xe thuê nên Xuất bến bị chặn tới khi có giá bảng / giá thoả thuận; taxi còn câu % doanh thu có đảo "không giá vốn a%" của ADR-0057 không, chở một đơn hay ghép, có thu tiền mặt không. Đi cùng sổ chia doanh thu (BL-VC-D6).
- **BL-VC-D8 — Đợt 8 Phần C: cắt đường ghi chặng kiểu cũ (`pickupTime` / `pickupPlace`).** Bộ đếm thân cũ đã chạy từ Đợt 1 (`src/modules/orders/than-cu.ts`); cổng = chủ đếm dòng `client_outdated_body` trên production về 0 đủ 7 ngày rồi mới cắt (kế hoạch `…-08-bo-duong-ghi-cu.md` Task 2).
- **BL-VC-TOA-DO — toạ độ điểm đón / trả.** Chủ đã chọn bảng phụ có kiểu (câu 0.1); cần ADR nhỏ (module `locations`) trước migration.
- **BL-VC-D4 — phần hoãn của Đợt 5:** tài xế nhờ xe khác đón, hộp đề nghị cần duyệt, bảng kiểm luật (D4) và Dòng dữ liệu / Nhật ký quyết định (V4). Khi làm: mã luật dạng danh mục, không `CHECK` cứng (lời chủ 2/10). **Mở lại 8/10** (nhiệm vụ "Vận chuyển & Bán hàng Gói A & C", Giai đoạn 3 mục A5: ADR-0052 D4, D5c). Sổ: `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`.
- **BL-VC-MAU-CAM-KET — mẫu chặng mang sẵn cam kết "xe riêng / số chỗ".** ADR-0056 chỉ nhắc ở "Phương án bị loại"; chặng tạo từ mẫu hôm nay luôn "không cam kết".

**Nợ cùng họ C38 — mã lệnh dùng lại (đánh giá ERP 7/10; kiểm độc lập 8/10):**

- **BL-VC-MA-LENH — so mã lệnh còn hở ngoài 29 route lệnh chuyến.** (1) Lệnh nhắm nhiều đối tượng (rút / xếp / thêm điểm / cập nhật) chỉ so chuyến + loại: rút suất 2 bằng mã của lần rút suất 1 trả 200 không làm gì. (2) Họ "Đã gọi báo" / "Bỏ đánh dấu" (`mocByRequest`) không so chặng. (3) Bảng giá xe thuê `findRate(requestId)` (`tien-xe-lenh.ts`) trả dòng cũ khi thân khác. (4) Tham số `tripId` / `suatId` / `diemId` từng route chưa có bài giữ riêng. Phơi nhiễm thấp: giao diện không dùng lại mã khi thân khác (`idChoLenh`).

**Nợ kỹ thuật của Đợt 7 (1.81):**

- **BL-VC-SMOKE-CU — ba kịch bản Chrome cũ đỏ sẵn từ 1.80:** `a2-smoke-form` (thứ tự thẻ chưa biết khối "Hành khách"), `a2-smoke-order` (hết giờ "form mở lại đơn"), `dat-gap-smoke` bước 3/7/8/10 (`call()` đăng nhập lại làm phiên trình duyệt hết hạn — sổ phiên một máy ADR-0075). Đã chứng minh đỏ y hệt trên `dc1ef1fe` (trước Đợt 7). Sửa kịch bản, không sửa Nền tảng.
- **BL-VC-TRO-GIUP — Trợ giúp bị cắt chữ để giữ trần 30 phút:** Bán hàng mất câu "Giờ đón sau giờ khởi hành" và câu ngày khởi hành đã qua; Quản trị mất ví dụ Đặt gấp và câu "Chỉ Quản trị và Toàn quyền duyệt Đặt gấp". Khôi phục khi chủ nâng trần hoặc gọn chỗ khác.
- **BL-VC-BANG-KICH-BAN — `web/CLAUDE.md` chưa liệt kê hai kịch bản Chrome mới** (`docs/evidence/2026-10-05-cam-ket-xe/kich-ban/cam-ket-xe-smoke.mjs`, `cam-ket-form-smoke.mjs`). Tệp luật — chủ duyệt mới thêm (N9).
- **BL-VC-CHROME-CAM-KET — Chrome chưa phủ hộp phá lệ cam kết ở sửa chuyến / thêm điểm khi xe chạy / dời** (chỉ có bài đơn vị cho `thanPhaLe`); chưa thử iPhone thật; chưa chạy axe trong lượt kiểm độc lập.
- **BL-VC-COT-MO-COI — cột phá lệ cam kết có thể "mồ côi"** trên chuyến chưa chạy khi lệnh cập nhật khách / điểm thoát sớm (không có suất lệch); cổng xuất bến là lưới. Nếu đơn sửa về đúng tập vi phạm cũ thì phá lệ cũ có hiệu lực lại (đúng chữ "khớp tuyệt đối" của ADR) — chủ muốn khác thì thêm xoá cột ở lệnh thoát sớm.
- **BL-VC-500-DONG-HONG — một dòng `min_vehicle_seats` hỏng do SQL tay làm `kiemCamKet` ném lỗi → bảng điều phối 500.** Đường thường bị CHECK của `0077` chặn; nếu cần thì bắt lỗi theo từng chuyến thay vì cả bảng.
- **BL-VC-R-VC-25 — câu kiểm định kỳ R-VC-25:** vế số chỗ chỉ xét chuyến có lần kiểm xuất bến ĐẠT (bỏ sót, không báo giả); bản chụp lệch nếu đổi xe giữa chuyến; bài thiếu ca "vế số chỗ có phá lệ" và "không có bản chụp ĐẠT".
- **BL-VC-BAI-MONG — bài kiểm còn mỏng (minor của người kiểm):** ca `exclusiveVehicle: null` → 400; ca 403 có đối chứng; ca thiếu khoảng nghỉ + trái cam kết cùng lúc; e2e chưa assert quyền Đối tác của tài khoản, chưa đếm suất sau 403, chưa kiểm `error.code` của 403; bài DTO chưa phủ tiền tố `xe:` của khoá; bài migration ghim lỏng `/constraint|commitment/`.
- **BL-VC-CHU-NHO — chữ / mã nhỏ:** câu "Số chỗ từ 1 đến 100" còn viết cứng ở `src/shared/chang-form.ts` (ngưỡng đã dùng hằng chung); lời "ghép vào xe riêng của X" phụ thuộc thứ tự chặng khi có hai đơn xe riêng; DTO nhật ký chuyến trả `phaLe.luat` thô (`CAM_KET`) mà giao diện chưa đổi ra chữ; công thức z13 của `CHANGE-GUIDE` dùng ví dụ `b.khoaMoi` thay `b.camKetPhaLe`.

**Khoảng hở còn lại của lệnh thay chặng (C14, 2026-10-08):**

- **BL-VC-THAY-CHANG — bảng Sửa đưa đón vẫn có thể lưu dở trong bốn trường hợp.** (1) Quản trị / Toàn quyền với kế hoạch không ghép thành lệnh thay được (bỏ hai thêm một, khác chiều, lý do "Không cần nữa"…): bảng không kiểm mốc trước cho người có ô đặt gấp, nên lệnh bỏ chạy xong rồi lệnh thêm mới gặp 409 và hộp duyệt đặt gấp — đóng hộp giữa chừng thì đơn đã mất chặng cũ mà chưa có chặng mới. (2) Ba route cũ (thêm, sửa, đóng chặng) gọi thẳng không có bảo vệ nguyên khối này — chỉ lệnh thay là một lô. (3) Chi tiết đơn không có số phút mốc (`mocToiThieuPhut` null) thì bảng không kiểm trước: lệnh bỏ có thể thành công trong khi lệnh thêm bị 503 `moc_toi_thieu_chua_co`. (4) Bước kiểm mốc phía bảng dùng đồng hồ của máy khách (`Date.now()` trong `web/sheet-dua-don.ts`, chỗ gọi `lenhChanMoc`), không dùng giờ máy chủ: máy chạy CHẬM hơn máy chủ thì có một khoảng ngắn bảng cho qua mà máy chủ chặn — kế hoạch còn lệnh rời (không ghép thành lệnh thay) thì lệnh bỏ xong, lệnh thêm bị 409, đơn lưu dở (lệnh thay bị chặn thì không ghi gì); máy chạy NHANH thì bảng chặn nhầm một lần lưu máy chủ sẽ nhận (trường hợp này an toàn, chỉ phiền). Máy chủ vẫn là cổng thật cho mốc; bốn khoảng này chỉ là lưu dở, không phải lọt luật.

**Khoảng hở của tin MQ-07 (gói A3, 2026-10-08 — câu hỏi V3 điều phối sẽ trình chủ):**

- **BL-VC-MQ07-HO — tin "giờ hẹn đổi ở chuyến … — gọi báo khách / mở để xem" (ADR-0052 D6.2 MQ-07) chỉ sinh từ dòng `order_leg_updated` đổi ngày / giờ đón.** Hai đường đổi chặng ĐÃ XẾP không sinh MQ-07: (1) đổi ngày qua `PUT /api/orders/:id/trip` dời MỌI chặng nhưng chỉ ghi MỘT dòng `trip_updated` (không có id chặng) → người lập / phụ trách chỉ nhận tin "đơn đổi sau xác nhận", tài xế đang lái không được báo; (2) thay hoặc bỏ chặng ghi `order_leg_closed` (thay chặng: kèm `order_leg_added`) → tài xế không được báo chặng mình đang chở đã bị bỏ. Ghi chú: ADR-0104 Đ2 (đã duyệt 8/10, CHƯA thi công) sẽ trả ghế khi bỏ chặng, nhưng chưa định báo tài xế khi đổi ngày. Muốn vá thì cần chủ quyết (câu V3) rồi ADR / kế hoạch riêng.

## 23. Công cụ tự động "bấm thử" toàn bộ trang mỗi khi đổi mã (ý tưởng chủ nêu 2026-09-22)

- **Ý tưởng (2026-09-22, chủ dự án nêu, chưa quyết):** gắn công cụ tự động "bấm thử" toàn bộ trang mỗi khi đổi mã (trình duyệt giả lập chạy trong máy chủ kiểm, không cần người bấm tay) — bắt được ngay lúc viết mã các lỗi kiểu "id HTML tĩnh lệch với mã" (ca thật: `public/staff.html` viết cứng 4 ô tick quyền, thiếu PARTNER/SUPER_ADMIN sau khi ADR-0014 thêm hai mã này vào `PERMISSION_CODES`, khiến nút "Tạo tài khoản" vỡ ngầm — chủ dự án tự bấm thử mới phát hiện, sửa ở commit `b852428`). Đánh đổi: phải cài thêm công cụ ngoài (Playwright/Puppeteer…), trái chủ trương hiện tại "không có dependency runtime"/ít phụ thuộc của dự án — cần chủ dự án quyết trước khi làm (Điều 7.2). Rẻ hơn, làm được ngay không cần quyết: (1) thêm kịch bản Chrome thủ công cho từng trang còn thiếu (`web/CLAUDE.md` — trang `/staff` hiện CHƯA có kịch bản riêng), (2) ưu tiên dựng giao diện bằng mã thay vì HTML tĩnh + tra theo id (mẫu: `openEdit` ở `web/staff.ts`) để diệt cả lớp lỗi này mà không cần công cụ mới.
- *Nguồn:* nhánh `kiem-toan-doi-tac` (lần lưu f9631c97, chưa từng nhập main); chuyển vào backlog 2026-10-05 khi dọn các bản làm việc cũ.
