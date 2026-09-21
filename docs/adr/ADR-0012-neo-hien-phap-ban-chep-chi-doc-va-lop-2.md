# ADR-0011 — Neo Hiến pháp bằng bản chép chỉ-đọc từ Core, và tầng ràng buộc dự án (Lớp 2)

- **Trạng thái:** **proposed** — do AI soạn theo yêu cầu của chủ dự án ngày 2026-09-21; chỉ chủ dự án mới chuyển sang accepted (Hiến pháp N9). Sau khi accepted chỉ sửa trạng thái, thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-21   **Người phê chuẩn:** (chủ dự án — chưa phê chuẩn)
- **Loại quyết định:** **cửa hai chiều về tệp** (gỡ được bằng xoá `playbook/`), nhưng **nghĩa vụ đã duyệt là bánh cóc** (Hiến pháp 9.4, 9.7): sau khi accepted, muốn nới phải qua đường sửa Hiến pháp ở Core, không nới ở đây
- **Liên quan:** Hiến pháp v2.3.0 (Điều 3.1, 9.4, 9.7; N3, N4, N7, N9); ADR-0002 (ranh giới); `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` (quyết định 2, 25, 30–32)

## Bối cảnh
- Repo này viện dẫn Hiến pháp (P1, P2, P4–P7, P11; N1, N3–N5, N7; Điều 3.1, 5.8, 6.2, 7, 8.2, 9.7) ở ít nhất 15 tệp tài liệu và 4 tệp mã, nhưng **không có bản Hiến pháp trong repo và không ghim phiên bản**; chỉ `docs/AUDIT-PWA-IPHONE.md` dòng 11 nêu phiên bản (v2.2.0).
- Dòng dõi Hiến pháp trên máy của chủ dự án (đối chiếu bằng băm và đọc tệp, 2026-09-21): `CoreSchemaProject/playbook` và `pt-hdv/playbook` là **v2.3.0** (P1–P21, N1–N10); `tourdaovn`, `nhatrangtravel`, `Aquanova`, `Master-Project-Framework` là v2.2.0 (P1–P13, N1–N7); `ketoanvn/CONSTITUTION.md` là v3.1.0, văn bản khác hẳn. `CoreSchemaProject/playbook/.PINNED_VERSION` ghi rằng từ 2026-08-21 **Core sở hữu lớp luật** (ADR-0027 của Core, chủ dự án chốt) và nhãn "bản pin của `nhatrangtravel`" là sai. Các điều mà repo này đã viện dẫn **giữ nguyên số hiệu** ở v2.3.0.
- Đặc tả v1 của bộ tiêu chuẩn từng đề xuất chép từ `tourdaovn` (v2.2.0) theo nhãn nguồn cũ; đã đổi sang Core sau rà soát độc lập và sau khi chủ dự án chọn lại (ghi theo P5).
- Ràng buộc từ Hiến pháp: 9.7 (tầng dự án chỉ được siết thêm, không định nghĩa lại hay nới); README của playbook ("đừng sửa Hiến pháp trong repo dự án"); N7 (không hai nguồn sự thật); N3 (AI không tự ra luật tối cao); N9 (AI không tự tay sửa luật chi phối chính mình; được chép nguyên văn văn bản chủ đã phê chuẩn theo đường mà ràng buộc cấp dự án quy định).
- Chủ dự án chọn (2026-09-21): ghim **bản sao chỉ-đọc từ Core**, chép toàn bộ trừ `archive/` và `CLAUDE.md` của Core; **không viết Hiến pháp mới**; ghi nhận đường chép bằng câu trả lời "ghi nhận bằng câu trả lời này, AI chép sau"; đánh số ADR này là 0011 vì ADR-0010 đã thuộc nhánh `worktree-doi-chieu-oracle-tca`.

## Quyết định
1. Ghim một **bản sao chỉ-đọc** `playbook/` ở gốc repo, chép nguyên byte từ `CoreSchemaProject/playbook` (Hiến pháp v2.3.0, Governance v1.0.0), **trừ** `archive/` và `CLAUDE.md` của Core; `init-project.sh` chép nguyên nội dung nhưng bỏ bit thực thi.
2. Bản ghim đi kèm `playbook/PIN-README.md` (nguồn, ngày, HEAD của Core, điều CẤM, điều không áp dụng, tham chiếu treo, cách nâng ghim) và `playbook/.PINNED_SHA256` (băm mọi tệp trừ chính nó); một bài kiểm trong `npm test` (`src/standards.test.ts`) bắt sửa nhầm.
3. **Không viết Hiến pháp mới.** Ràng buộc riêng của dự án nằm ở một tài liệu Lớp 2 (overlay) sẽ được đề xuất riêng, chỉ siết thêm (9.7).
4. Sửa `playbook/` chỉ qua một đường: sửa ở Core → chủ dự án duyệt → chép lại → nâng ghim theo `PIN-README.md`. AI không sửa tay (N9).
5. Việc cần sửa ở **nguồn** (không sửa ở đây): GOVERNANCE mục 4.4 mang điều kiện ra của tourdaovn (JSON-LD, Lighthouse, `prices.yaml`, hreflang) và mục 9.3 còn `[NEEDS HUMAN DECISION]`.

## Lý do
- **Một nguồn sự thật (N7):** Hiến pháp có một bản gốc ở Core; bản ở đây là bản chép có băm, không phải bản thứ hai được phép sửa.
- **Đúng chủ sở hữu và bản mới nhất:** Core tự nhận sở hữu (ADR-0027), là v2.3.0, và số hiệu đã viện dẫn không đổi nên nâng nguồn không làm gãy tài liệu hiện có.
- **Độc lập (N4):** repo này private và độc lập với các dự án khác; clone hoặc CI không thấy thư mục anh em, nên phải tự đủ.
- **Đơn giản (P11):** không soạn luật mới; chỉ chép và kiểm bằng máy.

## Phương án bị loại
- **Viện dẫn theo đường dẫn tương đối** `../CoreSchemaProject/playbook` hoặc `../tourdaovn/playbook`: gắn hai repo độc lập vào nhau (N4) và gãy khi clone hoặc chạy CI.
- **Viết Hiến pháp riêng cho tourdao-sales:** tạo nguồn sự thật thứ hai (N7), trái 9.7 và README playbook, và để AI soạn luật tối cao (N3).
- **Ghim từ `tourdaovn` v2.2.0:** lạc hậu (thiếu P14–P21, N8–N10) và nhãn nguồn của nó sai.
- **Ghim từ `ketoanvn` v3.1.0:** văn bản khác hẳn, phải rà lại mọi điều đã viện dẫn.
- **Ghim một phần (chỉ Hiến pháp + Governance):** để lại tham chiếu treo tới `PLAYBOOK.md`, `templates/`, `ai/` (GOVERNANCE 1.4 nói định nghĩa quy trình duy nhất nằm ở PLAYBOOK).
- **Git submodule:** phụ thuộc quyền truy cập repo Core và phức tạp hơn một bản chép có băm.

## Hệ quả
- **Ai trả:** chủ dự án là DRI duy nhất. Nhịp rà: theo sự kiện (Core đổi) và rà tổng mỗi quý.
- **Có hiệu lực ngay khi accepted:** N8–N10 và P14–P21 của v2.3.0 (không có ở v2.2.0). Overlay phải ánh xạ từng điều.
- **Tham chiếu treo có chủ ý (11 tệp):** bản chép nhắc `archive/`, `CLAUDE.md` của Core, `docs/core-specs/`, các ADR-00xx của Core; GOVERNANCE dòng 98, 109 nhắc `DESIGN.md` (tài liệu cấp dự án chưa có ở đây). Liệt kê ở `playbook/PIN-README.md`.
- **Câu đúng ở Core nhưng sai ở đây:** `playbook/.PINNED_VERSION` ("Sửa thẳng tại đây", còn ghi Hiến pháp v2.2.0) và `playbook/README.md` dòng 28 (đường sửa qua `04-CONSTRAINTS.md` khoản 6 và ADR-0030 của Core). Không sửa tệp (để băm khớp Core); `PIN-README.md` vô hiệu hoá bằng lời.
- **Cây làm việc của Core chưa xác nhận sạch lúc chép:** `PIN-README.md` ghi rõ; chủ dự án có thể đối chiếu bằng `diff -r`.
- **Giới hạn của băm:** chống sửa nhầm, không chống sửa cả tệp lẫn manifest. Lớp thứ hai: CODEOWNERS `playbook/**` và bảo vệ nhánh trên GitHub (gói trả phí đã xác nhận) — việc riêng của chủ dự án sau khi CI chạy lần đầu.
- **Điều 9.2 (7 ngày cân nhắc)** áp dụng cho việc sửa Hiến pháp, không cho việc ghim bản chép này.
- ADR này và overlay là **đề xuất** trên nhánh cho tới khi chủ dự án chuyển accepted.
