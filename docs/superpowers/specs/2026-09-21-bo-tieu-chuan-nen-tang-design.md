# Đặc tả thiết kế — Bộ tiêu chuẩn nền tảng của tourdao-sales (Lớp 1 ghim + Lớp 2 overlay + sơ đồ)

> Trạng thái: **ĐỀ XUẤT — chờ chủ dự án duyệt bản viết này** (2026-09-21). Chủ dự án đã chọn hai điều trong phiên: **ghim bản sao chỉ-đọc** Hiến pháp/Governance và **phạm vi "Vừa"**. Mọi thứ khác trong tệp này là đề xuất của người soạn.
> Đây là đặc tả, không phải mã. Chưa có tệp nào của bộ tiêu chuẩn được viết. Theo `docs/adr/README.md`: Hiến pháp → ràng buộc dự án → ADR → đặc tả → mã.

## 1. Vấn đề và điều đã kiểm chứng

Yêu cầu ban đầu: "dự án dường như thiếu Hiến pháp, khung kiến trúc, mô hình dữ liệu, sơ đồ thực thể, luồng vận hành — hãy dựa `tourdaovn` viết một bộ tiêu chuẩn". Kiểm kê bằng đọc mã và tài liệu (2026-09-21) cho thấy giả định **đúng một phần**:

| Hạng mục | Hiện có | Kết luận |
|---|---|---|
| Hiến pháp | Không có bản trong repo. `SPEC`, `adr/README`, `AUDIT-PWA-IPHONE`, `ADR-0004` viện dẫn `tourdaovn/playbook/CONSTITUTION.md` v2.2.0 (P1–P13, N1–N7, Điều 3.1/6.2/7/8.2) mà **không ghim phiên bản** | Thiếu neo |
| Ràng buộc cấp dự án (Lớp 2, mẫu `09-PROJECT_OVERLAY`) | Không có tệp. Luật rải ở `CLAUDE.md` §5, `ARCHITECTURE.md`, ADR-0002/0003, `SPEC` §2.3, N1 spec §6 | Thiếu |
| Khung kiến trúc | `ARCHITECTURE.md` (LUẬT, ép bằng `src/architecture.test.ts`), `SYSTEM-DESIGN.md`, ADR-0001…0009 | Có; đồ thị module chỉ là ASCII |
| Mô hình dữ liệu | `docs/data-dictionary.json` → `DATA-DICTIONARY.md`; `SYSTEM-DESIGN` §5; N1 spec | Có; sổ **không** ghi cột của bảng |
| Sơ đồ thực thể | 2 `erDiagram` (`SYSTEM-DESIGN.md:198`, N1 spec:57): chỉ quan hệ, không cột, thiếu `login_attempt`, `catalog_sync`, `mnt_setting`, `company_profile`… | Thưa |
| Luồng vận hành | Topology (`SYSTEM-DESIGN` :50), vòng đời request (:92), đăng nhập (:263) là sơ đồ; §6(b)–(j) và **máy trạng thái đơn** chỉ văn xuôi | Một phần |
| Ma trận quyền | `SYSTEM-DESIGN` §8 | Có — không làm lại |
| Mục lục tài liệu cho người | Chỉ `CLAUDE.md` §2 (viết cho AI) | Thiếu |

**Nguyên tắc dẫn đường:** không viết Hiến pháp mới. `CONSTITUTION` Điều 9.7 (tầng dự án chỉ được siết thêm, không định nghĩa lại hay nới), README playbook ("Đừng sửa `CONSTITUTION.md` trong repo dự án"), N7 (hai nguồn sự thật), N3 (AI không tự ra luật tối cao) đều cấm. Không sao chép mẫu `00…08` của `tourdaovn`: `SPEC`, `SYSTEM-DESIGN`, `CHANGE-GUIDE`, bộ test đã phủ, nhân bản chỉ sinh nguồn thứ hai.

## 2. Phạm vi (đã duyệt: "Vừa")

**Làm:** (A) ghim Lớp 1; (B) overlay Lớp 2; (C) ER đầy đủ + đồ thị module **sinh từ mã**; (D) luồng vận hành thành sơ đồ; (E) mục lục `docs/README.md`; (F) ADR-0010 đề xuất; (G) bốn nhóm test chống trôi; (H) cập nhật `CLAUDE.md`/`ARCHITECTURE.md` cùng commit.
**Không làm:** Hiến pháp mới; sao chép brief/QA/tokens; thêm phụ thuộc runtime hay dev (repo hiện 0 runtime, 3 dev); `.specify/`; sửa `ALLOWED_EDGES` hay logic module; đụng `migrations/`; push, merge, deploy.

## 3. Sản phẩm

### A. Lớp 1 — bản ghim (`playbook/`, chỉ đọc)
- Sao **nguyên byte** từ `tourdaovn/playbook/`: `CONSTITUTION.md` (v2.2.0), `GOVERNANCE.md` (v1.0.0), `CHANGELOG.md` (nguồn lịch sử duy nhất của hai tệp trên), `governance/**` (9 tệp, ~12 KB).
- `playbook/.PINNED_VERSION`: phiên bản, ngày ghim, **chuỗi nguồn** (repo playbook gốc `nhatrangtravel/playbook` → ghim ở `tourdaovn` v2.2.0-constitution/v1.0.0-pin 2026-07-21 → ghim này). `playbook/.PINNED_SHA256`: băm từng tệp.
- **Không** ghim `PLAYBOOK.md`, `templates/`, `ai/`, `specs/`, `init-project.sh`. Hệ quả có chủ ý: `GOVERNANCE.md` còn một tham chiếu treo `ai/PROMPT_FACTORY.md` và một ô "Code (.ts, .astro)" (dấu vết tourdaovn) — giữ nguyên văn, ghi trong ADR-0010, không vá (N7).
- Quy tắc: sửa ở nguồn rồi tăng ghim; không vá cục bộ. Test băm bắt sửa tay.
- Hạn chế trung thực: không truy cập được repo playbook gốc từ phiên này nên **chưa đối chiếu ghim với gốc**; chủ dự án có thể đối chiếu bằng `.PINNED_SHA256`.

### B. Lớp 2 — `docs/PROJECT-OVERLAY-tourdao-sales.md` (v0.1.0, `proposed`)
Theo khung `09-PROJECT_OVERLAY` (S1.1–S1.6) + S1.7. **Nguyên tắc: hệ thống hoá điều đang có hiệu lực, không đặt nghĩa vụ mới.** Điều gì thật sự MỚI phải gắn nhãn `MỚI` để chủ dự án quyết riêng.
- **S1.1 Stack:** chỉ trỏ ADR/`SYSTEM-DESIGN`, không lặp.
- **S1.2 Bất biến dữ liệu:** mỗi dòng có ID (`OV-D1…`), căn cứ, và **bộ kiểm** dạng máy đọc được (`tệp › tên test`, hoặc mã `R-N1-*`/`R-DSP-*` của `scripts/audit-checks.mjs`, hoặc tên trigger/chỉ mục trong `migrations/`).
- **S1.3 Ngưỡng số** (Điều 6.2): hằng và giá trị kèm tệp khai báo (vd `MAX_DAYS_AHEAD`, `MAX_TOKEN_LENGTH`, ngưỡng chống dò PIN, hạn phiên); test kiểm hằng đúng giá trị nêu.
- **S1.4 Hệ AI:** phiên Claude Code làm việc trong worktree, giới hạn ở `CLAUDE.md` §6 (không push/merge/deploy/ghi D1 remote nếu chủ không ra lệnh); phân tầng theo `governance/AI_RISK_TIERING.md`.
- **S1.5 Ranh giới:** với `tourdaovn` (độc lập; N4), Google Sheet (danh mục, nhân viên — nguồn nhập, D1 là nguồn sự thật), Cloudflare Turnstile, Cloudflare (Worker/D1/Assets).
- **S1.6 Quy ước:** tiếng Việt có dấu, tên bảng số ít, tiền `INTEGER` VNĐ, giờ dân sự VN, không `innerHTML`, token CSS…
- **S1.7 Khoảng trống kiểm chứng và ngoại lệ:** (i) ràng buộc **chưa có bộ kiểm** — theo kiểm tra sơ bộ có ít nhất: không `innerHTML`, nhật ký không ghi SĐT/email/MST, ô gõ 16px, `location.replace` sau khi lưu — ghi hạng E3 tạm kèm bộ kiểm đề xuất; (ii) ngoại lệ đã ghi ở nơi khác: `LEGACY` trong `architecture.test.ts`, `wonGuard` đọc `audit_log`, lệch ADR-0003 điều 7 (`dsp_assignment`), ba cột `orders.deposit_*` (hai nguồn "đã trả", ADR-0004 hẹn N3).
- **Phân biệt:** "khoảng trống kiểm chứng" ≠ "Nợ hiến pháp". Theo Hiến pháp 5.8, Nợ chỉ áp khi chủ **bẻ tạm** điều cấm hạng có điều kiện (N1/N4/N7/N5-nội-bộ), theo mẫu `EXC-YYYY-NNN` có `han_tra`. Người soạn **không tự đặt hạn** và không tự tạo bản ghi `EXC`.

### C. Sơ đồ sinh từ mã — `npm run diagrams`
`scripts/gen-diagrams.mjs` + thư viện thuần `scripts/diagrams-lib.mjs` (mẫu y hệt `gen-data-dictionary.mjs`/`data-dictionary-lib.mjs`):
- `docs/ER-DIAGRAM.md` — dựng schema từ `migrations/*.sql` bằng `node:sqlite` (như `architecture.test.ts`), đọc `PRAGMA table_info`/`foreign_key_list`/`sqlite_master`. Ra: một `erDiagram` **theo module** (cột, PK/FK, kiểu), một sơ đồ tổng chỉ cạnh khoá ngoại xuyên module, danh sách view công bố, danh sách trigger và chỉ mục duy nhất từng bảng (sự thật về "bất biến do SQL giữ", đối chứng với bảng viết tay ở `SYSTEM-DESIGN` §5).
- `docs/MODULE-GRAPH.md` — `flowchart` cạnh **import thật** giữa module. Cạnh "tiêm" (`orders ⇢ dispatch` qua `injected` ở `src/index.ts`) không phải import nên không hiện; ghi chú trỏ `ARCHITECTURE.md` mục 2.
- Phân tích import: dùng lại logic của `architecture.test.ts` bằng cách tách `relativeImports`/`relSrc` sang `scripts/architecture-lib.mjs` (một nguồn); `architecture.test.ts` import lại, hành vi không đổi — đây là sửa duy nhất vào tệp test hiện có.
- Tệp sinh có dòng đầu "Sinh tự động — không sửa tay" và một bài kiểm so bản sinh lại với tệp đang có.

### D. Luồng vận hành — `docs/LUONG-VAN-HANH.md` (viết tay, có `Nguồn mã:` cho từng sơ đồ)
Chỉ vẽ cái `SYSTEM-DESIGN` chưa vẽ; chỗ đã có sơ đồ thì **trỏ**, không vẽ lại.
1. Máy trạng thái đơn (`stateDiagram-v2`): `draft → confirmed | cancelled`, `confirmed → cancelled`, không đường về; điều kiện xác nhận (`confirmGaps`); ai được đổi (`order.modify`); sửa chuyến (`order.trip.edit`) ở `draft`/`confirmed`, cấm ở `cancelled`.
2. Lập đơn → sửa nháp → xác nhận (`sequenceDiagram`): khoá lạc quan `updated_at`, `wonGuard`, các mã 409 (`stale`, `catalog_changed`, `invalid_transition`, `incomplete_trip`).
3. Người phụ trách (`stateDiagram-v2`): chưa có / đang phụ trách; đặt, nhận (`dispatch.claim`), đổi (đóng dòng cũ + mở dòng mới trong một `db.batch()`).
4. Đồng bộ danh mục (`flowchart`): `markAttempt → fetch → parse → planSync → syncGuard → áp / 409 sync_guard`; ghi đè admin không bị mất.
5. Chế độ bảo trì (`stateDiagram-v2`): tắt/bật, `allowed_phones`, cổng router + `POST /api/auth/login`, đường thoát khẩn bằng SQL.
6. Luồng phát hành (`flowchart`): cổng chỉ-đọc → điểm khôi phục Time Travel → test/typecheck/e2e → migration → deploy → `audit-invariants --db remote` → ghi HANDOFF (từ `docs/HANDOFF-N1.md`; đây là quy trình người + máy, không phải luồng ứng dụng).

Trước khi vẽ, mỗi sơ đồ đối chiếu với **mã** (mã thắng, `CLAUDE.md` lời mở). Lệch tài liệu ↔ mã tìm thấy thì ghi vào `SYSTEM-DESIGN` §16 — **không** tạo `DRIFT_LOG` thứ hai (§16 đã làm đúng chức năng đó).

### E. `docs/README.md`
Mục lục theo nhóm, thứ bậc ưu tiên (Hiến pháp → overlay → ADR → đặc tả → mã) và bảng "nguồn duy nhất cho…" (mỗi thứ một tài liệu chủ). Không lặp `CLAUDE.md` §2: `CLAUDE.md` vẫn là cổng vào cho AI và trỏ tới đây.

### F. ADR-0010 (`proposed`; chỉ chủ dự án mới chuyển `accepted`)
"Neo Hiến pháp bằng bản ghim chỉ-đọc và tầng Lớp 2." Bối cảnh (viện dẫn chéo repo, không ghim), quyết định (ghim + overlay), phương án bị loại (viện dẫn sang `tourdaovn`; viết Hiến pháp riêng — kèm lý do), hệ quả (tham chiếu treo, nguy cơ trôi và cách bắt: băm), cửa một/hai chiều (hai chiều — gỡ bằng xoá `playbook/`). Cập nhật `docs/adr/README.md`.

### G. Kiểm thử chống trôi — `src/standards.test.ts`
1. **Ghim:** mọi tệp trong `playbook/` khớp `.PINNED_SHA256`; không có tệp thừa.
2. **Overlay:** mọi dòng ràng buộc có bộ kiểm **giải được** (tệp tồn tại và chứa tên test; `R-…` có trong `audit-checks.mjs`; hằng đúng giá trị) **hoặc** nhãn `CHƯA CÓ BỘ KIỂM` — không dòng nào bỏ trống; mọi ADR/migration nêu tên có thật.
3. **Đường dẫn tệp** trong bốn tài liệu mới (overlay, `LUONG-VAN-HANH`, `README`, ADR-0010) đều tồn tại.
4. **Tươi:** `ER-DIAGRAM.md` và `MODULE-GRAPH.md` khớp bản sinh lại; mọi `docs/*.md` và `docs/adr/*.md` có mặt trong `docs/README.md`.

### H. Cập nhật đồng commit
`CLAUDE.md`: §2 (bảng đọc-gì), §3 (`npm run diagrams`), §4 (`playbook/`), §5 (`playbook/` chỉ đọc), §9 (hiện trạng, số test đếm lại); `docs/ARCHITECTURE.md` (đầu tệp, "Bộ tài liệu nền"); `package.json` (script `diagrams`).

## 4. Tiêu chí nghiệm thu (Điều 6.2 — số kiểm được)
- `npm test` xanh, số test **tăng** (đếm lại và ghi vào `CLAUDE.md`); `npm run typecheck` **0 lỗi**.
- `npm run diagrams` chạy lần 2 **không đổi** tệp nào (`git status` sạch).
- **100%** dòng ràng buộc của overlay có bộ kiểm giải được hoặc nhãn `CHƯA CÓ BỘ KIỂM`; số dòng thuộc nhãn sau được báo trong báo cáo cuối.
- **100%** khối mermaid mới qua kiểm cú pháp bằng `mermaid.parse` chạy **một lần ngoài repo** lúc soạn (không thêm phụ thuộc). Nếu kiểm này không chạy được thì báo rõ "chưa kiểm cú pháp", không ngầm coi là đạt.
- Không đụng `migrations/`, `src/modules/**` (trừ import lại ở `architecture.test.ts`), `docs/data-dictionary.json`.
- e2e **không bắt buộc**: không chạm API hay migration. Báo rõ là không chạy, không ngụ ý đã xanh.

## 5. Điểm chờ chủ dự án quyết
1. Duyệt bản viết này; sau đó phê chuẩn overlay v0.1.0 (Người phê chuẩn để trống cho tới lúc đó).
2. Chuyển ADR-0010 sang `accepted` (hoặc trả lại).
3. Có chính thức hoá các ngoại lệ ở S1.7(ii) thành bản ghi `EXC-YYYY-NNN` (cần `han_tra`) hay để nguyên như đang ghi ở nơi khác.
4. Với mỗi "khoảng trống kiểm chứng": bổ sung bộ kiểm (việc riêng, ngoài đợt này) hay chấp nhận E3 tạm.

## 6. Giả định và điều chưa chắc
- Chép từ bản ghim của `tourdaovn`, chưa đối chiếu với repo playbook gốc.
- Phiên bản `GOVERNANCE.md` lấy theo tiêu đề tệp (v1.0.0).
- Danh sách "khoảng trống kiểm chứng" ở S1.7 là kết quả grep sơ bộ; danh sách chính xác được lập khi viết overlay, có thể dài hơn hoặc ngắn hơn.
- `node:sqlite` dựng schema từ migration đã chạy được trong `architecture.test.ts`; cùng cơ chế nên không thêm rủi ro phiên bản Node.
- Đợt này không thi công N2/N3/B5 và không đổi hành vi ứng dụng.

## 7. Thứ tự thi công đề nghị (cho kế hoạch)
(1) ADR-0010 + ghim + test băm → (2) overlay + test tham chiếu (lập kiểm kê ràng buộc–bộ kiểm từ mã) → (3) tách `architecture-lib`, bộ sinh sơ đồ + test tươi → (4) `LUONG-VAN-HANH` (đối chiếu mã trước khi vẽ) → (5) `docs/README.md` + cập nhật `CLAUDE.md`/`ARCHITECTURE.md` + test mục lục → (6) chạy `npm test`, `npm run typecheck`, kiểm mermaid → (7) commit (không push).
