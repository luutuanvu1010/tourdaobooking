# Dự thảo hai tệp con tầng 2 (kèm kế hoạch `2026-11-03-viet-lai-claude-md-dot-2.md`, mục E3)

## Tệp `docs/adr/CLAUDE.md`
```markdown
# Khi viết ADR (ADR-0162)
- Mỗi ADR có mục `## Đối chiếu` theo mẫu `docs/Ref/tieu-chi-doi-chieu.md`: căn cứ luật (Hiến pháp, Governance, Hiến chương), Oracle, MWG, Kernel 18 (chạm dòng nào), Anthropic khi việc là cách làm với AI, rồi Chọn. Không chạm gì thì một câu «không chạm». Thiếu mục thì `npm test` đỏ.
- Trước khi viết: mở đúng mục các căn cứ liên quan theo bảng «Sáu căn cứ» ở `CLAUDE.md` gốc §2; không đọc hết tệp.
- Ba căn cứ đầu là luật, lệch là sai; ba căn cứ sau là tiêu chí, lệch thì nêu cho chủ quyết.
- Đánh số, trạng thái, trang ghép: `docs/adr/README.md`. AI không tự duyệt ADR (N3, N9); không sửa ADR đã duyệt, quyết định mới thì ADR mới.
```

## Tệp `docs/superpowers/specs/CLAUDE.md`
```markdown
# Khi viết đặc tả (ADR-0162)
- Đặc tả có mục `## Đối chiếu` theo mẫu `docs/Ref/tieu-chi-doi-chieu.md` (căn cứ luật, Oracle, MWG, Kernel 18, Chọn; không chạm thì «không chạm»). Thiếu mục thì `npm test` đỏ.
- Trước khi viết: mở đúng mục các căn cứ liên quan theo bảng «Sáu căn cứ» ở `CLAUDE.md` gốc §2; thiết kế mới tra Hiến chương Phần I trước, chỉ điều đã duyệt.
- Ghi giả định và điều chưa chắc; tiêu chí nghiệm thu bằng hành vi kiểm được, viết trước khi làm (P20).
- Chạm vùng đang hở thì ghi «xây trên lỗ đang hở: <mã>» (`CLAUDE.md` gốc §3).
```
