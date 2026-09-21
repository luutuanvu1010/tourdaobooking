# Đặc tả thiết kế — Bộ tiêu chuẩn nền tảng của tourdao-sales (v3.1)

> Trạng thái: **ĐỀ XUẤT v3.1 — chờ chủ dự án duyệt** (2026-09-21). v1 = `0fd91b5`, v3 = `3a309cb` (trước rebase); v3.1 hợp nhất **bốn lượt kiểm độc lập bằng subagent** (A: sự thật/khả thi; B: tuân thủ/YAGNI; C: đặc tả v3; D: hook + `CLAUDE.md`) và chín lượt hỏi chủ dự án (34 câu). Nền: `main` @ `8c16767` (đã gộp module Góp ý).
> Đây là đặc tả: **chưa ghim `playbook/`, chưa viết overlay, ADR-0010, bộ sinh sơ đồ, quy trình nghiệp vụ**. Chỉ có **hai phần đã làm sớm theo yêu cầu của chủ** (mục 4N, 4O): hàng rào máy (chỉ *siết* AI, N9 cho phép) và bộ `CLAUDE.md` ở dạng **đề xuất** (không thay bản đang dùng). Mục 2 là lựa chọn của chủ; mục 3 là đề xuất của người soạn.
> **Về vai (Hiến pháp v2.3.0 P15, N8):** người soạn đặc tả/kế hoạch không thi công và không nghiệm thu. Mọi kết luận "đạt" ở mục 5 do người kiểm độc lập (subagent chỉ đọc) và chủ dự án đưa ra.

## 1. Kiểm kê (đã kiểm chứng bằng đọc mã, tài liệu và so băm tệp trên máy)

Yêu cầu gốc: "dự án dường như thiếu Hiến pháp, khung kiến trúc, mô hình dữ liệu, sơ đồ thực thể, luồng logic vận hành". Giả định **đúng một phần**:

| Hạng mục | Hiện có | Kết luận |
|---|---|---|
| Hiến pháp | Không có bản trong repo. ≥ 15 tệp nêu tên nó (`SPEC`:3, `docs/adr/README.md`:3,17, `ADR-0004`:5, `AUDIT-PWA-IPHONE`:11, `PWA-IPHONE`:24…), thêm tệp nêu "Điều N.N" và 4 tệp mã; chỉ `AUDIT-PWA-IPHONE`:11 nêu phiên bản (v2.2.0) | Thiếu neo |
| Ràng buộc cấp dự án (Lớp 2, mẫu `09-PROJECT_OVERLAY`) | Không có tệp; luật rải ở `CLAUDE.md` §5, `ARCHITECTURE.md`, ADR-0002/0003, `SPEC` §2.3, N1 spec §6 | Thiếu |
| Khung kiến trúc | `ARCHITECTURE.md` (ép bằng `src/architecture.test.ts`), `SYSTEM-DESIGN.md`, ADR-0001…0009 | Có |
| Mô hình dữ liệu | `docs/data-dictionary.json` → `DATA-DICTIONARY.md`; `SYSTEM-DESIGN` §5; N1 spec | Có; sổ **không** ghi cột/khoá ngoại |
| Sơ đồ thực thể | 2 `erDiagram` (`SYSTEM-DESIGN.md`:198, N1 spec:57): chỉ quan hệ, không cột, thiếu `login_attempt`, `catalog_sync`, `mnt_setting`, `company_profile`, `fbk_*`. Dòng :202 (`staff |o--|| pty_party`) nói hồ sơ bắt buộc trong khi `staff.party_id` còn nullable (B5 chưa áp) | Thưa, có một chỗ lệch mã |
| Luồng vận hành (kỹ thuật) | Topology (:50), vòng đời request (:92), đăng nhập (:263) là sơ đồ; §6(b)–(j) và **máy trạng thái đơn** là văn xuôi | Một phần |
| Luồng nghiệp vụ toàn công ty | Không có. `SPEC` §1 chỉ nói "sổ đơn + máy in xác nhận"; thu tiền, điều xe mới là kế hoạch (ADR-0004/0006) | Thiếu |
| Ma trận quyền | `SYSTEM-DESIGN` §8 | Có — không làm lại |
| Mục lục | `README.md` gốc đã có bảng "Bắt đầu ở đây" (:7-19); thiếu hàng cho overlay, playbook, thứ bậc; 7/14 tài liệu `docs/*.md` chưa được nhắc | Có một phần |
| CI | Không có `.github`; `npm test` + `typecheck` chạy tay, do AI tự khai | Thiếu |
| Phạm vi `typecheck` | `tsconfig.json` loại `src/**/*.test.ts`; `scripts/`, `tests/` ngoài mọi tsconfig ⇒ "0 lỗi" **không phủ** test/script (đã thử: cài lỗi kiểu vào tệp test, `tsc` vẫn thoát 0) | Overlay phải nói đúng |
| Luật nhật ký không ghi SĐT/email/MST | Từng bị vi phạm: `staff_updated` (`src/modules/accounts/index.ts`, `PATCH /api/staff/:id`) ghi `SĐT cũ → mới` (câu 4(b) ở `docs/HANDOFF-N1.md`). **Chủ chốt SỬA 2026-09-21; đã sửa** (mã một dòng + 2 test đỏ→xanh). Dòng nhật ký cũ trên production vẫn còn số (nhật ký chỉ-thêm) | Đã sửa cho nhật ký mới; nhật ký cũ còn số |

**Dòng dõi Hiến pháp trên máy chủ dự án (đã đối chiếu):** `CoreSchemaProject/playbook` và `pt-hdv/playbook` = **v2.3.0** (P1–P21, N1–N10; băm `a10f4554`); `tourdaovn`, `nhatrangtravel`, `Aquanova`, `Master-Project-Framework` = v2.2.0 (`5374f731`); `ketoanvn/CONSTITUTION.md` = v3.1.0, văn bản khác hẳn. `CoreSchemaProject/playbook/.PINNED_VERSION`: từ 2026-08-21 **Core sở hữu lớp luật** (ADR-0027, chủ dự án chốt); nhãn "pin của `nhatrangtravel`" là sai. Tệp đó cũng còn ghi CONSTITUTION "v2.2.0" (lỗi thời) và "Sửa thẳng tại đây". Các điều tourdao-sales viện dẫn (P1, P2, P4–P7, P11, N1, N3–N5, N7; Điều 3.1, 5.8, 6.2, 7.x, 8.2, 9.7) **giữ nguyên số hiệu ở v2.3.0**.

**Nguyên tắc dẫn đường:** không viết Hiến pháp mới. Điều 9.7 (tầng dự án chỉ siết thêm), README playbook, N7, N3 và **N9 (tác nhân không tự tay sửa luật chi phối chính mình)** đều cấm. Không sao chép mẫu `00…08` vì `SPEC`, `SYSTEM-DESIGN`, `CHANGE-GUIDE` và bộ test đã phủ.

**Thứ tự ưu tiên (Điều 3.1):** Hiến pháp → Ràng buộc cấp dự án → ADR → Quy trình/Playbook → Đặc tả từng bước → Sản phẩm (mã). (`docs/adr/README.md`:17 hiện bỏ tầng Quy trình/Playbook.)

**Thuật ngữ (tránh trùng):** "**Lớp** 1/2" = tầng luật (Hiến pháp+Governance / overlay). "**Bậc** A/B/C" = bậc bằng chứng của dự án (xem quyết định 19). "N3 Hiến pháp" ≠ "giai đoạn N3" (sổ thu tiền); "E1–E3" là hạng bằng chứng của GOVERNANCE 5.2.

## 2. Quyết định của chủ dự án (2026-09-21, ghi theo P5)

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Người đọc | Chủ dự án + lập trình viên/AI kế nhiệm |
| 2 | Neo Hiến pháp | **Ghim bản sao chỉ-đọc từ `CoreSchemaProject/playbook` (v2.3.0)** vào `playbook/` gốc repo; chép toàn bộ **trừ `archive/` và `CLAUDE.md` của Core** (thay bằng `PIN-README.md`); **không viết Hiến pháp mới**. Đổi so với vòng 1 (nguồn tourdaovn) vì thông tin vòng 1 lỗi thời |
| 3 | ER | Vật lý theo module, **sinh từ schema** |
| 4 | Luồng | **Luồng nghiệp vụ toàn công ty**, gắn nhãn phủ của app (ĐÃ CÓ / MỘT PHẦN / NGOÀI APP); chỉ chủ xác nhận ("chủ xác nhận ngày …"); không ghi số chính sách; bỏ vai "Giao gas" |
| 5 | Kênh khách | Zalo/điện thoại cho sale; website `tourdaovn.com`; đại lý/CTV; khách vãng lai/quầy vé/khách sạn giới thiệu |
| 6 | Đối tác bán | **Đại lý, CTV, Lễ tân khách sạn là ba loại riêng**; ai cũng tự đặt được trong WebApp, chính sách giá khác nhau (đại lý giá tốt nhất, có công nợ); CTV và lễ tân có thể thu trước một phần, phần còn lại do **HDV thu sau**; nhân viên kinh doanh đặt giùm được |
| 7 | Thanh toán | Cọc trước + trả nốt; trả 100% trước; đại lý ghi công nợ; có xuất hoá đơn VAT cho một số khách |
| 8 | Điều hành | Người phụ trách tự điều; điều hành viên riêng; nhóm Zalo. **Điều hành viên (xe, đón, HDV) và Điều hành cano (cano, lái cano, thuỷ thủ) là hai bộ phận nối tiếp** |
| 9 | Làn nội bộ | Sale + người phụ trách; Kế toán; Chủ/Quản lý + Admin app; Điều hành viên + tài xế + HDV; Điều hành cano + lái cano + thuỷ thủ |
| 10 | Ngoại lệ nghiệp vụ | Huỷ + hoàn tiền; đổi ngày/dịch vụ sau xác nhận; thời tiết xấu/cấm biển/huỷ hàng loạt; khách không đến/đến trễ/khiếu nại; **đổi thông tin khởi hành giờ chót** (thêm/bớt khách, đổi gói) |
| 11 | Bản xem | **Artifact riêng tư trên claude.ai** (HTML, mermaid từ CDN, in PDF từ trình duyệt) |
| 12 | Ngoại lệ đang có | **Chỉ liệt kê** trong overlay (không lập bản ghi `EXC-…`, không đặt hạn mới) |
| 13 | Nhật ký không ghi SĐT/email/MST | **Viết test E1 quét tổng quát ngay đợt này**; nếu lộ vi phạm cũ thì **dừng và báo chủ** trước khi sửa mã (đã lộ: `staff_updated`, xem mục 1 và 4I) |
| 14 | Cổng QA của Governance | **Bảng ánh xạ cổng trong overlay** |
| 15 | "Mã thắng" | **Chia hai loại tài liệu**: MÔ TẢ thua mã; CHUẨN TẮC thắng mã |
| 16 | Vai trò | Chủ là **DRI duy nhất**, duyệt mọi thứ; AI thực thi |
| 17 | CI | **Thêm GitHub Actions** chạy `npm test` + `npm run typecheck` |
| 18 | Dữ liệu cá nhân | Overlay ghi: SĐT trong repo chỉ của nhân viên, không phải khách; dữ liệu khách thật không nằm trong repo và cấm đưa vào phiên AI (**lời khai của chủ**, chưa kiểm được: 50 tệp/44 chuỗi giống SĐT, chưa phân biệt thật/thử; `migrations/0016_maintenance.sql`:22 chứa một số thật) |
| 19 | Bằng chứng | **Ba bậc + trần chỉ được giảm**: Bậc A = E1 trong CI (`npm test`); Bậc B = E1 chạy tay (e2e, `audit-invariants`); Bậc C = kịch bản Chrome chạy tay kèm ngày chạy gần nhất; điều chưa có bậc nào → ghi **"dựa vào kỷ luật" (P16)** với trần = số đo được hôm nay |
| 20 | Migration bất biến | **Manifest băm migration + test** |
| 21 | Hàng rào máy | **Làm ngay** cùng đợt: hook PreToolUse + `permissions.deny` + sửa `.gitignore` (bỏ qua `.claude/worktrees/` thay vì cả `.claude/`) |
| 22 | Người kiểm | **Việc lớn** (dữ liệu, quyền, tiền, migration, deploy, luật) bắt buộc subagent kiểm độc lập chỉ đọc; việc nhỏ chỉ cần test + chủ duyệt |
| 23 | Bộ CLAUDE.md | Gốc ≤ 200 dòng + `src/CLAUDE.md` + `web/CLAUDE.md`; soạn ở `docs/superpowers/proposals/2026-09-21-claude-md/`, **chủ duyệt mới cài** (N9) |
| 24 | Cách trả lời của AI | Ngắn gọn, kết luận trước, lời thường, **không bịa**, nói rõ điều chưa kiểm |
| 25 | Đường chép `playbook/` (N9) | **Chủ ghi nhận** (trả lời 2026-09-21: "ghi nhận bằng câu trả lời này, AI chép sau"): AI chép nguyên văn từ `CoreSchemaProject/playbook` sau khi soạn ADR-0010 + `PIN-README`; ADR-0010 và nhật ký thi công ghi câu trả lời này làm bản ghi phê chuẩn đường chép |
| 26 | `staff_updated` ghi SĐT | **SỬA**: chỉ ghi "đổi SĐT đăng nhập", không ghi số (đã làm, mục 4I) |
| 27 | Gói GitHub | **Pro/Team/Enterprise**: bảo vệ nhánh và CODEOWNERS dùng được; chủ bật "yêu cầu CI xanh" trên GitHub thì CI chặn merge thật (việc của chủ, không làm được bằng mã) |
| 28 | Điều khoản "lệch có chủ ý" | **Giữ** trong `CLAUDE.md` §2: lệch đã ghi ở `SYSTEM-DESIGN` §16 (mã đúng, tài liệu chuẩn tắc lệch) thì không sửa mã, trình chủ ra ADR/dòng lịch sử |

## 3. Quyết định của người soạn sau rà soát độc lập (chủ có thể đổi)

| # | Điều chỉnh | Lý do |
|---|---|---|
| S1 | **Bỏ** `MODULE-GRAPH` sinh và việc tách `architecture-lib` | 7 cạnh `ALLOWED_EDGES` mã không import (4 có nền SQL/view, 3 hoàn toàn không dùng: orders→parties, orders→locations, staff→audit); đồ thị "import thật" sẽ mâu thuẫn `ARCHITECTURE.md`/ADR. Muốn hình: vẽ tay trong `ARCHITECTURE.md` |
| S2 | Luồng **kỹ thuật** chỉ 2 sơ đồ (trạng thái đơn, chế độ bảo trì) trong `SYSTEM-DESIGN` §6; bỏ sơ đồ phát hành | Sơ đồ phát hành là bản thứ tư của quy trình ở `CLAUDE.md`, `HANDOFF-N1`, `SYSTEM-DESIGN` §10 |
| S3 | Mục lục = **mở rộng `README.md` gốc**, không tạo `docs/README.md` | Tránh chỉ mục thứ tư (N7) |
| S4 | ER sinh **gộp vào `npm run dict`** | Một lệnh cho mọi tài liệu sinh |
| S5 | Test overlay chỉ kiểm: tệp/tên test có thật, `R-…` có trong `audit-checks.mjs` (ghi cả mức; mã `R-N1-1`, `R-N1-4` xuất hiện hai lần), **trần số dòng "dựa vào kỷ luật"**; S1.3 chỉ giữ ngưỡng sản phẩm đã có ở `SPEC` (TTI < 2 s trên 4G, xuất PNG/PDF < 3 s — chưa có bộ kiểm máy; axe 0 critical/serious) và **trỏ** tới hằng trong mã. Hằng không export (`MAX_QUANTITY`…) không đụng | Tránh overlay thành nguồn thứ ba |
| S6 | Khai `playbook/` là **điểm chạm thứ hai** với dòng dõi Core/tourdaovn: sửa `README.md`:3 và `CLAUDE.md` §1, thêm một dòng "Lịch sử thay đổi" ở `SPEC` | N4; tiền lệ `AUDIT-PWA-IPHONE` RS8 |
| S7 | `SYSTEM-DESIGN` §16 thêm cột "Ghi lúc" và "Người xử lý"; ghi vào §16 hai lệch mã (`:202`; trigger `stf_permission_keep_admin_upd`/`staff_keep_admin_upd` chưa tồn tại) | GOVERNANCE mục 6; không lập `DRIFT_LOG` thứ hai |
| S8 | Nhịp rà overlay/ghim: theo sự kiện + rà tổng mỗi quý, DRI = chủ | `governance/ARTIFACT_OWNERSHIP.md` |
| S9 | Tầng rủi ro AI (đề xuất): soạn mã/tài liệu trong worktree = T0; merge, deploy, ghi D1 remote, đặt secret = T3 | `AI_RISK_TIERING.md`; khớp `CLAUDE.md` §6 |
| S10 | Nhãn **"dựa vào kỷ luật (P16)"**; danh sách sơ bộ (đã kiểm): không `innerHTML` (không bộ kiểm nào), luật import `.ts`/không đuôi (ngoại lệ `router.ts`:4 ghi ở `ARCHITECTURE.md` nhưng `CLAUDE.md` §5 chưa nêu), R-N1-6 "không CHECK liệt kê" (không test mang mã), tên bảng số ít, xoá cứng ở module cũ (`orders/repository.ts`:343-344, `catalog/repository.ts`:166, `auth/throttle.ts`). **Có bậc nhưng ngoài CI**: ô gõ 16px và `location.replace` (Bậc C: kịch bản Chrome); PII trong nhật ký (Bậc B từng ca: `tests/e2e/parties.mjs`:182-189, `maintenance.mjs`:208-210, `dispatch.mjs`:112, `trip.mjs`:227,262 — thiếu quét chung) | Điều 8.5/P16; GOVERNANCE 5.3 |
| S11 | **Đề xuất ≠ hiệu lực (N9) và thứ tự chép:** overlay, ADR-0010, sửa `CLAUDE.md` nằm trên nhánh chưa merge, `proposed`. **T1 chỉ soạn ADR-0010 + `PIN-README`; chép `playbook/` SAU KHI chủ ghi nhận đường chép** (N9 *Ranh giới* đòi đường chép do ràng buộc dự án quy định, mà ADR-0010 do chính T1 sinh ra). `CLAUDE.md`: AI chỉ tự sửa phần MÔ TẢ (số đếm); phần chuẩn tắc nộp dưới dạng tệp đề xuất để chủ áp | N9; rà soát C |
| S12 | **Mỗi cơ chế kiểm mới phải được quan sát chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và **người kiểm tái hiện** trong bản sao tạm (lời khai của người thi công không đủ). CI ghi "chưa quan sát chạy" tới khi thấy nó chặn thật (PR cố ý lỗi bị đỏ và không merge được) | P16; N8 |
| S13 | Thi công **mỗi việc một phiên, mỗi vai một phiên, mỗi việc một commit** (P15, P19); người thi công ≠ người kiểm (chỉ đọc) ≠ chủ. Lời nhắn giao subagent theo tiêu chí PQ1–PQ6 (GOVERNANCE 4.7); báo cáo kiểm lưu ở `docs/qa-reports/` theo khuôn có mục "Điều chưa kiểm được". Nhật ký ở `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md` | Hiến pháp P14, P15, P19, P20, N8 |
| S14 | S1.8: **không** ghi "không áp dụng" cho cổng QA mà ghi **"CHƯA ĐÁP ỨNG — chờ sửa GOVERNANCE 4.4 ở Core theo mục 10.3 rồi nâng ghim"** (cổng thuộc hạng tuyệt đối N2/N6, không có Nợ hiến pháp); điều kiện ra của GOVERNANCE 4.4 mang dấu vết tourdaovn (JSON-LD, Lighthouse, `prices.yaml`, hreflang) | Điều 5.8; rà soát C |

## 4. Sản phẩm

### A. Bản chép `playbook/` (Lớp 1, chỉ đọc) — **chép sau khi chủ ghi nhận đường chép (S11)**
- Chép từ `CoreSchemaProject/playbook/`: `CONSTITUTION.md` (v2.3.0), `GOVERNANCE.md` (v1.0.0), `PLAYBOOK.md`, `FRAMEWORK.md`, `CHANGELOG.md`, `README.md`, `governance/`, `templates/`, `ai/`, `docs/`, `specs/`, `init-project.sh` (43 tệp, ~245 KB). **Loại** `archive/` và `CLAUDE.md` của Core. Không sửa nội dung tệp nào được chép (kể cả `[NEEDS HUMAN DECISION]` ở GOVERNANCE 9.3). Đã quét: không khoá/token/email/SĐT/`/Users/`; ~28 lần nhắc tên dự án khác (ketoanvn, nhatrangtravel).
- `playbook/PIN-README.md`: bản chép chỉ-đọc từ Core (ngày, phiên bản, HEAD của Core đọc từ `.git` = `65a3c2b2`; cây làm việc sạch chỉ suy từ ngày sửa tệp, không kiểm bằng `git status` được); hai tệp bị loại và lý do; **cấm chạy `init-project.sh`** (chạy nhầm tạo thư mục rác trong `tourdao-sales/`); **vô hiệu** các dòng trong bản chép nói "sửa thẳng tại đây/`.PINNED_VERSION`/README:27-28" (đúng ở Core, sai ở đây); liệt kê tham chiếu treo (CLAUDE.md và `archive/` của Core, ADR-00xx của Core, `docs/core-specs/`, `project/`); nêu `.PINNED_VERSION` của Core còn ghi v2.2.0; luật sửa: sửa ở Core rồi chép lại; AI không sửa (N9).
- `playbook/.PINNED_SHA256`: băm SHA-256 mọi tệp **trừ chính nó**, định dạng `shasum -a 256`, sắp theo byte; `.gitattributes` (`playbook/** -text`, và `migrations/** -text`) tránh chuyển CRLF. Độ trung thực với Core kiểm bằng `diff -r` **lúc chép** (log lưu vào nhật ký thi công); về sau `diff -r` vẫn làm được khi Core chưa đổi.
- Băm chống sửa nhầm, không chống sửa cả tệp lẫn manifest: lớp thứ hai (P21) là CODEOWNERS `playbook/**` + bảo vệ nhánh (chờ gói GitHub, xem 4K); tới khi có, ghi "dựa vào kỷ luật". ADR-0010 nên nêu băm của `CONSTITUTION.md` khi `accepted`.

### B. ADR-0010 — `docs/adr/ADR-0010-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (`proposed`)
Đủ khuôn ADR của repo và mẫu `03-ADR`: Trạng thái, Ngày, Người phê chuẩn (trống), **Loại quyết định** (hai chiều về tệp, nhưng nghĩa vụ đã duyệt là bánh cóc 9.4/9.7), **Liên quan**; Bối cảnh (viện dẫn chéo repo không ghim; dòng dõi Hiến pháp; hai lựa chọn của chủ theo P5, kể cả đổi nguồn tourdaovn → Core); Quyết định; **Lý do**; Phương án bị loại (viện dẫn `../CoreSchemaProject`/`../tourdaovn` — vi phạm N4, gãy khi clone; viết Hiến pháp riêng; ghim v2.2.0 từ tourdaovn — lạc hậu, nhãn sai; ghim từ `ketoanvn` v3.1.0; ghim một phần; submodule); Hệ quả (**ai trả**: DRI = chủ; nhịp nâng ghim S8; N8–N10, P14–P21 có hiệu lực ngay; GOVERNANCE 9.3 chưa chốt; việc cần sửa ở Core: 4.4). Sửa `docs/adr/README.md` (dòng 3, 17). Số 0010 trống ở mọi nhánh; kiểm lại trước khi `accepted`.

### C. Overlay Lớp 2 — `docs/PROJECT-OVERLAY-tourdao-sales.md` (v0.1.0, `proposed`; Hiệu lực và Người phê chuẩn trống)
Theo `09-PROJECT_OVERLAY`. **Hệ thống hoá điều đang có hiệu lực, không đặt nghĩa vụ mới**; điều thật sự MỚI gắn nhãn `MỚI`. Kế thừa CONSTITUTION v2.3.0 + GOVERNANCE v1.0.0 + PLAYBOOK. Dòng ràng buộc có **định dạng cố định** để test đọc được: `ID | ràng buộc | căn cứ | bậc bằng chứng | bộ kiểm hoặc "dựa vào kỷ luật (P16)"`.
- **S1.1 Stack:** trỏ ADR/`SYSTEM-DESIGN`. **S1.2 Bất biến dữ liệu:** ID `OV-D1…`, bậc bằng chứng A/B/C, bộ kiểm giải được (`tệp › tên test`, mã `R-…` kèm mức, trigger/chỉ mục, manifest migration). **S1.3 Ngưỡng số:** theo S5. **S1.4 Hệ AI và dữ liệu:** đăng ký Claude Code (dev-time, DRI = chủ, tầng S9), phân loại dữ liệu theo quyết định 18. **S1.5 Ranh giới:** dòng dõi Core/tourdaovn (hai điểm chạm: token, bản chép `playbook/`), Google Sheet, Turnstile, Cloudflare. **S1.6 Quy ước:** tiếng Việt có dấu, tên bảng số ít, tiền `INTEGER`, giờ VN, không `innerHTML`, token CSS; phân loại MÔ TẢ/CHUẨN TẮC (kèm điều khoản "lệch có chủ ý", xem 4O); chuỗi ưu tiên đủ.
- **S1.7 Khoảng trống và ngoại lệ (chỉ liệt kê):** (i) "dựa vào kỷ luật" theo S10 kèm **trần** và đề xuất bộ kiểm; (ii) ngoại lệ ở nơi khác — `LEGACY`, `wonGuard` đọc `audit_log`, lệch ADR-0003 điều 7, `orders.deposit_*` (**N7 chưa bị vi phạm**: sổ thu tiền chưa có; Nợ hiến pháp chỉ kích hoạt nếu thêm `bil_payment_receipt` mà không gỡ `deposit_*` cùng lần — ADR-0004:28), ba cạnh `ALLOWED_EDGES` không dùng, việc `staff_updated` từng ghi SĐT (đã sửa; nhật ký cũ còn số). Cần **một câu phân biệt** ngoại lệ của ADR (LEGACY, lệch ADR) với ngoại lệ của điều cấm Hiến pháp (chỉ loại sau mới cần `EXC-…`, GOVERNANCE 7.1). S1.7 chỉ TRỎ tới ngoại lệ, không cấp phép (9.7). Trần chỉ được giảm; nâng trần là nới → cần chủ (9.4/9.7); test không tự chống được việc sửa số trần, nói rõ.
- **S1.8 Bảng ánh xạ cổng:** từng cổng GOVERNANCE (QA1, QA2, cổng trước thực thi/phát hành, "agent QA độc lập", E1 cho bất biến dữ liệu, ba tầng `CONTROL_GATES`) ↔ bước thật: `npm test` + `typecheck` (**không phủ test/script**; CI khi có), `test:e2e`, `audit-invariants`, `HANDOFF-N1`, kịch bản Chrome, chủ duyệt; axe/TTI thay Lighthouse/JSON-LD. Phần không ánh xạ được ghi **"CHƯA ĐÁP ỨNG — chờ sửa ở Core rồi nâng ghim"** (S14). Chủ chịu trách nhiệm phê chuẩn bảng này.
- **S1.9 Chưa chốt:** GOVERNANCE 9.3 (`[NEEDS HUMAN DECISION]`) — kế thừa nguyên trạng.
- **S1.10 Ánh xạ điều mới của v2.3.0** (mỗi dòng có bộ kiểm hoặc "dựa vào kỷ luật"): P14 chủ duyệt; P15/N8 tách vai (S13, `CLAUDE.md` §3); P16 (S10, S12); P17 sai lầm thành luật; P18; P19 vòng nhỏ + nhật ký; P20 nghiệm thu bằng hành vi (mục 5); P21 hai lớp phòng thủ (hook + deny; băm + CODEOWNERS); N9 (test băm `playbook/`, `CLAUDE.md` đề xuất); N10 bí mật (`.dev.vars` gitignored; CI không secret).

### D. ER sinh từ schema — `docs/ER-DIAGRAM.md` (một phần của `npm run dict`)
`scripts/diagrams-lib.mjs` (thuần, **có test đơn vị**) + mở rộng `scripts/gen-data-dictionary.mjs`: dựng schema từ `migrations/*.sql` bằng `node:sqlite`; đọc `PRAGMA table_info`/`foreign_key_list`/`sqlite_master`. Đã thử ngoài repo: 27 bảng (nay thêm `fbk_*`), ~239 cột, 30 khoá ngoại, 15 trigger, mermaid 11 parse được. **Bẫy phải xử lý:** cột vừa PK vừa FK viết `PK, FK`; nhãn có `( ) : "` phải nháy; SQLite báo `notnull=0` cho khoá chính TEXT nên xét cờ `pk` (person/organization 1–1); chỉ mục duy nhất một phần không suy được cardinality; 4 cạnh toàn vẹn đi ngược cần nhãn riêng; 30 `sqlite_autoindex_*` là nhiễu; "giữ điều gì" của trigger không sinh được nên chỉ liệt kê tên; sắp xếp tường minh. Ra: `erDiagram` theo module, sơ đồ tổng cạnh xuyên module, danh sách view/trigger/chỉ mục duy nhất. Đầu tệp "Sinh tự động — không sửa tay". **Hai ER viết tay hiện có bị lệch mã (`:202`) và sẽ thành nguồn thứ ba (N7): thay bằng con trỏ sang tệp sinh, không giữ song song.**

### E. Quy trình nghiệp vụ toàn công ty — `docs/QUY-TRINH-NGHIEP-VU.md` (viết tay)
Từ lời kể của chủ (mục 2) đối chiếu mã; **không** ghi số chính sách; bước tôi suy đoán gắn `GIẢ ĐỊNH`; dòng "chủ xác nhận ngày: ____" trống tới khi chủ xác nhận. Nội dung: (1) tác nhân ngoài (Khách, Đại lý, CTV, Lễ tân KS) và làn nội bộ; (2) **Sơ đồ 1** luồng chính yêu cầu → báo giá → lập đơn nháp → gửi ảnh xác nhận (Zalo) → thu cọc/thu trước → xác nhận → người phụ trách gọi xác nhận → điều hành viên → điều hành cano → chuyến → thu nốt (HDV/quầy) → hoá đơn VAT → hậu mãi; (3) **Sơ đồ 2** ba đường đối tác; (4) **Sơ đồ 3** năm ngoại lệ; (5) bảng **nhãn phủ**; (6) bảng **khoảng cách nghiệp vụ ↔ app**, mỗi dòng kiểm mã. Đã thấy sơ bộ: HDV thu nốt nhưng ô `payment.receive` của `FIELD` = `none`; thêm/bớt khách hoặc đổi gói sau xác nhận bị khoá (`order_service_frozen_update`); đối tác tự đặt nhưng app chỉ có tài khoản nhân viên; chính sách giá theo đối tác chưa có; công nợ đại lý hoãn (ADR-0004); huỷ hàng loạt vì thời tiết chưa có; nhiệm vụ điều hành xe/cano (giai đoạn N2) chưa có; đơn từ website không tự vào app.

### F. Luồng kỹ thuật (`SYSTEM-DESIGN` §6)
Hai sơ đồ có `Nguồn mã:`: máy trạng thái đơn (`draft → confirmed | cancelled`, `confirmed → cancelled`, không đường về; `confirmGaps`; `order.modify`; sửa chuyến ở `draft`/`confirmed`, cấm ở `cancelled`) và chế độ bảo trì. Đối chiếu mã trước khi vẽ; **test so cạnh của `stateDiagram` với `canTransition`** (đã export). Lệch tài liệu ↔ mã ghi vào §16. Mermaid kiểm cú pháp ngay khi vẽ (không đợi T10).

### G. Manifest băm migration
`scripts/migrations-manifest.txt` (SHA-256 của `migrations/0001…0016`, định dạng `shasum -c`, hai tệp `0016_*`) và `src/migrations-immutable.test.ts`: **đỏ** nếu tệp đã liệt kê bị sửa/mất, và **đỏ** khi có migration mới chưa vào manifest (buộc thêm một dòng). Quy ước: manifest **chỉ được thêm dòng**; B5 (`staff_party_required`) vào manifest khi áp. Không đụng `migrations/`. Lưu ý: `0016_maintenance.sql`:22 có một số điện thoại thật sẽ bị khoá vĩnh viễn.

### H. Test chống trôi — `src/standards.test.ts` (+ `src/diagrams-lib.test.ts`)
(1) **Ghim:** tệp trên đĩa = khoá manifest ∪ {`.PINNED_SHA256`}, loại `.DS_Store`, băm khớp; dùng `import.meta.url` như `architecture.test.ts`; (2) **overlay:** mọi dòng ràng buộc có bộ kiểm giải được hoặc nhãn "dựa vào kỷ luật" với **trần**; ADR/migration nêu tên có thật; (3) **tươi:** `ER-DIAGRAM.md` khớp bản sinh lại; so cạnh sơ đồ trạng thái đơn với `canTransition`; (4) **mục lục:** mọi `docs/*.md` **do đợt này thêm/sửa** và `docs/adr/*.md` có mặt trong `README.md`/`docs/adr/README.md` (không đòi cả 7 tài liệu cũ ngay ngày đầu); (5) bộ sinh ER: ca `PK, FK`, nháy nhãn, cờ `pk`, thứ tự xác định. Mỗi cơ chế theo S12.

### I. Test E1 quét PII trong nhật ký (quyết định 13)
Khẳng định không dòng `audit_log.detail` nào chứa giá trị PII đã gieo khi chạy các đường ghi nhật ký thật. **Vi phạm đã biết `staff_updated` ĐÃ SỬA theo quyết định 26** (mã `src/modules/accounts/index.ts` một dòng; 2 bài đỏ→xanh ở `patch-staff.test.ts`, chạy đúng câu lệnh route trên SQLite thật; người kiểm E xác nhận độc lập). Bài quét chung còn lại (mọi nơi dựng `detail`) do T3 làm, dùng bản kiểm kê của người kiểm E. Nhật ký cũ trên production vẫn còn số (chỉ-thêm) — không xoá. Cách chạy (test đơn vị nếu gọi được hàm dựng nhật ký thuần — harness `fakeD1` hiện chỉ có theo từng module; nếu không thì `tests/e2e`, cần mạng, khi đó thuộc **Bậc B**) chốt ở kế hoạch. **Không sửa mã ứng dụng khi chưa có quyết định của chủ.**

### K. CI — `.github/workflows/ci.yml` (quyết định 17)
`push` và `pull_request`: `npm ci`, `npm test`, `npm run typecheck`; không secret (N10), không e2e (cần mạng + Turnstile), **không** `npm run types` (làm mất `SESSION_SECRET` khỏi `Env`). Node ghim đúng minor đã kiểm (22.22.x; `node:sqlite` cần ≥ 22.13, bỏ cờ type-stripping cần ≥ 22.18). `package-lock.json` và `worker-configuration.d.ts` được git theo dõi nên chạy được trên máy sạch. **Chưa chạy trên GitHub** ⇒ "chưa quan sát chạy" (P16). Chủ dùng gói **trả phí** (quyết định 27) nên bảo vệ nhánh/CODEOWNERS dùng được: sau khi CI chạy lần đầu, chủ bật "yêu cầu CI xanh" và `playbook/**` trong CODEOWNERS; khi đó (và chỉ khi đó, sau khi quan sát PR cố ý lỗi bị chặn) CI mới được coi là chặn thật (P16).

### L. Cập nhật cùng commit (phần chuẩn tắc nộp dưới dạng đề xuất — S11)
`README.md` gốc (hàng overlay, `playbook/`, quy trình nghiệp vụ, ER, thứ bậc; sửa câu "điểm chạm duy nhất"); `ARCHITECTURE.md` (đầu tệp, và câu "mã lệch là lỗi" khớp quyết định 15); `SPEC` (một dòng lịch sử); `SYSTEM-DESIGN` §16 (S7) và dòng đầu (:5 "mã thắng"); `docs/adr/README.md`; số test ở `CLAUDE.md` (phần MÔ TẢ, AI tự sửa được). `CLAUDE.md`, §1–§9 chuẩn tắc: xem 4O.

### M. Bản xem (quyết định 11)
Sau khi chủ duyệt nội dung cuối, đăng **một Artifact riêng tư** (HTML, mermaid từ CDN, in PDF từ trình duyệt). **Bản chụp có ghi commit nguồn**, không phải nguồn (N7). Nội dung rời repo lên dịch vụ ngoài nên chỉ đăng khi chủ đồng ý. Không có SĐT/khoá trong sơ đồ.

### N. Hàng rào máy — **ĐÃ LÀM** (commit trên nhánh, chỉ siết AI; quyết định 21)
- `.claude/hooks/guard-remote.mjs` + `guard-remote-lib.mjs` (hook PreToolUse cho Bash), `.claude/settings.json` (`permissions.deny` + móc), `.gitignore` (bỏ qua `.claude/worktrees/`, `settings.local.json`, `scheduled_tasks.lock`), `src/claude-guard.test.ts` + `src/claude-guard.cases.json` (290 ca do người kiểm D soạn).
- Chặn: `git push`, `git merge` khi ở main/không rõ nhánh/đổi thư mục trước, `gh pr merge`, `wrangler deploy|secret|rollback|versions deploy|upload|triggers|delete`, `wrangler dev --remote`, `wrangler d1 execute|migrations apply|… ` không `--local`, `npm run db:migrate:remote`, `import-staff.mjs --db remote`, kịch bản/curl ghi lên `booking.tourdao.vn`. Thân heredoc/thông điệp commit không bị coi là lệnh.
- **Đã quan sát** (không phải lời khai): hook cho 0 lọt trong 154 ca "quên/nhầm" và 0 chặn nhầm trong 108 ca thường ngày/heredoc; test đỏ khi phá cố ý 5 kiểu (bỏ quy tắc `git push`, chặn thừa `d1 --local`, bỏ qua lại `.claude/`, bỏ bước heredoc, bỏ nhận `wrangler@x`) rồi hoàn nguyên. **Chưa quan sát** hook chặn trong một phiên Claude Code thật (hai phiên thử đều không thấy nó chạy; cấu hình tạo giữa phiên). Theo P16 **chưa được coi là "đang hoạt động"** cho tới khi chủ mở `/hooks` hoặc khởi động lại và thấy nó chặn.
- Giới hạn đã nêu (ở đầu tệp hook): ~24 kiểu cố ý lách lọt; `permissions.deny` cũng khớp chuỗi nên P21 mới đạt một phần; phiên bắt đầu ở checkout gốc của `main` không có hook cho tới khi nhánh này được gộp.

### O. Bộ CLAUDE.md đề xuất — **ĐÃ SOẠN** (quyết định 22–24; chưa cài, N9)
`docs/superpowers/proposals/2026-09-21-claude-md/` (`CLAUDE.md` gốc 92 dòng, `src/CLAUDE.md` 33, `web/CLAUDE.md` 28, `README.md` liệt kê điều MỚI cần duyệt và điều đã bỏ). Căn cứ: tài liệu Anthropic, `CLAUDE.md` của tourdaovn, bản cũ, quyết định của chủ, và kiểm độc lập D (31 khẳng định đúng; đã sửa các điểm D nêu). **Điều khoản cần chủ xác nhận riêng:** (1) "lệch có chủ ý" ở `SYSTEM-DESIGN` §16 (mã đúng, tài liệu chuẩn tắc lệch) không sửa mã mà trình chủ ra ADR/lịch sử; (2) "chỉ deploy từ `main` đã gộp"; (3) "hook không có công tắc tạm, chủ chạy bằng `!`"; (4) §7 nêu vi phạm `staff_updated` **đã sửa 2026-09-21** (nhật ký cũ còn số).

## 5. Tiêu chí nghiệm thu (P20 — đặt trước khi làm; do người kiểm độc lập và chủ xác nhận, không do người thi công tự khai)
- `npm test` xanh, số test **tăng** (đo lại trên `main`; ghi vào `CLAUDE.md`); `npm run typecheck` 0 lỗi **và** kiểm kiểu một lần bằng `tsc` riêng cho tệp test/script mới (cấu hình repo loại chúng); đính kèm log lệnh.
- `npm run dict` chạy lần 2 **không đổi** tệp nào.
- **Mỗi cơ chế kiểm mới** (băm `playbook/`, manifest migration, quét PII, ER tươi, so cạnh trạng thái đơn, trần overlay, hook) có **một lần quan sát chặn thật** do **người kiểm tái hiện** trong bản sao tạm.
- 100% dòng ràng buộc overlay có bộ kiểm giải được hoặc nhãn "dựa vào kỷ luật"; số nhãn ≤ trần; danh sách và trần được báo.
- ADR-0010: đủ các mục ở 4B, số 0010 trống; overlay: bảng ánh xạ cổng có cột "trạng thái thật"; bản chép `playbook/`: `diff -r` với Core = 0 lúc chép; quy trình nghiệp vụ: mọi bước có nhãn phủ, số bước `GIẢ ĐỊNH` và số dòng khoảng cách được báo; bản xem: có ghi commit nguồn.
- 100% khối mermaid mới qua `mermaid.parse` ngoài repo; không chạy được thì báo "chưa kiểm cú pháp".
- Không đụng `migrations/`, logic `src/modules/**` (trừ khi chủ quyết sửa `staff_updated`), `docs/data-dictionary.json`, `src/architecture.test.ts`; không push, merge, deploy; không sửa `playbook/` sau khi chép.
- e2e **không chạy** (không chạm API/migration) — báo rõ. CI: "chưa quan sát chạy". Hook: "chưa quan sát trong phiên thật".

## 6. Điểm chờ chủ dự án
1. Duyệt đặc tả v3.1 (hoặc chỉnh mục 3).
2. ~~Đường chép `playbook/`~~, ~~`staff_updated`~~, ~~gói GitHub~~, ~~điều khoản "lệch có chủ ý"~~: **đã có quyết định 25–28** (mục 2).
3. Xác nhận ba điều khoản còn lại ở 4O: "chỉ deploy từ `main` đã gộp", "hook không có công tắc tạm, chủ chạy bằng `!`", ghi việc `staff_updated` đã sửa ở §7; duyệt bộ `CLAUDE.md` đề xuất rồi cài.
4. Trên GitHub (việc của chủ, tôi không làm được bằng mã): sau khi CI chạy lần đầu, bật "yêu cầu CI xanh" cho nhánh `main` và CODEOWNERS cho `playbook/**` (4K).
5. Cân nhắc thêm: nhật ký production cũ vẫn chứa SĐT (chỉ-thêm) — giữ hay xử lý riêng (ngoài đợt này).
6. Mở `/hooks` hoặc khởi động lại phiên để hook được nạp, và cho biết có thấy nó chặn không (P16).
7. Sau thi công: phê chuẩn overlay v0.1.0 và bảng ánh xạ cổng (rủi ro S14); chuyển ADR-0010 sang `accepted`; xác nhận sơ đồ nghiệp vụ; chốt tầng rủi ro AI (S9), GOVERNANCE 9.3, ba cạnh `ALLOWED_EDGES` không dùng; đối chiếu `playbook/` với Core; đồng ý đăng Artifact.

## 7. Giả định, rủi ro và rà soát độc lập
- Bốn lượt kiểm A–D đã tích hợp; lỗi sự thật của v1/v2/v3 đã sửa ở mục 1. Không kiểm được (theo các người kiểm): e2e, kịch bản Chrome, renderer mermaid của người đọc, CI thật, `git status` của Core, gói GitHub, 44 chuỗi số là thật hay thử, `!` có qua hook không, `web/CLAUDE.md` có nạp khi làm bằng Bash không.
- Danh sách "dựa vào kỷ luật" (S10) là sơ bộ; kiểm kê chính xác lập khi viết overlay.
- Overlay có thể bị coi là nới (S14); rủi ro nằm ở chủ phê chuẩn.
- Đợt này không thi công giai đoạn N2/N3/B5 và không đổi hành vi ứng dụng, ngoại trừ nếu chủ chọn sửa `staff_updated`.

## 8. Thứ tự thi công đề nghị (mỗi việc một phiên, mỗi vai một phiên, mỗi việc một commit — S13)
**Đã làm:** N (hàng rào), O (bộ `CLAUDE.md` đề xuất). **Tiếp:** T1 soạn ADR-0010 + `PIN-README` (chưa chép) → chủ ghi nhận đường chép → T1b chép `playbook/` + `.PINNED_SHA256` + test băm → T2 manifest migration + test → T3 test quét PII (sau quyết định câu 4(b)) → T4 bộ sinh ER + test đơn vị + `dict` + test tươi → T5 luồng kỹ thuật (`SYSTEM-DESIGN` §6, §16) + test so cạnh → T6 kiểm kê ràng buộc ↔ bộ kiểm và overlay + test tham chiếu/trần → T7 quy trình nghiệp vụ (đối chiếu mã) → T8 `README.md`, `ARCHITECTURE.md`, `SPEC`, `docs/adr/README.md` + cài `CLAUDE.md` đã duyệt → T9 CI → T10 bản xem (sau khi chủ đồng ý). Mỗi T: người thi công → người kiểm độc lập (chỉ đọc, tái hiện cơ chế) → chủ duyệt; nhật ký ghi từng bước.
