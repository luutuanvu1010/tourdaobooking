# PLAYBOOK — Cẩm nang vận hành

Tài liệu này giải thích cách dùng bộ template: quy trình tổng, cách phân bổ công cụ AI theo năng lực, và cách dựng prompt chuẩn.

- **Phiên bản:** v1.1.0   **Hiệu lực từ:** 2026-06-10   **Người phê chuẩn:** Lưu Tuấn Vũ

---

## Phần 1 — Quy trình 9 bước (định nghĩa quy trình duy nhất của toàn hệ)

Chuỗi 9 bước dưới đây là định nghĩa quy trình canonical duy nhất (P6, N7). `GOVERNANCE.md` và mọi tài liệu khác chỉ trỏ về đây, không định nghĩa chuỗi bước riêng.

Đi từ trừu tượng xuống cụ thể. Mỗi bước đẻ ra một artifact trong `templates/`.

| # | Bước | Tầng gốc | Artifact |
|---|------|----------|----------|
| 0 | Định vị và ràng buộc | Strategy | PROJECT_BRIEF |
| 1 | Phạm vi và mô hình nội dung | Scope | CONTENT_MODEL |
| 2 | Kiến trúc hệ thống | C4 | SAD |
| 3 | Chốt stack bằng ADR | ADR | ADR-000x |
| 4 | Luật hệ thống bất biến | Constraints | CONSTRAINTS |
| 5 | Cấu trúc IA và schema | Structure | URL_MAP + DB_SCHEMA |
| 6 | Khung trang và binding map | Skeleton | BINDING_MAP |
| 7 | Bề mặt, thiết kế giao diện | Surface | DESIGN_TOKENS + mockup |
| 8 | Thực thi có cổng QA | Spec-driven | QA_CHECKLIST + PR |

Ba cổng cứng: chưa có BINDING_MAP thì cấm sang bước 7; chưa qua QA1 thì Code không chạy; chưa qua QA2 thì cấm merge và cấm phát hành.

---

## Phần 2 — Logic phân bổ công cụ AI

Nguyên tắc gốc: **giao việc theo năng lực lõi, không theo tiện tay**. Mỗi tác nhân giỏi một kiểu việc; giao sai vai là nguồn gốc của lỗi và làm lại.

### Năm vai và năng lực lõi

**BẠN — quyết định và khẩu vị.** Chỉ bạn được chốt định hướng, duyệt các cổng, và nói "đẹp hay chưa đẹp". AI không thay bạn ở đây. Bạn xuất hiện đậm nhất ở bước 0, 3, và tại mọi cổng QA.

**COWORK — điều phối, đặc tả, kiểm soát.** Đọc tài liệu, viết SPEC, ra prompt, giám sát, chạy QA. **Cowork không viết code.** Nó là bộ não tổ chức giữa bạn và Code. Đậm nhất ở bước 1, 2, 3, 4, 5, 6 và hai cổng.

**DESIGN (Claude Design / Open Design) — thẩm mỹ và bề mặt.** Chỉ làm bước 7, và chỉ sau khi có binding map. Xuất mockup và token. Không quyết kiến trúc, không chạm dữ liệu.

**CLAUDE CODE — thực thi chính xác.** Chỉ làm bước 8: viết, sửa, commit, deploy đúng theo prompt đã qua QA1. **Code không ra quyết định kiến trúc**; gặp chỗ mơ hồ thì dừng và hỏi, không tự đoán.

**QA AGENT — kiểm chứng độc lập.** Chạy checklist QA1 và QA2: đối chiếu artifact với SPEC và CONSTRAINTS, xuất bằng chứng E1/E2. Không soạn spec, không sửa artifact mình kiểm, không mở cổng. Tách khỏi Cowork để người soạn không tự chấm bài mình; cổng vẫn do bạn chốt.

### Bảng phân bổ nhanh

| Bước | Vai chính | Vì sao vai đó |
|------|-----------|---------------|
| 0 | Bạn (+ Cowork ghi chép) | quyết định chiến lược là của người |
| 1–2 | Cowork | mô hình hóa và kiến trúc là việc đặc tả |
| 3 | Bạn quyết, Cowork ghi ADR | quyết định công nghệ cần người chốt, máy lưu vết |
| 4–6 | Cowork | luật, schema, binding là spec thuần |
| 7 | Design | thẩm mỹ và bề mặt |
| 8 | Claude Code | thực thi theo spec |

### Ranh giới không được vượt
- Cowork không viết code. Code không tự đổi kiến trúc. Design không chạm dữ liệu. QA không sửa artifact mình kiểm. Bạn không bỏ qua cổng QA.
- Nếu một vai bị buộc làm việc của vai khác, đó là dấu hiệu prompt sai hoặc thiếu artifact đầu vào.

---

## Phần 3 — Cách dựng prompt chuẩn

Một prompt tốt là prompt khiến tác nhân không phải đoán. Bảy phần sau là khung; bỏ phần nào tùy task, nhưng càng rủi ro càng cần đủ.

1. **Vai và bối cảnh** — tác nhân là ai, dự án nào, ranh giới với dự án khác.
2. **Nguyên tắc bất biến** — các guardrail không được phá (ví dụ: chỉ chỉnh tài liệu, spec là chuẩn).
3. **Đầu vào phải đọc** — artifact nào, file nào, ở đâu.
4. **Nhiệm vụ chia pha có điểm dừng** — mỗi pha một đầu ra, dừng chờ duyệt ở chỗ rủi ro.
5. **Định dạng đầu ra** — bảng, ngôn ngữ, quy ước trình bày.
6. **Definition of done** — thế nào là xong.
7. **Anti-patterns** — điều cấm làm.

> Mẫu thực tế (đủ bảy phần, có điểm dừng để người giữ quyền quyết định): xem `archive/prompt-cowork-chot-khung-da-thi-hanh-2026-06-10.md`, prompt đã dùng thật cho phiên chốt khung. Khung prompt rút gọn theo từng vai có sẵn ở `ai/agents/*.prompt.md` (cowork, design, code, qa).

### Quy tắc cổng
- **QA1 (QA Agent kiểm chứng trước khi Code chạy, bạn mở cổng):** prompt có tham chiếu đúng artifact, nhắc đủ ràng buộc, phát biểu rõ tiêu chí done.
- **QA2 (QA Agent kiểm chứng trước khi merge, bạn chốt):** đối chiếu kết quả với SPEC và CONSTRAINTS, kiểm SEO/GEO, schema, responsive, token; bất biến dữ liệu đòi bằng chứng E1.

---

## Phần 4 — Chu trình tái sử dụng cho dự án mới

1. Từ repo playbook, chạy `./init-project.sh ten-du-an`. Lệnh tạo `../ten-du-an/` gồm: `playbook/` (bản pin chỉ-đọc để tham chiếu), hiến pháp dạng symlink, và 9 artifact đã copy sẵn vào `project/` để điền.
2. Điền `project/00-PROJECT_BRIEF` trước tiên; đừng chạm bước nào khác khi chưa xong bước 0. Luôn điền vào `project/`, KHÔNG bao giờ sửa `templates/` ở repo nguồn.
2b. Điền `project/PROJECT_OVERLAY-<tên dự án>.md` (init-project.sh đã tự copy và đổi tên từ template 09). Overlay là Lớp 2: chỉ được siết thêm so với hiến pháp và governance, không được nới (CONSTITUTION Điều 9.7).
3. Đi tuần tự 0 đến 8, mỗi bước điền đúng artifact của nó trong `project/`.
4. Tại bước 3, chốt stack qua cây quyết định (web nội dung → Astro; app động → Hono/JSX trên Workers; tránh Next.js trừ khi bắt buộc). Ghi lựa chọn thành ADR trong `project/adr/`.
5. Không đảo thứ tự, không bỏ cổng. Khung giữ nguyên, chỉ thay ruột.

> Mẫu đã điền thật để đối chiếu: repo dự án `nhatrangtravel` (PROJECT_OVERLAY-nhatrangtravel.md ở gốc, docs/adr/ADR-0001). Khuôn này không chứa file dự án nào.
