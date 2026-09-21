# Đặc tả thiết kế — Bộ tiêu chuẩn nền tảng của tourdao-sales (v3)

> Trạng thái: **ĐỀ XUẤT v3 — chờ chủ dự án duyệt** (2026-09-21). v1 = commit `0fd91b5`; v3 hợp nhất hai lượt rà soát độc lập bằng subagent (kiểm sự thật/khả thi; tuân thủ Hiến pháp/YAGNI) và chín lượt hỏi chủ dự án (34 câu).
> Đây là đặc tả, không phải mã: **chưa có tệp nào của bộ tiêu chuẩn được viết, ghim, sinh hay đẩy lên.** Mục 2 là lựa chọn của chủ dự án; mục 3 là đề xuất của người soạn, chủ có thể đổi.
> **Về vai (Hiến pháp v2.3.0 P15, N8):** người soạn đặc tả/kế hoạch **không thi công và không nghiệm thu**. Mọi kết luận "đạt" ở mục 5 do người kiểm độc lập (subagent chỉ đọc) và chủ dự án đưa ra, không do người soạn tự khai.

## 1. Kiểm kê (đã kiểm chứng bằng đọc mã, tài liệu và so băm tệp trên máy)

Yêu cầu gốc: "dự án dường như thiếu Hiến pháp, khung kiến trúc, mô hình dữ liệu, sơ đồ thực thể, luồng logic vận hành". Giả định **đúng một phần**:

| Hạng mục | Hiện có | Kết luận |
|---|---|---|
| Hiến pháp | Không có bản trong repo. ≥ 14 tệp nêu tên nó (`SPEC`:3, `docs/adr/README.md`:3,17, `ADR-0004`:5, `AUDIT-PWA-IPHONE`:11, `PWA-IPHONE`:24…), thêm ≥ 13 tệp nêu "Điều N.N" và 4 tệp mã (`src/architecture.test.ts`:2, `src/shared/permissions.ts`:2…), mà chỉ `AUDIT-PWA-IPHONE`:11 nêu phiên bản (v2.2.0) | Thiếu neo |
| Ràng buộc cấp dự án (Lớp 2, mẫu `09-PROJECT_OVERLAY`) | Không có tệp; luật rải ở `CLAUDE.md` §5, `ARCHITECTURE.md`, ADR-0002/0003, `SPEC` §2.3, N1 spec §6 | Thiếu |
| Khung kiến trúc | `ARCHITECTURE.md` (ép bằng `src/architecture.test.ts`), `SYSTEM-DESIGN.md`, ADR-0001…0009 | Có |
| Mô hình dữ liệu | `docs/data-dictionary.json` → `DATA-DICTIONARY.md`; `SYSTEM-DESIGN` §5; N1 spec | Có; sổ **không** ghi cột/khoá ngoại |
| Sơ đồ thực thể | 2 `erDiagram` (`SYSTEM-DESIGN.md`:198, N1 spec:57): chỉ quan hệ, không cột, thiếu `login_attempt`, `catalog_sync`, `mnt_setting`, `company_profile`. Dòng :202 (`staff |o--|| pty_party`) nói hồ sơ bắt buộc trong khi `staff.party_id` còn nullable (B5 chưa áp) | Thưa, có một chỗ lệch mã |
| Luồng vận hành (kỹ thuật) | Topology (:50), vòng đời request (:92), đăng nhập (:263) là sơ đồ; §6(b)–(j) và **máy trạng thái đơn** là văn xuôi | Một phần |
| Luồng nghiệp vụ toàn công ty | Không có. `SPEC` §1 chỉ nói "sổ đơn + máy in xác nhận"; thu tiền, điều xe mới là kế hoạch (ADR-0004/0006) | Thiếu |
| Ma trận quyền | `SYSTEM-DESIGN` §8 | Có — không làm lại |
| Mục lục | `README.md` gốc đã có bảng "Bắt đầu ở đây" (:7-19); thiếu hàng cho overlay, playbook, thứ bậc | Có một phần |
| CI | Không có `.github`; `npm test` + `typecheck` chạy tay, do AI tự khai | Thiếu |
| Phạm vi `typecheck` | `tsconfig.json` loại `src/**/*.test.ts`; `scripts/`, `tests/` ngoài mọi tsconfig ⇒ "0 lỗi" **không phủ** test/script (đã thử: cài lỗi kiểu vào một tệp test, `tsc` vẫn thoát 0) | Overlay phải nói đúng |

**Dòng dõi Hiến pháp trên máy chủ dự án (đã đối chiếu):** `CoreSchemaProject/playbook` và `pt-hdv/playbook` = **v2.3.0** (P1–P21, N1–N10; băm `a10f4554`); `tourdaovn`, `nhatrangtravel`, `Aquanova`, `Master-Project-Framework` = v2.2.0 (P1–P13, N1–N7; `5374f731`); `ketoanvn/CONSTITUTION.md` = v3.1.0, văn bản khác hẳn (lệch 445 dòng). `CoreSchemaProject/playbook/.PINNED_VERSION` ghi: từ 2026-08-21 **Core sở hữu lớp luật** (ADR-0027, chủ dự án chốt), nhãn "pin của `nhatrangtravel`" là sai; sửa thẳng ở Core, không đồng bộ ngược. Các điều tourdao-sales đang viện dẫn (P1, P2, P4, P5, P6, P7, P11, N1, N3, N4, N5, N7; Điều 3.1, 5.8, 6.2, 7.x, 8.2, 9.7) **giữ nguyên số hiệu ở v2.3.0**. Nếu ghi chuỗi nguồn ở v1/v2 ("`nhatrangtravel` → `tourdaovn` → ghim này") là **SAI** và đã bị bỏ.

**Nguyên tắc dẫn đường:** không viết Hiến pháp mới. Điều 9.7 (tầng dự án chỉ siết thêm), README playbook, N7, N3 và **N9 (v2.3.0: tác nhân không tự tay sửa luật chi phối chính nó)** đều cấm. Không sao chép mẫu `00…08` vì `SPEC`, `SYSTEM-DESIGN`, `CHANGE-GUIDE` và bộ test đã phủ.

**Thứ tự ưu tiên (Điều 3.1, trích đủ):** Hiến pháp → Ràng buộc cấp dự án → ADR → Quy trình/Playbook → Đặc tả từng bước → Sản phẩm (mã). (`docs/adr/README.md`:17 hiện bỏ tầng Quy trình/Playbook.)

## 2. Quyết định của chủ dự án (2026-09-21, ghi theo P5)

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Người đọc | Chủ dự án + lập trình viên/AI kế nhiệm |
| 2 | Neo Hiến pháp | **Ghim bản sao chỉ-đọc từ `CoreSchemaProject/playbook` (Hiến pháp v2.3.0)** đặt ở `playbook/` gốc repo; **chép toàn bộ trừ `archive/` và `CLAUDE.md` của Core** (`CLAUDE.md` của Core dạy "sửa thẳng tại đây", sai ở nơi bản chép phải chỉ-đọc; thay bằng một README ghim ngắn). Đổi so với vòng 1 (nguồn tourdaovn v2.2.0) vì thông tin vòng 1 lỗi thời; **không viết Hiến pháp mới** |
| 3 | ER | Vật lý theo module, **sinh từ schema** |
| 4 | Luồng | **Luồng nghiệp vụ toàn công ty**, gắn nhãn phủ của app (ĐÃ CÓ / MỘT PHẦN / NGOÀI APP); **chỉ chủ xác nhận** ("chủ xác nhận ngày …"); không ghi số chính sách ("theo chính sách công ty"); bỏ vai "Giao gas" |
| 5 | Kênh khách | Zalo/điện thoại cho sale; website `tourdaovn.com`; đại lý/CTV; khách vãng lai/quầy vé/khách sạn giới thiệu |
| 6 | Đối tác bán | **Đại lý, Cộng tác viên (CTV), Lễ tân khách sạn là ba loại riêng**; ai cũng tự đặt được trong WebApp, chính sách giá khác nhau (đại lý giá tốt nhất, có công nợ); CTV và lễ tân có thể thu trước một phần của khách, phần còn lại do **HDV của công ty thu sau**; nhân viên kinh doanh có thể đặt giùm |
| 7 | Thanh toán | Cọc trước + trả nốt khi đi/tại quầy; trả 100% trước; đại lý ghi công nợ; có xuất hoá đơn VAT cho một số khách |
| 8 | Điều hành | Người phụ trách đơn tự điều; có điều hành viên riêng; nhóm Zalo theo chuyến/ngày. **Điều hành viên (xe, đón, HDV) và Điều hành cano (cano, lái cano, thuỷ thủ) là hai bộ phận nối tiếp** |
| 9 | Làn nội bộ | Sale + người phụ trách; Kế toán; Chủ/Quản lý + Admin app; Điều hành viên + tài xế + HDV; Điều hành cano + lái cano + thuỷ thủ |
| 10 | Ngoại lệ nghiệp vụ | Huỷ + hoàn tiền; đổi ngày/dịch vụ sau xác nhận; thời tiết xấu/cấm biển/huỷ hàng loạt; khách không đến/đến trễ/khiếu nại; **đổi thông tin khởi hành giờ chót** (thêm/bớt khách, đổi gói) |
| 11 | Bản xem | **Artifact riêng tư trên claude.ai** (HTML, mermaid từ CDN, in PDF từ trình duyệt); không thêm phụ thuộc vào repo |
| 12 | Ngoại lệ đang có | **Chỉ liệt kê** trong overlay (không lập bản ghi `EXC-…`, không đặt hạn mới) |
| 13 | Nhật ký không ghi SĐT/email/MST | **Viết test E1 quét tổng quát ngay đợt này** (đã có e2e cục bộ từng ca, thiếu quét chung) |
| 14 | Cổng QA của Governance | **Bảng ánh xạ cổng trong overlay** |
| 15 | "Mã thắng" | **Chia hai loại tài liệu**: MÔ TẢ (`SYSTEM-DESIGN`, `DATA-DICTIONARY`, `CHANGE-GUIDE`) thua mã → sửa tài liệu; CHUẨN TẮC (Hiến pháp, overlay, ADR, luật `ARCHITECTURE`, `SPEC` đã duyệt) thắng mã → mã lệch là lỗi |
| 16 | Vai trò | Chủ là **DRI duy nhất**, duyệt mọi thứ; AI thực thi |
| 17 | CI | **Thêm GitHub Actions** chạy `npm test` + `npm run typecheck` trong đợt này |
| 18 | Dữ liệu cá nhân | Overlay ghi: SĐT trong repo chỉ của nhân viên, không phải khách; dữ liệu khách thật không nằm trong repo và cấm đưa vào phiên AI; chủ chấp nhận (**lời khai của chủ**, chưa kiểm được: ≥ 30 tệp chứa chuỗi 10 số giống SĐT, chưa phân biệt thật/thử) |
| 19 | Bằng chứng | **Ba lớp + trần chỉ được giảm**: E1-CI (trong `npm test`) / E1-chạy-tay (e2e, `audit-invariants`) / kịch bản Chrome chạy tay kèm ngày chạy gần nhất; điều chưa có lớp nào được ghi **"dựa vào kỷ luật" (P16)** với trần = số đo được hôm nay |
| 20 | Migration bất biến | **Thêm manifest băm migration 0001–0016 + test** (bộ kiểm cho luật đã có ở `CLAUDE.md` §5, hiện chỉ 0014 có test chặn) |

## 3. Quyết định của người soạn sau rà soát độc lập (chủ có thể đổi)

| # | Điều chỉnh | Lý do |
|---|---|---|
| S1 | **Bỏ** `MODULE-GRAPH` sinh và việc tách `architecture-lib` | Đã đo: 0 cạnh import ngoài `ALLOWED_EDGES` nhưng **7 cạnh khai mà mã không import** (dispatch→parties/locations, orders→staff/parties/locations, parties→locations, staff→audit; phần lớn là cạnh FK/view ở SQL). Đồ thị "import thật" sẽ mâu thuẫn `ARCHITECTURE.md`/ADR nếu không phân ba loại cạnh (import / SQL / tiêm). Tách còn cần `walk`, `SRC` — không chỉ hai hàm. Muốn có hình thì vẽ tay trong `ARCHITECTURE.md` |
| S2 | Luồng **kỹ thuật** chỉ 2 sơ đồ (trạng thái đơn, chế độ bảo trì) trong `SYSTEM-DESIGN` §6; bỏ sơ đồ phát hành | Sơ đồ phát hành là bản thứ tư của quy trình ở `CLAUDE.md` §6, `HANDOFF-N1`, `SYSTEM-DESIGN` §10 |
| S3 | Mục lục = **mở rộng `README.md` gốc**, không tạo `docs/README.md` | Tránh chỉ mục thứ tư (N7): `README.md`, `CLAUDE.md` §2, `ARCHITECTURE.md`:5, `SYSTEM-DESIGN`:3-4 đã là mục lục |
| S4 | ER sinh **gộp vào `npm run dict`** | Một lệnh cho mọi tài liệu sinh |
| S5 | Test overlay chỉ kiểm: tệp và tên test có thật, `R-…` có trong `audit-checks.mjs` (ghi cả mức `fail`/`warn…`; mã `R-N1-1`, `R-N1-4` xuất hiện hai lần), **trần số dòng "dựa vào kỷ luật"**; S1.3 chỉ giữ ngưỡng sản phẩm đã có ở `SPEC` (TTI < 2 s trên 4G, xuất PNG/PDF < 3 s: chưa có bộ kiểm máy, chỉ đo localhost; axe 0 critical/serious) và **trỏ** tới hằng trong mã (`MAX_DAYS_AHEAD`…) thay vì chép. Hằng không export (`MAX_QUANTITY`…) không đụng vì cấm sửa `src/modules/**` | Tránh overlay thành nguồn thứ ba |
| S6 | Khai `playbook/` là **điểm chạm thứ hai** với dòng dõi Core/tourdaovn (ngoài token màu/font): sửa `README.md`:3 và `CLAUDE.md` §1, thêm một dòng "Lịch sử thay đổi" ở `SPEC` (không sửa nội dung đã duyệt) | N4; tiền lệ `AUDIT-PWA-IPHONE` RS8 |
| S7 | `SYSTEM-DESIGN` §16 thêm cột "Ghi lúc" và "Người xử lý" (dòng cũ "—"); ghi vào §16 hai lệch mã đã phát hiện: `:202` (`party_id` nullable) và trigger `stf_permission_keep_admin_upd`/`staff_keep_admin_upd` mà N1 spec R-N1-5 nêu nhưng chưa tồn tại (0012:72 hoãn B5) | GOVERNANCE mục 6; không lập `DRIFT_LOG` thứ hai |
| S8 | Nhịp rà overlay/ghim: theo sự kiện + rà tổng mỗi quý, DRI = chủ | `governance/ARTIFACT_OWNERSHIP.md` |
| S9 | Tầng rủi ro AI (đề xuất): soạn mã/tài liệu trong worktree = T0; merge, deploy, ghi D1 remote, đặt secret = T3 | `AI_RISK_TIERING.md`; khớp `CLAUDE.md` §6 |
| S10 | Nhãn **"DỰA VÀO KỶ LUẬT (P16)"** thay "CHƯA CÓ BỘ KIỂM/E3 tạm"; danh sách sơ bộ (có thể thay đổi khi lập kiểm kê): không `innerHTML` (không bộ kiểm ở lớp nào), luật import `.ts`/không đuôi (chỉ `src/shared/router.ts`:4 là ngoại lệ ghi ở `ARCHITECTURE.md` nhưng `CLAUDE.md` §5 chưa nêu), "không CHECK liệt kê" (R-N1-6 không test nào mang mã), tên bảng số ít, UI không lộ chữ Anh, danh sách entry `build:web`, xoá cứng ở module LEGACY (`orders/repository.ts`:343-344). Riêng ô gõ 16px và `location.replace` có kịch bản Chrome (lớp 3, ngoài CI) | Điều 8.5/P16; GOVERNANCE 5.3 ("E3 đơn độc không bao giờ đủ"); rà soát A đo được chỉ `innerHTML` là không có bộ kiểm ở lớp nào |
| S11 | **Đề xuất ≠ hiệu lực (N9):** overlay, ADR-0010 và các sửa `CLAUDE.md` nằm trên nhánh chưa merge, trạng thái `proposed`; AI không chuyển ADR sang `accepted` và không tuân theo bản đã sửa cho tới khi chủ duyệt và ghi nhận (ADR-0010 + dòng lịch sử). Bản chép Hiến pháp là **nguyên văn văn bản chủ đã phê chuẩn ở Core** (CHANGELOG của Core ghi "Duyệt: Lưu Tuấn Vũ") — đường chép do ADR-0010 quy định | N9 *Ranh giới*, Điều 9.4 |
| S12 | **Mỗi cơ chế kiểm mới phải được quan sát chặn thật một lần** (sửa cố ý → test đỏ → hoàn nguyên), ghi log vào nhật ký thi công; CI ghi **"chưa quan sát chạy"** tới khi chủ đẩy và thấy nó chạy | P16 (cơ chế chưa từng bị bắt chặn thì chưa được đếm) |
| S13 | Thi công **theo vòng nhỏ, mỗi việc một phiên, mỗi vai một phiên** (P15, P19, N8): người thi công (subagent) ≠ người kiểm (subagent độc lập, chỉ đọc, báo cáo, không sửa) ≠ chủ duyệt (P14). Nhật ký thi công ở `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md` (trạng thái sống trong tài liệu, không trong trí nhớ phiên) | Hiến pháp v2.3.0 P14, P15, P19, P20, N8 |

## 4. Sản phẩm

### A. Bản ghim `playbook/` (Lớp 1, chỉ đọc)
- Chép từ `CoreSchemaProject/playbook/` vào `playbook/` gốc repo: `CONSTITUTION.md` (v2.3.0), `GOVERNANCE.md` (v1.0.0), `PLAYBOOK.md`, `FRAMEWORK.md`, `CHANGELOG.md`, `README.md`, `governance/`, `templates/`, `ai/`, `docs/`, `specs/`, `init-project.sh`. **Loại** `archive/` (lịch sử của Core) và `CLAUDE.md` của Core. Không sửa nội dung tệp nào được chép (kể cả `[NEEDS HUMAN DECISION]` ở GOVERNANCE 9.3).
- Thêm `playbook/PIN-README.md`: bản chép chỉ-đọc từ Core (ngày, phiên bản Hiến pháp/Governance/CHANGELOG cao nhất, HEAD của Core đọc từ `.git` — **không kiểm được cây làm việc của Core sạch**, vì phiên này không chạy được lệnh git sang repo khác), hai tệp bị loại và lý do, luật sửa (sửa ở Core, chép lại, nâng ghim; AI không sửa — N9).
- `playbook/.PINNED_SHA256`: băm SHA-256 mọi tệp trừ chính nó, định dạng `shasum -a 256`, sắp theo byte, đường dẫn chuẩn hoá NFC; thêm `.gitattributes` (`playbook/** -text`) để tránh chuyển CRLF.
- Không đối chiếu được nguyên byte với Core sau này nếu Core đổi; đó là điều `PIN-README` phải nói.

### B. ADR-0010 — `docs/adr/ADR-0010-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (`proposed`)
Đủ khuôn ADR của repo và mẫu `03-ADR`: Trạng thái, Ngày, Người phê chuẩn (trống), **Loại quyết định** (hai chiều về tệp, nhưng nghĩa vụ đã duyệt là bánh cóc 9.4/9.7), **Liên quan**; Bối cảnh (viện dẫn chéo repo không ghim; **dòng dõi Hiến pháp** ở mục 1; hai lựa chọn của chủ ghi theo P5, kể cả việc đổi nguồn từ tourdaovn sang Core); Quyết định (ghim từ Core + overlay); **Lý do**; Phương án bị loại (viện dẫn `../CoreSchemaProject`/`../tourdaovn` — vi phạm N4, gãy khi clone; viết Hiến pháp riêng; ghim từ tourdaovn v2.2.0 — lạc hậu, nhãn nguồn sai; ghim từ `ketoanvn` v3.1.0 — văn bản khác; ghim một phần — tham chiếu treo; submodule); Hệ quả (**ai trả**: DRI = chủ; nhịp nâng ghim S8; N8–N10 và P14–P21 có hiệu lực ngay; mục 9.3 GOVERNANCE chưa chốt). Sửa `docs/adr/README.md` (dòng 3, dòng 17) và thêm dòng bảng. Số 0010 trống (đã kiểm nhánh/worktree); kiểm lại trước khi `accepted`.

### C. Overlay Lớp 2 — `docs/PROJECT-OVERLAY-tourdao-sales.md` (v0.1.0, `proposed`; Hiệu lực và Người phê chuẩn trống tới khi chủ duyệt)
Theo `09-PROJECT_OVERLAY`. **Hệ thống hoá điều đang có hiệu lực, không đặt nghĩa vụ mới**; điều thật sự MỚI gắn nhãn `MỚI`. Kế thừa CONSTITUTION v2.3.0 + GOVERNANCE v1.0.0 + PLAYBOOK.
- **S1.1 Stack:** trỏ ADR/`SYSTEM-DESIGN`. **S1.2 Bất biến dữ liệu:** mỗi dòng có ID (`OV-D1…`), căn cứ, **lớp bằng chứng** (1/2/3 theo quyết định 19) và bộ kiểm giải được (`tệp › tên test`, `R-…` kèm mức, tên trigger/chỉ mục, manifest migration) hoặc nhãn "dựa vào kỷ luật (P16)". **S1.3 Ngưỡng số:** theo S5. **S1.4 Hệ AI và dữ liệu:** dòng đăng ký Claude Code (dev-time, DRI = chủ, tầng S9), phân loại dữ liệu theo quyết định 18. **S1.5 Ranh giới:** dòng dõi Core/tourdaovn (hai điểm chạm: token, bản chép `playbook/`), Google Sheet (nguồn nhập, D1 là nguồn sự thật), Turnstile, Cloudflare. **S1.6 Quy ước:** tiếng Việt có dấu, tên bảng số ít, tiền `INTEGER`, giờ VN, không `innerHTML`, token CSS; **phân loại MÔ TẢ/CHUẨN TẮC**; chuỗi ưu tiên đủ.
- **S1.7 Khoảng trống và ngoại lệ (chỉ liệt kê):** (i) mục "dựa vào kỷ luật" theo S10 kèm **trần** và đề xuất bộ kiểm; (ii) ngoại lệ đã ghi ở nơi khác — `LEGACY`, `wonGuard` đọc `audit_log`, lệch ADR-0003 điều 7, `orders.deposit_*` (**N7 chưa bị vi phạm**: sổ thu tiền chưa có; Nợ hiến pháp chỉ kích hoạt nếu thêm `bil_payment_receipt` mà không gỡ `deposit_*` cùng lần — ADR-0004:28); ba cạnh `ALLOWED_EDGES` không dùng (giữ cho N2 hay siết: chờ chủ). S1.7 chỉ TRỎ tới ngoại lệ, không cấp phép (9.7). Trần chỉ được giảm; nâng trần là nới → theo 9.4/9.7 cần chủ duyệt (test không tự chống được việc sửa số trần, nói rõ điều này).
- **S1.8 Bảng ánh xạ cổng:** từng cổng GOVERNANCE (QA1, QA2, cổng trước thực thi/phát hành, "agent QA độc lập", E1 cho bất biến dữ liệu, ba tầng `CONTROL_GATES`) ↔ bước thật: `npm test` + `typecheck` (**chưa phủ test/script**; CI khi có), `test:e2e`, `audit-invariants`, `HANDOFF-N1`, kịch bản Chrome, chủ duyệt; axe/TTI thay Lighthouse/JSON-LD; phần không ánh xạ được ghi "không áp dụng cho tourdao-sales" + ADR-0010 ghi việc cần sửa ở nguồn. **Rủi ro đã nêu:** cổng thuộc hạng tuyệt đối (N2/N6) nên "không áp dụng" có thể bị coi là nới; chủ chịu trách nhiệm phê chuẩn bảng này.
- **S1.9 Chưa chốt:** GOVERNANCE 9.3 (`[NEEDS HUMAN DECISION]`) — kế thừa nguyên trạng.
- **S1.10 Ánh xạ điều mới của v2.3.0** (mỗi dòng có bộ kiểm hoặc "dựa vào kỷ luật", điền khi viết overlay): P14 chủ duyệt; P15/N8 tách vai (S13); P16 (S10, S12); P17 sai lầm thành luật; P18 cảnh báo sớm; P19 vòng nhỏ + nhật ký thi công; P20 nghiệm thu bằng hành vi (mục 5); P21 hai lớp phòng thủ; N9 (test băm `playbook/`); N10 bí mật (`.dev.vars` gitignored; CI không secret).

### D. ER sinh từ schema — `docs/ER-DIAGRAM.md` (một phần của `npm run dict`)
`scripts/diagrams-lib.mjs` (thuần, **có test đơn vị**) + mở rộng `scripts/gen-data-dictionary.mjs`: dựng schema từ `migrations/*.sql` bằng `node:sqlite`; đọc `PRAGMA table_info`/`foreign_key_list`/`sqlite_master`. Đã thử ngoài repo: 27 bảng, 239 cột, 30 khoá ngoại, mermaid 11 parse được. **Bẫy phải xử lý:** cột vừa PK vừa FK viết `PK, FK` (không `PK FK`), nhãn có `( ) : "` phải nháy; SQLite báo `notnull=0` cho khoá chính TEXT nên phải xét cờ `pk` (person/organization là 1–1); chỉ mục duy nhất một phần (`staff_party_uq`, `dsp_assignment_handler_open_uq`) không suy được cardinality; 4 cạnh toàn vẹn đi ngược (audit_log→staff/orders, catalog_override→staff, company_profile→staff) cần nhãn riêng; 30 `sqlite_autoindex_*` là nhiễu (lọc); "giữ điều gì" của 15 trigger không sinh được nên chỉ liệt kê tên; sắp xếp tường minh. Ra: `erDiagram` theo module, sơ đồ tổng chỉ cạnh xuyên module, danh sách view, trigger và chỉ mục duy nhất. Đầu tệp "Sinh tự động — không sửa tay". Hai ER viết tay giữ nguyên, thêm dòng trỏ sang tệp sinh.

### E. Quy trình nghiệp vụ toàn công ty — `docs/QUY-TRINH-NGHIEP-VU.md` (viết tay)
Từ lời kể của chủ (mục 2) đối chiếu mã; **không** ghi số chính sách; bước tôi suy đoán gắn `GIẢ ĐỊNH`; dòng "chủ xác nhận ngày: ____" trống tới khi chủ xác nhận. Nội dung: (1) tác nhân ngoài (Khách, Đại lý, CTV, Lễ tân KS) và làn nội bộ (quyết định 9); (2) **Sơ đồ 1** luồng chính yêu cầu → báo giá → lập đơn nháp → gửi ảnh xác nhận (Zalo) → thu cọc/thu trước → xác nhận → người phụ trách gọi xác nhận → điều hành viên → điều hành cano → chuyến → thu nốt (HDV/quầy) → hoá đơn VAT → hậu mãi (`flowchart` + `subgraph` làm làn); (3) **Sơ đồ 2** ba đường đối tác; (4) **Sơ đồ 3** năm ngoại lệ; (5) bảng **nhãn phủ** từng bước kèm căn cứ mã/ADR; (6) bảng **khoảng cách nghiệp vụ ↔ app**, mỗi dòng kiểm mã trước khi ghi. Đã thấy sơ bộ, chưa kiểm hết: HDV thu nốt nhưng ô `payment.receive` của `FIELD` = `none`; thêm/bớt khách hoặc đổi gói sau xác nhận bị khoá (`order_service_frozen_update`; sửa sau xác nhận là N3); đối tác tự đặt nhưng app chỉ có tài khoản nhân viên (chưa kiểm hiện trạng); chính sách giá theo đối tác chưa có; công nợ đại lý hoãn (ADR-0004); huỷ hàng loạt vì thời tiết chưa có; nhiệm vụ điều hành xe/cano (N2) chưa có; đơn từ website không tự vào app.

### F. Luồng kỹ thuật (`SYSTEM-DESIGN` §6)
Hai sơ đồ có `Nguồn mã:`: máy trạng thái đơn (`draft → confirmed | cancelled`, `confirmed → cancelled`, không đường về; `confirmGaps`; `order.modify`; sửa chuyến ở `draft`/`confirmed`, cấm ở `cancelled`) và chế độ bảo trì. Đối chiếu mã trước khi vẽ; **test so cạnh của `stateDiagram` với `canTransition`** (đã export). Lệch tài liệu ↔ mã ghi vào §16.

### G. Manifest băm migration
`scripts/migrations-manifest.txt` (SHA-256 của `migrations/0001…0016`, định dạng `shasum -c`) và `src/migrations-immutable.test.ts`: đỏ nếu tệp đã liệt kê bị sửa hoặc mất, và **nhắc** khi có migration mới chưa vào manifest. Không đụng `migrations/`; không phải nghĩa vụ mới (bộ kiểm cho luật `CLAUDE.md` §5).

### H. Test chống trôi — `src/standards.test.ts` (+ `src/diagrams-lib.test.ts`)
(1) **Ghim:** tệp trên đĩa = khoá manifest ∪ {`.PINNED_SHA256`} (xoá tệp cùng dòng băm không lọt), loại `.DS_Store`, băm khớp, sắp byte, NFC; (2) **overlay:** mọi dòng ràng buộc có bộ kiểm giải được (tệp tồn tại và chứa tên test; `R-…` có trong `audit-checks.mjs`) hoặc nhãn "dựa vào kỷ luật" với **trần**; ADR/migration nêu tên có thật; (3) **tươi:** `ER-DIAGRAM.md` khớp bản sinh lại; **so cạnh** sơ đồ trạng thái đơn với `canTransition`; (4) mọi `docs/*.md` (cấp 1) và `docs/adr/*.md` được nhắc trong `README.md`/`docs/adr/README.md`; (5) bộ sinh ER: ca `PK, FK`, nháy nhãn, cờ `pk`, thứ tự xác định. Mỗi cơ chế theo S12 (thử làm đỏ, ghi log).

### I. Test E1 quét PII trong nhật ký (quyết định 13)
Khẳng định không dòng `audit_log.detail` nào chứa giá trị PII đã gieo khi chạy các đường ghi nhật ký thật (tạo/sửa đơn, sửa chuyến, hồ sơ, tài khoản, đổi PIN). Đã có e2e cục bộ từng ca (`tests/e2e/parties.mjs`:182-189, `maintenance.mjs`:208-210, `dispatch.mjs`:112, `trip.mjs`:227,262) — bài này thêm **quét chung ở lớp E1-CI**. Cách chạy (test đơn vị trên `node:sqlite` nếu gọi được hàm dựng nhật ký thuần; nếu không thì kịch bản `tests/e2e`, cần mạng, khi đó thuộc lớp 2) chốt ở kế hoạch. **Nếu lộ vi phạm cũ: dừng và báo chủ trước khi sửa mã ứng dụng.**

### K. CI — `.github/workflows/ci.yml` (quyết định 17)
`push` và `pull_request`: Node 22, `npm ci`, `npm test`, `npm run typecheck`; không secret (N10), không e2e. Đã kiểm: `package-lock.json` và `worker-configuration.d.ts` được git theo dõi nên chạy được trên máy sạch. **Chưa chạy trên GitHub** (không push) ⇒ theo P16 ghi "chưa quan sát chạy". **Chặn merge cần chủ bật bảo vệ nhánh trên GitHub** — không làm được bằng mã.

### L. Cập nhật cùng commit
`README.md` gốc (hàng overlay, `playbook/`, quy trình nghiệp vụ, ER, thứ bậc; sửa câu "điểm chạm duy nhất"); `CLAUDE.md` §1, §2, §3 (`dict` sinh cả ER; CI), §4 (`playbook/`, `.github/`), §5 (`playbook/` chỉ đọc; loại tài liệu), §9 (đếm lại số test — hiện đo được 388, `CLAUDE.md` ghi 386); `ARCHITECTURE.md` (đầu tệp); `SPEC` (một dòng lịch sử); `SYSTEM-DESIGN` §16; `docs/adr/README.md`. **Các sửa `CLAUDE.md` là ĐỀ XUẤT (S11)**, có hiệu lực khi chủ duyệt.

### M. Bản xem (quyết định 11)
Sau khi chủ duyệt nội dung cuối, đăng **một Artifact riêng tư**: HTML, mermaid từ CDN, các sơ đồ D/E/F, in PDF từ trình duyệt. Là **bản chụp có ghi commit nguồn**, không phải nguồn (N7). Nội dung rời repo lên dịch vụ ngoài nên chỉ đăng khi chủ đồng ý. Không có SĐT/khoá trong sơ đồ.

## 5. Tiêu chí nghiệm thu (P20 — đặt trước khi làm; do người kiểm độc lập và chủ xác nhận, không do người thi công tự khai)
- `npm test` xanh, số test **tăng** (đo lại, ghi vào `CLAUDE.md`); `npm run typecheck` 0 lỗi **và** kiểm kiểu một lần bằng `tsc` riêng cho tệp test/script mới (vì cấu hình repo loại chúng); đính kèm log lệnh.
- `npm run dict` chạy lần 2 **không đổi** tệp nào.
- **Mỗi cơ chế kiểm mới** (băm `playbook/`, manifest migration, quét PII, ER tươi, so cạnh trạng thái đơn, trần overlay) có **một lần quan sát chặn thật**: sửa cố ý → test đỏ (log) → hoàn nguyên.
- 100% dòng ràng buộc overlay có bộ kiểm giải được hoặc nhãn "dựa vào kỷ luật"; số nhãn ≤ trần; danh sách và trần được báo.
- Quy trình nghiệp vụ: mọi bước có nhãn phủ; số bước `GIẢ ĐỊNH` và số dòng khoảng cách được báo.
- 100% khối mermaid mới qua `mermaid.parse` chạy một lần ngoài repo; không chạy được thì báo "chưa kiểm cú pháp".
- Không đụng `migrations/`, logic `src/modules/**`, `docs/data-dictionary.json`, `src/architecture.test.ts`; không push, merge, deploy; không sửa `playbook/` sau khi chép.
- e2e **không chạy** (không chạm API/migration) — báo rõ. CI: "chưa quan sát chạy".

## 6. Điểm chờ chủ dự án
1. Duyệt đặc tả v3 (hoặc chỉnh mục 3).
2. Sau thi công: phê chuẩn overlay v0.1.0 và bảng ánh xạ cổng (rủi ro S1.8); chuyển ADR-0010 sang `accepted` (chỉ chủ; N9).
3. Xác nhận sơ đồ nghiệp vụ ("chủ xác nhận ngày …"); sửa các bước `GIẢ ĐỊNH`.
4. Chốt tầng rủi ro AI (S9), cách xử lý GOVERNANCE 9.3, và ba cạnh `ALLOWED_EDGES` không dùng.
5. Đẩy nhánh và bật bảo vệ nhánh trên GitHub để CI chạy lần đầu (P16); đối chiếu `playbook/` với Core khi Core đổi.
6. Đồng ý đăng Artifact (mục M).

## 7. Giả định, rủi ro và rà soát độc lập
- Rà soát A (kiểm sự thật/khả thi) và B (tuân thủ/YAGNI) đã tích hợp; các lỗi sự thật của v1/v2 đã sửa ở mục 1. A không kiểm được: e2e, kịch bản Chrome, renderer mermaid nơi người đọc dùng, Windows/CRLF, `npm run typecheck` đủ ba tsconfig, luật Origin theo mã.
- Danh sách "dựa vào kỷ luật" (S10) là sơ bộ; kiểm kê chính xác lập khi viết overlay và do người kiểm độc lập đối chiếu.
- Overlay có thể bị coi là nới (S1.8); rủi ro nằm ở chủ phê chuẩn.
- Đợt này không thi công N2/N3/B5 và không đổi hành vi ứng dụng, ngoài việc (nếu test PII lộ vi phạm) báo chủ trước.

## 8. Thứ tự thi công đề nghị (mỗi việc một phiên, mỗi vai một phiên — S13)
T1 ghim `playbook/` + `.PINNED_SHA256` + test băm + ADR-0010 → T2 manifest migration + test → T3 test quét PII (dừng nếu lộ vi phạm) → T4 bộ sinh ER + test đơn vị + `dict` + test tươi → T5 luồng kỹ thuật (`SYSTEM-DESIGN` §6, §16) + test so cạnh → T6 kiểm kê ràng buộc ↔ bộ kiểm và overlay + test tham chiếu/trần → T7 quy trình nghiệp vụ (đối chiếu mã) → T8 `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `SPEC`, `docs/adr/README.md` → T9 CI → T10 kiểm mermaid, bản xem (sau khi chủ đồng ý). Mỗi T: người thi công → người kiểm độc lập (chỉ đọc) → chủ duyệt; nhật ký ghi từng bước.
