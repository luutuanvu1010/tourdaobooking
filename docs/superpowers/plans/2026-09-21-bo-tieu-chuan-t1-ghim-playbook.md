# Ghim `playbook/` (T1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Vai (Hiến pháp P15, N8):** người thi công KHÔNG tự nghiệm thu; sau mỗi Task có cổng "Người kiểm" do một subagent KHÁC làm, chỉ đọc.

**Goal:** Đặt vào repo một bản chép chỉ-đọc, nguyên byte, của `CoreSchemaProject/playbook` (Hiến pháp v2.3.0) kèm `PIN-README.md`, manifest băm và bài kiểm chống trôi; kèm ADR-0011 (đề xuất) ghi lại quyết định.

**Architecture:** `playbook/` ở gốc repo (43 tệp chép từ Core + 2 tệp của repo này). Manifest `playbook/.PINNED_SHA256` sinh bởi một thư viện thuần (`scripts/playbook-manifest-lib.mjs`) — cùng mẫu với `scripts/data-dictionary-lib.mjs`; bài kiểm `src/standards.test.ts` so manifest với đĩa bằng cả thư viện lẫn `shasum -a 256 -c` độc lập.

**Tech Stack:** Node 22 (`node --test`, `node:crypto`, `node:fs`), `rsync`, `shasum`, git. Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` (v3.1, chủ duyệt 2026-09-21) — đặc biệt mục 2 (quyết định 2, 25, 29–32), 4A, 4B, 4H(1), 5, S11–S13. Nhật ký thi công: `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`.

## Global Constraints

- Nguồn: `/Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/` — HEAD `65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8`, Hiến pháp **v2.3.0**, GOVERNANCE **v1.0.0**, CHANGELOG cao nhất **3.3.1 (2026-08-23)**. Chỉ **ĐỌC** từ Core: tuyệt đối không ghi, không chạy git ghi ở đó.
- Chép **nguyên byte 43 tệp** (250.827 byte); **loại** `archive/` và `CLAUDE.md` của Core; `init-project.sh` chép nguyên nội dung nhưng **bỏ bit thực thi (0644)** (quyết định 32). Không sửa nội dung bất kỳ tệp Core nào được chép (kể cả `[NEEDS HUMAN DECISION]`).
- **Cây làm việc của Core CHƯA xác nhận sạch** (quyết định 31): `PIN-README.md` phải ghi đúng câu này, không được viết "sạch".
- Số ADR là **0011** (quyết định 30). Không đụng ADR-0010 (thuộc nhánh khác).
- KHÔNG đụng: `migrations/`, `src/modules/**`, `src/architecture.test.ts`, `docs/data-dictionary.json`, `CLAUDE.md` gốc. **Không** `git push`, merge, `wrangler`, ghi D1/production. Không `git -C` sang repo khác (bộ chặn từ chối); đọc Core bằng đường dẫn tuyệt đối.
- Tiếng Việt CÓ DẤU cho mọi văn bản, thông báo lỗi, commit. Tệp dài viết bằng công cụ Write (bộ chặn từ chối heredoc dài); thông điệp commit qua `git commit -F <tệp>`.
- P16: mọi cơ chế kiểm mới phải được **quan sát đỏ** rồi hoàn nguyên (Task 2, Step 12); ghi kết quả thật vào nhật ký thi công.
- P19: mỗi Task một commit. Commit kết thúc bằng hai dòng: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` và `Claude-Session: https://claude.ai/code/session_01HiznXXbuL1SnKyeS3FrwSq`.
- Thư mục tạm cho tệp nháp: `/Users/tuanbao/.claude/jobs/80c8fdcd/tmp/` (không dùng `/tmp`).

## File Structure

| Tệp | Việc | Task |
|---|---|---|
| `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` | tạo: quyết định (proposed) | 1 |
| `docs/adr/README.md` | sửa: dòng 3, thêm hàng 0011, dòng thứ tự tài liệu | 1 |
| `scripts/playbook-manifest-lib.mjs` | tạo: liệt kê tệp + sinh manifest (thuần) | 2 |
| `scripts/pin-playbook-manifest.mjs` | tạo: ghi `playbook/.PINNED_SHA256` | 2 |
| `src/standards.test.ts` | tạo: nhóm 1 (bản ghim) của bài kiểm chống trôi | 2 |
| `playbook/**` (43 tệp chép) | tạo: chép nguyên byte từ Core | 2 |
| `playbook/PIN-README.md`, `playbook/.PINNED_SHA256` | tạo: của repo này | 2 |
| `.gitattributes` | tạo: `playbook/** -text` | 2 |
| `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md` | sửa: ghi kết quả từng Task | 1, 2 |

---

### Task 1: ADR-0011 (đề xuất) và cập nhật `docs/adr/README.md`

**Files:**
- Create: `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md`
- Modify: `docs/adr/README.md` (dòng 3; thêm một hàng sau hàng `0009`; dòng "Thứ tự tài liệu")
- Modify: `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md` (thêm dòng kết quả)

**Interfaces:**
- Consumes: khuôn ADR của repo (`docs/adr/ADR-0009-nguoi-phu-trach-duoc-sua-don.md`) và mẫu `/Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/templates/03-ADR-0001-template.md` (chỉ để đối chiếu mục: Trạng thái, Ngày/Người phê chuẩn, Loại quyết định, Liên quan, Bối cảnh, Quyết định, Lý do, Phương án bị loại, Hệ quả).
- Produces: đường dẫn `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (Task 2 và `PIN-README.md` trỏ tới nó bằng chuỗi `ADR-0011`).

- [ ] **Step 1: Tạo ADR-0011** — ghi nguyên văn nội dung dưới vào `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` bằng công cụ Write:

```markdown
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
```

- [ ] **Step 2: Sửa dòng 3 của `docs/adr/README.md`** — thay đúng đoạn:

`Mẫu: `playbook/templates/03-ADR-0001-template.md` của tourdaovn (ở đó ADR nằm ở `project/adr/`; dự án này đặt ở `docs/adr/`).`

bằng:

`Mẫu: `playbook/templates/03-ADR-0001-template.md` (bản chép chỉ-đọc của Core, xem ADR-0011; ở đó ADR nằm ở `project/adr/`, dự án này đặt ở `docs/adr/`).`

- [ ] **Step 3: Thêm hàng 0011 vào bảng** — ngay SAU hàng bắt đầu bằng `| [0009](`, thêm đúng một hàng (giữ nguyên, không tạo hàng 0010 — số 0010 thuộc nhánh khác):

`| [0011](ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md) | Neo Hiến pháp bằng bản chép chỉ-đọc từ Core (v2.3.0) vào `playbook/`, kèm băm và bài kiểm; không viết Hiến pháp mới; tầng ràng buộc dự án (Lớp 2) chỉ siết thêm | hai chiều (tệp) / bánh cóc (nghĩa vụ) | **proposed** (chờ chủ dự án) |`

- [ ] **Step 4: Sửa dòng "Thứ tự tài liệu"** — thay:

`Thứ tự tài liệu (Điều 3.1): Hiến pháp → ràng buộc dự án → **ADR** → đặc tả từng bước → mã.`

bằng:

`Thứ tự tài liệu (Điều 3.1): Hiến pháp → ràng buộc dự án → **ADR** → quy trình/playbook → đặc tả từng bước → mã.`

- [ ] **Step 5: Kiểm tra cơ học** — chạy: `grep -c "ADR-0011" docs/adr/README.md` (mong đợi ≥ 2) và `grep -n "0010" docs/adr/README.md` (mong đợi: không dòng nào).

- [ ] **Step 6: Ghi nhật ký thi công** — thêm một dòng vào bảng của `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`: `Task 1 | Thi công | <thời điểm ISO> | ADR-0011 + README ADR | tệp đã tạo/sửa | (chưa kiểm)`.

- [ ] **Step 7: Commit**

```bash
git add docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md docs/adr/README.md docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md
git commit -F /Users/tuanbao/.claude/jobs/80c8fdcd/tmp/commit-msg-t1-adr.txt
```
Thông điệp (tạo tệp `commit-msg-t1-adr.txt` bằng Write trước): tiêu đề `ADR-0011 (đề xuất): neo Hiến pháp bằng bản chép chỉ-đọc từ Core`; thân nói **vì sao** (viện dẫn chéo không ghim; nguồn Core v2.3.0; số 0011 vì 0010 thuộc nhánh Oracle TCA); hai dòng đồng tác giả.

**Cổng — Người kiểm Task 1 (subagent KHÁC, chỉ đọc):** đối chiếu ADR-0011 với đặc tả 4B (đủ mục; số 0011; không nhắc 0010 như của mình; khớp khuôn ADR-0009); kiểm mọi khẳng định sự thật trong "Bối cảnh" (số tệp viện dẫn Hiến pháp, dòng dõi, dòng `.PINNED_VERSION`, README dòng 28) bằng lệnh/đọc tệp; kiểm `docs/adr/README.md` chỉ đổi đúng ba chỗ; báo cáo không sửa.

---

### Task 2: Chép `playbook/`, `PIN-README.md`, manifest và bài kiểm chống trôi

**Files:**
- Create: `scripts/playbook-manifest-lib.mjs`, `scripts/pin-playbook-manifest.mjs`
- Create: `src/standards.test.ts`
- Create: `playbook/**` (43 tệp chép), `playbook/PIN-README.md`, `playbook/.PINNED_SHA256`
- Create: `.gitattributes`
- Modify: `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`

**Interfaces:**
- Consumes: ADR-0011 từ Task 1 (chuỗi `ADR-0011` xuất hiện trong `PIN-README.md`).
- Produces: `MANIFEST_NAME` (`".PINNED_SHA256"`), `listPinnedFiles(dir): string[]`, `sha256Of(file): string`, `renderManifest(dir): string` từ `scripts/playbook-manifest-lib.mjs`; tệp `playbook/.PINNED_SHA256` theo định dạng `shasum -a 256 -c`; các nhóm kiểm sau (H(2)–H(5)) của `src/standards.test.ts` sẽ thêm vào tệp này ở các Task sau.

- [ ] **Step 1: Tạo thư viện manifest** — ghi vào `scripts/playbook-manifest-lib.mjs`:

```js
// Bản ghim playbook/ (ADR-0011): liệt kê tệp và sinh manifest băm. Hàm thuần — dùng cho scripts/pin-playbook-manifest.mjs (ghi)
// và src/standards.test.ts (kiểm), cùng mẫu với scripts/data-dictionary-lib.mjs.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const MANIFEST_NAME = ".PINNED_SHA256";

/** Mọi tệp thường trong `dir` (đường dẫn tương đối, dấu `/`), trừ `.DS_Store` và chính manifest ở gốc; sắp theo byte. Gặp symlink/mục lạ thì ném lỗi. */
export function listPinnedFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        if (e.name !== ".DS_Store" && !(d === dir && e.name === MANIFEST_NAME)) out.push(relative(dir, p).split(sep).join("/"));
      } else throw new Error(`Mục không phải tệp thường trong bản ghim: ${p}`);
    }
  };
  walk(dir);
  return out.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

export const sha256Of = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Nội dung manifest theo định dạng `shasum -a 256 -c`: `<64 hex>␠␠<đường dẫn>` mỗi dòng, kết thúc bằng xuống dòng. */
export function renderManifest(dir) {
  return listPinnedFiles(dir).map((f) => `${sha256Of(join(dir, f))}  ${f}\n`).join("");
}
```

- [ ] **Step 2: Tạo script ghi manifest** — ghi vào `scripts/pin-playbook-manifest.mjs`:

```js
// Ghi playbook/.PINNED_SHA256. Chạy: node scripts/pin-playbook-manifest.mjs
// CHỈ chạy sau khi việc chép/nâng ghim đã được chủ dự án duyệt (Hiến pháp N9): script này làm bài kiểm băm khớp với đĩa, nên chạy bừa là che một thay đổi.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_NAME, renderManifest } from "./playbook-manifest-lib.mjs";

const dir = fileURLToPath(new URL("../playbook", import.meta.url));
const text = renderManifest(dir);
writeFileSync(join(dir, MANIFEST_NAME), text);
console.log(`Đã ghi playbook/${MANIFEST_NAME}: ${text.split("\n").length - 1} tệp`);
```

- [ ] **Step 3: Viết bài kiểm (đỏ trước)** — ghi vào `src/standards.test.ts`:

```ts
// Bài kiểm chống trôi cho bộ tiêu chuẩn nền tảng (đặc tả docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md, mục 4H).
// Nhóm 1: bản ghim playbook/ (ADR-0011). Các nhóm 2–5 (overlay, sơ đồ sinh, mục lục, bộ sinh ER) thêm ở các Task sau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_NAME, renderManifest } from "../scripts/playbook-manifest-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PIN = join(ROOT, "playbook");
const read = (p: string): string => readFileSync(join(PIN, p), "utf8");
const byteOrder = (a: string, b: string): number => Buffer.compare(Buffer.from(a), Buffer.from(b));

/** Đi cây thư mục ĐỘC LẬP với thư viện sinh manifest, để lỗi của thư viện không che lỗi thật. */
function filesOnDisk(): string[] {
  const entries = readdirSync(PIN, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => !e.isDirectory() && e.name !== ".DS_Store")
    .map((e) => join(e.parentPath, e.name).slice(PIN.length + 1).split("\\").join("/"))
    .sort(byteOrder);
}

test("playbook/: có bản ghim (PIN-README, manifest, Hiến pháp, Governance, Playbook, Changelog)", () => {
  for (const f of ["PIN-README.md", MANIFEST_NAME, "CONSTITUTION.md", "GOVERNANCE.md", "PLAYBOOK.md", "CHANGELOG.md"]) assert.ok(existsSync(join(PIN, f)), `thiếu playbook/${f}`);
});

test("playbook/: đúng phiên bản Hiến pháp v2.3.0 và Governance v1.0.0", () => {
  assert.match(read("CONSTITUTION.md").slice(0, 1500), /\*\*Phiên bản:\*\* v2\.3\.0/);
  assert.match(read("GOVERNANCE.md").slice(0, 1500), /\*\*Phiên bản:\*\* v1\.0\.0/);
});

test("playbook/: manifest đúng định dạng shasum, sắp theo byte, NFC, không tự liệt kê chính nó", () => {
  const lines = read(MANIFEST_NAME).split("\n");
  assert.equal(lines.pop(), "", "manifest phải kết thúc bằng xuống dòng");
  const paths = lines.map((l) => {
    const m = /^([0-9a-f]{64}) {2}(\S.*)$/.exec(l);
    assert.ok(m, `dòng sai định dạng: ${l}`);
    return m[2]!;
  });
  assert.deepEqual(paths, [...paths].sort(byteOrder), "phải sắp theo byte");
  assert.equal(new Set(paths).size, paths.length, "có đường dẫn trùng");
  for (const p of paths) assert.equal(p, p.normalize("NFC"), `không phải NFC: ${p}`);
  assert.ok(!paths.includes(MANIFEST_NAME), "manifest không được liệt kê chính nó");
});

test("playbook/: tệp trên đĩa = tệp trong manifest ∪ {manifest} (không tệp thừa, không tệp mất)", () => {
  const listed = read(MANIFEST_NAME).split("\n").filter(Boolean).map((l) => l.slice(66)); // 64 hex + 2 khoảng trắng
  assert.deepEqual(filesOnDisk(), [...listed, MANIFEST_NAME].sort(byteOrder));
});

test("playbook/: băm khớp (thư viện VÀ đối chiếu độc lập bằng shasum/sha256sum -c)", () => {
  assert.equal(renderManifest(PIN), read(MANIFEST_NAME), "manifest lệch nội dung tệp — CHỈ chạy lại scripts/pin-playbook-manifest.mjs sau khi chủ dự án duyệt việc sửa/nâng ghim");
  const first = spawnSync("shasum", ["-a", "256", "-c", MANIFEST_NAME], { cwd: PIN, encoding: "utf8" });
  const r = first.error ? spawnSync("sha256sum", ["-c", MANIFEST_NAME], { cwd: PIN, encoding: "utf8" }) : first;
  assert.equal(r.status, 0, `đối chiếu độc lập thất bại:\n${`${r.stdout ?? ""}${r.stderr ?? ""}`.slice(0, 1500)}`);
});

test("playbook/: đã loại CLAUDE.md và archive/ của Core (dạy sai ở nơi bản chép chỉ-đọc)", () => {
  assert.ok(!existsSync(join(PIN, "CLAUDE.md")), "playbook/CLAUDE.md của Core không được chép");
  assert.ok(!existsSync(join(PIN, "archive")), "playbook/archive/ của Core không được chép");
});

test("playbook/init-project.sh: nội dung chép nguyên nhưng KHÔNG có bit thực thi (chạy nhầm tạo thư mục rác ngoài repo)", () => {
  assert.equal(statSync(join(PIN, "init-project.sh")).mode & 0o111, 0);
});

test("playbook/PIN-README.md: nêu nguồn, điều CẤM và điều không áp dụng", () => {
  const t = read("PIN-README.md");
  for (const need of [
    /CoreSchemaProject\/playbook/, /65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8/, /CHƯA xác nhận cây sạch/, /archive\//, /CLAUDE\.md/,
    /init-project\.sh/, /CẤM chạy/, /\.PINNED_VERSION/, /Sửa thẳng tại đây/, /04-CONSTRAINTS/, /ADR-0011/, /diff -r/, /pin-playbook-manifest/,
  ]) assert.match(t, need, `PIN-README thiếu: ${need}`);
});

test(".gitattributes: playbook/** không bị đổi kiểu xuống dòng (băm phải bền trên mọi hệ)", () => {
  assert.match(readFileSync(join(ROOT, ".gitattributes"), "utf8"), /^playbook\/\*\* -text$/m);
});
```

- [ ] **Step 4: Chạy bài kiểm, xác nhận ĐỎ**

Run: `node --test src/standards.test.ts 2>&1 | grep -E "^# (tests|pass|fail)|^not ok"`
Expected: `# fail` ≥ 1 và các dòng `not ok` (chưa có thư mục `playbook/`). Ghi kết quả thật vào nhật ký.

- [ ] **Step 5: Chép từ Core** — chạy đúng hai lệnh (dấu `/` cuối ở cả hai đường dẫn rất quan trọng):

```bash
rsync -a --exclude=/archive/ --exclude=/CLAUDE.md --exclude=.DS_Store /Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/ playbook/
chmod 644 playbook/init-project.sh
```

- [ ] **Step 6: Kiểm độ trung thực (đối chiếu với Core)** — chạy:

```bash
diff -r /Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook playbook
```
Expected (đúng hai dòng, không dòng nào khác):
```
Only in /Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook: CLAUDE.md
Only in /Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook: archive
```
Và `find playbook -type f | wc -l` phải là **43**. Nếu khác: DỪNG, không sửa tay cho khớp, báo lại người điều phối.

- [ ] **Step 7: Viết `PIN-README.md`** — ghi nguyên văn dưới vào `playbook/PIN-README.md`:

```markdown
# PIN-README — bản chép chỉ-đọc của playbook (Lớp 1)

> **CHỈ ĐỌC.** Thư mục này là bản CHÉP của `playbook/` do Core sở hữu, không phải nơi soạn luật. **Đừng sửa tay; AI không được sửa** (Hiến pháp N9). Quyết định và lý do: `docs/adr/ADR-0011-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (đề xuất, chờ chủ dự án duyệt).

## Nguồn
| Mục | Giá trị |
|---|---|
| Chép từ | `/Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/` (CoreSchemaProject/playbook), ngày 2026-09-21 |
| HEAD của Core | `65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8` (đọc từ `.git/HEAD` và `refs/heads/master`, không chạy git) |
| Cây làm việc của Core | **CHƯA xác nhận cây sạch**: chủ dự án chưa chạy `git status` ở Core (2026-09-21). Bằng chứng yếu: ngày sửa tệp không muộn hơn commit cuối chạm playbook (2026-08-23). Bản chép có thể chứa thay đổi chưa commit ở Core |
| Phiên bản | Hiến pháp v2.3.0 (hiệu lực 2026-08-22), GOVERNANCE v1.0.0, CHANGELOG cao nhất 3.3.1 (2026-08-23) |
| Người quyết nguồn và đường chép | chủ dự án, 2026-09-21 (`docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md`, quyết định 2, 25, 30–32) |

## Chép gì, loại gì
- Chép **43 tệp (250.827 byte) nguyên byte**, giữ nguyên đường dẫn.
- **Loại**: `archive/` (lịch sử của Core) và `CLAUDE.md` của Core (dạy "sửa thẳng tại đây, Core sở hữu bản này" — sai ở nơi bản chép phải chỉ-đọc — và Claude Code tự nạp nó khi làm việc trong thư mục này).
- **Khác nguồn duy nhất về quyền tệp**: `init-project.sh` bỏ bit thực thi (0644). Băm chỉ phủ nội dung, không phủ quyền; bài kiểm kiểm bit này.
- Thêm hai tệp của repo này (không có ở Core): `PIN-README.md` (tệp này) và `.PINNED_SHA256`.

## CẤM
- **CẤM chạy `init-project.sh`.** Nó sinh thư mục dự án MỚI cạnh thư mục cha của repo (`../<tên>`) và là công cụ của Core, không dùng ở đây.
- Không điền nội dung dự án vào `templates/` (chỉ đọc); tài liệu dự án đặt ở `docs/`.
- Không sửa tệp nào ở đây, kể cả `[NEEDS HUMAN DECISION]` ở GOVERNANCE mục 9.3 hay dấu vết tourdaovn ở GOVERNANCE 4.3/4.4. Việc cần sửa ở nguồn được ghi ở ADR-0011.

## Câu trong bản chép ĐÚNG ở Core nhưng KHÔNG áp dụng ở repo này
- `.PINNED_VERSION` (của Core): dòng 46 "**Sửa thẳng tại đây**" và cả tệp nói Core "sở hữu" bản này — đúng ở Core, không áp dụng ở đây. Tệp còn ghi Hiến pháp **v2.2.0** ở dòng 8 và 29 (lỗi thời so với v2.3.0). Bản ghim của repo này được mô tả bằng PIN-README này và `.PINNED_SHA256`.
- `README.md` dòng 28: "Đường hợp pháp duy nhất: `04-CONSTRAINTS.md` khoản 6 và `ADR-0030`" — của Core, không có ở đây. Ở repo này: sửa ở Core, chủ duyệt, chép lại, nâng ghim (mục "Cách nâng ghim").
- `README.md` dòng 24 và `init-project.sh`: quy trình sinh dự án mới — xem mục CẤM.

## Tham chiếu treo (có chủ ý, không phải lỗi bản chép)
11 tệp nhắc tới thứ KHÔNG nằm trong bản chép (`archive/`, `CLAUDE.md` của Core, `docs/core-specs/`, các ADR-00xx của Core): `.PINNED_VERSION`, `CHANGELOG.md`, `FRAMEWORK.md`, `PLAYBOOK.md`, `README.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md`, `docs/architecture-diagrams/README.md`, `docs/architecture-diagrams/so-do-quy-trinh.html`, `docs/huong-dan-su-dung.md`, `init-project.sh`. Ngoài ra `GOVERNANCE.md` (dòng 98, 109) nhắc `DESIGN.md` — tài liệu cấp dự án chưa có ở repo này.

## Kiểm bằng máy
`npm test` chạy `src/standards.test.ts`: tệp trên đĩa = manifest, băm khớp (kể cả đối chiếu độc lập bằng `shasum -a 256 -c`), không có `CLAUDE.md`/`archive/`, `init-project.sh` không thực thi, phiên bản Hiến pháp/Governance đúng. Băm chống sửa **nhầm**, không chống sửa cả tệp lẫn manifest; lớp thứ hai (CODEOWNERS `playbook/**` và bảo vệ nhánh) do chủ dự án bật trên GitHub.

## Cách nâng ghim (chỉ khi Core đổi VÀ chủ dự án duyệt việc nâng)
1. Chủ chạy `git -C <Core> status --short -- playbook` (trống = sạch) và ghi HEAD mới.
2. `rsync -a --delete --exclude=/archive/ --exclude=/CLAUDE.md --exclude=/PIN-README.md --exclude=/.PINNED_SHA256 --exclude=.DS_Store <Core>/playbook/ playbook/` rồi `chmod 644 playbook/init-project.sh`. (Các `--exclude` cũng bảo vệ hai tệp của repo này khỏi `--delete`.)
3. `diff -r -x archive -x CLAUDE.md -x PIN-README.md -x .PINNED_SHA256 <Core>/playbook playbook` — kết quả phải trống.
4. `node scripts/pin-playbook-manifest.mjs`; cập nhật bảng "Nguồn" ở trên (ngày, HEAD, phiên bản); chạy `npm test`.
5. Ghi một dòng vào nhật ký thi công hiện hành; nếu đổi quyết định thì ADR mới trỏ về ADR-0011.

## Đối chiếu độ trung thực lúc chép
`diff -r` giữa Core và bản chép (loại `archive/`, `CLAUDE.md`, và hai tệp của repo này) cho kết quả trống lúc chép; log nằm ở nhật ký thi công `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`. Người kiểm độc lập tái hiện lại.
```

- [ ] **Step 8: Tạo `.gitattributes`** — ghi vào `.gitattributes` đúng một dòng:

```
playbook/** -text
```

- [ ] **Step 9: Sinh manifest**

Run: `node scripts/pin-playbook-manifest.mjs`
Expected: `Đã ghi playbook/.PINNED_SHA256: 44 tệp` (43 tệp Core + `PIN-README.md`).

- [ ] **Step 10: Chạy bài kiểm, xác nhận XANH**

Run: `node --test src/standards.test.ts 2>&1 | grep -E "^# (tests|pass|fail)|^not ok"`
Expected: `# tests 9`, `# pass 9`, `# fail 0`.

- [ ] **Step 11: Chạy toàn bộ và commit**

```bash
npm test 2>&1 | grep -E "^# (tests|pass|fail)"
npm run typecheck >/dev/null 2>&1; echo "typecheck exit=$?"
git status --short | head -5
git check-ignore -v playbook/CONSTITUTION.md playbook/.PINNED_SHA256 playbook/specs/inbox/.gitkeep || echo "không tệp nào bị bỏ qua (đúng)"
git add playbook scripts/playbook-manifest-lib.mjs scripts/pin-playbook-manifest.mjs src/standards.test.ts .gitattributes docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md
git commit -F /Users/tuanbao/.claude/jobs/80c8fdcd/tmp/commit-msg-t1-pin.txt
```
Expected: mọi test xanh (số test = số trước + 9; trước khi thêm là 413), `typecheck exit=0`, `git check-ignore` không in gì. Thông điệp (`commit-msg-t1-pin.txt`, tạo bằng Write): tiêu đề `Ghim playbook/ (Hiến pháp v2.3.0) từ Core: bản chép chỉ-đọc, băm và bài kiểm`; thân nói **vì sao** (viện dẫn chéo không ghim; nguồn Core; N9 chỉ chép sau khi chủ ghi nhận đường chép; cây Core CHƯA xác nhận sạch; `init-project.sh` 0644; loại `archive/` và `CLAUDE.md`); hai dòng đồng tác giả.

- [ ] **Step 12: Quan sát ĐỎ trên từng cơ chế (P16)** — sau khi đã commit, với MỖI phá cố ý dưới đây: thực hiện, chạy `node --test src/standards.test.ts 2>&1 | grep -E "^# fail|^not ok"`, ghi kết quả thật vào nhật ký, rồi **hoàn nguyên** bằng lệnh ghi kèm và xác nhận `git status --short` trống:

| # | Phá cố ý | Hoàn nguyên | Bài phải đỏ |
|---|---|---|---|
| a | `printf x >> playbook/GOVERNANCE.md` | `git checkout -- playbook/GOVERNANCE.md` | băm khớp |
| b | `printf x > playbook/tep-thua.txt` | `rm playbook/tep-thua.txt` | tệp trên đĩa = manifest |
| c | `rm playbook/specs/inbox/.gitkeep` | `git checkout -- playbook/specs/inbox/.gitkeep` | tệp trên đĩa = manifest |
| d | `chmod 755 playbook/init-project.sh` | `chmod 644 playbook/init-project.sh` | không có bit thực thi |
| e | `cp /Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/CLAUDE.md playbook/CLAUDE.md` | `rm playbook/CLAUDE.md` | đã loại CLAUDE.md |
| f | đổi một ký tự hex đầu tiên của dòng đầu trong `playbook/.PINNED_SHA256` (dùng công cụ Edit) | `git checkout -- playbook/.PINNED_SHA256` | băm khớp |
| g | xoá dòng `playbook/** -text` khỏi `.gitattributes` (Edit) | `git checkout -- .gitattributes` | `.gitattributes` |

Ghi cả ca **không bị bắt** nếu có (ví dụ: sửa cả tệp lẫn manifest cùng lúc — biết trước là không bị bắt, ghi nhận đúng như giới hạn đã nêu ở ADR-0011).

- [ ] **Step 13: Ghi nhật ký và commit nhật ký** — điền kết quả thật của Step 4, 6, 10, 11, 12 vào nhật ký; `git add` nhật ký; commit `Nhật ký thi công T1: kết quả đỏ→xanh và đối chiếu Core` (kèm hai dòng đồng tác giả).

**Cổng — Người kiểm Task 2 (subagent KHÁC, chỉ đọc):** (1) trong bản sao tạm, tự tái hiện `diff -r` với Core (mong đợi đúng hai dòng "Only in"), đếm 43 tệp, `shasum -a 256 -c`; (2) tự tái hiện các phá cố ý a–g trong bản sao tạm và xác nhận đỏ đúng bài; (3) tìm chỗ bài kiểm KHÔNG bắt (ngoài giới hạn đã nêu) và ca chặn nhầm; (4) đọc `PIN-README.md` đối chiếu từng khẳng định với Core (số dòng 8, 24, 28, 29, 46; 11 tệp treo; `GOVERNANCE.md` dòng 98, 109; HEAD; 43 tệp/250.827 byte); (5) xác nhận `git ls-files playbook | wc -l` = 45 (43 + 2) và không tệp nào bị `.gitignore` bỏ qua; (6) xác nhận không đụng tệp ngoài danh sách File Structure. Báo cáo không sửa.

---

## Self-Review (đã chạy)

1. **Phủ đặc tả:** 4A (bản chép, PIN-README, manifest, `.gitattributes` `playbook/** -text`) → Task 2 Step 5–9; 4B (ADR) → Task 1; 4H(1) (tệp trên đĩa = manifest ∪ manifest, băm, NFC, sắp byte, loại `.DS_Store`, độc lập `shasum`) → Step 3; S12 (quan sát đỏ) → Step 12; S13 (mỗi Task một commit, người kiểm khác) → cổng cuối mỗi Task; quyết định 31, 32 → Global Constraints + PIN-README + bài kiểm bit thực thi. **Cố ý chưa làm ở T1:** `migrations/** -text` (thuộc T2 của đặc tả), CODEOWNERS (T9), sửa `README.md`/`CLAUDE.md`/`SPEC` (T8).
2. **Placeholder:** không có "TBD"; mọi tệp có nội dung đầy đủ; số dòng của Core (8, 24, 28, 29, 46, 98, 109) và số liệu (43, 250.827, HEAD) lấy từ đọc thật ngày 2026-09-21.
3. **Nhất quán tên:** `MANIFEST_NAME`, `listPinnedFiles`, `sha256Of`, `renderManifest` dùng nhất quán giữa lib, script và test; chuỗi kiểm PIN-README trong Step 3 đều có mặt trong Step 7 (`CoreSchemaProject/playbook`, HEAD, `CHƯA xác nhận cây sạch`, `archive/`, `CLAUDE.md`, `init-project.sh`, `CẤM chạy`, `.PINNED_VERSION`, `Sửa thẳng tại đây`, `04-CONSTRAINTS`, `ADR-0011`, `diff -r`, `pin-playbook-manifest`).
