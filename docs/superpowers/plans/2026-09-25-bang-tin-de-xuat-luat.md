# Bảng tin (ADR-0022) — đề xuất luật và quyết định chờ chủ (2026-09-26)

> **Đây là ĐỀ XUẤT, chưa có hiệu lực.** Các tệp luật (`docs/ARCHITECTURE.md`, `web/CLAUDE.md`, `src/CLAUDE.md`) do chủ dự án duyệt; AI chỉ đề xuất bằng diff (Hiến pháp N9, `CLAUDE.md` §3). Người soạn: phiên thi công Bảng tin, Task 11. Không tệp luật nào bị sửa bởi tài liệu này; áp dụng thì chủ ra lệnh và một phiên khác (hoặc chính chủ) áp diff bên dưới.
>
> Bối cảnh: nhánh `bang-tin` (chưa gộp `main`, chưa phát hành). Điều đã DUYỆT và đã ghi vào luật từ trước: hạng module `KHONG_DB` (`docs/ARCHITECTURE.md` dòng 148, 193, 231 — không cần đề xuất lại). Điều CHƯA duyệt, đề xuất ở đây: ngoại lệ "gốc lắp ráp nạp tệp lớp Durable Object" và các dòng ở `web/CLAUDE.md`, `src/CLAUDE.md`. Trong lúc chờ, mã đang thi hành các điều đó và `docs/SYSTEM-DESIGN.md` §16 ghi rõ hai chỗ mã lệch chữ luật.

## Cách chia lượt duyệt (`CLAUDE.md` §9: tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt)

| Lượt | Nội dung | Chạm quyền/dữ liệu/tiền? |
|---|---|---|
| 1 | Phần I, mục 1–4 (bốn đề xuất sửa luật, chỉ chữ) | Không: không đổi dữ liệu, quyền, tiền; các bài kiểm đang chạy đã thi hành đúng nội dung này |
| 2 | Phần II, R24 (thông báo bị bảng che) | Không, nhưng là điều NHÌN THẤY trên màn hình → hỏi chủ (bài học Đợt D) |
| 3 | Phần II, R16 (tin `tien` khi số khách y nguyên) + quyết định (5) của ADR-0023 (nhóm nhận tin của Hướng dẫn viên) | **Có**: R16 đụng hợp đồng tiền `orders`↔`dispatch`; (5) đụng bản đồ quyền. Hai quyết định, dưới trần 3 |
| 4 | Phần II, N6 (tài khoản lai Đối tác + Hướng dẫn viên vẫn thấy thông báo nổi) + N7 (Hướng dẫn viên nhận tin về đơn NHÁP) | **Có**: N6 đụng ai được nhận thông báo (quyền); N7 đụng luật "tin nào tới ai". Hai quyết định, dưới trần 3 |
| 5 | Phần II, N8 (trần số kết nối cho mỗi tài khoản) | Không đổi dữ liệu/quyền/tiền, nhưng là giới hạn an toàn vận hành nên hỏi chủ |
| (kèm lượt 1) | N9 (câu chữ ngoại lệ "gốc lắp ráp nạp tệp lớp DO" — chính là đề xuất 1 ở Phần I) và N10 (chủ đọc lại dòng Trạng thái đã sửa ở `docs/ARCHITECTURE.md` Phần I) — xem Phần II | Chỉ chữ luật |

**Trang ghép (`CLAUDE.md` §9, cho lượt 3):** (1) bảng chứa loại thực thể nào — Bảng tin KHÔNG thêm bảng/view D1 nào (`docs/data-dictionary.json` đã kiểm, không đổi); (2) dòng bản đồ quyền chạm — chỉ ĐỌC ô `order.view` và `dispatch.claim` (qua `nhanKetNoi` → `can()`), không thêm/sửa ô nào; (3) cổng canh cửa nào — bài NT-3 (`src/shared/bang-tin.test.ts`) canh quan hệ hai ô đó và đỏ CÓ CHỦ ĐÍCH khi (5) đổi bản đồ quyền; `src/bang-tin-guard.test.ts` canh QUÊN báo tin ở tám route ghi đơn (không canh R16).

---

## Phần I — Đề xuất sửa tệp luật

### 1. `docs/ARCHITECTURE.md` — ngoại lệ "gốc lắp ráp nạp tệp lớp Durable Object của module `bangtin`"

**Vị trí:** Phần II, danh sách ranh giới, điều 1 (dòng 182, "**Module khác chỉ import `index.ts`** của module đó…").

**Vì sao:** wrangler đòi lớp Durable Object (`BangTin`) được export từ tệp chính của Worker, tức `src/index.ts` phải có `export { BangTin } from "./modules/bangtin/tram"`. Đó là một import vào tệp KHÔNG phải `index.ts` của module — lệch chữ điều 1. Bài kiểm "tệp lớp DO" của `src/architecture.test.ts` ĐÃ thi hành đúng ngoại lệ này (chỉ `src/index.ts` được import `tram.ts`; không module nào, không `*.test.ts`, không `scripts/*.mjs`; không `index.ts` module nào chứa `cloudflare:workers`) — nhưng luật chuẩn tắc chưa ghi. Hàng rào mà luật không có là hàng rào tự đặt (`docs/SO-HANG-RAO.md`, dòng "KHONG_DB + tệp lớp DO").

**Nếu không duyệt:** hai lựa chọn — (a) giữ nguyên (mã lệch chữ luật, `docs/SYSTEM-DESIGN.md` §16 ghi lệch có tên); (b) kế hoạch đã nêu phương án dự phòng dùng một tệp `src/worker.ts` làm tệp chính (`wrangler.jsonc` `main`), export lớp DO và `default` từ `src/index.ts` — phương án đó **chưa dựng, chưa kiểm**; nó chuyển ngoại lệ từ `src/index.ts` sang tệp mới nhưng không xoá được (tệp mới vẫn phải import `tram.ts`).

**Diff đề xuất (chữ thêm cuối điều 1):**

```diff
 1. **Module khác chỉ import `index.ts`** của module đó. … Đồ thị vẫn không vòng (`catalog` không import `orders`).
+   **Ngoại lệ duy nhất, có bài kiểm ép** (`architecture.test.ts`, bài "tệp lớp DO"): gốc lắp ráp `src/index.ts` — và chỉ nó — được import tệp lớp Durable Object `src/modules/bangtin/tram.ts` (wrangler đòi lớp đó được export từ tệp chính của Worker). Tệp này chỉ chạy trong Worker (import `cloudflare:workers`), nên không tệp nào khác — kể cả `index.ts` của chính module `bangtin`, `*.test.ts` và `scripts/*.mjs` — được nạp nó.
```

### 1b. `docs/ARCHITECTURE.md` — thêm `bangtin` vào danh sách module ở sơ đồ các tầng

**Vị trí:** Phần II, khối sơ đồ "Các tầng và chiều phụ thuộc", dòng 175 (danh sách `src/modules/<tên>/`). Hôm nay danh sách không nhắc `bangtin`.

**Vì sao:** mô tả đúng mã (13 thư mục module, trong đó 12 module có route — `staff` không có route; `src/route-access.test.ts` đếm 12). Không đổi luật.

```diff
- …, feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`)
+ …, feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`), bangtin (Bảng tin, ADR-0022 — hạng `KHONG_DB`: không bảng, không SQL; route bắt tay `GET /api/bang-tin`, lớp Durable Object `tram.ts`; module lá — không import module nào; `orders`/`dispatch`/`accounts`/`maintenance` KHÔNG import nó, gốc lắp ráp tiêm `baoThayDoi`/`dongBangTin` vào `ctx`)
```

### 2. `web/CLAUDE.md` — hàng bảng kịch bản Chrome cho `bang-tin-smoke.mjs`

**Vị trí:** bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" (sau hàng `web/help.ts`… ở dòng 45, hoặc cuối bảng).

**Vì sao:** `web/CLAUDE.md` nói sửa `web/` phải chạy đúng kịch bản Chrome, nhưng chưa có hàng cho các tệp Bảng tin mới; kịch bản `docs/evidence/2026-09-25-bang-tin/kich-ban/bang-tin-smoke.mjs` là kịch bản DUY NHẤT phủ DOM của Bảng tin (hai tài khoản cùng lúc; `npm test`/e2e không phủ DOM). **Nếu không duyệt:** người sửa `web/bangtin*.ts` không biết phải chạy nó; chỉ có `docs/CHANGE-GUIDE.md` §3 (mô tả, không phải luật) nhắc.

```diff
+| Bảng tin (ADR-0022): `web/bangtin.ts`, `web/bangtin-logic.ts`, `web/toast.ts`, `web/lam-moi-logic.ts`, phần Bảng tin của `web/api.ts` (`vuaLamBoiTabNay`) / `web/shell.ts` (`batDauBangTin`) / `web/orders.ts` / `web/order.ts` / `web/home.ts` / `web/account.ts` / `web/order-form.ts`, khối `.toast*` của `public/app.css` | `bang-tin-smoke.mjs` ở `docs/evidence/2026-09-25-bang-tin/kich-ban/` (36 dòng ✓; HAI tài khoản mở cùng lúc bằng hai ngữ cảnh trình duyệt tách kho cookie — không theo mẹo "mở sau cùng"; lệnh trong README cùng thư mục) + kịch bản cũ của trang bạn chạm ở các hàng trên |
```

### 3. `web/CLAUDE.md` — ngoại lệ import kèm đuôi `.ts` ở hai tệp logic thuần

**Vị trí:** mục "Luật", dòng 16 ("`web/` import `src/shared` **không đuôi**; …").

**Hiện trạng:** `web/bangtin-logic.ts` và `web/lam-moi-logic.ts` import `../src/shared/…` KÈM `.ts`. Lý do: đó là logic thuần (không đụng DOM/`window`) và Node phải chạy thẳng hai tệp này dưới `node --test` (test ở `src/bang-tin-web.test.ts`, `src/lam-moi-web.test.ts` vì glob `npm test` chỉ quét `src/**`); Node không tự thêm đuôi. esbuild và `tsc -p web` chấp nhận nhờ `allowImportingTsExtensions` (đã bật ở `web/tsconfig.json`). Các tệp `web/` còn lại (kể cả `web/bangtin.ts`) vẫn không đuôi. **Không có bài kiểm ép chữ "không đuôi"** mà tôi tìm thấy (`architecture.test.ts` chỉ kiểm `web/` không import `src/modules/`; chưa rà hết mọi bài) — nên điều này hôm nay không làm test đỏ, chỉ lệch chữ luật.

**Hai phương án (chủ chọn):**

- **A (khuyến nghị): thêm ngoại lệ có tên** — giữ mã như hiện tại. Được: không đổi mã, đã có test và bằng chứng. Mất: một ngoại lệ ở luật giao diện, không có máy ép (dựa vào kỷ luật: chỉ tệp logic thuần có test Node mới được dùng đuôi).
- **B: dời logic thuần sang `src/shared/`.** Được: hết ngoại lệ; test nằm cạnh tệp. Mất: `src/shared/` được định nghĩa là "logic thuần dùng chung server ↔ `web/`" (`src/CLAUDE.md`) mà đây là logic CHỈ của trình duyệt (bộ nối lại, bộ gộp, sổ "tab này vừa làm") — làm loãng định nghĩa đó; phải đổi mọi import ở `web/bangtin.ts`, `web/toast.ts`, 5 trang và hai tệp test, rồi chạy lại toàn bộ kịch bản Chrome (việc cỡ nửa buổi, không có lợi ích chức năng).

```diff
 - `web/` import `src/shared` **không đuôi**; **không** import `src/modules/`. Luật dùng ở cả server và giao diện là tệp thuần ở `src/shared/`, không chép tay sang đây.
+ Ngoại lệ có tên: `web/bangtin-logic.ts` và `web/lam-moi-logic.ts` (logic thuần của Bảng tin, không đụng DOM/`window`) import `src/shared` KÈM đuôi `.ts`, vì Node chạy thẳng chúng dưới `node --test` (test ở `src/bang-tin-web.test.ts`, `src/lam-moi-web.test.ts`). Không thêm tệp nào khác vào ngoại lệ này.
```

### 4. `src/CLAUDE.md` — nhắc `bangtin` và hạng `KHONG_DB`

**Vị trí:** dòng 6 (danh sách module), dòng 14 (module "nghiêm"), dòng 16 (thêm module).

**Vì sao:** `src/CLAUDE.md` tự nhận là luật máy chủ nhưng danh sách và câu "đưa vào `STRICT` hoặc `LEGACY`" chưa có hạng thứ ba — người thêm module mới không biết còn `KHONG_DB`. **Nếu không duyệt:** `docs/ARCHITECTURE.md` (đã có `KHONG_DB`) và `docs/CHANGE-GUIDE.md` công thức b (đã nhắc, sửa ở commit Task 11) đúng, `src/CLAUDE.md` cũ hơn.

```diff
-- `src/index.ts` gốc lắp ráp (mảng `modules`, router, Cron). `src/modules/<tên>/`: `accounts`, `audit`, `auth`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`.
+- `src/index.ts` gốc lắp ráp (mảng `modules`, router, Cron; cũng là nơi DUY NHẤT nạp lớp Durable Object của `bangtin`). `src/modules/<tên>/`: `accounts`, `audit`, `auth`, `bangtin`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`.
```

```diff
 - **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): … Module cũ (`accounts`, `audit`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu.
+ Module `KHONG_DB` (`bangtin`) nghiêm hơn: không bảng, không SQL, không `env.DB`/`.prepare(`/`.batch(`/`DB.exec(` ở bất kỳ tệp `.ts` không phải test; mã đơn/người lập/người phụ trách do gốc lắp ráp đọc rồi truyền vào.
```

```diff
-- Thêm module: khai cạnh ở `ALLOWED_EDGES`, đưa vào `STRICT` hoặc `LEGACY` (kèm lý do), thêm bảng/view …
+- Thêm module: khai cạnh ở `ALLOWED_EDGES`, đưa vào `STRICT`, `LEGACY` (kèm lý do) hoặc `KHONG_DB` (không dùng cơ sở dữ liệu), thêm bảng/view …
```

---

## Phần II — Quyết định thiết kế chờ chủ (KHÔNG phải luật)

### R24 — khi có bảng/hộp đang mở, dải "Tải lại" và thông báo nổi nằm dưới lớp phủ (lượt 2)

**Chuyện gì xảy ra:** trên trang đơn, khi người dùng đang mở một bảng (sửa chuyến, đổi khách, chọn người phụ trách) hoặc hộp biên nhận và có tin về đơn đó, trang KHÔNG dựng lại (đúng ý, để khỏi mất chữ đang gõ) mà hiện dải "Đơn vừa được cập nhật — Tải lại". Dải nằm SAU bảng. Thông báo nổi cũng nằm dưới lớp phủ vì `public/app.css`: `.toast-vung` `z-index: 40` (dòng 856) thấp hơn `.sheet-root` `z-index: 50` (dòng 581) — ở khổ 1040 thông báo bị cắt và mờ ở góc trên phải; ở khổ 390 nó nằm trên thanh tab nên bị bảng phủ gần kín. Dải còn nằm trong phần nền `inert` (`role="alert"`), nên trình đọc màn hình **có thể không đọc** (**chưa kiểm**). Bằng chứng: ảnh `…-hop-bien-nhan-*`, `…-bang-sua-chuyen-*` (không thấy dải) và `…-dai-hien-sau-khi-dong-bang-*` (thấy dải sau khi đóng bảng) ở `docs/evidence/2026-09-25-bang-tin/anh/`.

**Điều KHÔNG mất:** bảng không đóng, chữ đang gõ còn nguyên (đúng TD-3); nếu bấm Lưu khi đơn đã đổi thì khoá lạc quan `stale` ở máy chủ chặn và báo tải lại — dữ liệu không bị ghi đè lặng lẽ.

| Phương án | Được / mất |
|---|---|
| **(1) Nâng lớp của thông báo nổi lên trên bảng** (`z-index` của `.toast-vung` > `.sheet-root`) | Sửa CSS một dòng, thông báo nổi luôn thấy. Mất: thông báo có thể che nút "Lưu" ở khổ điện thoại; dải "Tải lại" vẫn nằm dưới bảng (chỉ giải quyết thông báo nổi, không giải quyết dải); phải đo lại 390/1040 |
| **(2) Đặt một dòng báo TRONG bảng** ("Đơn vừa được cập nhật — Tải lại", trong vùng `aria-live` của bảng) | Người dùng thấy và trình đọc màn hình đọc được; đúng ngữ nghĩa hộp thoại. Mất: thêm chỗ cho mọi bảng/hộp (chuyến, khách, người phụ trách, biên nhận), phải chạy lại các kịch bản Chrome của bảng, quyết định chữ hiển thị |
| **(3) Chấp nhận như hôm nay** | Không đổi gì; dữ liệu an toàn nhờ `stale`. Mất: người dùng chỉ biết đơn đã đổi sau khi đóng bảng hoặc khi bấm Lưu |

**Khuyến nghị: (3) cho lần phát hành đầu**, rồi chọn (1)/(2) sau khi thử iPhone thật (Task 13) và biết trình đọc màn hình có đọc dải hay không — vì chưa kiểm được điều đó ở đây. Đây là điều nhìn thấy trên màn hình nên chủ quyết, không phải AI.

### R16 — `POST /api/orders/:id/handler-money-edit` phát tin `tien` cả khi số khách y nguyên (lượt 3, chạm tiền)

**Chuyện gì xảy ra:** `editMoneyAsHandler` (`orders`) trả `{ ok: true }` mà không ghi gì khi thân yêu cầu giữ nguyên số khách (`!plan.write`); route ở `dispatch` vẫn gọi `baoThayDoi({ …, thayDoi: "tien" })` vô điều kiện sau `ok`. Hậu quả: thêm MỘT lần làm mới thừa ở các màn hình đang mở; KHÔNG có thông báo nổi vì `tien` không hiện toast; không sai dữ liệu. ADR-0022/kế hoạch DP-1 nói "không phát ở nhánh không đổi gì" nhưng chỉ nêu `trip`/`booker`. e2e không khẳng định hành vi này và hàng rào `bang-tin-guard` không bắt được (`docs/SO-HANG-RAO.md`).

**Tác dụng phụ đã kiểm (người kiểm độc lập Task 12, đọc mã `orders/index.ts` dòng ~118 và `dispatch/index.ts` dòng ~189):** một Hướng dẫn viên bấm "Lưu" nhiều lần liên tục (dù không đổi số khách) làm MỌI màn hình văn phòng đang mở tải lại danh sách khoảng mỗi giây một lần (tin đến được gộp 1 giây ở trình duyệt). Không sai dữ liệu, không thông báo nổi, nhưng tốn tải và có thể nháy màn hình văn phòng; nếu nhiều Hướng dẫn viên cùng làm thì nhân lên. Đây là lý do nghiêng về (b) nếu chủ muốn chặt.

**Sửa thật (nếu chủ muốn chặt):** đổi kiểu `MoneyEditResult` (hợp đồng `orders` ↔ `dispatch`) thành `{ ok: true, changed: boolean }` (hoặc tương đương) và chỉ gọi `baoThayDoi` khi `changed`; thêm một test đỏ→xanh và một ca e2e. Vì đụng hợp đồng giữa hai module ở luồng TIỀN nên theo `CLAUDE.md` §3/P8 phải hỏi chủ, không tự sửa.

| Phương án | Được / mất |
|---|---|
| **(a) Giữ nguyên** | Không đổi mã tiền; chi phí là một lần làm mới thừa ở màn hình khác, hiếm (chỉ khi Hướng dẫn viên bấm lưu mà không đổi số khách) |
| **(b) Sửa `MoneyEditResult` + test** | Đúng chữ DP-1; đổi hợp đồng module ở luồng tiền, cần kiểm độc lập |

**Khuyến nghị: (a)** cho lần phát hành đầu (vô hại), ghi (b) làm việc nhỏ sau.

### Quyết định (5) của ADR-0023 — nhóm nhận tin của Hướng dẫn viên (lượt 3, chạm quyền)

Hôm nay Hướng dẫn viên (`FIELD`) có `order.view = none` và `dispatch.claim = none`, nên Bảng tin chỉ báo họ về đơn họ đang/vừa phụ trách (nhãn `nguoi:<id>`), không có nhãn `tat-ca`. ADR-0023 (nháp) quyết định (5) và GĐ2 Phần D có thể đổi các ô này. Khi đổi, bài NT-3 (`src/shared/bang-tin.test.ts`) **đỏ CÓ CHỦ ĐÍCH** nếu nhãn `cho-nhan` thêm người nhận ngoài nhóm `order.view = any` — đó là tín hiệu để hỏi chủ, **không** để sửa bài kiểm cho xanh. Chưa có quyết định nào cần từ chủ ở đây ngoài việc biết điều này khi duyệt GĐ2.

### N6 — tài khoản lai Đối tác + Hướng dẫn viên vẫn thấy thông báo nổi (lượt 4, chạm quyền)

**Chuyện gì xảy ra:** luật hôm nay (`thongBaoNoi` ở `src/shared/bang-tin.ts`, quyết định Q-C của ADR-0022) là: ai không thuộc văn phòng nhưng CÓ quyền Hướng dẫn viên thì vẫn thấy thông báo nổi. Một tài khoản mang cả quyền Đối tác lẫn Hướng dẫn viên (`["PARTNER","FIELD"]`) vì thế vẫn thấy thông báo nổi, trong khi bản 1.15 (`main`, ADR-0028) chốt "có quyền Đối tác là áp" các hạn chế của Đối tác. Không phải lỗi an ninh (thông báo chỉ nói mã đơn và việc vừa xảy ra, đơn đó tài khoản đã được phép thấy); chỉ là hai luật chưa cùng một cách hiểu "tài khoản lai".

| Phương án | Được / mất |
|---|---|
| **(1) Áp Q-C cho cả tài khoản lai:** có quyền Đối tác thì không thấy thông báo nổi, chỉ làm mới màn hình | Nhất quán với 1.15. Mất: Hướng dẫn viên kiêm Đối tác mất thông báo "bạn vừa được giao đơn"; sửa một điều kiện + một test đỏ→xanh |
| **(2) Giữ nguyên hôm nay** | Không đổi mã; tài khoản lai vẫn được báo khi được giao đơn. Mất: hai luật hiểu "tài khoản lai" khác nhau, phải ghi rõ ở tài liệu |

**Khuyến nghị: (2)** cho lần phát hành đầu (không hại, có ích cho người được giao việc), ghi rõ ở `docs/SYSTEM-DESIGN.md`; chọn (1) nếu chủ muốn "có quyền Đối tác là áp" tuyệt đối.

### N7 — Hướng dẫn viên nhận tin/thông báo về đơn NHÁP được giao, nhưng "Việc của tôi" chỉ liệt kê đơn ĐÃ XÁC NHẬN (lượt 4)

**Chuyện gì xảy ra:** khi một đơn nháp được giao cho Hướng dẫn viên, họ nhận tin (và thông báo nổi "vừa đổi người phụ trách"); bấm vào thì mở `/account` ("Việc của tôi"), nhưng danh sách đó chỉ có đơn đã xác nhận (`orders/index.ts` dòng ~139) nên KHÔNG thấy đơn vừa được báo. Gây khó hiểu, không sai dữ liệu.

| Phương án | Được / mất |
|---|---|
| **(1) Lọc tin theo trạng thái:** Hướng dẫn viên chỉ nhận tin về đơn đã xác nhận | Hết khó hiểu. Mất: luật "tin nào tới ai" thêm một điều kiện theo trạng thái đơn ở luồng phát; phải thêm test và ca e2e; Hướng dẫn viên không biết sớm là mình sắp có việc |
| **(2) Chấp nhận** và ghi vào hướng dẫn "đơn nháp chưa hiện ở Việc của tôi" | Không đổi mã. Mất: vẫn có lúc nhân viên hỏi "báo có đơn mà không thấy" |
| **(3) Cho "Việc của tôi" hiện cả đơn nháp được giao** | Khớp với tin. Mất: đổi luật quyền xem đơn của Hướng dẫn viên (ADR-0017/GĐ2) — việc lớn, không nên làm ở nhánh này |

**Khuyến nghị: (2)** cho lần phát hành đầu, rồi cân (1) sau khi nghe phản hồi thực tế; (3) thuộc GĐ2 về quyền, không quyết ở đây.

### N8 — chưa có trần số kết nối mở cùng lúc cho mỗi tài khoản (lượt 5)

**Chuyện gì xảy ra:** mỗi lần phát tin, trạm (`tram.ts` dòng ~83–87) duyệt MỌI kết nối đang mở; không có giới hạn số kết nối của cùng một tài khoản (nhãn `nguoi:<id>`). Với khoảng 1000 tài khoản Đối tác ngoài công ty, một người có thể mở rất nhiều kết nối để làm chậm việc phát tin cho mọi người. Đã giảm nhẹ bởi: mỗi kết nối tự đóng sau 900 giây và phải đăng nhập mới mở được. Không có dữ liệu bị lộ hay sai.

| Phương án | Được / mất |
|---|---|
| **(1) Đặt trần, đề xuất 10 kết nối mỗi tài khoản; vượt thì đóng kết nối CŨ NHẤT** | Chặn được kiểu lạm dụng này; 10 đủ cho nhiều tab/thiết bị. Mất: một lát việc nhỏ ở `tram.ts` (thêm test đỏ→xanh và ca e2e); một người mở hơn 10 tab sẽ thấy tab cũ tự nối lại |
| **(2) Chưa đặt trần, theo dõi** | Không đổi mã; rủi ro nhỏ với quy mô hôm nay. Mất: nếu bị lạm dụng thì chỉ phát hiện sau |

**Khuyến nghị: (1)** làm ngay sau lần phát hành đầu (không chặn phát hành), vì Đối tác ngoài công ty là nhóm đông nhất và không tin cậy bằng nhân viên.

### N9 — câu chữ ngoại lệ "gốc lắp ráp nạp tệp lớp Durable Object" (kèm lượt 1)

Ngoại lệ này đã nằm ở ADR-0022 (mục "Hệ quả"), `docs/SYSTEM-DESIGN.md` §16 và được bài kiểm "tệp lớp DO" của `src/architecture.test.ts` thi hành, nhưng CHƯA có trong chữ luật `docs/ARCHITECTURE.md` Phần II. Đó chính là đề xuất 1 ở Phần I phía trên (kèm diff sẵn). Việc cần chủ: duyệt câu chữ của diff đó (hoặc chọn phương án dự phòng ở mục "Nếu không duyệt"). **Khuyến nghị:** duyệt diff như đã soạn.

### N10 — dòng "Trạng thái" ở `docs/ARCHITECTURE.md` Phần I do AI sửa (kèm lượt 1)

Trong nhánh này AI đã sửa dòng Trạng thái ở đầu tệp (thêm một mệnh đề ghi việc chủ đã duyệt hạng `KHONG_DB`, không đổi câu chữ điều 5.3) và ba chỗ mô tả hạng này ở bảng thi hành 5.3 và phần "Ranh giới SQL" (`git diff main -- docs/ARCHITECTURE.md`: 4 dòng thêm, 3 dòng đổi); bản ghi gốc của quyết định nằm ở `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` dòng ~139. Vì đó là tệp luật (`CLAUDE.md` §3: AI không tự sửa luật chi phối mình), việc cần chủ: **đọc lại câu chữ các chỗ đó khi gộp** (nhất là mệnh đề mới ở dòng Trạng thái) và xác nhận đúng ý; nếu không đúng, hoàn nguyên các chỗ đó về bản của `main` (không ảnh hưởng mã; bài kiểm `KHONG_DB` vẫn chạy). **Khuyến nghị:** liếc lại một lần lúc gộp (`git diff main -- docs/ARCHITECTURE.md`).

### "Chấm đếm" cho Đối tác (ADR-0014 điều 12) — chưa có

Bảng tin chỉ làm MỚI màn hình của Đối tác (đơn do họ lập/phụ trách) và KHÔNG hiện thông báo nổi cho họ (ADR-0022 Q-C). "Chấm đếm" (con số/chấm nhỏ báo có gì mới cho Đối tác) theo ADR-0014 điều 12 **chưa được xây**. Chủ chỉ cần biết điều này; xây nó là một lát riêng có đặc tả.

### Lỗi thị giác nhìn thấy trong ảnh bằng chứng — KHÔNG thuộc nhánh này (Đợt E)

- Danh sách đơn ở 390 px: chip số khách bị cắt ("2NI"/"2NL") — ảnh `bang-tin-b-don-moi-hien-ngay-390` và `bang-tin-c-thong-bao-co-nguoi-nhan-390`.
- Trang `/order` ở 1040 px: huy hiệu "Đã xác nhận" xuống dòng lệch cạnh mã đơn.

Không sửa ở nhánh Bảng tin (thuộc phần giao diện thẻ đơn/biểu tượng — Đợt E); ghi để chủ đưa vào việc riêng.

| Phương án | Được / mất |
|---|---|
| **(1) Để Đợt E sửa** (nhánh thẻ đơn/biểu tượng đã có việc này) | Đúng chỗ, không trộn hai đợt; Bảng tin phát hành mà chip số khách còn bị cắt ở 390 px — lỗi này CÓ SẴN từ trước, không do Bảng tin |
| **(2) Sửa CSS ngay ở nhánh này** | Ảnh bằng chứng đẹp hơn. Mất: trộn việc giao diện vào Bảng tin, phải chạy lại nhiều kịch bản Chrome, dễ xung đột với Đợt E |

**Khuyến nghị: (1).**
