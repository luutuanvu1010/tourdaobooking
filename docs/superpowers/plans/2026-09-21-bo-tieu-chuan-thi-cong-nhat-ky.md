# Nhật ký thi công — Bộ tiêu chuẩn nền tảng

> Sổ điều phối (Hiến pháp P19: trạng thái sống trong tài liệu, không trong trí nhớ phiên). Đặc tả: `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` (v3.1, chủ duyệt 2026-09-21). Mỗi dòng: ai làm, bằng chứng thật, ai kiểm. **Người thi công không tự nghiệm thu** (N8): cột "Người kiểm" do một phiên KHÁC điền.

## Quyết định và ruling (theo P5)
| Ngày | Điều | Nguồn |
|---|---|---|
| 2026-09-21 | Duyệt đặc tả v3.1; bắt đầu chép `playbook/`; "không tự suy diễn, hỏi ngay khi mơ hồ hoặc cần thông tin" | chủ dự án (quyết định 29) |
| 2026-09-21 | Số ADR ghim playbook = **0011** (ADR-0010 đã có ở nhánh `worktree-doi-chieu-oracle-tca`, chưa gộp; nhánh đó cũng có migration `0017` và dời B5 sang `0018`) | chủ dự án (quyết định 30, lần một — bị thay ngay dưới) |
| 2026-09-21 | Số ADR ghim playbook đổi thành **0012**: nhánh Oracle TCA gộp vào `main` (PR #5, #6) và chiếm cả 0010 lẫn 0011 (`ADR-0011-khach-tren-don-ngoai-le-quyen`); chủ chọn "ADR-0012 (Khuyến nghị)" | chủ dự án (quyết định 30, lần hai) |
| 2026-09-21 | Cây Core **chưa xác nhận sạch**: chép nguyên hiện trạng, `PIN-README` ghi "CHƯA xác nhận cây sạch" | chủ dự án (quyết định 31) |
| 2026-09-21 | `init-project.sh` chép nguyên nội dung, **bỏ bit thực thi (0644)** | chủ dự án (quyết định 32) |
| 2026-09-21 | Đường chép `playbook/` được chủ ghi nhận ("ghi nhận bằng câu trả lời này, AI chép sau") — N9 | chủ dự án (quyết định 25) |

## Khác biệt phải nhớ khi gộp với nhánh khác
- Nhánh `worktree-doi-chieu-oracle-tca` ĐÃ GỘP vào `main` (PR #5, #6; `main` @ `f01fa5c`) và nhánh này ĐÃ REBASE lên đó (2026-09-21): xung đột `CLAUDE.md` (số test) và `docs/adr/README.md` (hàng ADR) đã giải; số ADR của bản ghim đổi 0011 → **0012**. Còn lại: số migration kế tiếp là `0018` (`0017` đã lên production); manifest băm migration (T2) phải gồm cả `0017`.
- Mục "Số migration" trong bộ `CLAUDE.md` đề xuất chưa ghi cứng "0017": cập nhật khi cài (T8), theo `main` hiện tại (0017 đã có, kế tiếp 0018).

## Sổ việc
| Việc | Kế hoạch | Trạng thái | Người thi công | Người kiểm |
|---|---|---|---|---|
| Hàng rào máy (hook, deny, test, `.gitignore`) | — (làm sớm theo yêu cầu chủ) | Xong, commit `fb25815`/`cbe2b3a` (sau rebase lên `main` @ `f01fa5c`; trước rebase: `f7651a1`/`c91cb8d`); **chưa quan sát chặn trong phiên Claude Code thật** | phiên soạn | người kiểm D (357 ca) |
| Bộ CLAUDE.md đề xuất | — | Xong ở dạng ĐỀ XUẤT (`docs/superpowers/proposals/2026-09-21-claude-md/`); chờ chủ duyệt và cài | phiên soạn | người kiểm D |
| `staff_updated` không ghi SĐT | — | Xong, commit `19af1c4` (trước rebase: `33eebed`) | phiên soạn | người kiểm E |
| **T1 — ghim `playbook/`** | `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-t1-ghim-playbook.md` | Đang thi công | (điền) | (điền) |
| T2 manifest băm migration | chưa lập | Chờ | | |
| T3 test quét PII chung | chưa lập (nguyên mẫu: `docs/superpowers/proposals/2026-09-21-pii-quet-chung/`) | Chờ | | |
| T4 bộ sinh ER | chưa lập | Chờ | | |
| T5 luồng kỹ thuật | chưa lập | Chờ | | |
| T6 overlay | chưa lập | Chờ | | |
| T7 quy trình nghiệp vụ | chưa lập | Chờ | | |
| T8 mục lục và cài `CLAUDE.md` đã duyệt | chưa lập | Chờ | | |
| T9 CI | chưa lập | Chờ | | |
| T10 bản xem (Artifact) | chưa lập | Chờ | | |

## Nhật ký từng bước
| Thời điểm (ISO) | Việc | Vai | Kết quả / bằng chứng (lệnh, đầu ra thật) | Người kiểm |
|---|---|---|---|---|
| 2026-09-21 | Lập kế hoạch T1 | Người lập kế hoạch | `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-t1-ghim-playbook.md`; số liệu nguồn: 43 tệp, 250.827 byte, HEAD Core `65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8`, Hiến pháp v2.3.0, GOVERNANCE v1.0.0, CHANGELOG 3.3.1; chỉ `init-project.sh` có bit thực thi | — |
| 2026-09-21T12:55:37Z | Task 1 — ADR-0012 (ban đầu đánh số 0011, đổi ở `222612c`) + README ADR | Thi công | Tạo `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (trạng thái **proposed**; `cmp` với văn bản trong brief: khớp từng byte); sửa `docs/adr/README.md` đúng ba chỗ (dòng 3 mẫu ADR, hàng 0011 sau hàng 0009, dòng "Thứ tự tài liệu"); thêm dòng này vào nhật ký. Kiểm cơ học: `grep -c "ADR-0011" docs/adr/README.md` = 2; `grep -n "0010" docs/adr/README.md` = không dòng nào. `npm test`: 413 test, 413 pass, 0 fail | (chưa kiểm) |
| 2026-09-21T13:27:31Z | Task 1 — vòng sửa 1: ADR-0012 sau kiểm độc lập | Thi công (sửa) | Sửa `docs/adr/ADR-0012-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (đổi số 0011 → 0012 trong thân tệp và nêu ADR-0010, ADR-0011 của `main`, gộp qua PR #5 `6853a26`; trích README:28 đúng chữ; dòng "Trạng thái" dẫn N3 + Điều 7.1 thay vì N9; N3 và N9 tóm đúng nghĩa, nêu đủ ba điều kiện của N9 và chỗ thay thế tạm; nhãn cửa; Điều 9.2; cách đếm số tệp viện dẫn Hiến pháp: `git grep` ở `8c16767` = 33 tệp, 28 sau khi bỏ 5 bản sao thiết kế), ô "Cửa" của hàng 0012 ở `docs/adr/README.md`, và giờ dòng Task 1 ở trên (12:57:00Z → 12:55:37Z, giờ tác giả của `4d68bbe`). Kiểm cơ học: số hàng 0010, 0011, 0012 trong bảng `docs/adr/README.md` đếm được = 3; mọi câu trích README/Hiến pháp khớp `grep -nF`. `npm test`: 418 test, 418 pass, 0 fail | (chưa kiểm) |
