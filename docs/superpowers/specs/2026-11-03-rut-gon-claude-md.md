# Đề xuất rút gọn CLAUDE.md và hàng rào cỡ tệp (2026-11-03)

> **Trạng thái:** ĐỀ XUẤT, chờ chủ dự án duyệt (Hiến pháp N9: AI không tự đổi `CLAUDE.md` và `.claude/`). Hồ sơ có ngày: viết xong là đóng băng. Nguồn: lời chủ 2026-11-03 («ok», «tuân thủ Framework.md, 18 kernel, 5 trụ cột MWG»); hai bản phản biện độc lập trong phiên (một đối chiếu tài liệu Anthropic, một chắt tiêu chí Oracle và MWG).

## 1. Vì sao
`CLAUDE.md` gốc nặng khoảng 30 KB (4.571 từ), `FRAMEWORK.md` đặt mức dưới 4 KB, tài liệu Anthropic nói tệp dài làm AI tuân thủ kém hơn. Bản đối chiếu 5/10 đã nêu điều này (mục 4.4), chưa ai làm. Việc này tách làm hai: **bước 1** (đã làm trên nhánh này) là hàng rào máy chặn tệp phình thêm; **bước 2** (chờ duyệt) là dời chỗ chữ.

## 2. Tiêu chí nghiệm thu (viết trước khi làm, P20)
- **A1.** Cỡ ba tệp `CLAUDE.md` (gốc, `src/`, `web/`) tính theo byte không vượt trần; trần chỉ được hạ. *Cách kiểm:* `src/claude-md-gioi-han.test.ts`; đã thấy đỏ khi hạ trần giả, rồi hoàn nguyên.
- **A2.** Mọi đường dẫn viết trong dấu `…` của ba tệp trỏ tới tệp có thật (trừ danh sách loại trừ có lý do). *Cách kiểm:* cùng bài; đã thấy đỏ khi bỏ một mục loại trừ.
- **A3.** (bước 2) Mọi gạch ở mục 10 cũ xuất hiện nguyên văn đúng một nơi mới, không mất chữ, không nhân đôi. *Cách kiểm:* một lệnh so chữ, ghi kết quả.
- **A4.** (bước 2) Không đổi nghĩa quy tắc nào: chỉ dời chỗ và nén câu trùng. Người kiểm độc lập đọc diff.
- **A5.** (bước 2) `CLAUDE.md` gốc sau rút không quá ngưỡng chủ chọn ở Q1. **Ước tính 2026-11-03:** mục 10 có 16 gạch, 4 gạch ở lại, 12 gạch dời (7.205 byte; kịch bản cắt nguyên văn, A3 ĐẠT, người kiểm độc lập so lại từng gạch). Dời xong còn khoảng 23,8 KB gồm cả câu con trỏ (người kiểm tính ra 23,5 KB; chênh nhỏ, cùng khuyến nghị 24 KB). Xuống 19 KB cần nén thêm khoảng 4,8 KB ở §3, §8, §9; chưa làm, chưa biết làm được mà không đổi nghĩa.

## 3. Bước 2: dời chỗ (đề xuất, chưa làm)
| Phần hiện tại của `CLAUDE.md` | Đi đâu |
|---|---|
| §2 thứ tự ưu tiên, §3 vai của AI, §5 lệnh, §6 bản đồ đọc, §8 điều cấm | **Ở lại** (đây là lõi; chỉ nén câu trùng) |
| §4 cách trả lời chủ | Ở lại; phần trùng với luật toàn cục của chủ (`~/.claude/CLAUDE.md`) thì nén còn con trỏ |
| §10 bẫy chung (build web, e2e cần mạng, kho cookie Chrome) | **Ở lại** (lỗi lặp nhiều lần; Anthropic khuyên giữ loại này ở `CLAUDE.md`) |
| §10 bẫy theo vùng: đăng nhập, bảo trì, đơn hàng, phân công, hồ sơ, giấy tờ, điều phối xe, migration, phát hành | Quy tắc theo đường dẫn (`.claude/rules/<vùng>.md` có `paths:`), chỉ nạp khi AI chạm tệp vùng đó. Bản nháp từng tệp: thư mục `2026-11-03-rut-gon-claude-md/` cạnh tệp này |
| §8 chuỗi triển khai dài, §9 bước ghép khi duyệt | Giữ một dòng + con trỏ tới `docs/QUY-TRINH-PHAT-HANH.md`, `docs/adr/README.md` |
| Thiếu: không nhắc `GOVERNANCE.md`, `FRAMEWORK.md` | Thêm **hai dòng** trỏ (không thêm khối «bậc luật»; chuỗi ưu tiên phải khớp Hiến pháp đang ghim 2.3.0, chưa có tầng Governance) |

## 4. Đối chiếu bốn khung
| Khung | Đề xuất này |
|---|---|
| **Framework** (`playbook/FRAMEWORK.md` §4.6) | Đòi dưới 4 KB. Không đạt được mà không mất luật an toàn, nên **lệch có chủ ý**, phải ghi ngoại lệ có hạn (đến lần nâng ghim, khi `FRAMEWORK.md` bị bỏ khỏi kho gốc). Cũng theo Framework: có tiêu chí nghiệm thu trước, người thi công không tự nghiệm thu, chủ ở chốt duyệt. |
| **Kernel 18** (`docs/kernel-18.md`) | Không dòng nào trong 18 bị chạm: chỉ là chỉ dẫn và một bài kiểm, không đổi dữ liệu, quyền, tiền. Ghi lại để người kiểm khỏi đoán. |
| **Oracle** | «Luật gần nơi thi hành»: bẫy theo vùng đặt gần mã của vùng. «Quy tắc phải đúng được máy giữ»: bài kiểm cỡ thay lời dặn. |
| **5 trụ cột MWG** | T3 kiểm soát bằng thiết kế (bài kiểm thay lời dặn). T2 một sự thật (mỗi bẫy một nơi, A3). T4 chuẩn hoá trước, từng bước nhỏ (bước 1 trước, bước 2 sau). T5 chủ rõ ràng (chủ duyệt, người kiểm độc lập). T1 không liên quan. |

## 5. Ba quyết định cần chủ
- **Q1. Ngưỡng cỡ `CLAUDE.md` gốc.** Khuyến nghị **24 KB** làm đợt này (chỉ dời mục 10, an toàn nhất vì không nén chữ nào của luật; đã đo 23,8 KB), rồi mới cân nhắc nén §3, §8, §9 để xuống 19 KB ở một đợt sau. Phương án khác: ép ngay 19 KB (phải nén chữ luật, rủi ro đổi nghĩa), hoặc giữ nguyên. Mọi phương án đều **lệch có chủ ý** so với 4 KB của Framework, phải ghi ngoại lệ có hạn.
- **Q2. Dời bẫy theo vùng sang đâu.** Khuyến nghị **quy tắc theo đường dẫn** (`.claude/rules/`), nhưng chỉ sau một lần thử: tạo một tệp, quan sát nó có thật sự được nạp khi đọc tệp vùng đó (chưa kiểm, tài liệu nói có). Chưa thấy thì dùng `CLAUDE.md` con trong từng thư mục như `src/` và `web/` đang làm. **Rủi ro cần biết:** bẫy dời sang quy tắc theo đường dẫn chỉ hiện khi AI đọc hoặc sửa tệp thuộc vùng đó; AI chỉ làm việc bằng dòng lệnh (`grep`, `find`) có thể không thấy, đúng điều `CLAUDE.md` gốc đã cảnh báo cho tệp theo thư mục. Bù lại bằng một câu ở `CLAUDE.md` gốc: «bẫy theo vùng nằm ở `.claude/rules/`; làm việc bằng dòng lệnh thì tự mở». Người kiểm cũng nêu: mốc 6 giờ của Điều phối xe chạm `orders`, và bẫy thêm mã quyền chạm `src/shared/permissions.ts`; bản nháp đã thêm các đường dẫn đó vào phạm vi nạp.
- **Q3. Hai dòng trỏ Governance và Framework.** Khuyến nghị thêm: «`playbook/GOVERNANCE.md` là luật thi hành chung; `playbook/FRAMEWORK.md` là khung quy trình, sẽ bỏ khi nâng ghim».

*Bước 3 (tiêu chí soi Oracle/MWG, dòng «Soi» trong mẫu ADR) cần ADR riêng, không nằm trong tệp này.*
