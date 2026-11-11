# Nhật ký thi công Đợt 6B — ô cọc của khách cho đơn Trả sau (ADR-0197) — 2026-11-11

Kế hoạch mẹ: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần IX, Task 6B.1–6B.3. ADR: `docs/adr/ADR-0197-o-coc-cua-khach-cho-don-tra-sau.md` (accepted 11/11: tên ô phương án (1) «Khách đặt cọc cho đối tác», luật huỷ phương án (c1)). Xây trên TNV-G1 theo khoá `xay_tren_cho_phep_adr_0197`: phát hành ngay khi xong. Không migration. Số bản tạm 2.92 (production 2.91 lúc làm).

Nhánh `claude/dot-6b-o-coc-tra-sau-fd9210`, worktree `.claude/worktrees/admin-delete-data-decision-31f0fc`, cắt từ nhánh mang lời duyệt (`2a7ca7117`, CHƯA có trên `main` lúc làm); đã gộp `origin/main` (3 lần lưu ghi trạng thái 2.88).

## Tiêu chí nghiệm thu (viết trước khi làm)

1. Đối tác lập đơn Trả sau có cọc: lưu được, xác nhận được ở cả hai đường của Đối tác (Gửi đơn nhánh B, Còn vé); khoản cọc sinh như ADR-0159 (tiền mặt, người thu là người lập, ghi chú dấu cũ); nợ của đơn = tổng; hạn mức kiểm trên tổng (thiếu 1 đồng ⇒ 409 `vuot_han_muc` dù có cọc).
2. Huỷ (c1): Đối tác tự huỷ đơn Trả sau đã xác nhận còn cọc ⇒ 409 `tra_sau_con_coc_o_doi_tac`, câu đúng ADR; Kế toán ⇒ 403; Quản trị ⇒ 200, cọc hiện ở màn cọc đơn huỷ, «Nộp về công ty» chạy; Hướng dẫn viên phụ trách ⇒ 200; nộp một phần ⇒ vẫn 409, nộp đủ ⇒ Đối tác tự huỷ được; cọc chuyển từ đơn huỷ (`transfer_of_id`, không mang dấu) ⇒ vẫn 409; vé hãng ngoài đã mở còn nợ ⇒ văn phòng 409 như cũ, Đối tác gặp lớp ADR-0170; đơn Thanh toán ngay có cọc ⇒ Đối tác tự huỷ như cũ.
3. Chữ: tên mới ở ô nhập, hai dòng tóm tắt, dòng chờ xác nhận, hướng dẫn Đối tác, bảng tham chiếu, DTO ghi chú khoản thu, nhật ký mới; `GHI_CHU_KHOAN_LOI_KHAI` không đổi (bài khoá); tên mới dành riêng ở khoản thu tay.
4. Form: ô hiện khi chọn Trả sau, không ép 0, có câu «Tiền cọc ở tay bạn, không làm giảm số nợ với Công ty.» khi chọn Trả sau.

## Đỏ trước

`node --test --test-name-pattern="ADR-0197" src/tra-sau-duong-ghi.test.ts src/tra-sau-xac-nhan.test.ts` trên mã cũ: 9 bài đỏ, 1 xanh (đơn Thanh toán ngay — đúng, luật không đổi). Lý do đỏ: 409 `tra_sau_khong_nhan_coc` ở lúc lưu; riêng bài cọc chuyển từ đơn huỷ (đơn không khai cọc) đỏ vì Đối tác tự huỷ được (200) — đúng lỗ mà Đ4 đóng. Hai bài chữ ở `dat-coc-route.test.ts` đỏ vì tên cũ; bài khoá chuỗi dấu xanh từ đầu (khoá điều không đổi).

## Thiết kế đã làm

- `billing/tra-sau.ts`: `noVaCocTheoDon` tính nợ và «cọc còn ở tay người thu» trong CÙNG lượt (`khai` = `phanKhaiCuaDon`, `cocConGiu` = `soKhaiChuaNop(khai, ls, congTyId)` — đúng hàm cổng khai lại của `dat-coc.ts` dùng); `noTheoDon` giữ chữ ký cũ, dẫn từ hàm mới; `traSauCuaDon` trả thêm `cocConGiu`. Không thêm hàm tiêm mới: kiểu `traSauCuaDon` ở `router.ts` (hai chỗ) và `HamNoTraSau` thêm khoá tuỳ chọn.
- `orders/tra-sau-cong.ts`: bỏ 409 chặn cọc (`kiemDon`, `DonTraSau` bỏ `declaredDeposit`); `congHuyTraSau` nhận `laDoiTac` BẮT BUỘC (typecheck ép ba nơi gọi: `/status`, `handler-cancel` qua `cancelOrderByHandler`, huỷ yêu cầu ở `xac-nhan-route.ts`; cả ba truyền `holdsPartner(staff)` — cùng vị từ lớp ADR-0170). Thứ tự: vé hãng ngoài đã mở còn nợ (409 cũ) → Đối tác còn cọc (409 mới; không đọc được số ⇒ 503) → phần cũ.
- Chữ: `NHAN_DAT_COC`, `NHAN_DAT_COC_CHO`, câu lỗi của `dat-coc-truoc.ts`, nhật ký `dat-coc.ts`, mô tả nhật ký sửa đơn, câu 503/409 ở `xac-nhan-chung.ts`, `coc.ts`; DTO `ghiChu` của `lanThuDto` đổi chuỗi dấu sang tên mới lúc hiển thị; `docLanThu` chặn cả tên mới; `thay-lan-thu.ts` coi gõ tên mới như gõ đúng chữ dấu.
- Giao diện: `web/order-form.ts` bỏ ẩn ô và bỏ ép 0; `#dat-coc-tra-sau` (mới, `public/order-form.html`) hiện câu nhắc khi chọn Trả sau. KHÔNG sửa `web/order.ts` (dòng chờ xác nhận đọc hằng chung).
- Bảng tham chiếu: «Trả sau» `khacVoi` theo nguyên văn bảng của ADR; khái niệm mới «Khách đặt cọc cho đối tác» (kèm câu dưới ô và câu 409). `chuDaLoai` để trống: tên cũ vẫn là chuỗi dấu trong CSDL, thêm dòng cấm sẽ bắt nhầm.

## Tự quyết (bề mặt, đảo ngược được)

- Mã lỗi `tra_sau_con_coc_o_doi_tac` (ADR không đặt mã).
- Câu nhắc dưới ô chỉ hiện khi chọn Trả sau (với Thanh toán ngay, «nợ với Công ty» không có nghĩa).
- Câu lỗi phụ của ô (vượt tổng, sai dạng, không phải Đối tác, 503/409 khi ghi khoản) cũng đổi sang tên mới cho một tên một nghĩa.
- Hướng dẫn Đối tác thêm một câu về Trả sau và luật huỷ.

## Hai mục «Chưa kiểm» của ADR (và mục thứ ba)

- **Sửa số khách làm tổng dưới số cọc** (`congSuaTangTraSau` chỉ gác khi tăng; trigger 0136 chỉ áp đơn nháp): đường sửa số khách của văn phòng cho giảm (như đơn Thanh toán ngay); nợ = tổng mới (không âm, `noMotDon` kẹp); Đối tác vẫn không tự huỷ. Bài `tra-sau-duong-ghi.test.ts` «sửa số khách làm tổng xuống DƯỚI số cọc». Khách trả thừa cho Đối tác là chuyện có sẵn như đơn Thanh toán ngay, không đổi.
- **Hoa hồng:** hai đơn giống nhau (có cọc / không cọc), thu đủ, «Khách đã trả đủ» ⇒ cùng số hoa hồng. Bài ghim thêm hành vi CÓ SẴN (đã thử với «Tôi thu» trên mã cũ, cùng kết quả): «Khách đã trả đủ» xét tiền khách đã trả (`conLai`), nên qua dù cọc còn ở tay Đối tác; hoa hồng cấn trừ vào số Đối tác giữ, nợ Trả sau còn = cọc − hoa hồng tới khi nộp. **Báo chủ:** ADR-0173 nói «còn nợ thì chưa có hoa hồng»; với tiền ở tay Đối tác (cọc hay «Tôi thu») thì hoa hồng vẫn vào sổ khi khách đã trả đủ. Không đổi ở đợt này (ADR-0197 Đ5 «không đổi»).
- **Huỷ để lập lại, cọc chuyển sang đơn Trả sau mới** (Phải nói thẳng): bài cọc chuyển — nợ của đơn mới = tổng, Đối tác 409, Quản trị huỷ được.

## Kiểm

- Bài liên quan (`dat-coc-route`, `tra-sau-duong-ghi`, `tra-sau-xac-nhan`, `cancel-lock`, `doi-tac-mo-ve`, `dat-coc-truoc`): 156/156 xanh trước khi gộp main.
- e2e `npm run test:e2e -- dat-coc` (thêm ca Trả sau: lưu, Gửi đơn, khoản cọc, Đối tác huỷ 409, Toàn quyền huỷ 200): 4/4 xanh.
- Kịch bản Chrome `docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs` (sửa chữ, thêm bước 2b Trả sau, khổ 1280 thay 1040; vá tài khoản thử thiếu vai trò đối tác — hỏng sẵn từ ADR-0185), có `AXE_JS`: 14/14 bước. Ảnh ở `docs/evidence/2026-11-11-dot-6b/anh/`.
- Toàn bộ `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Trả sau: ghi ở mục «Kết quả cuối» dưới.
- Người kiểm độc lập: ghi ở mục «Kiểm độc lập» dưới.

## Nợ, việc để sau

- Biên nhận vẫn «Khách đã trả trước» (ADR-0183).
- Kẽ «Tôi thu» trên đơn Trả sau rồi Đối tác tự huỷ (ADR-0197 «Phải nói thẳng») — không đóng ở đây.
- Sau khi văn phòng huỷ, số cọc Đối tác còn nợ không hiện ở màn «Hạn mức trả sau» (chỉ ở sổ giữ hộ, màn cọc đơn huỷ).

## Kiểm độc lập (2026-11-11)

Người kiểm `nguoi-kiem-doc-lap`, chỉ đọc: **ĐẠT**, không phát hiện CAO. Tự chạy typecheck (0 lỗi) và 9 tệp bài (230/230 xanh); phá thử trên bản sao tạm (tắt điều kiện `cocConGiu > 0` của `congHuyTraSau`) ⇒ 4 bài ADR-0197 đỏ đúng chỗ, nên bài kiểm đúng điều nó nói. Không chạy `npm test` đầy đủ, e2e, Chrome (người làm chạy).
Ghi nhận (không chặn):
- VỪA: `web/CLAUDE.md` (tệp luật) dòng bảng kịch bản Chrome còn tên ô cũ «Khách đặt cọc trước». AI không tự sửa tệp luật (N9) — đề xuất chủ cho sửa chữ.
- VỪA: «Khách đã trả đủ» khi cọc còn ở tay Đối tác là hành vi có sẵn (như «Tôi thu»), nhưng mở ô cọc cho Trả sau làm ca này gặp nhiều hơn — đã có bài ghim, báo chủ.
- THẤP: tài khoản lai giữ quyền Đối tác (kể cả lai với Quản trị nếu có) bị chặn như Đối tác vì dùng đúng vị từ `holdsPartner` của lớp ADR-0170; chưa có bài ghim riêng ca lai.
- THẤP: chú thích tên cũ ở `public/app.css` — đã sửa.

## Kết quả cuối (sau khi gộp `origin/main`, lần lưu `e02fa8c6e`)

- `npm run typecheck`: 0 lỗi. `npm test`: thoát 0 (8.840 bài qua, 0 đỏ; bài đo giờ chạy riêng xanh). Lần chạy đầu đỏ đúng một bài — A4 «hướng dẫn đọc xong trong 30 phút»: câu thêm vào hướng dẫn Đối tác làm nhóm vượt trần; đã viết gọn mục 6, nhóm Đối tác nay đúng 3.150/3.150 chữ (lần thêm chữ tới sẽ đỏ — phải bớt chỗ khác).
- `npm run test:e2e`: 90/90 kịch bản xanh, kể cả `audit-invariants`.
- Kịch bản Chrome đặt cọc: 14/14 (có `AXE_JS`), ảnh `docs/evidence/2026-11-11-dot-6b/anh/`.
- Kịch bản Chrome Trả sau (`docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs`): đã hỏng sẵn ở bước gieo (tạo tài khoản Đối tác bằng `permissions` — ADR-0185 bắt tạo bằng vai trò); sửa thành `roles: ["TRAVEL_AGENCY"]`. Chạy lại: mọi bước xanh trừ **P1-390** — ba ô tích `.o-tick` 13×13 ở trang Tôi (khối nút thanh dưới tự chọn, ADR-0187, đã có trên `main`, `web/thanh-duoi-cai-dat.ts`) nhỏ hơn vùng chạm 44px. Không thuộc Đợt 6B (nhánh không sửa trang Tôi); ghi làm việc sau. Ảnh `docs/evidence/2026-11-11-dot-6b/tra-sau/`.
- Sửa sau góp ý: `traSauCuaDon` trước đây trả `cocConGiu: 0` khi không tính được tiền của đơn, nên nhánh 503 của cổng không bao giờ chạy (khai «không đoán» là quá). Nay vắng khoá `cocConGiu` trong ca đó ⇒ Đối tác huỷ bị 503; văn phòng không đọc số này. Chạy lại typecheck + 5 tệp bài liên quan: xanh (178/178).

## Quyết định của chủ dự án 2026-11-12: «Chặn tới khi nộp»

Câu hỏi (hộp kết thúc lượt 11/11): hoa hồng vào sổ khi cọc còn ở tay Đối tác — giữ như cũ hay chặn? Chủ trả lời nguyên văn: «Chặn tới khi nộp». Nguyên tắc có sẵn: ADR-0173 Đ3.1 («đơn công nợ còn nợ thì hoa hồng chưa được trả hay đối trừ») — trước đây hoa hồng cấn trừ ngay lúc «Khách đã trả đủ» nên lệch điều này.

- Phạm vi (tự áp, hẹp nhất khớp câu chủ): CHỈ đơn Trả sau, CHỈ khi `cocConGiu > 0` (tiền khách đặt cọc cho đối tác chưa nộp, tính bằng đúng `noVaCocTheoDon` của cổng huỷ). Đơn Thanh toán ngay và tiền «Tôi thu» của đơn Trả sau KHÔNG đổi (chủ chưa hỏi; mở rộng sang «Tôi thu» là câu riêng).
- Mã: `lyDoChuaGiaoDuoc` thêm `cocConGiu` → mã giữ `deposit_held`, người xử lý «Kế toán», câu `CAU_COC_CHUA_NOP` nêu số; đứng sau «còn nợ», trước «trả dư». Route Đã giao tính `traSauCuaDon` và truyền vào `daGiao` (`tra-sau.ts` đã import `service.ts`, gọi ngược sẽ thành vòng); không tính được số cọc ⇒ 503 `tra_sau_khong_doc_duoc`. Màn đơn (`GET …/payments`) nhận cùng số ⇒ báo trước, nút ẩn.
- Đỏ trước: `tra-sau-giao.test.ts` (thiếu `CAU_COC_CHUA_NOP`), bài hoa hồng ở `tra-sau-duong-ghi.test.ts` (mong `deposit_held`, nhận khác) — viết lại bài cũ vốn ghim hành vi «qua dù còn cọc». Bài canh nơi gọi `tra-sau-ve.test.ts` đòi cả hai nơi truyền `cocConGiu`.
- Giới hạn: chỉ kiểm TRƯỚC lô, không có lớp trigger — khoản nộp cọc bị đảo đúng lúc giữa lần đọc và lô Đã giao thì lọt (hiếm; cùng mức với cổng huỷ). Nhánh 503 chưa có bài (khó dựng lỗi tính tiền trong khung thử).
- Kiểm độc lập (12/11, lần lưu `4ad975805`): ĐẠT; phá `deposit_held` → 2 bài đỏ. VỪA: nhánh 503 không có bài → đã sửa: tách `khongTinhDuocCoc` (rules.ts, thuần, có bài) và bài đọc mã buộc `daGiao` trả 503 trước lần đọc CSDL đầu tiên; phá (`if (false)`) → đỏ, hoàn nguyên → xanh. THẤP còn để: `docs/BANG-THAM-CHIEU.md` dòng «Khách đặt cọc cho đối tác» chưa nhắc câu chặn mới; màn xem tiền gọi thêm `traSauCuaDon` (chi phí nhỏ, chưa đo).
