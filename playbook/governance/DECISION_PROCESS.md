# DECISION PROCESS — Quy trình ra quyết định

## Khởi tạo (Working Backwards)
Dự án hoặc epic mới bắt đầu bằng `00-PROJECT_BRIEF` viết theo lối PR-FAQ: hình dung trước thông cáo ra mắt và câu hỏi người dùng, rồi mới xây.

## Thiết kế trước quyết định
Quyết định kiến trúc lớn phải có `02-SAD` (design doc) làm cơ sở review trước, rồi mới chốt bằng ADR.

## ADR bắt buộc
Mọi quyết định kiến trúc hoặc công nghệ sinh một ADR. Quyết định không ADR vi phạm P5 (mọi quyết định để lại dấu vết) và N3, bị chặn ở cổng.

## One-way vs two-way door
Mỗi ADR khai loại quyết định:
- Cửa hai chiều (đảo ngược dễ): quyết nhanh, không cần phê chuẩn nặng.
- Cửa một chiều (khó đảo: chọn DB, kiến trúc nền, public API, migration phá hủy): ADR đầy đủ, chủ dự án phê chuẩn.

## Release (gộp vào đây, vì release là một quyết định)
- Branching đơn giản: nhánh tính năng, gộp vào nhánh chính sau QA2.
- Release thường là cửa hai chiều, hotfix cũng vậy; migration dữ liệu phá hủy là cửa một chiều, cần ADR.
- Không release khi chưa qua cổng QA2 (Điều cấm N2).

## Incident (quyết định khi có sự cố)
Trỏ về quy trình sự cố và hậu kiểm trong GOVERNANCE.md mục 6 và runbook `ai/workflows/incident-runbook.md`.
