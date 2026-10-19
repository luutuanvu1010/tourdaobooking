# Nhật ký thi công — Tạo đơn thiết kế lại (18–19/10/2026)

Nhánh `worktree-tao-don-thiet-ke-lai`, HEAD khi nghiệm thu `f4b00bdc` (cộng kịch bản đo/chụp của Việc 10). Hồ sơ có ngày: viết xong là đóng băng. Số phiên bản nhật ký thay đổi **2.19 TẠM** (main 2.17; hai nhánh khác đã dùng 2.18), đánh số lại ở bước A.0. Không migration; cần `npm run trien-khai`; ADR-0130 (đề xuất) chờ chủ duyệt.

## 1. Kết quả chạy lại (Việc 10, 19/10/2026)

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | 0 lỗi |
| `npm test` | bước 1: 5631 bài, 5630 đạt, 0 đỏ, 1 todo; bước 2 (bài đo giờ) đạt; thoát 0 |
| `npm run test:e2e` | 69/69 kịch bản xanh (3 nhóm, 665 giây), gồm `audit-invariants` trên D1 tạm đã gieo |
| `audit-invariants --db local` | thoát 1 trên D1 local MỚI migrate và trống: duy nhất R-N1-5 "còn quản trị viên đang hoạt động" — vì DB trống chưa có tài khoản nào, không phải dữ liệu hỏng; bản chạy trên D1 đã gieo (cuối e2e) xanh |

Kịch bản Chrome (có `AXE_JS`, chạy tuần tự). "Bản gốc" = điểm tách nhánh `0780d014` (merge-base với main), không phải đầu main hiện tại, để chỉ khác nhau do nhánh này.

| Kịch bản | Nhánh này | Bản gốc | Kết luận |
|---|---|---|---|
| a2-smoke-form, a2-smoke-order | xanh | (không chạy lại) | |
| a2-smoke-sheet | đỏ (`order_leg_updated` !== `trip_updated`) | đỏ | đỏ sẵn |
| v1-nguoi-phu-trach | đỏ j, l | đỏ | đỏ sẵn |
| v1-xac-nhan-png | đỏ b, j | đỏ | đỏ sẵn |
| danh-muc-lap-don-smoke | đỏ bước 4 | đỏ | đỏ sẵn |
| dat-gap-smoke | đỏ bước 4 | đỏ | đỏ sẵn |
| moc-chua-co-smoke | đỏ 1, 2, 4, 5 | đỏ | đỏ sẵn |
| qr-smoke | đỏ axe region `#strips` | đỏ | đỏ sẵn |
| cam-ket-form-smoke | đỏ bước 8 | đỏ cùng bước | đỏ sẵn (chưa có trong danh sách đã biết, nay có đối chứng) |
| so-dai-ly-smoke | đỏ MỘT bước 36 trong 80 | xanh | Do thiết kế: kịch bản (hồ sơ có ngày 8/10) khoá chữ nút cũ "Đặt qua đối tác", nay công tắc ghi "Qua đối tác". Đã ghi ở CHANGE-GUIDE §3 và `DE-XUAT-WEB-CLAUDE.md`; không phải lỗi mới của mã |
| chon-hdv-lap-don-smoke | lần 1 đỏ bước 8 ("khối Người phụ trách hiện tên HDV" hết giờ); chạy lại 6 lần: xanh 6/6 | xanh 4/4 | Chập chờn, chưa tái hiện, chưa tra gốc (Việc 9 cũng gặp ở bước 3). Là mối lo, không chứng minh được là lỗi mới |
| chip-nhom, loc-don, dua-don-smoke | xanh | | |
| cong-tac-va-canh-bao, the-gap, thanh-dinh, dua-don-mot-o, luoi-khach-tien, doi-tac-lap-don | xanh | | |

Không có kịch bản nào đỏ ở nhánh này mà xanh ở bản gốc theo cách tái hiện được. `git status` sau các lần chạy: không tệp bằng chứng có ngày nào bị ghi đè.

## 2. Chiều cao trang Tạo đơn, 390x844, ba dịch vụ (TD101 có đưa đón, TTB03, TTB06; 2 khách mỗi dịch vụ)

Đo bằng `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/do-chieu-cao.mjs` (`scrollHeight`), cùng một kịch bản trên hai bản. Số thô ở `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/do-chieu-cao/`.

| Cách đo | Bản gốc | Nhánh này | Giảm |
|---|---|---|---|
| (A) lập bằng thao tác thật, ba dịch vụ | 4652 px | 3023 px | 1629 px (35,0%) |
| (B) mở lại nháp ba dịch vụ (mọi thẻ gập) | 3997 px | 2467 px | 1530 px (38,3%) |
| Form trống | 2392 px | 2285 px | 107 px |

Đặc tả tiêu chí 2 chỉ nói "giảm so với số đo trước" và để ngưỡng chốt theo số đo thật. Số đo cho thấy giảm trên 35% ở cả hai cách; đề nghị chốt ngưỡng "giảm từ 30% trở lên" (chưa phải ngưỡng chủ duyệt). Cách (A) có một thẻ vừa thêm đang mở.

## 3. Xác minh Thực tập

Tài khoản chỉ có quyền INTERN THẤY công tắc "Đơn của" (Khách lẻ | Qua đối tác): đúng với `coODatQuaDoiTac` trên bản đồ quyền thật (bài thuần trong `npm test`) và kịch bản `cong-tac-va-canh-bao-smoke` bước 5b (xanh, 390 và 1040). Quyền KHÔNG đổi (chủ quyết). Ô đơn giá và giảm giá của Thực tập vẫn khoá (`doi-tac-lap-don-smoke` xanh).

## 4. Lựa chọn đã áp (DAC-TA mục 10, lệnh /goal 18/10)

Câu 1 thành phương án (a): soạn đề xuất ADR-0130 ở `DE-XUAT-ADR-0130.md` (chưa duyệt, không đặt vào `docs/adr/`). Câu 2 thành phương án (a): không đổi hợp đồng API, lớp chặn nhầm gọi `GET /api/pricing/nguoi-huong`. Cả hai đảo ngược được.

## 5. Các dòng `Ruling:` (nguyên văn từ sổ điều phối `progress.md`)

- Ruling: Việc xác minh Thực tập ở T3 làm bằng test thuần (cho vai INTERN gọi `coODatQuaDoiTac` với bản đồ quyền thật) thay vì kịch bản Chrome — vì rẻ, chạy được trong `npm test` — nếu sai thì chỉ mất một ca test.
- Ruling: Kịch bản Chrome cần Chrome + dev server local. Người thi công VIẾT kịch bản, thử chạy; nếu môi trường không chạy được thì ghi rõ "CHƯA CHẠY" trong báo cáo, không bịa kết quả; T10 tổng hợp và báo chủ. Nếu sai: đợt nghiệm thu thật phải chạy bù.
- Ruling: Mô hình: sonnet cho T1–T9 (bản kế hoạch cho chữ ký, không cho thân hàm → không dùng bậc rẻ nhất); T8 và bản kiểm cuối dùng mô hình mạnh nhất.
- Ruling: Không `git push`, không mở PR từ phiên này (CLAUDE.md §8 cấm); PR để chủ ra lệnh.
- Task 2: Ruling: loc-don-smoke.mjs (docs/evidence/2026-09-30-gop-y/kich-ban/, bước 6 đợi #catalog-nhom-nut) đang đỏ do bỏ nút xổ — chủ sở hữu là T9: xoá bước 6 và để chú thích trỏ tới chip-nhom-smoke bước 7/9 — nếu sai: mất một ca kiểm sao, chip-nhom-smoke đã phủ.
- Task 2: Ruling: hướng dẫn Bán hàng còn 1 từ dư trong giới hạn bài A4 (3149/3150 từ). T3, T9 khi thêm chữ phải cắt chữ khác, không nới bài A4 — nếu sai: A4 đỏ ngay.
- Task 2: Ruling: sửa web/CLAUDE.md (dòng 76 bảng kịch bản còn nói chip/.loc-*) là luật; AI chỉ ĐỀ XUẤT, đưa vào báo cáo cuối cho chủ duyệt (N9), không tự sửa.
- Task 7: review 1 = Needs fixes (Important I-1: chữ nơi đón/trả gõ tay bị bỏ/đổi âm thầm khi rời ô mà chưa chạm dòng "Gõ tự do" — bản cũ giữ từng phím; mất nơi đón thật trên đơn). Ruling: chọn phương án A (cam kết chữ gõ dở thành nơi tự do khi rời ô / Tab / Enter không chọn dòng; Esc = huỷ; nhãn nổi tính là trong ô) — khuyến nghị của reviewer, đảo ngược được, khôi phục đúng hành vi cũ — nếu sai: chữ gõ dở bị lưu thành địa chỉ tự do hiển thị rõ ngay trong ô. Fix round 1/5 dispatched (cùng M-1 bàn phím iOS bật khi focus bằng mã, M-2 pointerType).
- Task 7: Ruling: dòng đồng tác giả: giữ đúng dòng "Claude Sonnet 5.5" theo nhắc nhở thuộc tính; các commit cũ ghi "Opus 5.5" không viết lại lịch sử — nếu sai: chỉ là nhãn, không ảnh hưởng mã.
- Ruling: để nguyên 2 wrangler dev cổng 62212/64831 (cwd = worktree này, của trợ lý thi công) vì hệ thống chặn lệnh kill — chi phí nếu sai: máy chậm thêm, chủ tắt tay.
- Ruling: nut "Duyet dat gap" cua form la nut phu (nutDuyetPhu) — DAC-TA dong 56 "thang nut ba cap cho ca man" thang dong 53 — chi phi neu sai: bo nutDuyetPhu:true o order-form.ts. Chu co the quyet lai.
- Ruling: Task 10 bao gom kiem doc lap 2e906ca8 + review toan nhanh.

## 6. Nợ còn lại (từ báo cáo Việc 9)

- Chưa làm: T8(b) tự mở lại bảng chi tiết khi đang có khung lỗi (chưa đo 405px); nhãn "đặt gấp đã duyệt" trên dòng gập (cần chủ chọn chữ).
- Chưa làm ở T7: `blur()` sau chọn cảm ứng (đánh đổi với bàn phím ảo iOS), tên truy cập dòng "Gõ tự do", Home/End; "khớp đúng tên vẫn hiện dòng tự do" (đặc tả chốt dòng tự do luôn ở cuối — đổi là chủ quyết); hai Minor vòng 2 (câu nhắc / ô số hiệu chuyến bay lúc chờ dựng lại; `nhoChamKichHoat` coi mọi phím là bàn phím).
- M-6: bản chuẩn thân gửi phụ thuộc ngày (so lại bằng cách bỏ ngày: 12/12 giống từng byte).
- Đường `kiemLai` của bảng "Đổi khách" không có kịch bản riêng (dựa vào kỷ luật).
- `so-dai-ly-smoke` bước 36 và `chup-anh.mjs` 14/10 là hồ sơ có ngày, lệch chữ/cấu trúc mới, không sửa.
- Bảng kịch bản của `web/CLAUDE.md` (dòng chip/`.loc-*`) cần cập nhật: chỉ ĐỀ XUẤT ở `DE-XUAT-WEB-CLAUDE.md`, chờ chủ duyệt (N9).
- Việc lớn `2e906ca8` (hiển thị / khoá giá của Đối tác, Thực tập) và toàn nhánh CẦN người kiểm độc lập (chưa có); Việc 10 này chỉ là chạy lại kiểm, không phải kiểm độc lập.

## 7. Điều CHƯA kiểm

Bộ chọn ngày/giờ gốc của iOS/Android; bàn phím ảo iPhone/Android; bộ gõ tiếng Việt thật (Telex/VNI, `isComposing`); iPhone thật; chủ chưa xem ảnh. Bộ ảnh ở `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/anh/`: 4 vai x 2 khổ x 3 ảnh (vừa mở; ba dịch vụ trong khung; ba dịch vụ cả trang) cùng `so-do-trang.json`, dựng bằng dữ liệu thử, không dữ liệu khách thật; ảnh còn hiện danh sách tìm đang mở vì chụp ngay sau thao tác chọn. Ảnh nghiệm thu không chạy axe riêng (axe chỉ trong các kịch bản có sẵn).

## 8. Quan sát cần ghi

- Lỗi cũ (có từ trước Việc 9, không do nhánh này): 1040x768, đầu trang, khi khung lỗi của lần Lưu trước còn hiện, nút Lưu nằm 753–799 px — nửa dưới ra ngoài khung cho tới khi cuộn nhẹ; trái câu SYSTEM-DESIGN §9 "luôn thấy". Đề nghị tách thành việc riêng.
- wrangler dev mồ côi: phiên Việc 10 chỉ chạy tiến trình do kịch bản tự dựng và tự tắt; khi kết thúc không còn tiến trình nào của worktree này (các wrangler/workerd còn thấy thuộc worktree `optimistic-wu-2c3796` của phiên khác, không đụng). Ruling cũ về cổng 62212/64831 nay không còn tiến trình tương ứng.
- Sổ hàng rào: Việc 10 không có hàng rào mới quan sát chặn thật, nên không sửa `docs/SO-HANG-RAO.md`.
