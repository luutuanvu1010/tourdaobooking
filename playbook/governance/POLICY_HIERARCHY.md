# POLICY HIERARCHY — Bốn tầng chính sách

> Bộ này đã có sẵn bốn tầng, đây là bản đồ nêu rõ. Tầng dưới cụ thể hóa tầng trên và không được mâu thuẫn. Sửa càng lên cao càng cần mức duyệt cao hơn.

| Tầng | Là gì | Sống ở đâu | Nhịp đổi |
|------|-------|-----------|----------|
| 1. Principles | Nguyên tắc bất biến, độc lập công nghệ | `CONSTITUTION.md` (P1–P21, N1–N10) | hiếm, qua Amendment |
| 2. Standards | Chuẩn phải đạt | `04-CONSTRAINTS`, `07-DESIGN_TOKENS`, `08-QA_CHECKLIST`, `governance/policies/` | khi đổi stack/brand |
| 3. Procedures | Cách làm | `governance/DECISION_PROCESS.md`, `PLAYBOOK.md`, `ai/workflows/spec-driven-flow.md` | khi cải tiến quy trình |
| 4. Work instructions | Thao tác cụ thể | `ai/agents/*.prompt.md`, `ai/workflows/incident-runbook.md` | thường xuyên |

Quy tắc: khi một work instruction (tầng 4) muốn làm điều mâu thuẫn với một principle (tầng 1), nó sai, không phải principle sai.
