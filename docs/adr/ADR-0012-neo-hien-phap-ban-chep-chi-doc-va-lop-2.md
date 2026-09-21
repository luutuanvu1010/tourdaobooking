# ADR-0012 — Neo Hiến pháp bằng bản chép chỉ-đọc từ Core, và tầng ràng buộc dự án (Lớp 2)

- **Trạng thái:** **proposed** — do AI soạn theo yêu cầu của chủ dự án ngày 2026-09-21; chỉ chủ dự án mới chuyển sang accepted (Hiến pháp N3; Điều 7.1: kiến trúc do chủ dự án phê chuẩn, AI chỉ đề xuất kèm bản ghi quyết định). Sau khi accepted chỉ sửa trạng thái, thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-21   **Người phê chuẩn:** (chủ dự án — chưa phê chuẩn)
- **Loại quyết định:** **cửa hai chiều về tệp** (gỡ được bằng xoá `playbook/`), nhưng **nghĩa vụ đã duyệt là bánh cóc** (Hiến pháp 9.4, 9.7): sau khi accepted, muốn nới phải qua đường sửa Hiến pháp ở Core, không nới ở đây. Nhãn "hai chiều (tệp) / bánh cóc (nghĩa vụ)" là **nhãn tự đặt** của ADR này: Điều 7.2 chỉ có cửa một chiều và cửa hai chiều; bánh cóc là mô tả cơ chế của 9.4 và 9.7, không phải một loại cửa. Nếu chủ dự án muốn một nhãn theo 7.2 thì đó là **hai chiều**.
- **Liên quan:** Hiến pháp v2.3.0 (Điều 3.1, 7.1, 7.2, 9.4, 9.7; N3, N4, N7, N9); ADR-0002 (ranh giới); ADR-0010 và ADR-0011 của `main` (chỉ để giải thích số 0012, xem Bối cảnh; ADR này không phụ thuộc vào hai ADR đó); `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` (quyết định 2, 25, 30–32)

## Bối cảnh
- Repo này viện dẫn Hiến pháp (gồm P1, P2, P4–P7, P11; N1, N3–N5, N7; Điều 3.1, 5.8, 6.2, 7, 8.2, 9.7) ở 21 tệp tài liệu `.md`, 3 kịch bản bằng chứng đặt dưới `docs/` (`.mjs`, `.py`) và 4 tệp mã (`src/architecture.test.ts`, `src/migrations-n1.test.ts`, `src/shared/permissions.ts`, `tests/e2e/trip.mjs`), nhưng **không có bản Hiến pháp trong repo và không ghim phiên bản**; chỉ `docs/AUDIT-PWA-IPHONE.md` dòng 11 nêu phiên bản (v2.2.0). Cách đếm: `git grep -l -P "(?i:hiến pháp|constitution)|Điều [0-9]+\.[0-9]+"` ở merge-base `8c16767` cho 33 tệp; bỏ 5 bản sao thiết kế của tourdaovn ở `docs/design/a2-mockup/` thì còn 28 (21 + 3 + 4). Đếm hẹp (chỉ chữ "Hiến pháp"/"CONSTITUTION", không phân biệt hoa thường) cho 19 tệp, gồm cả 5 bản sao; số ở đây là đếm rộng, cộng thêm các tệp chỉ nêu "Điều N.N".
- Dòng dõi Hiến pháp trên máy của chủ dự án (đối chiếu bằng băm và đọc tệp, 2026-09-21): `CoreSchemaProject/playbook` và `pt-hdv/playbook` là **v2.3.0** (P1–P21, N1–N10); `tourdaovn`, `nhatrangtravel`, `Aquanova`, `Master-Project-Framework` là v2.2.0 (P1–P13, N1–N7); `ketoanvn/CONSTITUTION.md` là v3.1.0, văn bản khác hẳn. `CoreSchemaProject/playbook/.PINNED_VERSION` ghi rằng từ 2026-08-21 **Core sở hữu lớp luật** (ADR-0027 của Core, chủ dự án chốt) và nhãn nguồn cũ của tệp đó (khai nguồn là `nhatrangtravel/playbook`, tự nhận là bản pin chỉ đọc) là sai. Các điều mà repo này đã viện dẫn **giữ nguyên số hiệu** ở v2.3.0.
- Đặc tả v1 của bộ tiêu chuẩn từng đề xuất chép từ `tourdaovn` (v2.2.0) theo nhãn nguồn cũ; đã đổi sang Core sau rà soát độc lập và sau khi chủ dự án chọn lại (ghi theo P5).
- Ràng buộc từ Hiến pháp và README của playbook:
  - **9.7:** tầng dự án chỉ được siết thêm, không định nghĩa lại hay nới.
  - **README của playbook (dòng 28):** "Đừng sửa `CONSTITUTION.md` trực tiếp." Câu liền sau trong README ("Đường hợp pháp duy nhất: `04-CONSTRAINTS.md` khoản 6 và `ADR-0030`.") là đường sửa **của Core**, không phải đường của repo này; ở đây không sửa `playbook/` tại chỗ mà chỉ chép lại từ Core (Quyết định 4), và mục Hệ quả ("Câu đúng ở Core nhưng sai ở đây") xử lý câu ấy.
  - **N7:** không hai nguồn sự thật song song cho cùng một thứ.
  - **N3:** AI không tự quyết định kiến trúc/chiến lược; việc ghim này chờ chủ dự án duyệt (Điều 7.1: kiến trúc do chủ dự án phê chuẩn, tác nhân điều phối đề xuất kèm bản ghi quyết định).
  - **N9:** AI không tự tay sửa luật chi phối chính mình. Phần *Ranh giới* của N9 cho phép AI chép nguyên văn bản sửa đổi vào tài liệu đích khi **đủ ba điều kiện**: chủ dự án đã phê chuẩn; việc phê chuẩn được ghi nhận trong nhật ký thay đổi tập trung; chép theo đường mà ràng buộc cấp dự án quy định. Ràng buộc cấp dự án quy định đường chép **hiện chưa có** (theo Điều 3.1 tầng đó đứng trên ADR, nên ADR này không thay được nó). Thay vào đó, **câu trả lời của chủ dự án ngày 2026-09-21** ("ghi nhận bằng câu trả lời này, AI chép sau"; đặc tả quyết định 25) đóng vai bản ghi phê chuẩn đường chép, được ghi ở nhật ký thi công `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md` (mục "Quyết định và ruling") và ở ADR này. Đây là chỗ thay thế tạm: nhật ký thi công của repo không phải `CHANGELOG.md` của Core (Điều 10 của Hiến pháp dành `CHANGELOG.md` cho lịch sử sửa đổi Hiến pháp), nên điểm này cần chủ dự án xem lại khi chuyển ADR sang accepted.
- Chủ dự án chọn (2026-09-21): ghim **bản sao chỉ-đọc từ Core**, chép toàn bộ trừ `archive/` và `CLAUDE.md` của Core; **không viết Hiến pháp mới**; ghi nhận đường chép bằng câu trả lời "ghi nhận bằng câu trả lời này, AI chép sau"; đánh số ADR này là 0012 vì 0010 (`ADR-0010-nguong-mo-rong-sau-doi-chieu-oracle`) và 0011 (`ADR-0011-khach-tren-don-ngoai-le-quyen`) đã thuộc `main`, gộp từ nhánh `worktree-doi-chieu-oracle-tca` (PR #5, merge `6853a26`; commit thêm hai tệp là `0f97198` cho 0010 và `dbafe34` cho 0011).

## Quyết định
1. Ghim một **bản sao chỉ-đọc** `playbook/` ở gốc repo, chép nguyên byte từ `CoreSchemaProject/playbook` (Hiến pháp v2.3.0, Governance v1.0.0), **trừ** `archive/` và `CLAUDE.md` của Core; `init-project.sh` chép nguyên nội dung nhưng bỏ bit thực thi.
2. Bản ghim đi kèm `playbook/PIN-README.md` (nguồn, ngày, HEAD của Core, điều CẤM, điều không áp dụng, tham chiếu treo, cách nâng ghim) và `playbook/.PINNED_SHA256` (băm mọi tệp trừ chính nó); một bài kiểm trong `npm test` (`src/standards.test.ts`) bắt sửa nhầm.
3. **Không viết Hiến pháp mới.** Ràng buộc riêng của dự án nằm ở một tài liệu Lớp 2 (overlay) sẽ được đề xuất riêng, chỉ siết thêm (9.7).
4. Sửa `playbook/` chỉ qua một đường: sửa ở Core → chủ dự án duyệt → chép lại → nâng ghim theo `PIN-README.md`. AI không sửa tay (N9).
5. Việc cần sửa ở **nguồn** (không sửa ở đây): GOVERNANCE mục 4.4 mang điều kiện ra dành riêng cho website (không áp cho CRM này) — JSON-LD, Lighthouse, `prices.yaml`, hreflang — và mục 9.3 còn `[NEEDS HUMAN DECISION]`.

## Lý do
- **Một nguồn sự thật (N7):** Hiến pháp có một bản gốc ở Core; bản ở đây là bản chép có băm, không phải bản thứ hai được phép sửa.
- **Đúng chủ sở hữu và bản mới nhất:** Core tự nhận sở hữu (ADR-0027), là v2.3.0, và số hiệu đã viện dẫn không đổi nên nâng nguồn không làm gãy tài liệu hiện có.
- **Độc lập (N4):** repo này private và độc lập với các dự án khác; clone hoặc CI không thấy thư mục anh em, nên phải tự đủ.
- **Đơn giản (P11):** không soạn luật mới; chỉ chép và kiểm bằng máy.

## Phương án bị loại
- **Viện dẫn theo đường dẫn tương đối** `../CoreSchemaProject/playbook` hoặc `../tourdaovn/playbook`: gắn hai repo độc lập vào nhau (N4) và gãy khi clone hoặc chạy CI.
- **Viết Hiến pháp riêng cho tourdao-sales:** tạo nguồn sự thật thứ hai (N7), trái 9.7 và README playbook, và để AI tự đặt luật tối cao mà không qua chủ duyệt (N3).
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
- **Điều 9.2 (7 ngày cân nhắc)** áp dụng cho việc sửa nguyên tắc hoặc điều cấm của Hiến pháp, không cho việc ghim bản chép này.
- ADR này và overlay là **đề xuất** trên nhánh cho tới khi chủ dự án chuyển accepted.
