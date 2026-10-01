# Vận chuyển còn lại — Đợt 1: việc nhỏ — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một bản phát hành gồm: chặn "Thêm" giấy tờ xe trùng loại đang dùng (ADR-0056 VK3-B), văn phòng đổi thứ tự điểm khi xe đang chạy, Toàn quyền đổi mốc nhắc giấy tờ sắp hết hạn (kèm nhãn hạn giấy tờ cá nhân theo đúng mốc), sửa tài liệu mô tả cũ.

**Architecture:** VK3-B hai lớp: route 409 `document_type_exists` trước, trigger mới 409 `document_type_conflict` sau, cùng đoạn "hiện hành" `HIEN_HANH`. Mốc nhắc tới `parties` qua hàm tiêm của gốc lắp ráp (khuôn `mocToiThieu`, ADR-0049 D2). Nút đổi thứ tự dùng route 39 đã có; luật dựng thân lệnh nằm ở MỘT hàm thuần `src/shared/tien-do-man.ts`, dùng chung cho hai màn.

**Tech Stack:** Worker + D1, TypeScript, `node --test`, khung thử `tests/audit/harness.mjs`, e2e `tests/e2e/*.mjs`, kịch bản Chrome.

**Spec:** lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` (Đợt 1). Nguồn quyết định: ADR-0056 §VK3-B và "Tiêu chí nghiệm thu" mục 5; ADR-0040 D1 (một mốc nhắc); ADR-0049 D3 (route 29 ↔ 39); bản rà `docs/superpowers/specs/2026-10-01-ra-soat-phan-he-van-chuyen.md` mục "Có API, thiếu màn hình". Mã đo ở `0ba370d6`.

## Global Constraints

Giữ nguyên mục Global Constraints của lộ trình mẹ. Thêm cho đợt này:
- Không sửa `migrations/0033_*`, `0034_*` (đã áp remote). Không sửa ADR-0040 dù ADR-0056 ghi câu thay (ADR đã duyệt không sửa; `docs/adr/` có hàng rào).
- Không sửa `CLAUDE.md`, `web/CLAUDE.md` (tệp luật). Bảng "sửa tệp nào chạy kịch bản nào" của `web/CLAUDE.md` đã phủ mọi tệp đợt này chạm.
- Số migration theo L2 của lộ trình: lúc thi công chạy
  ```bash
  { ls migrations; git branch -a --format='%(refname:short)' | while read b; do git ls-tree --name-only "$b" migrations/ 2>/dev/null; done; } \
    | sed 's#^migrations/##' | grep -E '^[0-9]{4}_' | sort -u | tail -5
  ```
  rồi lấy số lớn nhất + 1, ghi vào chỗ `<NNNN>` dưới đây. Không lấp lỗ trống (`0061`, `0064` đang trống trên `main`; `0019` giữ cho B5 theo `docs/HANDOFF-N1.md`).
- Số phiên bản: lớn nhất ở `origin/main` + 1 lúc gộp (`git show origin/main:src/shared/changelog.ts | grep -m1 'version:'`).
- Commit: tiếng Việt, tiêu đề nói việc, thân nói vì sao, kèm hai dòng đồng tác giả theo môi trường.

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| T-1 | Màn đổi mốc nhắc làm luôn phần "nhãn hạn giấy tờ cá nhân theo mốc" | **Có** — Task 4 (máy chủ) + Task 5 (giao diện). Bỏ Task 4 thì bỏ cả ô đổi mốc | Ruling R23 (`docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md:129`, GB2 `:302`) bỏ ô đổi mốc CHỈ vì nhãn hạn giấy tờ người cố định 30 ⇒ đổi mốc làm hai nơi lệch; `src/shared/giay-to-hien-thi.ts:26-30` ghi "khi API có `warnDays` thì thay hằng". ADR-0040 D1 đã định một mốc chung |
| T-2 | Cách đưa mốc tới `parties` | hàm tiêm `ctx.nguongHetHan` của gốc lắp ráp | `parties` không import `van-chuyen`; khuôn sẵn `mocToiThieu` (`src/shared/router.ts:121-126`, `src/index.ts:125`) |
| T-3 | `R-VC-11` sau trigger | giữ mức `warn`, chỉ sửa ghi chú | trigger không quét dữ liệu cũ; ADR-0056 không đòi đổi mức; bài `src/audit-invariants.test.ts:834` ghim `warn` |
| T-4 | Ô "Người đi kèm" lúc xếp | **không làm đợt này** — chuyển "Cần chủ" | không ADR nào định ai được chọn / tên hiện ở đâu (xem cuối tệp) |

## Review Focus

1. **Hai Quản trị cùng bấm "Thêm Kiểm định" cho một xe** ⇒ một người được, người kia 409 câu dễ hiểu (lớp CSDL), không 500. Bài: Task 1 bước 1 (ca `INSERT` thô + `loiRangBuocXe`).
2. **Huỷ dòng gia hạn làm dòng trước sống lại; xe đã có hai dòng song song từ trước** ⇒ không bao giờ sinh thêm dòng hiện hành; dòng cũ song song vẫn gia hạn / huỷ được. Bài: Task 1 bước 1.
3. **Toàn quyền đổi mốc 30 → 7** ⇒ danh sách sắp hết hạn, chi tiết xe, giấy tờ cá nhân (Danh bạ, trang Tôi, trang đầu tài xế) cùng dùng 7. Bài: Task 4 bước 1, Task 5 Chrome.
4. **Văn phòng bấm ↓ đúng lúc tài xế vừa "Đã tới" điểm đó** ⇒ câu của máy chủ "Điểm đã tới hoặc đã bỏ qua…" ở dải báo, màn đọc lại chuyến, không ô trống. Bài: Task 3 bước 1 (ca điểm không chờ → `null`) + Chrome bước 7b.
5. **Quản trị (không Toàn quyền) mở "Sắp hết hạn"** ⇒ không thấy nút đổi mốc; gọi thẳng route vẫn 403 câu của ô (bài sẵn `sap-het-han.test.ts:68`). Bài: Task 5 Chrome bước 5.

---

### Task 1: VK3-B máy chủ — mỗi xe mỗi loại một dòng hiện hành (việc lớn: dữ liệu)

**Files:**
- Create: `migrations/<NNNN>_mot_giay_to_xe_hien_hanh.sql`
- Modify: `src/modules/van-chuyen/repository.ts:160` (sau `FIND_VEHICLE_DOC`), `src/modules/van-chuyen/index.ts:105` (hằng lỗi), `:399-424` (route + chú thích thứ tự), `src/modules/van-chuyen/rules.ts:125-128` (`loiRangBuocXe`), `scripts/audit-checks.mjs:368-371` (ghi chú R-VC-11), `src/audit-invariants.test.ts:844` (bài R-VC-11 gỡ trigger trước khi gieo dữ liệu cũ)
- Test: `src/modules/van-chuyen/giay-to-xe.test.ts`, `src/modules/van-chuyen/rules.test.ts:75`, `tests/e2e/van-chuyen.mjs:105`
- Docs: `docs/SO-HANG-RAO.md` (hai dòng mới + sửa dòng `R-VC-11` ở `:158`), `docs/SYSTEM-DESIGN.md:335` (trigger) và bảng migration (sau dòng `0066`), `docs/CHANGE-GUIDE.md` (bẫy: "Thêm" giấy tờ xe trùng loại → 409, dùng Gia hạn)

**Interfaces:**
- Produces: `hasCurrentVehicleDocOfType(db: D1Database, vehicleId: string, typeCode: string): Promise<boolean>`; mã lỗi route `document_type_exists`, mã lỗi CSDL `document_type_conflict`; trigger `vc_vehicle_document_one_current` (thông báo bắt đầu `vehicle_document_type_current`).

- [ ] **Bước 1: Viết test đỏ** — nối vào cuối `src/modules/van-chuyen/giay-to-xe.test.ts`:

```ts
// (dòng import này đặt lên đầu tệp, cạnh hai import sẵn có)
import { readFileSync, readdirSync } from "node:fs";

const TRIGGER = "vc_vehicle_document_one_current";
const chenTho = (w: any, id: string, xe: string, type: string, truoc: string | null = null) =>
  w.sqlite.prepare(
    `INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, previous_id, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`,
  ).run(id, xe, type, truoc);

test("VK3-B route: thêm Kiểm định khi đã có dòng hiện hành → 409 document_type_exists, không ghi, không nhật ký; Gia hạn → 201; loại khác → 201; huỷ dòng rồi thêm → 201", async () => {
  const { w, xe } = await setup();
  const d1 = dongMoiNhat(await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", expiryDate: ngay(20) }), "INSPECTION").id;
  const [n0, g0] = [soNhatKy(w), w.q("SELECT count(*) n FROM vc_vehicle_document")[0].n];
  const x = await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-9999", expiryDate: ngay(300) });
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "document_type_exists", "lớp route (lớp CSDL trả document_type_conflict)");
  assert.equal(x.json.error.message, "Xe đã có Kiểm định đang dùng — bấm Gia hạn hoặc Sửa sai.");
  assert.deepEqual([soNhatKy(w), w.q("SELECT count(*) n FROM vc_vehicle_document")[0].n], [n0, g0]);
  assert.equal((await giaHan(w, ADM, xe, d1, { expiryDate: ngay(385) })).status, 201, "Gia hạn vẫn được");
  assert.equal((await them(w, ADM, xe, { typeCode: "TPL_INSURANCE", expiryDate: ngay(100) })).status, 201, "loại chưa có vẫn được");
  const bh = w.q("SELECT id, updated_at FROM vc_vehicle_document WHERE document_type_code = 'TPL_INSURANCE'")[0];
  assert.equal((await suaSai(w, ADM, xe, bh.id, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: bh.updated_at })).status, 200);
  assert.equal((await them(w, ADM, xe, { typeCode: "TPL_INSURANCE", expiryDate: ngay(120) })).status, 201, "dòng cũ đã huỷ → thêm lại được");
});

test("VK3-B CSDL: INSERT thô dòng song song → RAISE vehicle_document_type_current; dòng gia hạn, loại khác → được; huỷ dòng gia hạn không sinh dòng hiện hành thứ hai", async () => {
  const { w, xe } = await setup();
  chenTho(w, "a0000000-0000-4000-8000-000000000001", xe, "INSPECTION");
  assert.throws(() => chenTho(w, "a0000000-0000-4000-8000-000000000002", xe, "INSPECTION"), /vehicle_document_type_current/);
  chenTho(w, "a0000000-0000-4000-8000-000000000003", xe, "INSPECTION", "a0000000-0000-4000-8000-000000000001");
  chenTho(w, "a0000000-0000-4000-8000-000000000004", xe, "TPL_INSURANCE");
  w.sqlite.prepare("UPDATE vc_vehicle_document SET voided_at = '2026-10-01T01:00:00.000Z' WHERE id = 'a0000000-0000-4000-8000-000000000003'").run();
  const r = await w.call("GET", `/api/van-chuyen/xe/${xe}`, { as: ADM });
  assert.equal(r.json.documents.filter((d: any) => d.typeCode === "INSPECTION" && d.current).length, 1, "dòng trước sống lại — vẫn MỘT dòng hiện hành");
  assert.throws(() => chenTho(w, "a0000000-0000-4000-8000-000000000005", xe, "INSPECTION"), /vehicle_document_type_current/);
});

test("VK3-B dữ liệu cũ: hai dòng song song có TRƯỚC trigger vẫn gia hạn / huỷ được qua route (trigger chỉ canh dòng mới không nối dòng nào)", async () => {
  const { w, xe } = await setup();
  const sql = w.q("SELECT sql FROM sqlite_master WHERE name = ?", TRIGGER)[0].sql;
  w.sqlite.exec(`DROP TRIGGER ${TRIGGER}`);
  chenTho(w, "b0000000-0000-4000-8000-000000000001", xe, "INSPECTION");
  chenTho(w, "b0000000-0000-4000-8000-000000000002", xe, "INSPECTION");
  w.sqlite.exec(sql);
  assert.equal((await giaHan(w, ADM, xe, "b0000000-0000-4000-8000-000000000001", { expiryDate: ngay(385) })).status, 201);
  const d2 = dong(w, "b0000000-0000-4000-8000-000000000002");
  assert.equal((await suaSai(w, ADM, xe, d2.id, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: d2.updated_at })).status, 200);
});

test("VK3-B một luật: trigger chứa NGUYÊN VĂN HIEN_HANH của van-chuyen/repository.ts", () => {
  const repo = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  const m = repo.match(/const HIEN_HANH = "(.+?)";/);
  assert.ok(m, "không thấy HIEN_HANH");
  const dir = new URL("../../../migrations/", import.meta.url);
  const tep = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(new URL(f, dir), "utf8")).find((s) => s.includes(`CREATE TRIGGER ${TRIGGER}`));
  assert.ok(tep, `không có migration tạo ${TRIGGER}`);
  assert.ok(tep!.includes(m![1]!), "trigger phải dùng đúng đoạn HIEN_HANH (tránh hai luật 'hiện hành')");
});
```

Thêm vào bài `loiRangBuocXe` ở `src/modules/van-chuyen/rules.test.ts:75` (trong thân bài có sẵn):

```ts
  assert.deepEqual(loiRangBuocXe("D1_ERROR: vehicle_document_type_current: xe đã có giấy tờ loại này đang dùng — gia hạn hoặc sửa sai: SQLITE_CONSTRAINT"), {
    status: 409, code: "document_type_conflict", message: "Xe vừa có giấy tờ loại này — tải lại rồi bấm Gia hạn hoặc Sửa sai.",
  });
```

- [ ] **Bước 2: Chạy, thấy đỏ**

Run: `node --test src/modules/van-chuyen/giay-to-xe.test.ts src/modules/van-chuyen/rules.test.ts`
Expected: FAIL — route trả 201 thay vì 409; `assert.throws` không ném; "không có migration tạo vc_vehicle_document_one_current"; `loiRangBuocXe` trả `null`.

- [ ] **Bước 3: Migration** — `migrations/<NNNN>_mot_giay_to_xe_hien_hanh.sql`:

```sql
-- ADR-0056 VK3-B (Q-L3-3 = a "Không cho, dùng Gia hạn"): mỗi xe, mỗi loại giấy tờ tối đa MỘT dòng hiện hành. Chỉ THÊM một trigger; KHÔNG sửa dữ liệu cũ
-- (dòng song song đã có: Quản trị huỷ bằng Sửa sai → Nhập nhầm cả dòng; R-VC-11 đếm). Chỉ canh dòng mới KHÔNG nối dòng nào (previous_id IS NULL): dòng gia
-- hạn đã có vc_vehicle_document_renew_ins + vc_vehicle_document_next_uq của 0033. Lớp route trả document_type_exists; lớp này RAISE
-- vehicle_document_type_current → loiRangBuocXe trả document_type_conflict (khuôn R15 ADR-0040: hai lớp, hai mã). Đoạn "hiện hành" là NGUYÊN VĂN HIEN_HANH
-- của src/modules/van-chuyen/repository.ts (bài giay-to-xe.test.ts so chữ). Không áp cho giấy tờ của người.
CREATE TRIGGER vc_vehicle_document_one_current BEFORE INSERT ON vc_vehicle_document
WHEN NEW.previous_id IS NULL AND EXISTS (
  SELECT 1 FROM vc_vehicle_document d
  WHERE d.vehicle_id = NEW.vehicle_id AND d.document_type_code = NEW.document_type_code
    AND (d.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)))
BEGIN SELECT RAISE(ABORT, 'vehicle_document_type_current: xe đã có giấy tờ loại này đang dùng — gia hạn hoặc sửa sai'); END;
```

- [ ] **Bước 4: Lớp CSDL → mã** — `src/modules/van-chuyen/rules.ts`, trong `loiRangBuocXe`, NGAY TRƯỚC nhánh `document_changed`:

```ts
  // ADR-0056 VK3-B lớp CSDL (trigger vc_vehicle_document_one_current) — mã KHÁC lớp route (document_type_exists). Tới đây khi hai người cùng bấm "Thêm".
  if (/vehicle_document_type_current/.test(message)) {
    return { status: 409, code: "document_type_conflict", message: "Xe vừa có giấy tờ loại này — tải lại rồi bấm Gia hạn hoặc Sửa sai." };
  }
```

- [ ] **Bước 5: Lớp route** — `src/modules/van-chuyen/repository.ts`, sau `FIND_VEHICLE_DOC`:

```ts
// ADR-0056 VK3-B lớp ROUTE: xe đã có dòng HIỆN HÀNH của loại này chưa — CÙNG đoạn HIEN_HANH với trigger vc_vehicle_document_one_current và R-VC-11.
const HAS_CURRENT_DOC_OF_TYPE = defineSql(
  "van-chuyen",
  "has_current_vehicle_document_of_type",
  `SELECT 1 AS x FROM vc_vehicle_document d WHERE d.vehicle_id = ?1 AND d.document_type_code = ?2 AND ${HIEN_HANH} LIMIT 1`,
);
export async function hasCurrentVehicleDocOfType(db: D1Database, vehicleId: string, typeCode: string): Promise<boolean> {
  return (await db.prepare(HAS_CURRENT_DOC_OF_TYPE).bind(vehicleId, typeCode).first<{ x: number }>()) !== null;
}
```

`src/modules/van-chuyen/index.ts`: thêm `hasCurrentVehicleDocOfType` vào import từ `./repository.ts` (dòng 17); sau `DOC_NOT_CURRENT` (dòng 105):

```ts
// ADR-0056 VK3-B lớp ROUTE — lớp CSDL (trigger) trả document_type_conflict (loiRangBuocXe).
const DOC_TYPE_EXISTS = (ten: string) => error(409, "document_type_exists", `Xe đã có ${ten} đang dùng — bấm Gia hạn hoặc Sửa sai.`);
```

Trong route `POST /api/van-chuyen/xe/:id/giay-to`, ngay sau `const v = parsed.value;`:

```ts
      if (await hasCurrentVehicleDocOfType(env.DB, id, v.typeCode)) return DOC_TYPE_EXISTS(d.tenLoai(v.typeCode));
```

Sửa chú thích thứ tự ở `:399-400`: "… → 400 thân → 409 loại đã có dòng hiện hành (thêm — ADR-0056 VK3-B, `document_type_exists`; lớp CSDL `document_type_conflict`) → 409 dòng hiện hành (gia hạn, sửa sai) → …".

- [ ] **Bước 6: Bài R-VC-11 gieo dữ liệu cũ** — `src/audit-invariants.test.ts:844`, ngay sau `const db = build();` thêm:

```ts
  db.exec("DROP TRIGGER vc_vehicle_document_one_current"); // dữ liệu CŨ có trước trigger ADR-0056 VK3-B — R-VC-11 là lưới cho đúng dữ liệu đó
```

Sửa ghi chú R-VC-11 ở `scripts/audit-checks.mjs:368-371` thành: "route "Thêm giấy tờ" (409 `document_type_exists`) và trigger `vc_vehicle_document_one_current` (ADR-0056 VK3-B, migration `<NNNN>`) chặn dòng song song MỚI; câu này đếm dòng CŨ có trước trigger. Mức warn: Quản trị huỷ dòng nhập nhầm, không chặn phát hành." Đổi cả chữ cuối dòng 1 của chú thích bài ở `src/audit-invariants.test.ts:859` ("CSDL và route hôm nay đều nhận") thành "dữ liệu cũ trước trigger VK3-B".

- [ ] **Bước 7: Chạy, thấy xanh** — `npm run db:migrate:local` không cần (khung thử dựng từ `migrations/`).

Run: `node --test src/modules/van-chuyen/giay-to-xe.test.ts src/modules/van-chuyen/rules.test.ts src/audit-invariants.test.ts`
Expected: PASS.

Rồi tìm chỗ khác thêm cùng loại hai lần cho một xe (khung thử, e2e, kịch bản Chrome):

Run (zsh: phải có nháy quanh `--include`):
```bash
grep -rn "/giay-to[\`\"]" src tests docs/evidence --include='*.ts' --include='*.mjs' | grep -v "gia-han\|sua-sai"
grep -rln "INTO vc_vehicle_document " src tests docs/evidence scripts --include='*.ts' --include='*.mjs'
npm test
```
Expected: xanh. Có bài đỏ vì thêm trùng loại ⇒ bài đó đang gieo dữ liệu cũ hoặc đi sai đường: đổi lần thêm thứ hai thành Gia hạn nếu bài không cố ý kiểm song song; cố ý kiểm song song thì gỡ trigger như bước 6. Ghi mỗi chỗ sửa vào nhật ký thi công.

- [ ] **Bước 8: e2e** — `tests/e2e/van-chuyen.mjs`, ngay sau `assert.equal(r.status, 201 …)` của lần thêm `KD-E2E-1` (dòng 106):

```js
const dup = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xe2.id}/giay-to`, { typeCode: "INSPECTION", number: "KD-E2E-2", expiryDate: vnDate(300) });
assert.equal(dup.status, 409, JSON.stringify(dup.body));
assert.equal(dup.body.error.code, "document_type_exists", "ADR-0056 VK3-B: xe đã có Kiểm định đang dùng → dùng Gia hạn");
```

Run: `npm run test:e2e -- van-chuyen`
Expected: PASS (cần mạng).

- [ ] **Bước 9: Thấy hàng rào chặn thật (P16)** — mỗi phép sửa cố ý → chạy `node --test src/modules/van-chuyen/giay-to-xe.test.ts` → chép dòng `not ok` → hoàn nguyên → xanh, `git diff --quiet`:
  1. Xoá khối `CREATE TRIGGER` trong `<NNNN>` ⇒ kỳ vọng đỏ bài "VK3-B CSDL" và "VK3-B một luật".
  2. Xoá dòng `if (await hasCurrentVehicleDocOfType…` ⇒ kỳ vọng đỏ bài "VK3-B route" với `document_type_conflict !== document_type_exists` (lớp CSDL đỡ, mã khác — đúng khuôn R15).
  3. Bỏ `AND n.voided_at IS NULL` trong trigger ⇒ kỳ vọng đỏ "VK3-B một luật".

- [ ] **Bước 10: Tài liệu + sổ hàng rào**
  - `docs/SO-HANG-RAO.md`: thêm hai dòng — (a) trigger `vc_vehicle_document_one_current` + bài "một luật"; (b) route 409 `document_type_exists` — mỗi dòng ghi ngày + phép sửa + dòng `not ok` quan sát ở bước 9. Sửa cột "Ghi chú" dòng `R-VC-11` (`:158`): bỏ câu "KHÔNG chặn: route … và CSDL vẫn nhận dòng song song — chặn thật là đề xuất VK3-B", thay "Từ `<NNNN>` route + trigger chặn dòng mới (hai dòng trên); câu này còn đếm dòng cũ."
  - `docs/SYSTEM-DESIGN.md:335`: "`vc_vehicle_document_*` (5 trigger + `_next_uq`, cùng khuôn 0032)" → "(5 trigger + `_next_uq` của 0033; `vc_vehicle_document_one_current` của `<NNNN>` — một dòng hiện hành mỗi loại, ADR-0056 VK3-B)". Thêm dòng bảng migration `<NNNN>` theo khuôn dòng `0066`.
  - `docs/CHANGE-GUIDE.md`: thêm một bẫy (số kế tiếp trong danh sách bẫy) "Giấy tờ XE: 'Thêm' loại đã có dòng hiện hành → 409 `document_type_exists` (route) / `document_type_conflict` (trigger) — dữ liệu thử phải đi Gia hạn; bài muốn dòng song song cũ phải gỡ trigger như `src/audit-invariants.test.ts` R-VC-11."

- [ ] **Bước 11: Commit**

```bash
git add migrations/<NNNN>_mot_giay_to_xe_hien_hanh.sql src/modules/van-chuyen/{repository,index,rules}.ts src/modules/van-chuyen/{giay-to-xe,rules}.test.ts \
  src/audit-invariants.test.ts scripts/audit-checks.mjs tests/e2e/van-chuyen.mjs docs/SO-HANG-RAO.md docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md
git commit -m "Giấy tờ xe: mỗi loại một dòng hiện hành — route 409 và trigger (ADR-0056 VK3-B)" -m "Bấm Thêm thay vì Gia hạn từng sinh hai chuỗi giấy tờ song song (R-VC-11). Hai lớp, hai mã như khuôn R15; trigger dùng nguyên văn HIEN_HANH."
```

---

### Task 2: VK3-B giao diện — form "Thêm giấy tờ" xe ẩn loại đã có

**Files:**
- Modify: `src/shared/giay-to-hien-thi.ts` (hàm mới), `web/xe-chi-tiet.ts:33-40` (truyền loại lọc), `:80` (nút "Thêm giấy tờ")
- Test: `src/shared/giay-to-hien-thi.test.ts`; Chrome `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-chi-tiet-smoke.mjs` (+ chạy lại `giay-to-nguoi-smoke.mjs` vì tệp dùng chung)

**Interfaces:**
- Consumes: DTO giấy tờ xe có `typeCode`, `current` (`Api.VehicleDocumentDto`), loại có `code`, `active`.
- Produces: `loaiThemDuocChoXe<T extends { code: string; active: boolean }>(types: readonly T[], docs: readonly { typeCode: string; current: boolean }[]): T[]`.

- [ ] **Bước 1: Test đỏ** — cuối `src/shared/giay-to-hien-thi.test.ts` (thêm `loaiThemDuocChoXe` vào import):

```ts
test("loaiThemDuocChoXe (ADR-0056 VK3-B): bỏ loại đang có dòng HIỆN HÀNH và loại đã ngưng; dòng lịch sử / đã huỷ không tính", () => {
  const types = [{ code: "INSPECTION", active: true }, { code: "TPL_INSURANCE", active: true }, { code: "REGISTRATION", active: true }, { code: "OLD", active: false }];
  const docs = [
    { typeCode: "INSPECTION", current: true },
    { typeCode: "INSPECTION", current: false },
    { typeCode: "TPL_INSURANCE", current: false },
  ];
  assert.deepEqual(loaiThemDuocChoXe(types, docs).map((t) => t.code), ["TPL_INSURANCE", "REGISTRATION"]);
  assert.deepEqual(loaiThemDuocChoXe(types, [{ typeCode: "INSPECTION", current: true }, { typeCode: "TPL_INSURANCE", current: true }, { typeCode: "REGISTRATION", current: true }]), []);
});
```

- [ ] **Bước 2: Chạy, thấy đỏ** — `node --test src/shared/giay-to-hien-thi.test.ts` → FAIL "loaiThemDuocChoXe is not a function".

- [ ] **Bước 3: Mã** — `src/shared/giay-to-hien-thi.ts`:

```ts
/** ADR-0056 VK3-B: loại giấy tờ XE còn "Thêm" được = đang dùng và xe CHƯA có dòng hiện hành của loại đó (có rồi thì Gia hạn / Sửa sai). Máy chủ luôn kiểm lại. */
export function loaiThemDuocChoXe<T extends { code: string; active: boolean }>(types: readonly T[], docs: readonly { typeCode: string; current: boolean }[]): T[] {
  const daCo = new Set(docs.filter((d) => d.current).map((d) => d.typeCode));
  return types.filter((t) => t.active && !daCo.has(t.code));
}
```

`web/xe-chi-tiet.ts`: import `loaiThemDuocChoXe`; trong `moBang` đổi `types: meta.documentTypes,` thành

```ts
    types: kind === "add" ? loaiThemDuocChoXe(meta.documentTypes, docs) : meta.documentTypes,
```

Ở `:80` (nút "Thêm giấy tờ"): khi `loaiThemDuocChoXe(meta.documentTypes, docs).length === 0` thì `themTren.disabled = true` và đặt ngay sau nút `h("span", { class: "dp-note" }, "Xe đã có đủ các loại giấy tờ — dùng Gia hạn hoặc Sửa sai.")`. Làm cùng cho nút "Thêm giấy tờ" dính đáy điện thoại (cùng tệp, tìm chuỗi `"Thêm giấy tờ"`).

- [ ] **Bước 4: Xanh + typecheck** — `node --test src/shared/giay-to-hien-thi.test.ts && npm run typecheck` → PASS, 0 lỗi.

- [ ] **Bước 5: Chrome** — `npm run build:web`, thêm vào `xe-chi-tiet-smoke.mjs` một bước sau bước đang thêm Kiểm định: mở bảng "Thêm giấy tờ" → ô loại KHÔNG có "Kiểm định"; chạy cả `giay-to-nguoi-smoke.mjs`. Cách chạy ở đầu mỗi kịch bản; ảnh vào `docs/evidence/<ngày>-van-chuyen-dot-1/`.

- [ ] **Bước 6: Commit** — `git commit -m "Chi tiết xe: form Thêm giấy tờ ẩn loại xe đã có (ADR-0056 VK3-B)" -m "Giao diện khớp luật máy chủ: loại đã có dòng hiện hành thì Gia hạn, không Thêm."`

---

### Task 3: Văn phòng đổi thứ tự điểm chưa tới khi xe đang chạy

**Files:**
- Modify: `src/shared/tien-do-man.ts` (hàm mới), `web/cuoc-chuyen.ts:144-160` (dùng hàm chung), `web/chuyen.ts:297` (`phuDiem` thêm `ben`) + hàm nút mới, `docs/BACKLOG.md:60` (Q-B-15 xong)
- Test: `src/shared/tien-do-man.test.ts`; Chrome `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` (bước 7b mới, bước 9 thêm khẳng định) + `chuyen-smoke.mjs`

**Interfaces:**
- Consumes: route `POST /api/van-chuyen/chuyen/:id/thu-tu` (`src/modules/van-chuyen/index.ts:1387`, ô `trip.progress`, thân `{ requestId, diem: { id, thuTu }[] }`, KHÔNG nhận `xayRaLuc` — `dieu-phoi-than.ts:208` gọi `docXayRa(body, false)`). `guiTienDo(duoi, than)` của `web/chuyen.ts:236` (tự gắn `requestId`, đọc lại GET).
- Produces: `thanDoiThuTu(diem: readonly Pick<DiemVao, "id" | "thuTu" | "trangThai">[], diemId: string, huong: -1 | 1): { diem: { id: string; thuTu: number }[] } | null`.

- [ ] **Bước 1: Test đỏ** — `src/shared/tien-do-man.test.ts` (thêm `thanDoiThuTu` vào import):

```ts
test("thanDoiThuTu (route 29 / 39): đổi chỗ với điểm CHƯA TỚI liền kề, giữ tập số thứ tự cũ; điểm đã tới bị bỏ qua; đầu / cuối / điểm không chờ → null", () => {
  const d = [
    { id: "a", thuTu: 1, trangThai: "ARRIVED" as const },
    { id: "b", thuTu: 2, trangThai: "PENDING" as const },
    { id: "c", thuTu: 4, trangThai: "PENDING" as const },
    { id: "e", thuTu: 3, trangThai: "SKIPPED" as const },
    { id: "f", thuTu: 5, trangThai: "PENDING" as const },
  ];
  assert.deepEqual(thanDoiThuTu(d, "c", 1), { diem: [{ id: "b", thuTu: 2 }, { id: "f", thuTu: 4 }, { id: "c", thuTu: 5 }] });
  assert.deepEqual(thanDoiThuTu(d, "c", -1), { diem: [{ id: "c", thuTu: 2 }, { id: "b", thuTu: 4 }, { id: "f", thuTu: 5 }] });
  assert.equal(thanDoiThuTu(d, "b", -1), null, "đầu danh sách chờ");
  assert.equal(thanDoiThuTu(d, "f", 1), null, "cuối danh sách chờ");
  assert.equal(thanDoiThuTu(d, "a", 1), null, "điểm đã tới — Review Focus 4: tài xế vừa bấm Đã tới");
});
```

- [ ] **Bước 2: Đỏ** — `node --test src/shared/tien-do-man.test.ts` → FAIL "thanDoiThuTu is not a function".

- [ ] **Bước 3: Hàm thuần** — `src/shared/tien-do-man.ts`:

```ts
/**
 * Thân lệnh "đổi thứ tự" (route 29 của tài xế ↔ 39 của văn phòng — CÙNG một hàm xử lý): đổi chỗ điểm `diemId` với điểm CHƯA TỚI liền trước (-1) / liền sau (+1),
 * gửi đủ các điểm chưa tới với tập số thứ tự cũ (máy chủ chỉ ghi điểm đổi số). `null` = không đổi được (đầu / cuối, hoặc điểm không còn chờ).
 */
export function thanDoiThuTu(diem: readonly Pick<DiemVao, "id" | "thuTu" | "trangThai">[], diemId: string, huong: -1 | 1): { diem: { id: string; thuTu: number }[] } | null {
  const cho = diem.filter((d) => d.trangThai === "PENDING").sort((x, y) => x.thuTu - y.thuTu);
  const i = cho.findIndex((d) => d.id === diemId);
  const j = i + huong;
  if (i < 0 || j < 0 || j >= cho.length) return null;
  const moi = [...cho];
  [moi[i], moi[j]] = [moi[j]!, moi[i]!];
  return { diem: moi.map((d, k) => ({ id: d.id, thuTu: cho[k]!.thuTu })) };
}
```

- [ ] **Bước 4: Màn tài xế dùng hàm chung** — `web/cuoc-chuyen.ts` `nutThuTu` (dòng 144-160) thay bằng:

```ts
function nutThuTu(b: BuocDiem): HTMLElement | null {
  const r = duLieu!;
  if (r.chuyen.trangThai !== "RUNNING" || b.diem.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    const than = thanDoiThuTu(r.diem, b.diem.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than, "aria-label": nhan, "data-action": action }, kyHieu);
    x.addEventListener("click", () => { if (than) void chay("thu-tu", () => gui("thu-tu", than)); });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom" }, nut(-1, "↑", `Đưa ${b.diem.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${b.diem.tenNoi} xuống sau`, "xuong"));
}
```

(import `thanDoiThuTu` từ `../src/shared/tien-do-man`.)

- [ ] **Bước 5: Màn văn phòng** — `web/chuyen.ts`: import `thanDoiThuTu`, `type BuocDiem` từ `../src/shared/tien-do-man` và `cauLoiTienDo` từ `./tien-do-ui`; thêm sau `diemChay`:

```ts
/** Văn phòng đổi thứ tự điểm CHƯA TỚI khi xe đang chạy (route 39 ↔ 29, ADR-0049 D3): nút lên / xuống như màn tài xế; không ô giờ (route không nhận xayRaLuc). */
function nutThuTuVanPhong(b: BuocDiem): HTMLElement | null {
  const r = duLieu!;
  if (!coTienDo || r.chuyen.trangThai !== "RUNNING" || b.diem.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    const than = thanDoiThuTu(r.diem, b.diem.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than, "aria-label": nhan, "data-action": action }, kyHieu);
    x.addEventListener("click", async () => {
      if (!than) return;
      x.disabled = true;
      try {
        await guiTienDo("thu-tu", than);
        xong(dai("ok", "Đã đổi thứ tự điểm"));
      } catch (e) {
        const cau = cauLoiTienDo(e, Date.now(), r.chuyen.ngayChay).cau;
        try {
          await nap(); // 409 (vd tài xế vừa "Đã tới" điểm này): đọc lại chuyến để nút lên / xuống theo trạng thái mới
        } catch {
          /* mất mạng: giữ dữ liệu cũ, dải báo vẫn hiện */
        }
        xong(dai("danger", "Chưa đổi được thứ tự điểm", [cau]));
      }
    });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom" }, nut(-1, "↑", `Đưa ${b.diem.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${b.diem.tenNoi} xuống sau`, "xuong"));
}
```

Ở `:297` đổi `phuDiem: (b) => ({ duoi: … })` thành `phuDiem: (b) => ({ ben: nutThuTuVanPhong(b) ?? undefined, duoi: … })` (giữ nguyên phần `duoi`).

- [ ] **Bước 6: Xanh** — `node --test src/shared/tien-do-man.test.ts && npm run typecheck` → PASS, 0 lỗi.

- [ ] **Bước 7: Chrome** — `npm run build:web`. Trong `cuoc-smoke.mjs` thêm bước `7b` ngay sau bước 7 (T1 vừa xuất bến, trang `s` của Bán hàng, 1040):
  - có 4 nút `.dp-thu-tu` (2 điểm chưa tới), `↑` của điểm đầu và `↓` của điểm cuối bị khoá;
  - bấm `↓` của điểm đầu → có POST `/thu-tu`, thân chỉ có khoá `requestId`, `diem` (không `xayRaLuc`); dải "Đã đổi thứ tự điểm"; thứ tự chữ `.dp-run-noi` đảo; KHÔNG chữ mã thô (`noCode`);
  - bấm `↑` để trả về thứ tự cũ (bước 8 bấm "Đã tới" ở điểm đầu). Máy chủ từ chối trả trước đón ⇒ khẳng định dải "Chưa đổi được thứ tự điểm" kèm câu tiếng Việt thay cho dải "Đã đổi", và ghi lại vào nhật ký thi công.
  - Review Focus 4 (màn cũ): trên trang `s` đang mở, ghi "Đã tới" điểm đầu bằng API — `call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T1.id}/diem/${idDiemDau}/da-toi`, { requestId: randomUUID() })` — rồi bấm `↓` của điểm đó trên trang chưa tải lại ⇒ dải "Chưa đổi được thứ tự điểm" + câu "Điểm đã tới hoặc đã bỏ qua…", sau đó điểm đó KHÔNG còn nút `.dp-thu-tu` (màn đã đọc lại). Bước này đổi trạng thái T1 cho bước 8 ⇒ đặt nó SAU bước 8 (bước `8b`, mở lại `s` trên một chuyến đang chạy còn ≥ 1 điểm chưa tới), hoặc sửa bước 8 bấm "Đã tới" ở điểm kế tiếp — chọn một, ghi nhật ký thi công.
  - Bước 9 (Kế toán) thêm `.dp-thu-tu` vào danh sách selector phải đếm 0.
  Chạy `cuoc-smoke.mjs` và `chuyen-smoke.mjs`; ảnh `b2-doi-thu-tu-van-phong.png`.

- [ ] **Bước 8: BACKLOG** — `docs/BACKLOG.md:60` đổi thành "- ~~Q-B-15: văn phòng sắp lại thứ tự điểm dừng khi chuyến đang chạy~~ — **xong bản <số phiên bản>** (nút lên / xuống ở Chi tiết chuyến, khuôn màn tài xế)."

- [ ] **Bước 9: Commit** — `git commit -m "Chi tiết chuyến: văn phòng đổi thứ tự điểm chưa tới khi xe đang chạy" -m "Route 39 có từ 1.38 nhưng không màn nào gọi (Q-B-15). Luật dựng thân lệnh dùng chung một hàm thuần cho màn tài xế và văn phòng."`

---

### Task 4: Mốc nhắc giấy tờ tới danh sách giấy tờ người (máy chủ; việc lớn: hợp đồng giữa module)

**Files:**
- Modify: `src/shared/router.ts:121-126` (ctx), `:226-233` (injected), `:309` (dựng ctx); `src/modules/van-chuyen/index.ts:113` (hàm công bố); `src/index.ts:31`, `:125` (tiêm); `src/shared/contracts.ts:825`; `src/modules/parties/index.ts:487-489`, `:582-591`, `:671-679`, `:710`, `:746`, `:796`
- Test: `src/modules/parties/giay-to-route.test.ts`, `src/shared/router.test.ts` (ca không tiêm), `tests/e2e/van-chuyen.mjs:116-125`

**Interfaces:**
- Produces: `nguongHetHanHienHanh(db: D1Database): Promise<number>` (van-chuyen, CHỈ gốc lắp ráp gọi); `ctx.nguongHetHan: () => Promise<number>`; `PersonDocumentListResponse.warnDays: number`.

- [ ] **Bước 1: Test đỏ** — cuối `src/modules/parties/giay-to-route.test.ts`:

```ts
test("ADR-0040 D1 (GB2/R23): mọi phản hồi danh sách giấy tờ người mang warnDays = mốc đang hiệu lực; Toàn quyền đổi 7 → mọi đường trả 7", async () => {
  const w = setup();
  const ids = gieoTaiXe(w);
  const doc = async () => [
    (await w.call("GET", "/api/parties/documents/mine", { as: DRIVER })).json.warnDays,
    (await w.call("GET", `/api/parties/${pty(DRIVER)}/documents`, { as: ADM })).json.warnDays,
  ];
  assert.deepEqual(await doc(), [30, 30]);
  assert.equal((await w.call("POST", "/api/van-chuyen/nguong-het-han", { as: SUP, body: { warnDays: 7 } })).status, 200);
  assert.deepEqual(await doc(), [7, 7]);
  const g = await giaHan(w, ADM, pty(DRIVER), ids.gplx, { expiryDate: "2027-11-05" });
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.warnDays, 7, "phản hồi sau khi ghi cũng mang mốc");
});
```

Cuối `src/shared/router.test.ts`:

```ts
test("ctx.nguongHetHan: khung thử không tiêm → 30 (NGUONG_MAC_DINH, chỉ để hiển thị); có tiêm → đúng giá trị tiêm", async () => {
  const s = staffOf(["SALES"]);
  const mod: AppModule = { name: "giả", routes: [route("GET", "/api/moc", "staff", async ({ nguongHetHan }) => json({ moc: await nguongHetHan() }))] };
  const goc = {
    isAssigned: async () => false,
    newOrderHandler: async () => ({ ok: false as const, message: "không dùng" }),
    ordersWithHandler: async () => new Set<string>(),
    handledOrderIdsOf: async () => [],
    maintenanceBlock: async () => null,
    partyAccount: async () => ({ linked: false }),
    baoThayDoi: async () => {},
    dongBangTin: async () => {},
    giaoLoDay: async () => [],
    mocToiThieu: async () => ({ phut: 360, policyId: "moc-gia-router", canhBaoPhut: 120 }),
  };
  const doc = async (injected: any) => {
    const app = createApp({ modules: [mod], currentStaff: async () => phien(s), injected });
    return (await (await app.fetch(new Request("http://x/api/moc"), {} as Env, {} as ExecutionContext)).json()).moc;
  };
  assert.equal(await doc(goc), 30);
  assert.equal(await doc({ ...goc, nguongHetHan: async () => 7 }), 7);
});
```

- [ ] **Bước 2: Đỏ** — `node --test src/modules/parties/giay-to-route.test.ts src/shared/router.test.ts` → FAIL `undefined !== 30`.

- [ ] **Bước 3: Mã**

`src/modules/van-chuyen/index.ts` sau `mocToiThieuHienHanh`:

```ts
/** HÀM CÔNG BỐ (ADR-0040 D1; GB2/R23): mốc "sắp hết hạn" đang hiệu lực — CHỈ gốc lắp ráp gọi, để tiêm `ctx.nguongHetHan` cho parties (không import van-chuyen). */
export const nguongHetHanHienHanh = (db: D1Database): Promise<number> => currentWarnDays(db, new Date().toISOString());
```

`src/shared/router.ts` — trong kiểu ctx, sau `mocToiThieu`:

```ts
  /**
   * MỐC "SẮP HẾT HẠN" đang hiệu lực (ADR-0040 D1 — MỘT mốc cho giấy tờ xe lẫn giấy tờ người; GB2/R23) — do gốc lắp ráp tiêm (`van-chuyen.nguongHetHanHienHanh`;
   * `parties` không đọc bảng `vc_`, không import `van-chuyen` — khuôn `mocToiThieu`). Một truy vấn mỗi lần gọi; route gọi đúng một lần mỗi request. Môi
   * trường không tiêm (khung thử cố ý) → `NGUONG_MAC_DINH` (30 — bằng dòng gieo 0033 và giá trị mặc định của `currentWarnDays`; chỉ dùng để hiển thị nhãn hạn).
   */
  nguongHetHan: () => Promise<number>;
```

trong kiểu `injected`, sau `mocToiThieu`: `/** Mốc sắp hết hạn (ADR-0040 D1). BẮT BUỘC trong mã chạy thật (src/index.ts). */ nguongHetHan: (env: Env) => Promise<number>;`

khi dựng ctx, sau dòng `mocToiThieu:` (`:309`):

```ts
      nguongHetHan: () => (typeof opts.injected.nguongHetHan === "function" ? opts.injected.nguongHetHan(env) : Promise.resolve(NGUONG_MAC_DINH)),
```

và `import { NGUONG_MAC_DINH } from "./giay-to-hien-thi.ts";`. Mọi chỗ dựng `injected` trong test (`grep -rn "mocToiThieu:" src tests`) không phải sửa (kiểm bằng `typeof`); typecheck báo thiếu ở `src/index.ts` thì thêm ở bước sau.

`src/index.ts`: import `nguongHetHanHienHanh` (dòng 31); sau `mocToiThieu: (env) => …` (dòng 125):

```ts
    // MỐC SẮP HẾT HẠN (ADR-0040 D1, GB2/R23): parties không đọc bảng vc_ — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố của van-chuyen.
    nguongHetHan: (env) => nguongHetHanHienHanh(env.DB),
```

`src/shared/contracts.ts:825`:

```ts
/** `warnDays` = mốc "sắp hết hạn" đang hiệu lực (ADR-0040 D1) — nhãn hạn ở giao diện so với số này, không hằng 30. */
export interface PersonDocumentListResponse { documents: PersonDocumentDto[]; warnDays: number }
```

`src/modules/parties/index.ts`:
- `respondDocs(db, partyId, status)` → `respondDocs(db, partyId, status, warnDays: number)`, thân `json({ documents: …, warnDays } satisfies PersonDocumentListResponse, status)`; ba nơi gọi (`:710`, `:746`, `:796`) truyền `await ctx.nguongHetHan()` (ba route này nhận `ctx` nguyên khối).
- `GET /api/parties/documents/mine` (`:582`): thêm `nguongHetHan` vào tham số; cả hai `json(...)` (`:589`, `:591`) thêm `warnDays: await nguongHetHan()` — gọi một lần, gán biến trước nhánh `if (!staff.partyId)`, SAU hai lần kiểm quyền.
- `GET /api/parties/:id/documents` (`:671`): như trên cho hai `json(...)` (`:677`, `:679`), sau `can()`.

- [ ] **Bước 4: Xanh** — `node --test src/modules/parties/giay-to-route.test.ts src/shared/router.test.ts && npm run typecheck` → PASS, 0 lỗi. Rồi `npm test` (bài kiến trúc canh `parties` không import `van-chuyen`; bài quét nơi gọi hàm công bố van-chuyen nếu có).

- [ ] **Bước 5: e2e** — `tests/e2e/van-chuyen.mjs`, trong khối `try` mục 8, sau `assert.deepEqual(cua(r.body.items), [["vehicle", "Kiểm định"]]);`:

```js
  r = await call(TX, "GET", "/api/parties/documents/mine");
  assert.equal(r.body.warnDays, 7, "giấy tờ của tài xế dùng CÙNG mốc (ADR-0040 D1)");
```

Run: `npm run test:e2e -- van-chuyen` → PASS.

- [ ] **Bước 6: Tài liệu** — `docs/SYSTEM-DESIGN.md` §7 dòng route `GET /api/parties/documents/mine` và `GET /api/parties/:id/documents`: thêm "kèm `warnDays` (mốc sắp hết hạn, tiêm từ van-chuyen)". `src/CLAUDE.md` KHÔNG sửa (tệp luật).

- [ ] **Bước 7: Commit** — `git commit -m "Giấy tờ người: phản hồi kèm mốc nhắc sắp hết hạn đang hiệu lực" -m "Một mốc cho giấy tờ xe và người (ADR-0040 D1); trước đây giao diện cố định 30 nên ô đổi mốc bị bỏ (R23). Đưa qua hàm tiêm của gốc lắp ráp, parties không import van-chuyen."`

---

### Task 5: Giao diện mốc nhắc — nhãn hạn theo API + ô "Đổi mốc nhắc" cho Toàn quyền

**Files:**
- Modify: `web/account.ts:104-115`, `web/tai-xe.ts:38-51`, `web/parties.ts:539-543`, `:561`, `:614`, `:668`; `src/shared/giay-to-hien-thi.ts:26-30` (chú thích hằng); `web/giay-to-sap-het-han.ts` (chú thích đầu tệp + nút + bảng trượt)
- Test: Chrome `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/sap-het-han-smoke.mjs` (viết lại bước 5), `giay-to-cua-toi-smoke.mjs`, `giay-to-nguoi-smoke.mjs`, `tai-xe-trang-dau-smoke.mjs`

**Interfaces:**
- Consumes: `PersonDocumentListResponse.warnDays` (Task 4); `POST /api/van-chuyen/nguong-het-han` thân `{ warnDays: số nguyên 1–365 }`, 200 / 400 `invalid_input` / 403 / 409 `stale` (`src/modules/van-chuyen/index.ts:743`); `can(staff, "settings.ops")`; `moBangTruot` (`web/bang-truot.ts:19`, trả `{ close, setBusy } | null`).

- [ ] **Bước 1: Nhãn hạn giấy tờ người theo API**
  - `web/account.ts`: giữ cả phản hồi `const r = await api<Api.PersonDocumentListResponse>(…)`, `docs = r.documents`, `const moc = r.warnDays`; dòng 115 `chipHan(d.daysLeft, moc)`.
  - `web/tai-xe.ts:38`: `const { documents, warnDays } = …`; dòng 51 `chipHan(d.daysLeft, warnDays)`.
  - `web/parties.ts`: cạnh `let docs` thêm `let moc: number;`; ở `:543` lấy cả phản hồi danh sách (`.then((r) => r)` thay `.then((r) => r.documents)`) rồi gán `docs = r.documents; moc = r.warnDays;`; ở `:561` cũng gán `moc` từ phản hồi; `:614`, `:668` dùng `moc`.
  - Bỏ import `NGUONG_MAC_DINH` ở `account.ts`, `tai-xe.ts`, `parties.ts` (sau bước này hằng chỉ còn ở router + định nghĩa). Sửa chú thích `src/shared/giay-to-hien-thi.ts:26-30`: "Mốc dự phòng của router khi môi trường không tiêm `nguongHetHan`; giao diện đọc `warnDays` của API."

- [ ] **Bước 2: Ô đổi mốc** — `web/giay-to-sap-het-han.ts`:
  - Thay câu "Mốc (mặc định 30 ngày) KHÔNG đổi ở màn này — Ruling R23 …" ở đầu tệp bằng: "Toàn quyền (ô `settings.ops`) đổi mốc bằng nút "Đổi mốc nhắc" (khuôn kế hoạch B6 của 1a: nút chữ cạnh dòng tiêu đề, bảng trượt một ô số) — R23 đã hết điều kiện vì giấy tờ người nay đọc mốc từ API (Task 4)."
  - `const staff = await initShell();` (thay `await initShell();`), import `can` từ `../src/shared/permissions`, `moBangTruot` từ `./bang-truot`, `api, ApiError` từ `./api`.
  - Trong `ve(r)`, khi `can(staff, "settings.ops")` nối vào `subEl` nút:

```ts
const doiMoc = h("button", { type: "button", class: "btn btn-link vc-due-doi-moc", "data-action": "doi-moc" }, "Đổi mốc nhắc");
doiMoc.addEventListener("click", () => moDoiMoc(doiMoc, r.warnDays));
```

  - Hàm mới:

```ts
/** Đổi mốc "sắp hết hạn" (ADR-0040 D1) — chỉ Toàn quyền; máy chủ kiểm 1–365 và quyền, màn chỉ hiện câu của máy chủ. Lưu xong đọc lại danh sách. */
function moDoiMoc(opener: HTMLElement, hienTai: number): void {
  const o = h("input", { id: "moc-nhac", class: "vc-input", type: "text", inputmode: "numeric", value: String(hienTai), autocomplete: "off", "aria-describedby": "moc-nhac-loi" }) as HTMLInputElement;
  const loi = h("div", { id: "moc-nhac-loi", class: "vc-field-error", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Huỷ");
  const luu = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "doi-moc-luu" }, "Lưu");
  const bang = moBangTruot({
    title: "Mốc nhắc giấy tờ sắp hết hạn",
    body: [h("div", { class: "vc-field" }, h("label", { for: "moc-nhac" }, "Nhắc trước (ngày)"), o, loi), h("p", { class: "dp-note" }, "Áp cho giấy tờ xe và giấy tờ cá nhân, có hiệu lực ngay.")],
    foot: [huy, luu],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    bang.setBusy(true);
    try {
      await api<Api.VanChuyenMetaResponse>("/api/van-chuyen/nguong-het-han", { method: "POST", body: { warnDays: Number(o.value.trim()) } });
      bang.close(false);
      ve(await api<Api.ExpiringListResponse>("/api/van-chuyen/sap-het-han"));
    } catch (err) {
      bang.setBusy(false);
      replaceChildren(loi, loiCua(err));
      loi.hidden = false;
    }
  });
}
```

  `Number("")`/chữ ⇒ `NaN` ⇒ JSON `null` ⇒ máy chủ 400 "Số ngày nhắc trước là số nguyên từ 1 đến 365." hiện dưới ô. Ô `.vc-input` đã 16px (kiểm lại bằng kịch bản). CSS `.vc-due-doi-moc` (nếu cần canh lề) chỉ dùng token, đặt trong khối `.vc-due-*` của `public/app.css`.

- [ ] **Bước 3: typecheck + build** — `npm run typecheck && npm run build:web` → 0 lỗi.

- [ ] **Bước 4: Chrome** — `sap-het-han-smoke.mjs` viết lại bước 5 (Ruling R23 cũ): (a) Quản trị 1040 + 390: KHÔNG nút "Đổi mốc nhắc"; (b) Toàn quyền: có nút; gõ `0` → câu máy chủ dưới ô, không lưu; gõ `7` → "Trong 7 ngày tới", số dòng giảm đúng như dữ liệu gieo; (c) trả về `30` để bước sau không lệch. Chạy thêm `giay-to-cua-toi-smoke.mjs`, `giay-to-nguoi-smoke.mjs`, `tai-xe-trang-dau-smoke.mjs` (nhãn hạn vẫn đúng với mốc 30). Nhớ: trang tài khoản nào mở SAU CÙNG (kho cookie chung).

- [ ] **Bước 5: Commit** — `git commit -m "Sắp hết hạn: Toàn quyền đổi mốc nhắc; nhãn hạn giấy tờ cá nhân theo mốc thật" -m "Bỏ hằng 30 ở trang Tôi, Danh bạ, trang đầu tài xế — một mốc cho mọi giấy tờ nên mở lại được ô đổi mốc mà R23 từng bỏ."`

---

### Task 6: Sửa tài liệu mô tả cũ

**Files:**
- Modify: `docs/VAN-CHUYEN.md:35`, `:87-89`, `:185`, `:200`; `docs/BACKLOG.md:69`; `docs/SYSTEM-DESIGN.md:532`, `:1098`; `scripts/audit-checks.mjs:783` (chú thích R-ORD-12). KHÔNG sửa `migrations/0034_chang_dua_don.sql:43` (đã áp remote).

- [ ] **Bước 1: Đối chiếu mã trước khi sửa** — tài liệu mô tả thua mã: `grep -n "noiTra\|nơi trả" web/khoi-dua-don.ts | head` và `src/shared/changelog.ts` mục 1.62 (form đơn có khối Đưa đón: nơi trả, chiều về; khối Hành khách; "Sửa đưa đón", "Sửa danh sách" ở chi tiết đơn). Máy chủ KHÔNG tự tạo chiều về (chỉ gợi ý ở form — `docs/data-dictionary.json` ghi chú mẫu chặng).

- [ ] **Bước 2: Sửa**
  - `docs/VAN-CHUYEN.md:35` → "…Nhân viên nhập ở khối "Hành khách" của form đơn và "Sửa danh sách" ở chi tiết đơn (từ bản 1.62)."
  - `:87` tiêu đề "### 2.3 Cái gì CHƯA có (bản 1.38)" → "(cập nhật bản <số phiên bản>)". `:89` thay cả gạch đầu dòng bằng: "- ~~Màn nhập tên hành khách, màn nhập / sửa chặng~~ — **đã có từ 1.62** (khối Đưa đón + Hành khách ở form đơn; "Sửa đưa đón" / "Sửa danh sách" ở chi tiết đơn). Chiều về: form gợi ý theo dịch vụ, máy chủ không tự tạo."
  - `:185`, `:200` (danh sách việc của chủ): đánh dấu phần "chưa có màn ghi nơi trả" / "có màn nhập tên khách" là đã có từ 1.62; GIỮ nguyên việc "bổ sung nơi trả cho 2 chặng" (dữ liệu, chưa kiểm đã làm chưa).
  - Đầu tệp (sau dòng 4) thêm một dòng: "> Cập nhật <ngày>: mục 2.3 và danh sách việc đã đối chiếu bản <số phiên bản>; các mục khác vẫn theo bản 1.38 — chưa rà lại."
  - `docs/BACKLOG.md:69` (tên khách thứ tự ngẫu nhiên) → gạch, thêm "— **xong bản 1.63** ("Danh sách hành khách hiện đúng thứ tự đã nhập")".
  - `docs/SYSTEM-DESIGN.md:532` tiêu đề: "chủ quyết CHƯA dùng cho chuyến thật tới khi có màn nhập tên khách" → "màn nhập tên khách có từ bản 1.62; dùng cho chuyến thật khi nào do chủ quyết". `:1098` câu "chủ quyết chưa dùng Bảng điều phối cho chuyến thật tới khi có màn nhập tên khách (ADR-0047 Phần B)" → cùng nghĩa như trên. KHÔNG viết là chủ đã bắt đầu dùng (chưa kiểm).
  - `scripts/audit-checks.mjs:783`: "câu hỏi Q1 (a) — GIẢ ĐỊNH chờ chủ chạy truy vấn đếm" → "câu hỏi Q1 (a) — ĐÓNG 2026-09-29: chủ chạy truy vấn chỉ đọc, 2 dịch vụ giờ-không-nơi đều thuộc đơn đã huỷ (`docs/superpowers/plans/2026-09-29-adr-0047-thi-cong-nhat-ky.md:37`)". Chú thích ở `migrations/0034` giữ nguyên (đã áp remote).

- [ ] **Bước 3: Kiểm** — `npm test` (bài `audit-invariants` đọc `audit-checks.mjs`) → PASS.

- [ ] **Bước 4: Commit** — `git commit -m "Tài liệu Vận chuyển: bỏ các câu 'chưa có màn nhập khách / nơi trả' đã cũ" -m "Phần B lên từ 1.62, thứ tự khách xong 1.63, Q1 của ADR-0047 đã đóng 29/9 — tài liệu mô tả thua mã."`

---

### Task 7: Nhật ký phiên bản, kiểm toàn bộ, người kiểm độc lập

**Files:**
- Modify: `src/shared/changelog.ts:12` (mục mới ở ĐẦU), `src/shared/app-info.test.ts:21`; nhật ký thi công `docs/superpowers/plans/<ngày>-van-chuyen-dot-1-nhat-ky.md` (Create)

- [ ] **Bước 1: Mục nhật ký** — số `1.N` = lớn nhất ở `origin/main` + 1 lúc gộp (Global Constraints):

```ts
  {
    // Đợt 1 Vận chuyển còn lại (kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-01-viec-nho.md): ADR-0056 VK3-B, route 39 có màn, mốc nhắc.
    // Migration <NNNN>. Số "1.N" = main 1.(N-1) + 1 (<ngày gộp>).
    version: "1.N",
    date: "<YYYY-MM-DD>",
    items: [
      { kind: "moi", text: "Xe đã có một loại giấy tờ đang dùng thì không \"Thêm\" loại đó nữa — bấm \"Gia hạn\" hoặc \"Sửa sai\"." },
      { kind: "moi", text: "Chi tiết chuyến: văn phòng đổi được thứ tự các điểm chưa tới khi xe đang chạy (nút lên / xuống)." },
      { kind: "moi", text: "Giấy tờ sắp hết hạn: người phụ trách hệ thống đổi được số ngày nhắc trước; nhãn hạn giấy tờ cá nhân theo đúng số này." },
    ],
  },
```

`src/shared/app-info.test.ts:21`: đổi chuỗi thành `"Phiên bản 1.N · ngày <d> tháng <m> năm <yyyy>"` đúng mục mới.

- [ ] **Bước 2: Kiểm đủ** — tắt mọi `wrangler dev` mồ côi trước.

```bash
npm test && npm run typecheck && npm run test:e2e && node scripts/audit-invariants.mjs --db local
```

Expected: tất cả xanh; typecheck 0 lỗi; `audit-invariants` thoát 0 (thoát 2 = KHÔNG chạy được, không phải sạch). Chạy `help-smoke.mjs` (`docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/`) vì `changelog.ts` đổi.

- [ ] **Bước 3: Người kiểm độc lập** (subagent `nguoi-kiem-doc-lap`, chỉ đọc) cho Task 1 và Task 4 (dữ liệu + hợp đồng giữa module), kèm xem nhanh Task 2, 3, 5: đọc mã thật, chạy lại bước 2, tự làm lại các phép sửa cố ý ở Task 1 bước 9, kiểm `parties` không import `van-chuyen`, kiểm `grep -rn NGUONG_MAC_DINH web src` chỉ còn định nghĩa (`src/shared/giay-to-hien-thi.ts`), router và test. Chỉ báo "đạt" dựa trên báo cáo đó.

- [ ] **Bước 4: Nhật ký thi công** — ghi: số migration và lệnh đã dùng để chọn, số phiên bản, từng phép sửa cố ý + dòng `not ok`, chỗ test phải sửa vì thêm trùng loại (Task 1 bước 7), kết quả kịch bản Chrome + đường dẫn ảnh, kết luận người kiểm.

- [ ] **Bước 5: Commit** — `git commit -m "Nhật ký phiên bản 1.N: Vận chuyển đợt 1" -m "Ba thay đổi nhân viên thấy; migration <NNNN> chỉ thêm một trigger."`

- [ ] **Bước 6: Bàn giao chủ** (AI không chạy remote — CLAUDE.md §8):
  1. **Trước khi phát hành, chủ chạy (chỉ đọc)** ở thư mục repo gốc:
     ```bash
     node scripts/audit-invariants.mjs --db remote
     ```
     Đọc dòng `R-VC-11`. Số khác 0 KHÔNG chặn migration (trigger không quét dòng cũ); Quản trị mở xe đó → giấy tờ → "Sửa sai" → "Nhập nhầm cả dòng" cho dòng thừa. Thoát mã 2 = lệnh không chạy được, không phải dữ liệu sạch.
  2. `npm run day-len -- <nhánh>` rồi `npm run trien-khai` (đổi app + migration ⇒ PHẢI triển khai).

---

## Cần chủ (một câu, đợt này)

**Gắn người đi kèm (hướng dẫn viên, phụ xe) lên xe lúc xếp.** Máy chủ đã nhận sẵn nhưng chưa ADR nào nói ai được chọn và tên hiện ở đâu; việc này chạm quyền xem chuyến (gần ADR-0064 đang chờ duyệt), nên chưa làm ở đợt này.
- **A (khuyến nghị):** chỉ chọn người có tài khoản Hướng dẫn viên; tên hiện ở Chi tiết chuyến của văn phòng và màn tài xế; hướng dẫn viên CHƯA thấy chuyến (chờ ADR-0064). Được: gọn, không mở quyền mới. Mất: phụ xe không tài khoản chưa gắn được.
- **B:** chọn bất kỳ người nào trong Danh bạ (kể cả phụ xe không tài khoản). Được: đủ người. Mất: dễ chọn nhầm; máy chủ phải thêm luật lọc.
- **C:** để sau, làm cùng ADR-0064.

Chủ chọn xong ⇒ người lập kế hoạch thêm một task (máy chủ kiểm "ai được chọn" + ô chọn ở màn xếp xe + người kiểm độc lập).

## Chưa chắc (người thi công đo lại)

- Máy chủ có cấm "trả trước đón" khi đổi thứ tự không: route 39 không thấy luật đó (`dieu-phoi-tien-do.ts:210-233`), trigger chưa đọc — Task 3 bước 7 đã ghi cách xử lý cả hai trường hợp.
- Có kịch bản Chrome / e2e / khung thử nào khác thêm cùng loại giấy tờ hai lần cho một xe (Task 1 bước 7 dò bằng `npm test` + grep; e2e và kịch bản Chrome chỉ lộ khi chạy).
- Ca router ở Task 4 bước 1 chép bộ `injected` của `build()` (`src/shared/router.test.ts:30-45`); kiểu `injected` có thể đòi thêm trường mới hơn mốc đo — `*.test.ts` không qua typecheck, chạy thấy lỗi thì bổ sung trường giả.
