# Nhật ký thi công — Bộ tiêu chuẩn nền tảng

> Sổ điều phối (Hiến pháp P19: trạng thái sống trong tài liệu, không trong trí nhớ phiên). Đặc tả: `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` (v3.1, chủ duyệt 2026-09-21). Mỗi dòng: ai làm, bằng chứng thật, ai kiểm. **Người thi công không tự nghiệm thu** (N8): cột "Người kiểm" do một phiên KHÁC điền.

## Quyết định và ruling (theo P5)
| Ngày | Điều | Nguồn |
|---|---|---|
| 2026-09-21 | Duyệt đặc tả v3.1; bắt đầu chép `playbook/`; "không tự suy diễn, hỏi ngay khi mơ hồ hoặc cần thông tin" | chủ dự án (quyết định 29) |
| 2026-09-21 | Số ADR ghim playbook = **0011** (ADR-0010 đã có ở nhánh `worktree-doi-chieu-oracle-tca`, chưa gộp; nhánh đó cũng có migration `0017` và dời B5 sang `0018`) | chủ dự án (quyết định 30) |
| 2026-09-21 | Cây Core **chưa xác nhận sạch**: chép nguyên hiện trạng, `PIN-README` ghi "CHƯA xác nhận cây sạch" | chủ dự án (quyết định 31) |
| 2026-09-21 | `init-project.sh` chép nguyên nội dung, **bỏ bit thực thi (0644)** | chủ dự án (quyết định 32) |
| 2026-09-21 | Đường chép `playbook/` được chủ ghi nhận ("ghi nhận bằng câu trả lời này, AI chép sau") — N9 | chủ dự án (quyết định 25) |

## Khác biệt phải nhớ khi gộp với nhánh khác
- Nhánh `worktree-doi-chieu-oracle-tca`: `docs/adr/README.md` (hàng 0010 vs hàng 0011 của tôi), `docs/HANDOFF-N1.md`, số migration (`0017` đã dùng; B5 → `0018`). Xung đột tầm thường nhưng phải giải khi gộp; **chủ quyết thứ tự gộp**.
- Mục "Số migration" trong bộ `CLAUDE.md` đề xuất chưa ghi cứng "0017": cập nhật khi nhánh Oracle TCA gộp.

## Sổ việc
| Việc | Kế hoạch | Trạng thái | Người thi công | Người kiểm |
|---|---|---|---|---|
| Hàng rào máy (hook, deny, test, `.gitignore`) | — (làm sớm theo yêu cầu chủ) | Xong, commit `f7651a1`/`c91cb8d`; **chưa quan sát chặn trong phiên Claude Code thật** | phiên soạn | người kiểm D (357 ca) |
| Bộ CLAUDE.md đề xuất | — | Xong ở dạng ĐỀ XUẤT (`docs/superpowers/proposals/2026-09-21-claude-md/`); chờ chủ duyệt và cài | phiên soạn | người kiểm D |
| `staff_updated` không ghi SĐT | — | Xong, commit `33eebed` | phiên soạn | người kiểm E |
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
