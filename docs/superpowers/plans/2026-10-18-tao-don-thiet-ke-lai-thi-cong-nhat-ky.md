# Nhật ký thi công — Tạo đơn thiết kế lại (18–19/10/2026)

Nhánh `worktree-tao-don-thiet-ke-lai`, HEAD khi nghiệm thu `f4b00bdc` (cộng kịch bản đo/chụp của Việc 10). Hồ sơ có ngày: viết xong là đóng băng. Số phiên bản nhật ký thay đổi **2.19 TẠM** (main 2.17; hai nhánh khác đã dùng 2.18), đánh số lại ở bước A.0. Không migration; cần `npm run trien-khai`; ADR-0130 (đề xuất) chờ chủ duyệt. **Sau gộp main 19/10 (mục 9):** số tạm nay là **2.20** (main đã có 2.19 tạm); số 0130 trên main đã là ADR bảng từ giao diện nên bản đề xuất `DE-XUAT-ADR-0130.md` cần số mới khi duyệt.

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

- Chưa làm: T8(b) tự mở lại bảng chi tiết khi đang có khung lỗi (chưa đo 405px). (Nhãn "đặt gấp đã duyệt" trên dòng gập: ĐÃ LÀM ở Việc 14, mục 10.)
- Chưa làm ở T7: `blur()` sau chọn cảm ứng (đánh đổi với bàn phím ảo iOS), tên truy cập dòng "Gõ tự do", Home/End; "khớp đúng tên vẫn hiện dòng tự do" (đặc tả chốt dòng tự do luôn ở cuối — đổi là chủ quyết); hai Minor vòng 2 (câu nhắc / ô số hiệu chuyến bay lúc chờ dựng lại; `nhoChamKichHoat` coi mọi phím là bàn phím).
- M-6: bản chuẩn thân gửi phụ thuộc ngày (so lại bằng cách bỏ ngày: 12/12 giống từng byte).
- Đường `kiemLai` của bảng "Đổi khách" không có kịch bản riêng (dựa vào kỷ luật).
- `so-dai-ly-smoke` bước 36 và `chup-anh.mjs` 14/10 là hồ sơ có ngày, lệch chữ/cấu trúc mới, không sửa.
- Bảng kịch bản của `web/CLAUDE.md` (dòng chip/`.loc-*`) cần cập nhật: chỉ ĐỀ XUẤT ở `DE-XUAT-WEB-CLAUDE.md`, chờ chủ duyệt (N9).
- Việc lớn `2e906ca8` (hiển thị / khoá giá của Đối tác, Thực tập) và toàn nhánh CẦN người kiểm độc lập (chưa có); Việc 10 này chỉ là chạy lại kiểm, không phải kiểm độc lập.

## 7. Điều CHƯA kiểm

Bộ chọn ngày/giờ gốc của iOS/Android; bàn phím ảo iPhone/Android; bộ gõ tiếng Việt thật (Telex/VNI, `isComposing`); iPhone thật; chủ chưa xem ảnh. Bộ ảnh ở `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/anh/`: 4 vai x 2 khổ x 3 ảnh (vừa mở; ba dịch vụ trong khung; ba dịch vụ cả trang) cùng `so-do-trang.json`, dựng bằng dữ liệu thử, không dữ liệu khách thật; **chụp lại 19/10 trên HEAD `26c0773f`** (sau gộp main và các vòng sửa; kịch bản thêm bước xoá chữ tìm + chờ 0,5 giây trước khi chụp, nên không còn chữ tìm dở; khung danh mục 3 dịch vụ vẫn hiện vì đó là khung cố định của thiết kế, không phải danh sách đang mở). Ảnh bản trước (chụp ở `f56f9ef9`) đã cũ. Ảnh nghiệm thu không chạy axe riêng (axe chỉ trong các kịch bản có sẵn).

## 8. Quan sát cần ghi

- ~~Lỗi cũ (có từ trước Việc 9, không do nhánh này)~~ **Sửa 19/10 (câu trên sai sự thật):** đây là HỒI QUY MỘT PHẦN của nhánh này. Đo cùng một cách ở 1040x768, đầu trang, không cuộn: bản gốc `0780d014` nút Lưu ở 619 px khi form trống, có khung lỗi một dòng 717–763 px (trọn khung); `f56f9ef9` 659 px và 753–799 px (nửa dưới ra ngoài khung, trái câu SYSTEM-DESIGN §9 "luôn thấy"). Nguyên nhân: Việc 8 thêm dòng "Giảm giá" vào khối Tóm tắt (+40 px). Đã sửa ở Việc 11 (mục 9): nay 611 px và 705–751 px.
- wrangler dev mồ côi: phiên Việc 10 chỉ chạy tiến trình do kịch bản tự dựng và tự tắt; khi kết thúc không còn tiến trình nào của worktree này (các wrangler/workerd còn thấy thuộc worktree `optimistic-wu-2c3796` của phiên khác, không đụng). Ruling cũ về cổng 62212/64831 nay không còn tiến trình tương ứng.
- Sổ hàng rào: Việc 10 không có hàng rào mới quan sát chặn thật, nên không sửa `docs/SO-HANG-RAO.md`.

## 9. Việc 11 — vòng sửa cuối (19/10/2026)

Người thi công vòng sửa cuối; KHÔNG phải kiểm độc lập. Năm lần lưu: `016f4243` (gộp main), `e41144d3` (B), `98a6b17b` (C), `58c5e41a` (D + E), lần lưu nhật ký này.

- **A. Gộp main `38e4921c`** bằng `git merge` (không rebase, không viết lại lịch sử, không đẩy lên). Xung đột gỡ theo nguyên tắc: bố cục / hành vi của nhánh giữ, CHỮ theo main ("Lượt N" thay "Chặng N" ở đầu lượt đưa đón, "Người thu tiền" thay "Người nhận tiền", "Ghi khoản thu" thay "Ghi lần thu", bỏ chữ "app"). Chi tiết từng tệp ở thân lần lưu `016f4243`. Nhật ký thay đổi của nhánh: số TẠM **2.20**, ngày 19/10 (main đã có 2.19 tạm; kiểm main, mọi nhánh và mọi worktree ngày 19/10: chưa nơi nào dùng 2.20). Hướng dẫn Bán hàng cắt sáu chữ để A4 còn xanh (3149/3150). Bài C4 trợ lý đo lại 17 / 10 / 45 (lý do ghi trong bài). Sơ đồ trang sinh lại.
- **Trùng số ADR-0130**: main đã có ADR-0130 ĐÃ DUYỆT (bảng từ giao diện), 0131 và 0132 cũng đã dùng; bản đề xuất `DE-XUAT-ADR-0130.md` của nhánh này giữ tên tệp (hồ sơ đề xuất, không đổi tên) nhưng các chỗ nhắc đã ghi rõ "số tạm, trùng"; số trống gần nhất lúc kiểm 19/10 là 0133 — chủ đặt số khi duyệt. Không đụng `docs/adr/`.
- **B.** `src/shared/booker.ts`: câu gợi ý khi chọn hồ sơ tổ chức nay gọi đúng công tắc "Đơn của: … Qua đối tác" (câu cũ "Đặt qua đối tác" không còn trên giao diện). Đỏ trước: `booker.test.ts` sửa kỳ vọng → đỏ trên mã cũ → sửa mã → xanh.
- **C.** `docs/SYSTEM-DESIGN.md` §16: thêm dòng LỆCH CÓ CHỦ Ý với ADR-0058 Đ8 (không còn "Đang lọc … Bỏ lọc"; tìm xuyên mọi nhóm), trỏ `DE-XUAT-ADR-0130.md`. ADR không sửa.
- **D. Danh sách gợi ý Nơi đón / Nơi trả ở khổ ≤ 640px**: thêm `tranhThanhDay` ở `web/o-noi-goi-y.ts` (khi thanh Lưu đang dính và che danh sách thì cuộn trang lên vừa đủ, không đẩy ô gõ lên quá đỉnh vùng an toàn). Đo sau sửa: 375×667 danh sách 272–536, thanh từ 544; 390×844 danh sách 449–713, thanh từ 721; thanh cao (khung lỗi dài) ô 140–194, danh sách 202–466, thanh từ 382.
- **E. Nút Lưu ở 1040×768**: thu nhịp dòng khối Tóm tắt ở cột phải (`public/app.css`, hai dòng token). Số đo đầu trang, không cuộn — bản gốc `0780d014`: 619 px / lỗi một dòng 717–763; trước sửa `f56f9ef9`/`98a6b17b`: 659 / 753–799 (tràn đáy 768); sau sửa: **611 / 705–751**. Dòng ~85 mục 8 đã sửa câu sai ("lỗi cũ, không do nhánh này").
- **Hàng rào mới** `kich-ban/khong-cuon-truoc-smoke.mjs` (ngoài `npm test`): quan sát chặn thật 19/10 (5 bước đỏ trên mã cũ; phá cố ý 6 bước đỏ; sau sửa 8/8) — dòng mới ở `docs/SO-HANG-RAO.md`. `docs/CHANGE-GUIDE.md` và `DE-XUAT-WEB-CLAUDE.md` thêm tên kịch bản.
- **Chạy lại Chrome trên `58c5e41a`** (đã build, D1 tạm, có AXE_JS ở `thanh-dinh-smoke`): a2-smoke-form, a2-smoke-order, thanh-dinh-smoke, dua-don-mot-o, cong-tac-va-canh-bao, the-gap, dua-don-smoke (16 bước), help-smoke, khong-cuon-truoc — đều OK. `than-gui.mjs` hai cách (có trả trước 8 thân, mặc định 6 thân): sau khi bỏ ngày, thân gửi lên GIỐNG HỆT bản trước gộp (chỉ khác ngày 21/10 ↔ 22/10). "Tổng máy chủ = tổng trên thanh" đạt ở 390 và 1040 (tạm tính 4.300.000, giảm 100.000, tổng 4.200.000). Không bài nào đỏ nên không cần so trên main sạch. Ảnh / JSON có ngày bị kịch bản ghi đè đã `git checkout --` về bản cũ.
- **Trước lần lưu cuối** (một lần, 19/10): `npm run typecheck` 0 lỗi; `npm test` bước 1 5665 bài (5664 đạt, 0 đỏ, 1 todo), bước 2 bài đo giờ 1/1 — thoát 0 (`tu-khai-route.test.ts` không đỏ lần này).
- **Không làm (theo giao việc)**: `so-dai-ly-smoke` bước 36 và `chup-anh.mjs` ca 1–2 vẫn lệch như mục 6; không sửa tệp luật.
- **CHƯA kiểm**: bàn phím ảo / iPhone thật (khi bàn phím bật, thanh dính có thể nằm sau bàn phím); khổ 641–959px không có bước riêng; e2e không chạy lại ở vòng này (không đổi API / migration / thân gửi); toàn nhánh vẫn CẦN người kiểm độc lập.

## 10. Việc 14 — chip «Đã duyệt đặt gấp» trên dòng gập (19/10/2026)

Người thi công; KHÔNG phải kiểm độc lập. Chủ chốt chữ «Đã duyệt đặt gấp». Luật thuần `chipDatGap` + hằng `CHIP_DA_DUYET_DAT_GAP` ở `src/shared/dong-gap-the.ts`: còn chặng dưới mốc chưa duyệt thì chỉ «Cần đặt gấp», mọi chặng dưới mốc đã duyệt thì chỉ «Đã duyệt đặt gấp», hai chip không cùng hiện. `web/order-form.ts` (`capNhatMoc`) đếm chặng đã duyệt và chờ duyệt rồi gọi `chipDatGap`. Không đổi API, thân gửi, quyền, tiền, hướng dẫn (hướng dẫn không có đoạn nói về dòng gập; số từ không đổi).
- Đỏ trước: bài thuần mới (chip hiện đúng, loại trừ nhau) đỏ vì thiếu hằng; kịch bản `the-gap-smoke.mjs` bước 15 (Quản trị, mốc 48 giờ) đỏ trên mã cũ ở khẳng định «chip đã duyệt» (đang có: []), xanh sau sửa (390 + 1040, 15/15 bước mỗi khổ). Phá cố ý (cho phép hai chip cùng hiện): bài thuần đỏ, hoàn nguyên xanh 15/15.
- Chạy: typecheck 0 lỗi; `dong-gap-the` 15/15; `huong-dan`, `khoi-gap-noi-day`, `migrations-tro-ly-van-nghia` và 4 bài nối dây giao diện xanh; Chrome: the-gap-smoke, thanh-dinh-smoke (có axe), a2-smoke-form (có axe) OK.
- CHƯA chạy: `npm test` đầy đủ (máy tải ~210); `than-gui.mjs` (không chạm thân gửi); e2e; người kiểm độc lập.
