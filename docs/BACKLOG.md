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
- **Đã có:** kho dùng 2/33 loại sự kiện — `PreToolUse` (chặn lệnh nguy hiểm, tệp cấm sửa, không sửa luật bằng dòng lệnh), `Notification` (báo tin, đặt ở cấu hình cá nhân của chủ, ngoài kho). Đặc tả `docs/superpowers/specs/2026-10-01-ba-hook-moi.md`; ba dòng ở `docs/SO-HANG-RAO.md`. `Stop` (cổng xanh) đã gỡ 2026-10-19 theo lệnh chủ vì mỗi lần dừng chạy quá 12 phút. Nguồn: `code.claude.com/docs/en/hooks` (bảng "Hook lifecycle") và `…/hooks-guide` — đếm 33 loại ngày 1/10; con số đổi theo phiên bản, lúc nghiên cứu phải đếm lại.
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
- **BL-VC-D4 — phần hoãn của Đợt 5:** tài xế nhờ xe khác đón, hộp đề nghị cần duyệt, bảng kiểm luật (D4) và Dòng dữ liệu / Nhật ký quyết định (V4). Khi làm: mã luật dạng danh mục, không `CHECK` cứng (lời chủ 2/10). **Mở lại 8/10** (nhiệm vụ "Vận chuyển & Bán hàng Gói A & C", Giai đoạn 3 mục A5: ADR-0052 D4, D5c). Sổ: `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`. **Phần D4 đã thi công 9/10** (gói A5, ADR-0111, nhánh `a5-chuyen-khach`, CHƯA gộp — nhật ký `docs/superpowers/plans/2026-10-09-goi-a5-thi-cong-nhat-ky.md`); **V4 (Dòng dữ liệu / Nhật ký quyết định) vẫn hoãn.**
- **BL-VC-A5-NO — nợ nhỏ gói A5:** đổi tài xế / xe của xe NHẬN không tự huỷ đề nghị tới nó (câu hỏi chủ); N4 (`DRIVER_PARTNER` chuyển khách) chờ A4 gộp; N5 (R-VC-17) chưa đo; trần `db.batch` lô xác nhận trên D1 production chưa kiểm; kịch bản e2e chuyển khách chưa đột biến.
- **BL-VC-MAU-CAM-KET — mẫu chặng mang sẵn cam kết "xe riêng / số chỗ".** ADR-0056 chỉ nhắc ở "Phương án bị loại"; chặng tạo từ mẫu hôm nay luôn "không cam kết".

**Nợ cùng họ C38 — mã lệnh dùng lại (đánh giá ERP 7/10; kiểm độc lập 8/10):**

- **BL-VC-MA-LENH — so mã lệnh còn hở ngoài 29 route lệnh chuyến.** (1) Lệnh nhắm nhiều đối tượng (rút / xếp / thêm điểm / cập nhật) chỉ so chuyến + loại: rút suất 2 bằng mã của lần rút suất 1 trả 200 không làm gì. (2) Họ "Đã gọi báo" / "Bỏ đánh dấu" (`mocByRequest`) không so chặng. (3) Bảng giá xe thuê `findRate(requestId)` (`tien-xe-lenh.ts`) trả dòng cũ khi thân khác. (4) Tham số `tripId` / `suatId` / `diemId` từng route chưa có bài giữ riêng. Phơi nhiễm thấp: giao diện không dùng lại mã khi thân khác (`idChoLenh`).

**Nợ kỹ thuật của Đợt 7 (1.81):**

- **BL-VC-SMOKE-CU — ba kịch bản Chrome cũ đỏ sẵn từ 1.80:** `a2-smoke-form` (thứ tự thẻ chưa biết khối "Hành khách"), `a2-smoke-order` (hết giờ "form mở lại đơn"), `dat-gap-smoke` bước 3/7/8/10 (`call()` đăng nhập lại làm phiên trình duyệt hết hạn — sổ phiên một máy ADR-0075). Đã chứng minh đỏ y hệt trên `dc1ef1fe` (trước Đợt 7). Sửa kịch bản, không sửa Nền tảng.
- **BL-VC-TRO-GIUP — Trợ giúp bị cắt chữ để giữ trần 30 phút:** Bán hàng mất câu "Giờ đón sau giờ khởi hành" và câu ngày khởi hành đã qua; Quản trị mất ví dụ Đặt gấp và câu "Chỉ Quản trị và Toàn quyền duyệt Đặt gấp". Gói A5 (2026-10-09, thêm câu chuyển khách giữa hai xe) cắt thêm: Bán hàng mục "Điều phối xe" mất "chọn chặng, số khách" (sau [[Thêm điểm đón / thêm khách]]) và "(nhầm thì [[Bỏ đánh dấu]])" (sau [[Đã gọi báo]]); Quản trị mục "Điều chỉnh khẩn cấp và phá lệ" mất câu "Việc này ghi vào nhật ký chuyến kèm tên bạn." Khôi phục khi chủ nâng trần hoặc gọn chỗ khác.
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

## 24. QR thanh toán và mã giao dịch ngân hàng — việc để sau (mã `BL-QR-…`)

- **Ngày:** 2026-10-08 · **Nêu bởi:** kế hoạch thi công `docs/superpowers/plans/2026-10-08-qr-thanh-toan-ke-hoach.md` (ADR-0108, ADR-0092 Đ6) · **Trạng thái chung:** `ý tưởng` (không phải lời duyệt).
- **BL-QR-TIN-DOI-TK — tin báo cho Kế toán khi công ty đổi tài khoản nhận tiền.** Hôm nay đổi tài khoản chỉ ghi nhật ký (không chép số tài khoản), chưa có tin nào báo ai. Chờ loại tin của sổ tiền (đặc tả `docs/superpowers/specs/2026-10-06-tin-bao-so-tien.md`) rồi thêm một loại tin "Tài khoản nhận tiền đã đổi".
- **BL-QR-SUA-MA — đường sửa riêng cho mã giao dịch và số tiền thực chuyển.** Hạn chế đã biết (câu C4 của đặc tả, chủ chấp nhận 2026-10-08): nhập sai mã hoặc số thực chuyển thì chỉ sửa bằng "Đảo" (trước Đã giao) hoặc "Thay lần thu"; ca kẹt là mã dùng chung nhiều đơn đã giao mà số thực chuyển nhập sai ngay từ đầu. Đường sửa riêng cần luật hai người (HC-4.2 trong `docs/quyen-hoan.json`) nên chờ HC-4.2 được vá.

## 25. Đổi chữ "lần thu" thành "khoản thu" trên toàn Nền tảng (chủ chốt 2026-10-08)

- **Ngày:** 2026-10-08 · **Nêu bởi:** chủ dự án, trong chat phiên QR thanh toán ("'Ghi lần thu' là 1 cụm từ cực kỳ tối nghĩa") · **Trạng thái:** `đã làm 2026-10-18` (ADR-0130, chờ chủ day-len/trien-khai). Xoá mục này khi đã lên production.
- **Tên mới chủ đã chọn:** "Khoản thu" — "Ghi lần thu" → **"Ghi khoản thu"**; "Thay lần thu" → **"Sửa khoản thu đã ghi"**; "Ghi bù lần thu" → **"Ghi bù khoản thu"**; các câu khác có chữ "lần thu" đổi theo cùng kiểu.
- **Khi nào:** việc nhỏ riêng, làm NGAY SAU khi nhánh QR thanh toán đã nhập `main` (nhánh đó cũng thêm chữ "lần thu"), dựng trên `main` mới nhất.
- **Phạm vi phải quét:** nhãn và câu báo ở `web/*.ts` (khoảng 17 tệp có chữ này), `src/shared/` (câu lỗi, Trợ giúp, nhật ký thay đổi chỉ sửa mục MỚI — mục cũ là hồ sơ có ngày, giữ nguyên), kho tri thức Trợ lý Mai sinh từ nhãn (`npm run build:web` sinh lại `src/shared/so-do-trang.ts` và tệp cấu trúc Trợ lý), kịch bản Chrome dò nút theo tên (`docs/evidence/*/kich-ban/`), tài liệu mô tả (`docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`). Tên cột / mã trong CSDL (`bil_receipt`…) KHÔNG đổi — chỉ chữ người dùng thấy.

## 26. Sổ đại lý đợt 1 — nợ nhỏ (mã `BL-SDL-…`)

- **Ngày:** 2026-10-12 · **Nêu bởi:** người thi công Task 14, gom từ phát hiện của các người kiểm độc lập của Task 2–13 và kết quả Task 13 (nhật ký: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`) · **Trạng thái chung:** `ý tưởng` (không phải lời duyệt). Các nợ mã nhỏ (a)–(g) của Task 14 đã làm xong và không còn ở đây.
- **Cách đọc:** cột «Nơi» ghi tên tệp / tên chức năng, KHÔNG ghi số dòng (số dòng đổi liên tục; muốn tìm thì tìm theo tên). Việc của đợt 2 và đợt 3 nằm ở đặc tả (`docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md`, phần «Để đợt 2» / «Để đợt 3») và `docs/HANDOFF-N1.md` «Việc còn treo» — không chép lại hết ở đây.

**A. Chờ chủ quyết hoặc cần ADR**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-SDL-TAY-BI-DE | Đổi bên đặt trên đơn đã xác nhận chụp lại mọi dòng và THAY mức Kế toán đã ghi tay bằng mức tự động; cờ «ghi tay» mất, bản tay chỉ còn trong chuỗi bản chụp. Tái hiện: e2e `so-dai-ly` bước 8. Khớp chữ đặc tả §5 «chụp lại mọi dòng» nhưng đặc tả không nói về mức tay | `changeBooker` ở `src/modules/orders/repository.ts`; `thuong-mai-repo.ts` | Quyết định (điều phối chuyển lại lúc giao Task 14, 2026-10-12): chưa đổi, ghi nợ. Nếu mở lại: (A) giữ nguyên và nhắc trước khi đổi; (B) chặn đổi bên đặt khi còn mức tay (409); (C) giữ mức tay qua lần đổi |
| BL-SDL-TO-CHUC | **ĐÃ ĐÓNG CHO LOẠI MỚI (ADR-0117 lần 1, 2026-10-14; đang chờ phát hành): Quản trị / Toàn quyền gán loại đối tác do Kế toán thêm cho hồ sơ TỔ CHỨC qua `POST /api/parties/:id/roles` (loại nhóm `OTHER`, không qua `role_via_account`); e2e `loai-doi-tac` bước 2. Năm loại có sẵn (nhóm bên ngoài) VẪN mở: chúng vẫn 409 `role_via_account` cho hồ sơ tổ chức.** Nguyên văn việc cũ: Hồ sơ TỔ CHỨC (công ty lữ hành) chưa mang được vai được hưởng bằng đường quản trị nào: `POST /api/parties/:id/roles` trả 409 `role_via_account` cho mọi vai bên ngoài; tạo tài khoản chỉ gắn hồ sơ cá nhân. Hệ quả: ô «Đặt qua đối tác» chưa tìm thấy công ty lữ hành; đợt 1 chạy trọn cho đại lý cá nhân. **Cần ADR:** cho Quản trị gán vai cho tổ chức, hoặc ghi rõ đợt 1 chỉ hỗ trợ đại lý cá nhân | route `POST /api/parties/:id/roles` (`isAccountGroup`) ở `src/modules/parties/index.ts` | Chủ chọn để sau (2026-10-09); phải có ADR vì chạm vai và quyền. Cập nhật 2026-10-14: chủ duyệt ADR-0117 (14/10) nên «để sau 2026-10-09» không còn là quyết định hiện hành cho loại mới |
| BL-SDL-KE-TOAN-TRA | Kế toán chưa tự tra được đối tác theo tên: `GET /api/pricing/nguoi-huong` đòi `order.create` mà cột Kế toán là `none`. Hướng: nới cho `partner.commission.write` | route `nguoi-huong` ở `src/modules/pricing/index.ts`; bài `o-dat-qua-noi-cong.test.ts` đỏ có chủ đích khi nới | Chủ chọn «Chưa nới, ghi nợ» (2026-10-09, Ruling 26); đổi cổng là đổi quyền |
| BL-SDL-GHI-CHU-NGAY | Ghi chú khoá tháng «Đối chiếu ngày 30.09.2026» bị từ chối vì luật số điện thoại (bỏ dấu chấm rồi thấy 8 chữ số) với câu báo dễ làm Kế toán khó hiểu. Giao diện đã thêm gợi ý «Ghi ngày dạng 30/09/2026». Ảnh: `6-khoa-thang-ghi-chu-ngay-cham-*` ở `docs/evidence/2026-10-08-so-dai-ly-dot-1/` | `docGhiChuKy` ở `src/modules/ky-so/rules.ts` | Chủ quyết sau khi xem kết quả thật; luật chặn SĐT dùng chung nhiều nơi |
| BL-SDL-R-PRC-4 | `R-PRC-4` không phủ điều khoản phạm vi «mọi dịch vụ» do nhà cung cấp bán mang a% (chỉ trigger `prc_supply_term_all_owner` chặn lúc chèn). Có thêm `OR scope = 'ALL'` không | `scripts/audit-checks.mjs` (R-PRC-4) | Không có đường thường sinh ca này; chủ chưa quyết |

**B. Mã và luật nhỏ**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-SDL-BEN-DAT-NGUNG | Cờ «Bên đặt (đối tác)» của đơn (`BOOKER_LA_DOI_TAC`) không xét hồ sơ bên đặt còn hoạt động: đơn có bên đặt đã ngưng sau đó vẫn hiện cờ; hàm `laNguoiHuong` cũng không xét `active` (báo 403 thay vì 400) | `BOOKER_LA_DOI_TAC` ở `src/modules/orders/repository.ts`; `laNguoiHuong` ở `src/modules/pricing/index.ts` | Chỉ lệch chữ và cờ, không sai tiền; chờ chủ |
| BL-SDL-DOI-TAC-CHUA-HO-SO | Tài khoản Đối tác chưa gắn hồ sơ không lưu lại được nháp mà văn phòng đã gắn đại lý (409 `partner_no_party`) | `benDatCuaTaiKhoan` ở `src/modules/orders/index.ts` | Đúng đặc tả §7: cấu hình thiếu hồ sơ phải do văn phòng sửa (Ruling 20) |
| BL-SDL-GIA-DAI-LY-AM | `giaDaiLy` âm khi mức đ/khách × khách lớn hơn thành tiền của dòng | `tinhDongDoiTac` ở `src/shared/hoa-hong-dong.ts` | Đặc tả im lặng; cần chủ nói có kẹp ở 0, có chặn lúc đặt mức hay để Kế toán thấy. **Giải một phần ở sổ đại lý đợt 2 (2026-10-19, chưa lên production):** tiền không vào sổ được nữa — hoa hồng + giá vốn vượt giá bán thì «Đã giao» bị giữ (lý do `terms_exceed_price`, lưới CSDL (iii) của `0112`); con số âm vẫn HIỆN ở phần thương mại của đơn nên câu hỏi hiển thị còn chờ chủ |
| BL-SDL-CHU-409 | Câu 409 `stale` của ghi mức tay xảy ra SAU khi bản tay đã vào sổ, nhưng câu «hãy tải lại rồi sửa tiếp» làm Kế toán tưởng chưa ghi; câu `FORBIDDEN()` «… mới được thay đổi đơn này» ở route đọc `…/thuong-mai` cũng chưa đổi | route `POST …/thuong-mai/:serviceId` và `GET …/thuong-mai` ở `src/modules/orders/index.ts` | Chỉ là chữ; thử lại an toàn (đơn huỷ ⇒ `not_confirmed`) |
| BL-SDL-400-THO | Câu 400 «Trạng thái đích phải là confirmed hoặc cancelled» ở route đổi trạng thái còn lộ mã thô | route `POST /api/orders/:id/status` ở `src/modules/orders/index.ts` | Chỉ gặp khi gửi trạng thái lạ (giao diện không gửi); Task 14 (g) đã sửa câu 409 liền kề |
| BL-SDL-LICH-SU-BEN-DAT | Lịch sử đơn vẫn ghi «gắn hồ sơ khách …» khi bên đặt là đại lý | `describeBookerChange` ở `src/shared/booker.ts` | Chỉ chữ; người kiểm Task 13 nêu |
| BL-SDL-TIM-HOA-THUONG | Tìm người hưởng theo tên không phân biệt hoa–thường với chữ có dấu (`LIKE` của SQLite chỉ lo chữ không dấu) | `findBeneficiaries` ở `src/modules/pricing/repository.ts` | Cần một quy ước tìm tiếng Việt chung toàn Nền tảng, không riêng pricing |
| BL-SDL-KHOA-DAU-TIEN | Lần khoá ĐẦU TIÊN so với tháng có dòng sổ sớm nhất chỉ xét ba bảng của billing, không xét dòng chi phí xe thuê | `earliestLedgerMonth` ở `src/modules/billing/` | Đúng brief Task 7; chủ chọn có đưa xe vào hay không |
| BL-SDL-BANG-KIEM-KHOA | Bảng kiểm trước khi khoá tháng: nhóm «chờ công ty xác nhận» (`PENDING_COMPANY`) không lọc riêng khoản chuyển khoản | `src/modules/billing/repository.ts` | Bảng kiểm không chặn khoá (Kế toán quyết) |
| BL-SDL-NUT-XE-THANG-KHOA | Trên chuyến có ngày chạy ở tháng đã khoá, DTO vẫn bật `coTheChupLai` / `coTheNhapThoaThuan` nên nút hiện rồi bấm ra 409 (an toàn, không sai tiền). Sửa = đưa tháng khoá vào `datGiaDuoc` | `datGiaDuoc` ở `src/modules/van-chuyen/tien-xe.ts`; `web/chi-phi-chuyen.ts` | Không đổi hình dạng hợp đồng; hộp báo 409 đã đúng chữ |
| BL-SDL-KY-CUA | Hàm `kyCua` được nhập bằng hai đường (trực tiếp từ `src/shared/ky-khoa.ts` và qua `ky-so`) | `src/modules/ky-so/`, `van-chuyen/tien-xe-chi-phi.ts`, `billing/rules.ts` | Dọn cho gọn, không đổi hành vi |
| BL-SDL-KIEM-DINH-NHO | Kiểm định kỳ: chưa có kiểm chồng hiệu lực cho `prc_supply_term` (R-PRC-1 chỉ phủ bảng mức); ghi chú của kiểm lỗi không được in ra; chữ `0090` gắn cứng trong thông báo | `scripts/audit-checks.mjs`, `scripts/audit-invariants.mjs` | Trigger đã chặn chồng lúc chèn; chỉ là lưới thứ hai |
| BL-SDL-NHAT-KY-NHAN-LOC | Nhãn lọc ở trang Nhật ký vẫn liệt kê tên các hành động thương mại (`order_terms_*`, `prc_*`) cho tài khoản lai Toàn quyền + Đối tác, dù dòng nhật ký đã bị lọc khỏi kết quả | `GET /api/audit` ở `src/modules/audit/` (`hideThuongMai`) | Chỉ lộ TÊN hành động, không số tiền; số lạ toàn Nền tảng vẫn xanh |
| BL-ADR0117-VAI-CU | Hố nhỏ còn lại của ADR-0117 lần 1: vai cũ `STAFF` / `SALES` (nhóm `OTHER`, đã ngưng) có thể bị `/end` bằng ngày TƯƠNG LAI rồi hồ sơ gắn loại đối tác (dòng vai cũ không còn `valid_to_date IS NULL` nên luật «nội bộ» coi như hết). Chỉ ảnh hưởng hồ sơ có vai cũ mà KHÔNG có tài khoản; mức thấp. Hướng: chặn `/end` ngày tương lai cho cả hai mã cũ, hoặc dọn dữ liệu cũ. `R-PRC-6` cũng KHÔNG bắt ca này vì nó đọc `v_pty_open_role` (thấy dòng vai cũ đã có ngày kết thúc là «hết»); hiện chỉ kỷ luật người dùng canh | `POST /api/parties/:id/roles/:rid/end` ở `src/modules/parties/index.ts`; `VAI_CU_NOI_BO` ở `parties/rules.ts` | Người kiểm độc lập ghi nhận 2026-10-14; chủ chưa quyết, thấp. Cập nhật 2026-10-15 (ADR-0117 lần 2): KHÔNG gộp vào lần 2 (kế hoạch lần 2, mục «Nợ lần 1»: chỉ sửa máy chủ, không cần migration — làm riêng, trước hoặc song song); lần 2 không chạm `parties`, hố vẫn còn nguyên |
| BL-ADR0117-TEN-DUY-NHAT | Chưa khoá DUY NHẤT tên loại đối tác ở CSDL: trùng tên (không phân biệt dấu / hoa thường) chỉ bị chặn ở máy chủ (`kiemTenLoaiDoiTac`, 409 `loai_trung`); hai lần thêm cùng tên đồng thời có thể lọt hai dòng. Hướng: chỉ mục duy nhất trên khoá so tên — cần migration mới | `kiemTenLoaiDoiTac` ở `src/modules/parties/rules.ts`; route `POST /api/pricing/loai-doi-tac` | Cần migration; lần 1 không có nhu cầu (số người thêm loại rất ít). Cập nhật 2026-10-15 (ADR-0117 lần 2): KHÔNG gộp vào lần 2 (cửa một chiều 0097 không nên kéo thêm nợ); đề xuất tệp riêng `0098` chỉ sau khi lần 2 lên ổn, và phải dùng cột khoá do máy chủ ghi (`khoaTen`, nay ở `src/shared/khoa-ten.ts`) vì `lower()` của D1 chỉ gập chữ ASCII (Bước 0 bậc b, 2026-10-14: `lower('ĐÀ NẴNG')` ra `ĐÀ nẴng`). Bảng mới `prc_rate_tier` đã có `name_key` UNIQUE từ đầu nên tên mức TA không mang nợ này |
| BL-ADR0117-DANH-BA-TEN-LOAI | **Chờ chủ quyết:** Danh bạ (`GET /api/parties/:id`) cho tài khoản LAI có ô xem hồ sơ (vd Bán hàng + Đối tác) thấy TÊN LOẠI đối tác của hồ sơ khác — lệch câu «Đối tác (kể cả lai) KHÔNG BAO GIỜ thấy … tên loại» của brief lần 2. Hành vi có từ lần 1, module `parties`, không thuộc lần 2; tên MỨC, mã mức và tỷ lệ KHÔNG lộ ở đâu. Hai hướng: giữ như hôm nay, hoặc ẩn tên loại với mọi tài khoản giữ PARTNER. Chưa ai phân loại mức nghiêm trọng hay quyết có cần mục `docs/quyen-hoan.json` | `GET /api/parties/:id` ở `src/modules/parties/`; chỗ khoanh trong bài `src/so-la-doi-tac.test.ts` (chú thích «chờ điều phối / chủ quyết»); báo cáo `.superpowers/sdd/2026-10-14-adr-0117-lan-2-ke-hoach/task-4-report.md` mục Lo ngại 1 | Ghi 2026-10-15 (Task 5 lần 2); người kiểm Task 4 nêu là Important 2 |

**C. Giao diện và kịch bản Chrome**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-SDL-NHAY-KHOI | Khối «Phần đối tác» nháy hiện → ẩn → hiện mỗi lần trang đơn vẽ lại (9–16 ms trên máy local; mạng thật chưa đo) và mỗi lần vẽ gọi `…/thuong-mai` thêm một lần (Kế toán: thêm `/api/pricing/cung-ung`; Quản trị / Toàn quyền chưa đo). Gợi ý: đưa vào `Promise.all` của `load()` hoặc giữ nội dung cũ khi vẽ lại; chỉ gọi `cung-ung` khi bấm «Ghi mức tay» | `web/order.ts`, `web/phan-doi-tac.ts` | Chờ đo mạng điện thoại thật rồi điều phối quyết |
| BL-SDL-LOI-TRONG-KHOI | Lỗi khác 404 của khối «Phần đối tác» hiện dòng lỗi «Hoa hồng» trong khối kèm nút «Tải lại», không qua hộp báo lỗi chung — cần chủ xác nhận có chủ ý | `web/phan-doi-tac.ts` | Chỉ là cách hiện |
| BL-SDL-MAN-MUC-NHO | Màn «Hoa hồng đối tác»: lọc chỉ khớp theo nhãn đang hiện (gõ tên dịch vụ không ra dòng nhóm hay dòng «Mọi dịch vụ» đang áp); mã dịch vụ nằm trong nhãn phạm vi (chủ xem ảnh); chữ «đang tải» | `web/hoa-hong.ts`, `src/shared/hoa-hong-hien-thi.ts` | Chủ duyệt nhãn qua ảnh trước |
| BL-SDL-CHU-XE | Chữ gợi ý ở màn chi phí chuyến «Để trống: ngày huỷ / ngày chạy» lệch với ngày mặc định thật khi tháng đã khoá | `web/chi-phi-chuyen.ts` | Chỉ là chữ |
| BL-SDL-AXE-NHO | Bốn vi phạm axe minor `empty-table-header` (cột nút cuối bảng `/hoa-hong`, `/nguoi-ban`, khổ 1040); dòng «Thử tra» không nêu tên nhóm («…mức của loại đối tác cho nhóm»); huy hiệu «Đang áp» xuống hai dòng ở cột Trạng thái khổ 1040 | `web/hoa-hong.ts`, `web/nguoi-ban.ts`, `web/so-dai-ly-ui.ts` | Không critical / serious; chờ chủ xem ảnh |
| BL-SDL-ANH-CHO-CHU | Ảnh bằng chứng chưa gửi chủ; chờ duyệt nhãn («Hoa hồng», «Giá đại lý», «Khách tính», «Mức», «Người bán») và bố cục | `docs/evidence/2026-10-08-so-dai-ly-dot-1/` | Điều phối gửi chủ |
| BL-SDL-KICH-BAN-CU | Hai kịch bản Chrome cũ đỏ do hạ tầng, không do sổ đại lý: `xe-smoke.mjs` nhánh 390 gọi `call(ADMIN, …)` ngay sau `env.as(ADMIN, …)` làm phiên Node bị thay (luật một phiên ADR-0075) nên bước 8b, 9 đỏ (11/13; có từ 28/9, chưa chạy đối chứng trên `main`); `v1-nguoi-phu-trach.mjs` gieo `wrangler d1 execute` hỏng ngẫu nhiên (bước đỏ đổi theo lần chạy; `ONLY=h,p,q` 3/3 xanh; đã có hồ sơ 8/10 `2026-10-08-kich-ban-chrome-do-san`) | `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` | Hồ sơ có ngày, không sửa; cùng loại với `BL-VC-SMOKE-CU` ở mục 22 |
| BL-SDL-KHO-390 | Khẳng định «không có liên kết» ở khổ 390 trong `so-dai-ly-smoke.mjs` chưa mở trang `/account` nên chưa chứng minh gì; rào thật của menu điện thoại là bài `trang-toi` | `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs` | Chỉ là độ chặt của kịch bản (người kiểm Task 13) |
| BL-SDL-CUOC-CHUYEN | `web/cuoc-chuyen.ts` chặn bằng `coCuocCuaToi(staff)` trực tiếp, không qua `moTrang`; rào «mục hiện ⇔ mở được» không canh trang này | `web/cuoc-chuyen.ts` | Ngoài phạm vi đợt 1; đúng hành vi hôm nay |
| BL-SDL-DOC-MENU | `docMenu()` của rào mục hiện bỏ qua nhánh `root`; bài đặc tả mục chưa so lưới, sáng, huy hiệu | `tests/audit/muc-hien-mo-duoc-khung.mjs`, `src/muc-giao-dien-hien-trang.test.ts` | Minor của người kiểm K-c |

**D. Bài kiểm còn mỏng (đều canh QUÊN, không canh cố ý)**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-SDL-BAI-KHOA | Bài quét `lo-dich-khoa-ky.test.ts` chỉ ĐẾM lô và chỗ dịch lỗi — coi là «đếm chống quên»; `ngayCuaKeHoach` / `ngays` ở tiền xe chưa bài nào ghim (cần ca hai tháng khoá 08 + 09) | `src/modules/billing/lo-dich-khoa-ky.test.ts`, `src/modules/van-chuyen/khoa-thang-xe.test.ts` | Minor của người kiểm Task 7 và 8; thêm việc phải hỏi chủ |
| BL-SDL-BAI-TAP-QUYEN | Bài nối cổng thứ tư của khối «Phần đối tác» chạy 12 tập quyền, bài nối ô tìm đối tác của màn «Hoa hồng đối tác» chạy 46 tập (lần quét riêng 1023 tập cho 0 lệch); tuỳ chọn thêm bài thuần quét đủ 1024 tập | `src/modules/pricing/o-dat-qua-noi-cong.test.ts`, `src/modules/pricing/co-the-tim-doi-tac.test.ts` | Đã có rào khác phủ đủ tập; chỉ tăng độ chặt (T11 M9, T10 M-3) |
| BL-SDL-BAI-KA | Rào «số lạ toàn Nền tảng»: câu đỏ đầu tiên trên mã cũ là khẳng định cấu trúc; lời gọi đối chứng ghi tay nạp vào `thay` nên «bài rỗng» có thể không đỏ; hai vị từ `laDongThuongMai` / `laHanhDongThuongMai` nên gộp một nguồn; bài tĩnh của Mai nên là danh sách cho phép `FROM/JOIN tl_* \| v_stf_*`; mã đơn tự gieo ngẫu nhiên (~0,05% đỏ giả) nên làm tất định; `POST /api/pricing/*` của Quản trị / Toàn quyền + Đối tác, `xe-cua-don`, `nhap-ke-toan` chưa quét; `hideThuongMai` nên bắt buộc; một chữ «nền c18cfc41» | `src/so-la-thuong-mai-toan-nen-tang.test.ts`, `src/shared/audit-actions.ts`, `src/modules/audit/` | Minor m1–m9 của người kiểm K-a; không đổi hành vi |
| BL-SDL-BAI-KC | Rào K-c: bài nối dây đọc chữ (`if (process.env.X) await kiemPhan(2)` hay bí danh vẫn xanh — đề xuất đòi dòng cấp cao nhất `await kiemPhan(n);`); nhánh rỗng sau `if (!moTrang(...))` vẫn xanh; dòng sổ hàng rào ghi «chưa quan sát chặn thật» cho M-b(a) trong khi người kiểm đã quan sát | `src/muc-hien-mo-duoc-*.test.ts`, `docs/SO-HANG-RAO.md` (dòng K-c) | Minor m1–m3 của người kiểm K-c |

**E. Việc của đợt 2 (đã có trong đặc tả, nhắc lại để khỏi mất)**

- **BL-SDL-DOT-2:** (1) chụp bù đơn cũ; (2) gộp hồ sơ trùng (ADR-0068) có tính tới bản chụp — hôm nay bản chụp giữ `beneficiary_party_id` cũ; (3) `R-BIL-2` vào bảng kiểm khoá tháng; (4) mở khoá «Đã giao» cho đơn có người hưởng. Chi tiết và thứ tự: `docs/HANDOFF-N1.md` «Việc còn treo», đặc tả đợt 1 phần «Để đợt 2».
  - **Cập nhật 2026-10-19 (sổ đại lý đợt 2, nhánh `claude/objective-euclid-1c8113`, CHƯA gộp, CHƯA lên production):** (1) **đã làm** — migration `0113` chụp bù một lần đơn khách lẻ, trang «Chụp bù mức» cho phần còn lại; (4) **đã làm** — «Đã giao» mở cho đơn có người hưởng, sổ ghi hoa hồng / giá vốn theo bản chụp. (2) **chờ chủ** — gộp hồ sơ người hưởng sau Xác nhận: số tiền đúng nhưng dòng ghi cho hồ sơ đã gộp (`BL-SDL2-GOP-HO-SO` ở mục 43). (3) **chưa làm** — `R-BIL-2` đã là kiểm định kỳ, nhưng bảng kiểm khoá tháng chưa có mục «đơn Đã giao thiếu giá vốn» vì `billing` không đọc được nhà cung cấp của từng dòng (`BL-SDL2-KHOA-THANG-GIA-VON` ở mục 43). Khi nhánh lên production thì đóng (1), (4).

## 27. Luật «có quyền Đối tác là áp» cho tiền xe thuê (mã `BL-SDL-XE-…`) — NGOÀI phạm vi sổ đại lý đợt 1

- **Ngày:** 2026-10-12 · **Nêu bởi:** người kiểm độc lập bước K-a · **Trạng thái:** `đã duyệt hướng, chưa làm` — chủ/điều phối trả lời «Có, làm sau đợt 1» (2026-10-12).
- **Vấn đề:** các route tiền xe thuê chỉ hỏi `can(transport.*)` và không chặn `holdsPartner`, nên tài khoản lai Kế toán / Quản trị / Toàn quyền + Đối tác nhận 200 ở `GET /api/van-chuyen/bang-gia`, `GET /api/van-chuyen/chi-phi` và `GET /api/van-chuyen/chuyen/:id/chi-phi` (chưa kiểm thân có số). Nhật ký mới không ẩn hành động `trip_cost_*` / `rental_rate_*`. Bài số lạ `tien-xe-so-la` không có tài khoản lai.
- **Việc khi làm:** thêm `holdsPartner` ở dòng đầu ba route, lọc hai nhóm hành động khỏi nhật ký của tài khoản giữ quyền Đối tác (khuôn `hideThuongMai`), mở rộng bài số lạ với tài khoản lai, rồi đọc D1 production xem có tài khoản lai nội bộ + Đối tác nào không (lệnh chỉ đọc do chủ chạy). Phân hệ Vận chuyển đã đóng sổ (mục 22) nên chỉ mở lại khi chủ yêu cầu.

## 28. Sau khi vá ba chỗ hở tiền 12/10 — nợ nhỏ (mã `BL-VA-…`)

- **Ngày:** 2026-10-12 · **Nêu bởi:** người kiểm độc lập hai vòng sau lượt vá ba chỗ hở tiền (luật giá Thực tập ADR-0100 và hai hàng rào canh tiền). Cột «Nơi» ghi tên tệp / chức năng, không ghi số dòng. Mục «Thực tập chỉ giá danh mục» (BL-QUYEN-BH08) đã làm xong và đã xoá khỏi mục 21.

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-VA-NHAP-TAY-LAI | Tài khoản Thực tập kèm Bán hàng (hoặc kèm Quản trị) thấy nút «nhập tay» khi công tắc nhập tay BẬT, nhưng mọi lần lưu dòng nhập tay đều bị 403 (luật giá). Máy chủ an toàn. Chủ chọn: ẩn nút cho tài khoản `chiGiaDanhMuc`, hay để nguyên. | `orders/index.ts` (`duocDung`), `web/order-form.ts` | Chạm cách hiển thị theo quyền; chờ chủ chọn |
| BL-VA-THUC-TAP-QUAN-TRI | Thực tập kèm Quản trị bị 403 khi xác nhận hoặc sửa nháp CÓ giảm giá / giá thoả thuận do người khác lập (hệ quả đúng chữ ADR-0100 Đ2 «có quyền Thực tập là áp», ADR không nêu rõ). Chưa kiểm production có tài khoản lai như vậy không. | `orders/index.ts` (nhánh xác nhận, sửa nháp) | Chờ chủ xem hệ quả; muốn khác thì ADR mới |
| BL-VA-RAO-K1 | Hàng rào K-A-1: cấm `defineSql(` ngoài `src/modules/**` (trừ định nghĩa ở `sql-registry.ts`; hôm nay 0 chỗ); xử lý trường hợp bộ che chú thích hiểu nhầm regex URL (khi đó bài im lặng cho lọt `defineSql` trong thân hàm). | `src/architecture.test.ts`, `scripts/source-mask-lib.mjs` | Minor; muốn lọt phải sai hai chỗ cùng lúc |
| BL-VA-RAO-K3 | ~~Hàng rào K-A-3: bắt thêm biến bị bọc (`Number(rateBp)`, `((rateBp))`) và `CAST(rate_bp …)` / `IFNULL(rate_bp, 0)` trong SQL.~~ **ĐÃ LÀM 2026-10-19** (sổ đại lý đợt 2 Task 1, sửa thêm ở Task 14: hết báo nhầm `rate_bp, cột * x`, bắt `\|\| 0` và đối số âm; quan sát chặn thật ở `docs/SO-HANG-RAO.md` dòng K-A-3; nhánh `claude/objective-euclid-1c8113`, chưa gộp) | `src/hoa-hong-mot-nguon.test.ts` | Khe còn lại ghi ở phần GIỚI HẠN đầu tệp |
| BL-VA-CAU-NHAC | Dòng nhắc dưới ô giảm giá ở form tự chọn «Đối tác hay Thực tập», song song với cách chọn câu của máy chủ; thêm vai thứ ba vào `chiGiaDanhMuc` thì dòng nhắc ghi sai. Đưa cách chọn câu vào một hàm thuần ở `src/shared/`. | `web/order-form.ts`, `orders/price-guards.ts` | Chỉ chữ; máy chủ vẫn chặn đúng |
| BL-VA-FINDING-CU | Tám bài «FINDING» ở `tests/audit/redteam.test.mjs` và `tests/audit/doi-tac.test.mjs` đỏ khi chạy lẻ (D-02, P2, P3, P5, P6, D1, D2, D5). Kịch bản cũ: dựng tài khoản bằng `POST /api/staff` nay trả 403; D1, D2, D5 khẳng định CSDL cho sửa tiền đơn đã xác nhận nhưng trigger `order_money_frozen` đã đóng lỗ đó. Không thuộc `npm test` nên không ai thấy. Việc: sửa khung dựng, đổi D1/D2/D5 thành bài «CSDL chặn». | `tests/audit/` | Đỏ y hệt trước lượt vá; không liên quan |
| BL-VA-CHROME-LAI | Kịch bản Chrome `doi-tac-lap-don-smoke.mjs` chưa có bước cho tài khoản vừa Đối tác vừa Thực tập (câu của Đối tác); bài thuần đã có. Dòng mô tả kịch bản này ở `web/CLAUDE.md` còn ghi chỉ canh Đối tác (ADR-0027): đề xuất thêm «hoặc Thực tập (ADR-0100)» (tệp luật, chủ duyệt). | `web/CLAUDE.md`, kịch bản Chrome | Tệp luật chỉ đề xuất |
| BL-VA-TAI-LIEU-AC | Tài liệu mô tả của gói Vận chuyển A+C (từ bản chính) còn sót, người ghép 2026-10-13 chỉ giữ nguyên văn: (1) chữ «CHƯA gộp» trong mô tả mới nay đã sai vì gói đã vào bản chính; (2) thiếu dòng bảng cho migration `0084`, `0085`, `0092`; (3) thiếu dòng cho ba ô quyền `trip.transfer`, `trip.refuse`, `unavailability.self`; (4) chưa kiểm production đã áp `0084`–`0086`, `0089`, `0091`–`0093` chưa (chỉ dựa vào HANDOFF bản 1.87). | `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/DATA-DICTIONARY.md` (nếu cần) | Tài liệu mô tả thua mã; sửa khi chạm tới, kiểm production bằng lệnh chỉ đọc |

## 29. Khe «Đã giao» không có hoa hồng khi vai bên ngoài của bên đặt đã kết thúc (mã `BL-HH-DA-GIAO-KHE`)

- **Cập nhật 2026-10-19 (sổ đại lý đợt 2, chưa gộp):** cơ chế vá dưới đây (hằng `CO_NGUOI_HUONG`) bị THAY khi nhánh sổ đại lý đợt 2 lên — đơn có người hưởng nay «Đã giao» được, chỗ chặn mới là «còn dòng chưa chụp / bản chụp thiếu mức» (hằng `THIEU_BAN_CHUP`, trigger `bil_posting_delivered_terms` của `0112`); khe «vai đã kết thúc ⇒ giao không hoa hồng» không còn vì sổ ghi theo bản chụp. Hai câu đếm dưới đây vẫn đúng cho bản đang chạy.
- **Ngày:** 2026-10-13 · **Nêu bởi:** người phân tích đề xuất «gắn vai với mức chiết khấu», điều phối đã đọc lại mã · **Trạng thái:** `đã vá` (commit `8ade17ac` trên nhánh `worktree-agent-ab8c0cd598c5b2f6d`, 2026-10-13; đã có người kiểm độc lập 2026-10-13: ĐỦ về an toàn tiền, không có Chặn; đã gộp vào `main` và ĐÃ LÊN PRODUCTION cùng bản 1.92, 2026-10-13 21:30; người nghiệm thu sau triển khai xác nhận mã có trong bản chạy) — chủ đổi ý trong chat 2026-10-13: «Vá riêng ngay, có người kiểm», thay cho phương án gộp vào LẦN 1 của đề xuất gắn vai. Cách vá: hằng `CO_NGUOI_HUONG` ở `orders/hoan-tat-repo.ts` ghim vào bản chụp hiện hành của chính đơn; bài `src/da-giao-khe-hoa-hong.test.ts`; dòng ở `docs/SO-HANG-RAO.md`.
- **Vấn đề (đã đọc mã; người kiểm độc lập ĐÃ tái hiện bằng khung thử thật 2026-10-13):** điều kiện của câu «Đã giao» chỉ chặn khi bên đặt **đang** mang vai nhóm bên ngoài (`orders/hoan-tat-repo.ts`, `DAT_GIAO_DIEU_KIEN`, nhánh `NOT EXISTS … role_group = 'EXTERNAL'`; cùng điều kiện ở `GIAO_STATE.co_nguoi_huong`). Nếu vai bên ngoài của bên đặt bị kết thúc SAU khi đơn đã xác nhận và chụp mức hoa hồng, chỗ chặn gỡ ra: đơn có thể qua «Đã giao» không có hoa hồng trong sổ, rồi bản chụp bị khoá. Hệ quả kèm theo: loại đối tác mới thuộc nhóm OTHER cũng không được canh. Chưa kiểm đường kết thúc vai có bị chặn khi hồ sơ còn đơn xác nhận chưa giao không.
- **Việc khi làm:** bài ĐỎ trước tái hiện (kết thúc vai rồi bấm «Đã giao»); điều kiện chặn mới ghim vào bản chụp của chính đơn (đơn có bản chụp hiện hành với người hưởng khác rỗng), giữ điều kiện cũ làm dự phòng; người kiểm độc lập (chạm tiền và hợp đồng giữa `orders` và `parties`). Không đụng `docs/quyen-hoan.json`.
- **Hai câu đếm chỉ đọc cho chủ — CHỦ TỰ CHẠY, CHƯA CHẠY** (dùng `wrangler d1 execute tourdao-sales-db --remote --command "…"`; AI không chạy `--remote`):
  - Đơn MỚI bị giữ ở «Đã giao» sau bản vá (đơn đã xác nhận, chưa giao, bản chụp hiện hành có người hưởng nhưng bên đặt KHÔNG còn vai bên ngoài): `SELECT o.order_code FROM orders o WHERE o.status='confirmed' AND o.delivered_at IS NULL AND EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id=o.id AND t.commission_status<>'NONE' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id=t.id)) AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id=o.booker_party_id AND g.role_group='EXTERNAL');`
  - Đơn ĐÃ lọt «Đã giao» trước khi vá (khe đã bị dùng): `SELECT o.order_code FROM orders o WHERE o.delivered_at IS NOT NULL AND EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id=o.id AND t.commission_status<>'NONE' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id=t.id)) AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id=o.booker_party_id AND g.role_group='EXTERNAL');` — kết quả khác 0 là đơn đối tác giao mà sổ không có dòng hoa hồng, cần Kế toán xem. (Chú ý: đơn đã giao có bản chụp sau khi đối tác đổi sang khách lẻ cũng là bản NONE nên không lọt vào đây — đúng thiết kế.)

## 30. Thẻ "Cọc cần chi hoàn" trên Việc của bạn — chờ có trang cọc

- **Ngày:** 2026-10-15 · **Trạng thái:** `chờ`. Thẻ "Cọc cần chi hoàn" trên Việc của bạn — chờ có trang cọc: route `GET /api/ledger/coc` có nhưng chưa trang web nào gọi nên nút "Chi hoàn" chưa có đích; khi có trang cọc thì thêm lại khoá `cocCanChi` (ưu tiên 6, điều kiện `ledger.view`) vào `src/shared/viec-cua-ban.ts`.

## 31. Menu máy tính theo việc và «Việc của bạn» — nợ sau đợt 1 (chủ chốt đợt 1 ngày 2026-10-15)

- **Ngày:** 2026-10-15 · **Trạng thái:** `chờ`. Đặc tả `docs/superpowers/specs/2026-10-14-menu-may-tinh-viec-cua-ban/DAC-TA.md` (§10 là điều chỉnh sau thi công). Mỗi gạch dưới là một việc riêng; việc nào cần route đếm mới thì chạm API và quyền → ADR + trang ghép, chủ duyệt (CLAUDE.md §9).
- **Trang chủ cho Hướng dẫn viên, Đối tác, Nhân sự (đợt 2).** Chủ đã chọn «dựng Trang chủ mới» cho ba vai này (15/10). Hôm nay họ được đưa thẳng sang trang khác (`homeRedirect`) và `GET /api/orders/dashboard` trả 403. Cần ADR + trang ghép; xem thêm mục 18 (nội dung theo vai). Đợt 1 không thêm mục «Trang chủ» cho ba vai này để không dẫn tới trang lỗi.
- **Thẻ «Đề nghị chuyển khách»** (Quản trị, Toàn quyền): bỏ khỏi đợt 1 vì chỉ đếm được theo ngày. Cần route đếm tổng đề nghị đang chờ.
- **Thẻ «Đơn của tôi cần làm»** cho Bán hàng: cần route đếm riêng (đơn mình lập / mình phụ trách còn việc).
- **Thẻ «Đơn sắp đi chưa có xe», «Chuyến chưa xếp xe», «Đơn đã giao chờ Kế toán Hoàn thành»:** mỗi thẻ cần route đếm; không đếm trên trình duyệt (đặc tả §5).
- **`/orders` đọc `?status=draft`:** để nút «Xem đơn nháp» của thẻ Đơn nháp mở sẵn bộ lọc nháp. Hôm nay `web/orders.ts` chỉ đọc `q` nên thẻ dẫn tới `/orders` trơn. Cần nới trần gói `web/orders.ts` (chủ quyết) hoặc tách gói.
- **Thanh bên: nhớ trạng thái mở / đóng nhóm Thiết lập theo máy** (đặc tả §3, bỏ khỏi đợt 1). Hiện chỉ có luật `thietLapMoSan`. Làm khi có chỗ trong trần gói `web/orders.ts`.
- **Mục gộp: `aria-current` `"true"` thay `"page"` cho trang con** (nhận xét M-6 của người kiểm độc lập, chưa xác minh lại bằng trình đọc màn hình). Khi đứng ở một trang con của mục gộp, thanh bên sáng mục gộp; cân nhắc đặt `aria-current="true"` thay vì `"page"` cho trang con. Việc nhỏ, đổi ở `web/shell.ts` (chạm trần gói).
- **Chuỗi lỗi → Thử lại → hồi phục của thẻ Việc của bạn** (nhất là «Cần xem lại» và hai nguồn ngoài) mới được khóa bằng bài đọc mã, chưa chạy thật. Cần kịch bản Chrome / e2e (Task 7b của đợt này).
- **Ghi chú liên quan:** thẻ «Cọc cần chi hoàn» của Kế toán: xem mục 30.

## 32. Trợ giúp theo vai: nới trần 30 phút hoặc tách theo mục để bổ sung ý phụ

- **Ngày:** 2026-10-15 · **Trạng thái:** `chờ`. Khi viết lại Trợ giúp cho khớp menu theo việc, bài A4 (`src/shared/huong-dan.test.ts`: Phần chung + một nhóm vai ≤ 30 phút) buộc phải rút chữ, nên mất vài ý phụ: dòng thời gian trong thẻ «Chuyến đón» của Bán hàng (chuyến kế tiếp có nhãn «Sắp tới»); ở Kế toán: ô «Doanh thu của tôi» ghi «Chưa có đơn nào tuần này» và dòng «số đơn và ngày đón sớm nhất» của «Còn thiếu tiền»; Trợ giúp Quản trị không nói chân menu (Của tôi, Góp ý, Trợ giúp). Việc: nới trần A4 (chủ quyết) hoặc tách Trợ giúp theo mục để bổ sung ý phụ mà không vượt.

## 33. Chat thời gian thực trong Vé hỗ trợ (mã `BL-VE-CHAT-THOI-GIAN-THUC`)

> Đánh lại số khi gộp main ngày 2026-10-15: trên nhánh Vé hỗ trợ mục này là **mục 30** (ADR-0119 và kế hoạch đợt 1 còn ghi «mục 30» — hồ sơ đóng băng, không sửa); main đã dùng 30–32.

- **Ngày:** 2026-10-14 · **Nêu bởi:** chủ dự án, trong phiên đặc tả Vé hỗ trợ · **Trạng thái:** `để sau`
- **Ý:** tin đến tức thì và hiện «đang soạn» trong phiếu hỗ trợ. Chủ chốt: **không nhúng chat của bên thứ ba** (lý do: hai nơi lưu hội thoại, nội dung nhạy cảm rời D1, không biết quy tắc nhóm); nếu làm thì dùng Durable Objects của Cloudflare chạy trong chính Worker.
- **Vì sao để sau:** đợt 2 của Vé hỗ trợ dùng tải lại ngầm mỗi 5 giây là đủ cho ~30 người; Durable Objects thêm một loại hạ tầng vào cấu hình triển khai nên cần ADR riêng và chủ duyệt.
- **Đặc tả gốc:** `docs/superpowers/specs/2026-10-14-ve-ho-tro-design.md`.

## 34. Vé hỗ trợ — nợ đợt 1 (mã `BL-VE-…`)

> Đánh lại số khi gộp main ngày 2026-10-15: trên nhánh Vé hỗ trợ mục này là mục 31.

- **Ngày:** 2026-10-15 · **Nêu bởi:** điều phối và người thi công Vé hỗ trợ đợt 1 (ADR-0119, nhánh `claude/support-ticket-module-eb6445`, chưa gộp) · **Trạng thái:** `để sau` (đợt 2 hoặc lần phát hành sau). Cột «Nơi» ghi tên tệp / chức năng, không ghi số dòng.

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| ~~BL-VE-GIAO-VIEC~~ | ~~Trưởng nhóm chưa có ô chọn «Giao cho người khác»…~~ — **xong ở Vé hỗ trợ đợt 2a** (ADR-0127, 2026-10-17, CHƯA gộp): tuyến `GET /api/feedback/teams/:id/members` + nút «Giao cho người khác» cho Trưởng nhóm và Toàn quyền | `src/modules/feedback/index.ts`, `web/feedback.ts` | — |
| BL-VE-HOP-THU | Thẻ «Hộp thư» ở Trang chủ chỉ cho Toàn quyền (đọc tuyến cũ `GET /api/feedback`); đặc tả muốn hiện cho thành viên nhóm. Thành viên hôm nay thấy huy hiệu số ở menu | `web/home.ts`, `GET /api/feedback/queue` | Lệch có chủ ý ghi ở kế hoạch và `docs/SYSTEM-DESIGN.md` §16; bề mặt, đảo được |
| BL-VE-GO-TUYEN-CU | Gỡ tuyến cũ `GET /api/feedback`, `PATCH /api/feedback/:id`, hàm `canRead` (mã chết còn trong `GUARDS` của `route-write-guard.test.ts`) và cột chết `fbk_ticket.admin_seen_at` (migration mới) — expand–contract lần phát hành sau, khi bản web cũ đã hết trong bộ nhớ đệm | `src/modules/feedback/{index,repository}.ts`, `src/route-write-guard.test.ts`, `src/route-access.test.ts`, migration mới | Bản web cũ còn gọi tuyến cũ tới khi nhân viên mở bản mới |
| BL-VE-THU-THANH-VIEN | Email / thông báo đẩy tới TỪNG thành viên nhóm (hôm nay một địa chỉ chung `FEEDBACK_NOTIFY_EMAIL`). Bảng nhân viên không có email; đẩy qua `thongbao` cần khai cạnh `feedback → thongbao` ở `ALLOWED_EDGES` | `src/modules/feedback/notify.ts`, `src/modules/thongbao` | ADR-0119 điều 9: đợt 2, cần quyết định riêng |
| BL-VE-QUYEN-HOAN | Lúc gộp: kiểm lại `docs/quyen-hoan.json` (năm mục hạn 2026-10-31) — nhánh này không thêm / bớt mục nào, nhưng hạn có thể đã tới khi gộp và làm `npm test` đỏ | `docs/quyen-hoan.json` | Hạn do chủ đặt; AI không tự gia hạn |
| BL-VE-DO-GIO | Bài đo giờ hook `src/claude-guard-thoi-gian.test.ts` đỏ khi máy bận (tải > ~25) trong lúc thi công; chạy lại riêng khi máy rảnh thì xanh. Chưa đo lại trên máy khác | `src/claude-guard-thoi-gian.test.ts` | Không phải lỗi của nhánh; không sửa hook |
| BL-VE-NHOM-CU | Ghi chú nội bộ CŨ (trước 0100) mang nhóm Kỹ thuật ⇒ thành viên nhóm Kỹ thuật (không phải Toàn quyền) đọc được mọi ghi chú nội bộ cũ của phiếu cũ | dữ liệu `fbk_message.team_id` | Hệ quả của «phiếu cũ vào nhóm Kỹ thuật» (ADR-0119 điều 1, 5); chủ xác nhận khi gán thành viên Kỹ thuật |
| BL-VE-BEN-NGOAI-CHUYEN | Trưởng nhóm Kỹ thuật chuyển được phiếu của tài khoản bên ngoài sang nhóm khác (Ruling R12); người bên ngoài khi đó thấy tên nhóm đó trên phiếu của mình (vẫn chỉ tin công khai) | `POST /api/feedback/:id/transfer` | Chờ chủ quyết: chặn hay để nguyên |
| BL-VE-TRUNG-TEN | Menu «Hỗ trợ» trùng tên với nút nổi «Hỗ trợ» của Trợ lý AI (ADR-0066) — người dùng dễ nhầm hai lối (Ruling R15) | `src/shared/muc-giao-dien.ts`, `web/tro-ly.ts` | Chờ chủ chọn tên |
| BL-VE-THONG-KE | Thống kê tuần của hàng đợi nhóm đếm cả phiếu chính người xem gửi trong khi danh sách loại ra; `/queue` trả 404 «không có nhóm» trước 403 (lộ mã nhóm có tồn tại — không đáng kể); mốc đã xem trùng mili giây tính là đã đọc | `src/modules/feedback/{index,repository}.ts` | Bề mặt; người kiểm từng việc xếp «nhỏ, để sau» |
| BL-VE-DOT-2B | Phần còn lại của Vé hỗ trợ đợt 2: trạng thái «Chờ người gửi bổ sung», loại phiếu «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên nhóm (xem BL-VE-THU-THANH-VIEN) | `docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md` mục 1 | Chủ chốt 2026-10-16: làm đợt 2a trước, 2b chưa làm |
| BL-VE-CUNG-MILI-GIAY | Ở bước «gọi tiếp ngay» của khung trò chuyện, nếu tin thứ 100 và 101 mang đúng cùng một mili giây thì phép so `>` bỏ sót tin 101 ở lần đó; vòng thường kế tiếp (lùi 30 giây) bắt lại, trừ khi trong 30 giây có hơn 100 tin | `buocLamMoi` ở `src/shared/ve-ho-tro-hien-thi.ts`, `LIST_MESSAGES_SINCE` ở `src/modules/feedback/repository.ts` | Rất hiếm với ~30 người; dựa vào kỷ luật (`docs/SO-HANG-RAO.md`) |
| BL-VE-DA-XEM-LECH-GIO | Huy hiệu «chưa đọc» so `seen_at >= last_activity_at`; `seen_at` do tuyến chi tiết ghi lúc mở, còn dấu giờ tin do lệnh trả lời tính TRƯỚC lô ghi, nên tin có dấu giờ sớm hơn lần mở vài chục mili giây vẫn bị coi là đã đọc (người kiểm cả nhánh 17/10 tái hiện được; lỗ có từ đợt 1, đợt 2a làm nhẹ đi với tab đang mở nhờ tuyến làm mới). Hướng sửa: so huy hiệu theo id/rowid tin hoặc ghi `seen_at` theo dấu giờ tin cuối đã trả | `UNREAD_USER` ở `src/modules/feedback/repository.ts`, `index.ts` tuyến chi tiết | Bề mặt, gom với BL-VE-THONG-KE |
| BL-VE-UU-TIEN-CHUYEN-NHOM | Chuyển nhóm không đặt lại mức ưu tiên: nhóm mới nhận nguyên mức «Khẩn» của nhóm cũ. Đặc tả không nói; chủ quyết có đặt lại về Thường hay giữ | `TRANSFER` ở `src/modules/feedback/repository.ts` | Chờ chủ quyết (bề mặt) |
| BL-VE-DON-NHAP-HUY | Danh sách chọn «Đơn liên quan» có cả đơn nháp và đơn đã huỷ (đặc tả không loại) | `my_orders` ở `src/modules/feedback/repository.ts`, `napDonCuaToi` ở `web/feedback.ts` | Chờ chủ quyết: giữ, lọc, hay chỉ hiện nhãn |
| BL-VE-PHIEU-KET-NGOAI | Phiếu đã kẹt từ trước bản vá R6 (người giữ là tài khoản bên ngoài còn dòng thành viên cũ) không tự lành: `nguoiGiuHopLe` vẫn coi họ là người giữ hợp lệ, phiếu không về «Chưa ai nhận», nhận việc 409. Vá = thêm vế «không phải tài khoản bên ngoài» vào `nguoiGiuHopLe` hoặc một view quyền. Kèm: khoảng hở kiểm-rồi-ghi khi giao việc (quyền bên ngoài thêm đúng lúc giữa kiểm và ghi). Gỡ tay hôm nay: Trưởng nhóm / Toàn quyền giao lại cho người nội bộ hoặc bỏ gán | `nguoiGiuHopLe`, `nguoiNhanNgoai` ở `src/modules/feedback/` | Đụng luật R6 (không chép mã quyền vào SQL) nên chờ chủ quyết; có thể thêm một mã kiểm định kỳ ở `scripts/audit-checks.mjs` nếu chủ muốn |
| BL-VE-MEMBERS-MA | Tuyến `GET /api/feedback/teams/:id/members` trả 404 cho nhóm không có nhưng 403 cho người không phải Trưởng nhóm ⇒ lộ mã nhóm có tồn tại (mục M-a của người kiểm Việc 4, đợt 2a; điều phối chỉ đạo chưa gộp hai mã) | `src/modules/feedback/index.ts` | Không đáng kể (danh sách nhóm vốn công khai ở `/teams`); bề mặt |

## 35. Hai ý của chủ khi xác nhận sổ vàng 14/10/2026 — để sau (mã `BL-SV-…`)

Nêu bởi chủ dự án trong lúc trả lời từng ca sổ vàng; hồ sơ trả lời: ca SV-SC-06 và SV-DH-07. Cả hai chạm tiền và chứng từ nên cần đặc tả ngắn và chủ duyệt trước khi làm (P8); chưa làm, chưa có ADR.

- **BL-SV-NOP-BU** · **Trạng thái:** `chưa làm` · **Ca liên quan:** SV-SC-06 (còn chờ xác nhận).
  - **Vấn đề:** Hướng dẫn viên khai «Công ty thu – CK» nhưng tiền chưa về, nên nộp bù tiền mặt (Kế toán ghi «Đã nộp»). Sau đó Kế toán bấm «Xác nhận đã nhận» cho khoản chuyển khoản thì máy chủ từ chối (ADR-0092 Đ2b) để hướng dẫn viên không bị âm. Chủ nêu: tiền khách có thể về trễ vì chuyển khoản bị gián đoạn, khi đó công ty đang giữ cả hai khoản.
  - **Việc khi làm:** thêm đường trả lại cho hướng dẫn viên phần đã nộp bù khi tiền chuyển khoản thật sự về (có người duyệt khác người ghi, có nhật ký, không âm số dư). Quyết định luật tiền nên qua ADR; ca sổ vàng SV-SC-06 viết thêm bước này rồi mới xác nhận.
- **BL-SV-CHUNG-TU-HOAN-NGOAI** · **Trạng thái:** `chưa làm` · **Ca liên quan:** SV-DH-07 (còn chờ xác nhận).
  - **Vấn đề:** Khoản «đã hoàn ngoài hệ thống» (công ty trả tay cho khách) hiện chỉ ghi số tiền. Chủ yêu cầu thu chi phải có chứng từ nội bộ: ghi rõ chi vì mục đích gì, số tiền, chi cho ai, hình thức nào (ví dụ tiền mặt), số chứng từ và ngày.
  - **Việc khi làm:** thêm các trường chứng từ vào khoản hoàn ngoài (bắt buộc, không đưa số tài khoản/giấy tờ cá nhân vào nhật ký — CLAUDE.md §7), cập nhật migration + `docs/data-dictionary.json`, viết lại ca SV-DH-07 cho khớp, chủ xác nhận lại.

- **BL-SV-SUA-SO-KHACH-HIEN-THI** · **Trạng thái:** `chưa làm` · **Ca liên quan:** SV-SK-03, 04, 06, 07, 10, 11 (còn chờ).
  - **Ý của chủ 14/10/2026 cho màn Sửa số khách:** (a) không đổi gì thì ẩn nút Lưu, và lịch sử số khách chỉ hiện khi có thay đổi (SK-06); (b) nhật ký ghi đủ chuỗi 4 → 3 → 5, không chỉ 3 → 5 (SK-07); (c) khuyến mại tặng vé: nhật ký nói rõ bản chất (mua 2 tặng 2 còn 1 người thì thành mua 2 tặng 1) (SK-04); (d) dịch vụ gõ tay hiện số lượng của nó (ví dụ "1 xe") thay vì "0 người" (SK-03); (e) đơn huỷ vẫn hiện rõ khoản khách đã thu trước (SK-11). Mục (f) — tự chuyển 0 người lớn + 1 em bé thành 1 người lớn + 1 em bé (SK-10) — chủ ĐÃ HUỶ 14/10/2026, giữ việc từ chối của ADR-0114 D3.
  - **Việc khi làm:** đặc tả ngắn, chủ duyệt; sửa ca sổ vàng liên quan; chủ xác nhận lại.

Các việc khác từ cùng buổi xác nhận (đang chờ chủ quyết, chưa phải backlog): SV-SC-02 (tính nợ trước khi Kế toán xác nhận), SV-DH-05 (cho Kế toán ghi chuyển sang đơn khác), SV-DH-08 (điều chỉnh có dấu vết thay vì «đảo»), SV-SK-07 và SV-SK-11 (nhật ký hiện đủ chuỗi, hiện khoản đã thu), SV-DH-04 (dòng «Đã hoàn trả»). Chi tiết ở `golden/README.md`.

## 36. Nợ hạ tầng dữ liệu hồ sơ (mã `BL-PTY-…`)

- **BL-PTY-REPLACE-0103** · **Trạng thái:** `đã làm ở nhánh, CHƯA gộp` (2026-10-17, lát H-3: migration `0105` thêm `pty_consent_no_replace`, `pty_privacy_policy_no_replace`, `pty_verification_no_replace`; bài (k) của `src/migrations-ho-so-tu-khai.test.ts`; dòng ở `docs/SO-HANG-RAO.md`). Còn lại: rà các bảng chỉ-thêm khác ngoài `pty_*`.
  - **Vấn đề:** `INSERT OR REPLACE` xoá dòng cũ mà không chạy trigger xoá, nên lách được "chỉ-thêm" của `pty_consent` và `pty_verification` (migration `0103`). Migration `0104` đã chặn cho hai bảng kho tệp (trigger `no_replace`) nhưng `0103` chưa có.
  - **Việc khi làm:** migration MỚI (không sửa `0103`) thêm trigger BEFORE INSERT cùng khuôn, kèm bài đỏ→xanh; rà các bảng chỉ-thêm khác.
- **BL-PTY-ISO-MOC-TEP** · **Trạng thái:** `chưa làm`. Ba mốc `stored_at`, `purged_at`, `r2_deleted_at` của `pty_attachment` chưa có CHECK khuôn ISO (repo chưa có quy ước CHECK cho dấu thời gian); máy chủ ghi `toISOString()`. Làm khi có quy ước chung.

## 37. Kho tệp hồ sơ — nợ lát H-2 (mã `BL-TEP-…`)

- **BL-TEP-PHAT-LAI-500** · **Trạng thái:** `chưa làm` · **Phải giải TRƯỚC lát giao diện tải ảnh** · **Cần chủ quyết** (chạm ADR-0094 đ6).
  - **Vấn đề (người kiểm độc lập tái hiện 2026-10-17):** route tải ảnh `POST /api/parties/:id/documents/:did/tep` ghi vé chống ghi trùng ở lô đầu. Khi kho hỏng, route trả 500; bấm lại CÙNG vé thì nhận phát lại 200 `{ da_ghi_truoc_do: true, ket_qua: null }` — ảnh không được lưu nhưng giao diện sẽ báo «Lần bấm trước đã được ghi.». Không mất dữ liệu đã lưu (vé của route này chỉ sống trong bộ nhớ trang; lần bấm sau tạo vé mới).
  - **Hướng sửa (chủ chọn):** (a) máy khách coi phát lại có `ket_qua = null` ở route này là «chưa rõ — tải lại để kiểm»; (b) route trả mã khiến máy khách đóng vé (không phát lại 200); (c) sửa ADR-0094 đ6. Không đổi hành vi lớp vé khi chưa có quyết định.
- **BL-TEP-MO-QUA-HO-SO-PHU** · **Trạng thái:** `chưa làm` · **Cần chủ quyết.**
  - **Vấn đề:** sau khi gộp, ảnh vẫn mở được qua đường dẫn của hồ sơ PHỤ (dòng giấy tờ đã huỷ của nó; dòng nối cũ giữ nguyên — bảng chỉ-thêm), nhật ký ghi đích là hồ sơ phụ. Người kiểm đề nghị chặn (404 khi hồ sơ đã gộp). Chưa làm vì mơ hồ: ADR-0068 / ADR-0123 không nói; «xem đủ số» trên hồ sơ đã gộp hiện vẫn cho; ảnh tải lên trong khe gộp (`BL-TEP-KHE-GOP`) CHỈ mở được qua đường hồ sơ phụ — chặn thì chúng không còn đường mở trước khi lát H-5 xoá.
  - **Việc khi làm:** chủ chọn chặn / giữ; nếu chặn thì quyết cùng lúc số phận ảnh trong khe gộp.
- **BL-TEP-EXIF** · **Trạng thái:** `chưa làm`. Xoá toạ độ chụp (EXIF) khỏi ảnh trước khi đặt kho — chưa làm vì không thêm thư viện runtime và chưa kiểm khả thi trên Worker (ruling R12 kế hoạch `docs/superpowers/plans/2026-10-16-goi-2-h2-kho-tep-ke-hoach.md`).
- **BL-TEP-HOOK-R2** · **Trạng thái:** `chưa làm` · **Đề xuất cho chủ** (AI không tự sửa `.claude/`). Hook `guard-remote` chưa chặn `wrangler r2 bucket create|update|cors|lifecycle|lock|sippy|notification` và `wrangler r2 object put` không kèm `--local`; thêm luật `wrangler-r2-write` + ca ở `src/claude-guard.cases.json` (ruling R14). Hôm nay chỉ dựa vào kỷ luật (CLAUDE.md §8).
- **BL-TEP-THAN-HAI-LAN** · **Trạng thái:** `chưa làm`. Tải 10 MB = thân ~14 MB bị lớp chống ghi trùng đọc một lần và route đọc lần nữa; bộ nhớ 128 MB của Worker thật CHƯA đo. Nếu Worker báo thiếu bộ nhớ thì xét đường tải lên riêng (cần ADR — đụng lớp chống ghi trùng).
- **BL-TEP-KHE-GOP** · **Trạng thái:** `chưa làm`. Ảnh tải lên dòng giấy tờ của hồ sơ phụ trong khe giữa lúc đọc và lúc ghi lô gộp không đi theo (ruling R15) — nằm lại ở dòng đã huỷ của hồ sơ phụ; lát H-5 đưa vào danh sách xoá.
- **BL-TEP-GIAO-DIEN** · **Trạng thái:** `chưa làm`. Chưa có màn hình tải / xem ảnh — lát H-2 chỉ có API; lát giao diện sau (phải giải `BL-TEP-PHAT-LAI-500` trước).

## 38. Tự khai hồ sơ — nợ lát H-3 (mã `BL-TK-…`)

- **BL-TK-ANH** · **Trạng thái:** `chưa làm`. Ảnh kèm phiếu tự khai (loại nối `SELF_SUBMISSION` của `0104` vẫn đóng — ruling R1; cổng `src/cong-phat-hanh-anh-tu-khai.test.ts`). Mở cùng lát H-5 (đường xoá) và sau khi giải `BL-TEP-PHAT-LAI-500`.
- **BL-TK-TO-CHUC** · **Trạng thái:** `chưa làm` · **Cần chủ quyết** (Q3). Tự khai cho hồ sơ TỔ CHỨC (giấy tờ tổ chức, địa chỉ công ty) — lát H-3 chỉ hồ sơ cá nhân (ruling R5; tài khoản gắn hồ sơ tổ chức nhận 409 `self_person_only`).
- **BL-TK-PHIEU-BAN-CU** · **Trạng thái:** `đã đóng` (lát H-4, ruling R8 của kế hoạch H-4, 2026-10-17). Phiếu đang chờ ghi phiên bản chính sách CŨ khi đã có bản mới: người xác minh vẫn xử lý được bình thường (xác minh không xét phiên bản chính sách — người khai vẫn còn đồng ý bản cũ); rút đồng ý bản cũ thì rút phiếu đó (ruling I-2 lát H-3). Không có luật bắt khai lại.
- **BL-TK-CHINH-SACH-60KB** · **Trạng thái:** `chưa làm`. Toàn văn chính sách (tới ≈ 60 KB) đi kèm `GET /api/parties/cua-toi` mỗi lần mở trang Tôi; cân nhắc tải toàn văn theo yêu cầu (bấm "Đọc chính sách") khi văn bản thật dài.
- **BL-TK-PHAN-TRANG** · **Trạng thái:** `chưa làm`. Danh sách phiếu của chính mình trả tối đa 50 dòng (mới trước), chưa phân trang — đủ cho tự khai; thêm khi có người vượt 50.

## 39. Xác minh hồ sơ — nợ lát H-4 (mã `BL-XM-…`)

- **BL-XM-ADR0121** · **Trạng thái:** `chưa làm` · **BẮT BUỘC cho lát ADR-0121.** Lát ADR-0121 phải (1) ghi `mfa_grace_reopened` / `mfa_exception_set` cùng lô với thay đổi (target_type `staff`, target_id = tài khoản, staff_id = người làm, không chi tiết); (2) có bài máy canh `mfa_exception_set` — hôm nay bảng ngoại lệ tạm chưa tồn tại nên vế vĩnh viễn của luật tách nhiệm vụ xác minh chỉ dựa vào kỷ luật (`docs/SO-HANG-RAO.md`); (3) thêm lời gọi mới vào tập ghim bài (5) của `src/modules/audit/cham-tai-khoan.test.ts` có lý do.
- **BL-XM-NHAT-KY-SDT-CU** · **Trạng thái:** `chưa làm` (m-3 của người kiểm nhóm A). Nhật ký đổi SĐT TRƯỚC bản sửa commit 19af1c48 (2026-09-21) có dạng "SĐT x → y", không khớp hằng `CHI_TIET_DOI_SDT` nên view `v_aud_cham_tai_khoan` không thấy. Việc cần làm: (a) kiểm ngày production nhận bản sửa đó (`wrangler deployments list` / `docs/HANDOFF-N1.md`; CHƯA kiểm); (b) nhận xét: phiếu gửi trước khoảng 21/10 (30 ngày sau ngày đó) có thể bỏ sót ca đổi SĐT cũ; từ sau mốc đó cửa sổ 30 ngày không còn chạm nhật ký cũ.

- **BL-XM-NHOM-C-NHO** · **Trạng thái:** `ghi nợ` (vòng sửa 1 nhóm B+C, người kiểm độc lập). Bốn điểm nhỏ không sửa mã: (m-5) hàng "đã xử lý" đọc 200 dòng, lọc cấp bậc rồi cắt 50 — vô hại ở quy mô ~30 tài khoản nội bộ, xem lại nếu số tài khoản tăng nhiều; (m-8) lý do `NHAP_NHAM_DONG` khi từ chối KHÔNG đánh dấu cần xác minh lại giá trị đã xác minh — chấp nhận được, nêu vào phần chủ quyết nếu muốn đổi; (m-1) dòng `xem-so` trong `BI_MAT` (`src/shared/lan-gui-bi-mat.ts`) không có bài canh — thân rỗng, số nằm ở phản hồi, dựa vào kỷ luật; (m-10) dòng sổ hàng rào cho rào 5.23 (`ROUTE_GOI_HAM_XAC_MINH`), bài 4b theo nhóm đường dẫn và bài tách nhiệm vụ còn phải ghi ở `docs/SO-HANG-RAO.md` (nhóm D).

- **BL-XM-ANH** · **Trạng thái:** `chưa làm`. Route ảnh của phiếu (người xác minh xem ảnh giấy tờ để đối chiếu, nối ảnh với phiếu tự khai — loại nối `SELF_SUBMISSION` còn đóng, ruling R1/R4). Đi cùng `BL-TK-ANH`. Cho tới lúc đó phiếu giấy tờ chỉ TỪ CHỐI được (409 `can_anh_giay_to` khi chấp nhận; hằng `CHAP_NHAN_GIAY_TO_KHI_CHUA_CO_ANH` ở `src/modules/parties/xac-minh.ts`).
- **BL-XM-TAI-HANG-CHO** · **Trạng thái:** `chưa làm`. Đo tải hàng chờ với ~1000 tài khoản Đối tác (ADR-0014): `GET /api/parties/xac-minh` đọc tối đa 5.000 phiếu chờ + toàn bộ tài khoản (`tai_khoan_cho_xac_minh`) rồi lọc trong bộ nhớ; hàng đã xử lý đọc 200 dòng. Hôm nay chưa có số đo trên D1 thật — làm trước khi mở tự khai cho đông người.
- **BL-XM-NHAN-SU-TAO** · **Trạng thái:** `ghi nhận` (kiểm cuối lát H-4, I-1). Người Nhân sự đã tạo một tài khoản thì không bao giờ xác minh được hồ sơ của tài khoản đó (ADR-0125 đ5 vế b); vận hành cần ít nhất một Nhân sự hoặc Quản trị khác người đã tạo tài khoản, nếu không phiếu chỉ còn Toàn quyền xử lý.
- **BL-XM-THONG-DONG** · **Trạng thái:** `ghi nhận` (ADR-0125 nói thẳng). Hai người thông đồng (tạo tài khoản rồi nhờ người khác xác minh) vẫn lách được luật tách nhiệm vụ; luật chỉ chặn nhầm / quên và chặn người đã chạm tài khoản, không chống cố ý. Toàn quyền là người chốt cuối.
- **Q1–Q5 còn mở (kế hoạch H-4; đã áp phương án khuyến nghị, đảo ngược được):** (Q1) phiếu giấy tờ chưa có ảnh — hôm nay KHÔNG chấp nhận được, chỉ từ chối; (Q2) "kích hoạt lại tài khoản" — đã tính là chạm quyền truy cập, tầng 30 ngày (vòng sửa 1 nhóm B+C); (Q3) hồ sơ bị gộp còn phiếu chờ — chấp nhận bị chặn (409 `ho_so_da_gop`), người xác minh từ chối với lý do "Hồ sơ đã gộp vào hồ sơ khác"; luật chặn gộp khi còn phiếu chờ CHƯA làm; (Q4) Nhân sự thấy họ tên chủ phiếu (không SĐT, email, vai), Quản trị không xác minh phiếu của Nhân sự (luật cấp bậc chung); (Q5) từ chối của Toàn quyền không gắn cờ, bảy thuộc tính xác minh gieo sẵn giữ nguyên (lát này chỉ dùng "Ngày sinh"). Chờ chủ trả lời chính thức; chưa câu nào chặn thi công.

## 40. Xoá / ẩn danh hoá — nợ lát H-5 nhóm A (mã `BL-XOA-…`)
- **BL-XOA-GHI-CHU-ERASED** · **Trạng thái:** `ghi nhận`. Ghi chú cột `erased_at` của `pty_person_document` chỉ có ở `hangDuLieu`; mục bảng trong `docs/data-dictionary.json` không có chỗ ghi chú vì bài (j) của `src/migrations-giay-to-cua-nguoi.test.ts` so khớp nguyên mục (không nới bài hàng rào).
- **BL-XOA-THU-TU-TRIGGER** · **Trạng thái:** `chưa kiểm`. Thứ tự chạy các trigger cùng sự kiện trên D1 chưa kiểm (trên sqlite3 3.51 đóng băng `person_document_erased` bắn trước `_superseded`, ngược chú thích bài (e)); an toàn, chỉ khác câu báo lỗi. Cần thử thật trước khi route dịch mã lỗi.
- **BL-XOA-MERGE-OLD** · **Trạng thái:** `ghi nhận`. `pty_party_merge_erasure` thiếu vế `OLD.merged_into_id IS NULL`; vô hại hôm nay (đã có `pty_party_merge_set_once`).
- **BL-XOA-ERASED-DINH-DANG** · **Trạng thái:** `ghi nhận`. `erased_at` (hai bảng) không có CHECK định dạng thời điểm.
- **BL-XOA-PHIEN-CHU-PHIEU** · **Trạng thái:** `ghi nhận`. Câu ẩn danh sổ phiên của lô Thực hiện dùng mã tài khoản đang gắn hồ sơ (`chuPhieu.id`), không phải người gửi phiếu (`created_by`): nếu tài khoản đã gắn sang hồ sơ khác thì phiên của người gửi không bị xoá IP. Hiếm; kiểm toán vòng sửa 1 (m-7).
- **BL-XOA-DA-XOA-MAI** · **Trạng thái:** `ghi nhận`. `hoSo.daXoa` ở "Hồ sơ của tôi" giữ `true` mãi kể cả khi người dùng khai dữ liệu mới sau khi xoá; chưa có quyết định chủ về việc có hiện lại hay không (m-8).
- **BL-XOA-LIEN-HE-DONG-PHONE** · **Trạng thái:** `ghi nhận`. Liên hệ đã đóng (dấu ẩn danh) hiện "Đã xoá" với loại PHONE ở `GET /api/parties/:id`; giao diện không được biến dòng này thành đường gọi điện (m-8).
- **BL-XOA-TO-CHUC** · **Trạng thái:** `chưa làm`. Phiếu yêu cầu xoá cho hồ sơ TỔ CHỨC / hộ kinh doanh (hôm nay chỉ hồ sơ cá nhân — trigger `pty_erasure_request_person_ins`). Cần luật sư nói số giấy phép của hộ có là dữ liệu cá nhân phải xoá không (Q6).
- **BL-XOA-THAY-KHACH** · **Trạng thái:** `chưa làm`. Quản trị lập phiếu THAY khách không có tài khoản (yêu cầu qua điện thoại) — cần trang ghép (bảng nhận loại người gửi mới, ai là «người gửi» cho luật người xử lý ≠ người gửi). Ưu tiên trước khi đăng chính sách trên production (Q6).
- **BL-XOA-KHOI-PHUC** · **Trạng thái:** `chưa làm`. Công cụ chạy lại phiếu từ BẢN NGOÀI (kho `HO_SO`, tiền tố `xoa/`) khi D1 sau khôi phục không còn dòng phiếu; đi cùng diễn tập khôi phục HC-5.19 (hạn 2026-11-05). Hôm nay: phiếu còn trong kho mà D1 còn `CHO_XU_LY` thì bấm «Thực hiện» lại; phiếu mất dòng thì chỉ ghi lại mã hồ sơ và chờ công cụ.
- **BL-XOA-BAO** · **Trạng thái:** `chưa làm`. Báo Quản trị khi có phiếu xoá mới — hôm nay chỉ thấy ở hàng chờ trong Danh bạ.
- **BL-XOA-TAI-KHOAN-NGUNG** · **Trạng thái:** `chờ chủ`. Gỡ Face ID / yếu tố lớp hai / `staff.phone` khi tài khoản đã ngưng (ADR-0126 đ9) — hôm nay giữ `staff.phone` để người đã xoá vẫn đăng nhập lại được; khoá nhanh và máy tin cậy chỉ còn tên (nhãn) trong phần giữ lại.
- **BL-XOA-LOGIN-ATTEMPT** · **Trạng thái:** `chưa kiểm`. `login_attempt.key` chứa SĐT — chưa kiểm dọn có nằm ngoài lô ẩn danh hay không.
- **BL-XOA-SELF-SUBMISSION-ANH** · **Trạng thái:** `ghi nhận`. Lát nào mở loại nối ảnh `SELF_SUBMISSION` phải giữ vế (b) của `GIU_ANH` và ca (8) của `src/modules/parties/xoa-an-danh-lenh.test.ts`, nếu không ảnh gắn phiếu tự khai đang chờ sẽ bị coi là «hết lý do giữ».
- **BL-XOA-TRAN-30** · **Trạng thái:** `chờ chủ` (Q2). Có bắt buộc nhập «số ngày xử lý yêu cầu xoá» khi đăng chính sách và chặn số lớn hơn 30 (lời chủ 16/10) không. Khuyến nghị: bắt buộc nhập, chặn trên 30. Hôm nay để trống được và không chặn trên.
- **BL-XOA-CAU-HOI-LUAT-SU** · **Trạng thái:** `chờ chủ + luật sư`. Q1 (bộ câu cho luật sư: hạn 20/30 ngày, giữ IP, căn cứ từng phần giữ lại, khi nào được từ chối), Q3 (ẩn danh cả phiếu tự khai — kế hoạch đã áp), Q4 (xoá thêm giới tính và nhãn máy — hôm nay GIỮ cả hai, danh sách «phần giữ lại» đã nói rõ), Q5 (luật giữ tên — kế hoạch đã áp), Q6 (hộ kinh doanh và khách không tài khoản). Câu trả lời khi có ghi vào đây.
- **Cập nhật `BL-TEP-KHE-GOP`:** ảnh nằm lại ở dòng đã HUỶ của hồ sơ phụ (khe gộp) nay hiện ở danh sách «ảnh hết lý do giữ» với lý do `DA_HUY` (lát H-5) — người có quyền xoá được; mục gốc ở trên giữ nguyên cho phần mở ảnh qua đường hồ sơ phụ.
## 41. Sổ tay hướng dẫn nghiệp vụ (mã `BL-SO-TAY-NGHIEP-VU`)

- **Trạng thái:** `chưa làm` · Ý của chủ 17/10/2026: gom luật nghiệp vụ thành sổ tay cho nhân viên.
- **Nguồn đã có để soạn:** `docs/VAN-CHUYEN.md` mục 0 (luật vận chuyển hiện hành từ bản 2.11, kèm nghĩa từng ô của Chính sách điều phối); Trợ giúp theo vai trong Nền tảng; nhật ký thay đổi (`src/shared/changelog.ts`); sổ vàng `golden/` (các ca đã chủ xác nhận).
- **Việc khi làm:** chủ chọn phạm vi (theo vai hay theo luồng việc) và nơi đặt (trong Trợ giúp hay tài liệu riêng); rà lại các mục 1–5 của `docs/VAN-CHUYEN.md` (còn theo bản 1.38).

## 42. Nút «Huỷ khoản thu» trên dòng trả lại khách và trên đơn đã huỷ (mã `BL-HUY-KHOAN-TRA-LAI`)

- **Trạng thái:** `chờ chủ quyết` · Thấy ở rà soát ngôn ngữ 18/10 (`docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-giao-dien.md` §5). Chủ chọn 18/10: «Chưa đổi, để tôi duyệt sau».
- **Hiện trạng:** nút hiện trên dòng trả lại khách (chữ «Huỷ khoản trả lại») và trên khoản thu của đơn đã huỷ; máy chủ (`ghiDieuChinh`, loại `dao_lan_thu`) VẪN cho làm — chỉ chặn sau Đã giao, dòng huỷ, lệnh chuyển giữa hai đơn và các bất biến cọc. Bỏ nút là đổi luật tiền.
- **Hai phương án đã đưa:** (a) ẩn ở đơn huỷ, giữ ở dòng trả lại — tiền đơn huỷ chỉ qua khối «Tiền của đơn huỷ», máy chủ chặn theo; (b) ẩn và chặn cả hai — nhưng ghi trả lại nhầm thì chưa có cách sửa khác. Lưu ý: khoản thu «chưa rõ» từ cọc cũ hiện dùng nút này để huỷ.

## 43. Sổ đại lý đợt 2 — nợ và điểm chờ chủ quyết (mã `BL-SDL2-…`)

- **Ngày:** 2026-10-19 · **Nêu bởi:** người thi công và người kiểm độc lập từng task của sổ đại lý đợt 2 (gom ở Task 14 từ mục «Nợ» và «Ruling» của `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md` — chi tiết, ví dụ số và hướng sửa ở đó) · **Trạng thái:** nhánh `claude/objective-euclid-1c8113` CHƯA gộp, CHƯA lên production. Không mục nào dưới đây chặn phát hành, trừ khi chủ nói khác.

**A. Chờ chủ quyết**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| BL-SDL2-LAI-KT-DT | Có nên tồn tại tài khoản lai Kế toán + Đối tác: màn tiền của đơn đã che theo luật Đối tác, nhưng trang sổ (`GET /api/ledger`, `GET /api/ledger/coc` — trường `benKia`) vẫn trả tên và số dư mọi bên cho tài khoản đó (Ruling R-91; người kiểm Task 12 Minor 1) | `billing/service.ts`, `index.ts` | Che ở trang sổ phá việc Kế toán thật; chủ chọn cấm loại tài khoản này hay ra ADR |
| BL-SDL2-BIEN-NHAN-GIAM | Biên nhận chia phần: giảm giá trừ vào phần Tour Đảo trước rồi tới các phần sau (Ruling R-81) — chưa có chữ ở ADR / đặc tả | `receipt/rules.ts:chiaPhanBienNhan` | Chỉ đổi cách in cho khách; chủ duyệt cách chia |
| ~~BL-SDL2-TRAN-THU-CHO~~ | **ĐÃ LÀM 2026-10-24** (chủ chọn trần theo số sau giảm; Ruling R-154, nhánh `claude/sua-so-dai-ly-sau-ra-soat`, CHƯA gộp: một hàm `chiaPhanNguoiBan` ở `src/shared/chia-phan-nguoi-ban.ts` cho cả trần và biên nhận). ~~Trần «thu cho» nhà cung cấp tính TRƯỚC giảm giá, biên nhận chia SAU giảm giá ⇒ đơn có giảm giá in «trả dư» ở phần nhà cung cấp (ví dụ vé 600.000 giảm 20.000; Nợ cạnh R-81, M-2 người kiểm Task 8+9) | `billing/rules.ts` (`phanChuaThuNhaCungCap`), `receipt/rules.ts` | Lệch tiền in; hai cách sửa, chủ chọn một |
| BL-SDL2-TEN-QUAY | Tên quầy nhà cung cấp vẫn hiện cho HDV / Bán hàng / Thực tập trong câu «đang đối chiếu» và cột người thu (Ruling R-94, R-130) | `billing/service.ts` | Tên không suy ra giá vốn; chủ quyết ẩn hay giữ |
| ~~BL-SDL2-DO-NCC~~ | **ĐÃ LÀM 2026-10-24** (Ruling R-155, CHƯA gộp: tài khoản giữ quyền Đối tác gửi «thu cho» ⇒ 403 một câu, trước mọi kiểm). ~~Tài khoản Đối tác gửi «thu cho» một hồ sơ nhà cung cấp với số nhỏ nhận 201 (ghi khoản thu thật) ⇒ dò được nhà cung cấp của đơn mình (M-3 người kiểm Task 8+9, khe R-96) | `docLanThu` ở `billing/service.ts` | Đắt để dò, để lại dấu; Đối tác vốn thấy tên người bán trên biên nhận |
| BL-SDL2-DON-LAI | Đơn «lai» (vài dòng đã chụp, vài dòng chưa) không có lối thoát trên giao diện: «Chụp bù» 409, ghi tay dòng chưa chụp 404 (Ruling R-59, R-P14). Chọn: «Chụp bù» chụp riêng dòng chưa chụp, hay người bảo trì sửa bằng SQL có duyệt | route «Chụp bù» ở `orders/index.ts` | Không route nào dựng được đơn lai; câu đếm (lai) trước phát hành phải bằng 0 |
| BL-SDL2-DOI-DAU | Điều chỉnh có duyệt làm ĐỔI DẤU số dư (nhà cung cấp đang giữ tiền khách, bổ sung giá vốn lớn hơn) phải tách hai yêu cầu — cần câu hướng dẫn cho Kế toán hoặc đổi luật `kiemDieuChinh` (ADR) | `billing/rules.ts:kiemDieuChinh` | Không sai tiền; thao tác vòng |
| BL-SDL2-KHOA-THANG-GIA-VON | Bảng kiểm khoá tháng chưa có mục «tháng có đơn Đã giao thiếu giá vốn»: `billing` không đọc được nhà cung cấp của từng dòng. Đề xuất view chỉ khoá `v_ord_service_supplier` (migration mới, hoặc thêm vào `0112` khi chưa áp remote) — chạm hợp đồng module | `kySoResponse`, `migrations/` | Lưới tạm là kiểm định kỳ `R-BIL-2` / `R-BIL-2w` |
| BL-SDL2-GOP-HO-SO | Gộp hồ sơ người hưởng sau Xác nhận (ADR-0117 N-11): «Đã giao» ghi đúng số hoa hồng nhưng cho hồ sơ ĐÃ GỘP; số dư / trả hoa hồng theo hồ sơ còn lại không thấy dòng này (bài `src/gop-ho-so-ban-chup.test.ts` ghim hiện trạng + `todo`) | `billing`, `parties` | Số tiền đúng, NGƯỜI nhận là câu hỏi của chủ |
| BL-SDL2-R-BIL-2-ADR | `R-BIL-2` không cộng phiếu điều chỉnh cho đơn giao sau mốc — lệch chữ ADR-0079 mục «Bất biến»; dòng 5.17 của `docs/ARCHITECTURE.md` cũ (Ruling R-100; `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/de-xuat-luat.md`; `docs/SYSTEM-DESIGN.md` §16) | tài liệu chuẩn tắc | AI không sửa ADR / Hiến chương; chủ duyệt |
| BL-SDL2-TIEN-TO-TRIGGER | Trigger lớp 2 báo `delivered_terms:` thay chữ `terms_missing:` của ADR-0079 điều 5 (Ruling R-6; `docs/SYSTEM-DESIGN.md` §16) | `0112` | Người dùng không thấy khác; chủ chọn giữ (ghi lịch sử ADR) hay đổi |
| BL-SDL2-R-BIL-5W-ON | Cảnh báo `R-BIL-5w` hiện cho gần như mọi đơn «Đã giao» lượt 1 trên production (dòng chưa có bản chụp người bán) — đúng nghĩa nhưng che cảnh báo khác. Chọn: thu hẹp về đơn có dịch vụ «làm đại lý», hay gộp thành một dòng đếm | `scripts/audit-checks.mjs` | Cảnh báo, không chặn |
| ~~BL-SDL2-HA-MUC-TAY~~ | **ĐÃ LÀM 2026-10-24** (chủ chọn cảnh báo, không chặn; Ruling R-156, CHƯA gộp: câu cảnh báo cạnh nút «Ghi mức», số do `chenhGiamGiaSauGhiTay`). ~~Kế toán hạ mức tay sau Xác nhận vẫn để lại «giảm giá > hoa hồng hiện hành» (R-ORD-DC1 nay không báo — Ruling R-111); có chặn / cảnh báo ở route ghi mức tay không | route ghi mức tay `orders/index.ts` | Chủ chọn (b) hay giữ |

**B. Nợ mã / bài (không chờ quyết, làm khi chạm tới)**

| Mã | Việc | Nơi | Vì sao để sau |
|---|---|---|---|
| ~~BL-SDL2-DAO-DONG-TM~~ **ĐÓNG 19/10** (chủ chọn «Chặn rồi mới đẩy»; người kiểm toàn nhánh xếp HIGH): `dao_dong` trả 409 `commercial_line_needs_approval` cho ba loại dòng thương mại, tài khoản giữ quyền Đối tác 403 ở cả hai lệnh đảo, kiểm định kỳ `R-BIL-20` (sổ thi công Ruling R-147…R-150) — lịch sử: «Huỷ dòng sổ» (`dao_dong` của Kế toán) đảo được riêng dòng `HOA_HONG` / `GIA_VON` / `GIAM_GIA_BEN_DAT`: dòng đảo không mang `order_service_id`, không qua luật điều chỉnh sau «Đã giao», và `R-BIL-2` chỉ so dòng gốc nên không thấy hoa hồng ròng đã về 0 (Nợ Task 4, chưa ai quyết) | `ghiDieuChinh` nhánh `dao_dong` ở `billing/service.ts` | **Có thể mức HIGH (chờ người kiểm Task 14 xếp):** ADR-0115 để lệnh đảo ghi NGAY, không người thứ hai duyệt, nên MỘT Kế toán huỷ được dòng hoa hồng / giá vốn mà luật hai người canh. Nên chặn đảo riêng dòng thương mại (đi đường điều chỉnh có duyệt); nếu xếp HIGH thì cần mục ở `docs/quyen-hoan.json` (luật dừng dây chuyền) — điều phối / chủ quyết |
| ~~BL-SDL2-NHAN-KHOA-THANG~~ **ĐÓNG 25/10** (chủ chọn chữ «Khoản thu chờ đối chiếu»; nhật ký thay đổi 2.31 — số tạm, đi cùng lần phát hành sau; bài `src/shared/khoa-thang-hien-thi.test.ts`) | Nhãn «Khoản Công ty thu – chuyển khoản chờ xác nhận» ở bảng kiểm khoá tháng nay gồm cả khoản khách trả bên kia đang chờ | `web/khoa-thang.ts` | Chỉ chữ |
| BL-SDL2-NEM-THIEU-MUC | `sinhPhieuDaGiao` chỉ ném «thiếu mức» khi có người hưởng; chưa chốt có ném cả khi không người hưởng (M-2 người kiểm Task 3+4) và M-5 | `billing/rules.ts` | Route chỉ gọi khi tình trạng đủ; lỗi là lỗi mã |
| BL-SDL2-CHUP-BU-TRAN | «Chụp bù» không kiểm trần giảm giá: đơn cũ đổi sang đại lý rồi chụp bù có thể mang giảm giá > hoa hồng (Ruling R-74) | route «Chụp bù» | Production chỉ có dữ liệu demo cho đơn đại lý |
| BL-SDL2-KT-KEM-GIAO | Kế toán ghi `{ partyId }` của bên đặt / nhà cung cấp kèm «Đã giao» trong một lệnh — chạy theo đọc mã, chưa có bài riêng (Ruling R-41) | `billing/service.ts` | Thêm một ca bài |
| BL-SDL2-THU-TU-TIEN | `scripts/audit-thuong-mai.mjs` chép tay THỨ TỰ gọi của `tienChoHoaHong` / `loadOrderView`; đổi một bên mà quên bên kia thì R-BIL-2 / R-ORD-DC1 báo nhầm (dựa vào kỷ luật) | `scripts/audit-thuong-mai.mjs` | K-A-3 không quét `scripts/` |
| BL-SDL2-CHROME | Phần Chrome của Task 12 chưa được kiểm độc lập (máy người kiểm thiếu axe); chữ bị cắt ở khổ 1040 người kiểm nêu chưa rõ có từ trước; `v1-xac-nhan-png.mjs` bước b, j đỏ sẵn (Ruling R-129) | `docs/evidence/2026-10-18-so-dai-ly-dot-2/kich-ban/`, kịch bản cũ | Rà giao diện lượt sau |
| BL-SDL2-SO-VANG | Ca vàng C-1…C-5 của `golden/so-cong-no-luot-2.json` còn `cho_xac_nhan`; SV-HT-02, 03 chạy `todo` — Kế toán đánh dấu xác nhận | `golden/` | AI không tự xác nhận ca vàng |


## 44. Đại lý tổ chức nhiều nhân viên (mã `BL-DAI-LY-TO-CHUC`)

- **Trạng thái:** `để sau` · Góp ý YC-0017 (20/10). Chủ chọn 24/10: «Chưa có đại lý cụ thể, để sau» và «Chỉ giữ bản soạn».
- **Hồ sơ:** bản tách `docs/superpowers/specs/2026-10-24-de-xuat-adr-0140-ban-tach.md` (0140a thành viên + bên đặt về tổ chức; 0140b phạm vi xem theo tổ chức), trang ghép lượt 3 ở `2026-10-24-trang-ghep-luot-duyet-1.md`.
- **Mở lại khi:** có ít nhất hai tài khoản của cùng một đại lý cần thấy chung đơn (ngưỡng ADR-0014 điều 5). Thứ tự khi mở: ADR-0081 dựng xong → soạn bản chính 0140a → 0140b. Số ADR lấy số trống kế tiếp lúc soạn, không giữ «0140».
- **Bản nháp song song (không gộp):** phiên nháp ADR lượt B soạn một bản khác, đã sửa theo người kiểm độc lập (cơ chế nới phạm vi xem), ở nhánh `claude/adr-luot-b-ed348e` lần lưu `23a1ae47`, tệp `docs/superpowers/specs/2026-10-24-gop-y-ho-tro-adr/de-xuat-adr-0141-dai-ly-to-chuc-nhieu-nhan-vien.md`. Nhánh chỉ có trên máy dự án (chưa lên GitHub). Đọc đối chiếu khi soạn bản chính 0140a / 0140b.

## 45. Góp ý màn Hỗ trợ — việc còn lại sau bản 2.29 / 2.30 (mã `BL-GOPY-HT-…`)

Ghi 25/10 khi đóng phiên phân tích góp ý và ba phiên con (Lượt A, nháp ADR lượt B, sổ công nợ). Kế hoạch gốc: `docs/superpowers/specs/2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md`.

| Mã | Việc | Ở đâu | Chờ |
|---|---|---|---|
| BL-GOPY-HT-CON-NO | Lọc «Còn công nợ» ở danh sách đơn (YC-0013) — chưa làm. Không có view `v_bil_*` đủ (chỉ `v_bil_order_paid`, thiếu tổng, hoàn, cọc); cách theo khuôn ADR-0060 là hàm tiêm mới bọc `tienNhieuDon` của `billing` ⇒ hợp đồng mới giữa gốc lắp ráp, `orders`, `billing` | `src/modules/orders/index.ts` (GET `/api/orders`, cạnh lọc `nhapKeToan`) | Chủ quyết có thêm hàm tiêm không (phiên Lượt A dừng đúng chỗ này 24/10) |
| BL-GOPY-HT-GHI-CHU-DON | Ô ghi chú giờ đón riêng (YC-0014 vế ghi chú) — chưa làm; cần cột mới trên chặng đón ⇒ migration | `ord_transfer_leg` | Chủ quyết |
| BL-GOPY-HT-DUA-DON-0118 | Nhánh đưa đón ADR-0118 (`claude/tour-dao-booking-audit-bc6c77`, 23 lần lưu) chưa vào bản chính; xung đột chắc chắn ≥ 14 tệp | nhánh trên | Một phiên riêng sửa xung đột rồi chủ `day-len` (chủ đã quyết hướng này) |
| BL-GOPY-HT-TIEN-DON | Tiền đón là khoản riêng trên đơn (YC-0014 vế tiền) — nháp `docs/superpowers/specs/2026-10-24-de-xuat-adr-tien-don-khoan-rieng.md`; mâu thuẫn chưa giải «ai đặt mức» (nháp: người giữ `partner.commission.write`; lời chủ 14/10: Quản trị) | nháp trên | Nhánh 0118 vào bản chính, rồi hỏi chủ; số ADR lấy số trống kế tiếp |
| BL-GOPY-HT-SO-CONG-NO | Sổ công nợ P2 (ADR-0081, đối tác xem sổ — chủ chọn kiểu 1c) và P3 (ADR-0116) chưa làm; P1 (màn Kế toán) đã lên 2.30 | kế hoạch `docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach.md` (bản đã kiểm độc lập, khôi phục 25/10 vì lần gộp của phiên sổ công nợ giữ nhầm bản ngắn); quyết định chủ 25/10: `docs/superpowers/specs/2026-10-25-prompt-claude-design-hai-man-so.md` | Phiên mới theo kế hoạch |
| BL-GOPY-HT-CHROME | Kịch bản Chrome chưa chạy cho: mục «Hoa hồng hiện hành» + nút mức riêng (`web/parties.ts` — `t2b-danh-ba-smoke`, `dot-a-smoke`, `giay-to-nguoi-smoke`), màn cuốc tài xế (`web/cuoc-chuyen.ts` — `cuoc-smoke`), màn Sổ công nợ (2.30) | `web/CLAUDE.md` bảng cuối | Dựa vào kỷ luật; chạy khi máy có Chrome + axe |
| BL-GOPY-HT-SO-VANG-TA | Ca vàng `SV-TA-07`, `SV-TA-08` (mức TA gắn riêng, ADR-0138) còn `cho_xac_nhan` | `golden/so-cong-no-luot-2.json` | Kế toán xác nhận (AI không tự đánh dấu) |
| BL-GOPY-HT-SDT-HDV | ADR-0139 chỉ hiện số liên hệ chính của hồ sơ trong Danh bạ (không bao giờ SĐT đăng nhập): HDV chưa có số ở Danh bạ thì tài xế không thấy số | Danh bạ | Quản trị bổ sung số |

## 46. Câu đếm ngược bảo trì dễ đọc nhầm thành giờ đồng hồ (mã `BL-BAO-TRI-DEM-NGUOC`)

- **Trạng thái:** `chờ chủ chọn chữ` · Thấy khi nghiệm thu 2.30 (25/10): trang đăng nhập hiện «Thời gian dự kiến hoàn tất là 18 giờ 30 phút 48 giây». Con số là thời gian CÒN LẠI (`maintenanceMessageParts` ở `src/shared/maintenance.ts`, câu có từ 21/9), nhưng đọc lướt dễ hiểu là «xong lúc 18:30».
- **Phương án chữ để chủ chọn:** (a) «Dự kiến xong lúc 09:11 ngày 26/10 (còn 18 giờ 30 phút)» — rõ nhất; (b) «Dự kiến hoàn tất sau 18 giờ 30 phút 48 giây nữa»; (c) giữ nguyên. Chỉ đổi chữ giao diện (kèm bài kiểm của hàm), không đụng luật máy chủ tự tắt đúng giờ.
