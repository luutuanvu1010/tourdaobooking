> **Nguyên văn báo cáo của agent QA độc lập (lần 1), lưu nguyên vẹn, không chỉnh sửa nội dung.** Phiên chính lưu lại để giữ dấu vết (P5); đây là báo cáo của agent, không phải của người thi công. Kết quả: **KHÔNG ĐẠT**. Việc xử lý các phát hiện nằm ở các commit sau (xem `docs/AUDIT-PWA-IPHONE.md`); báo cáo lần 2 (nếu có) là file `QA2-doc-lap-lan-2.md`.

# QA2 — nhánh `worktree-pwa-iphone` (app iPhone bằng PWA, "Tour Đảo Desk")

- **Kết quả: KHÔNG ĐẠT** — 1 mục CHẶN (Q2-01). Bất biến trung tâm mà chính nhánh tuyên bố ("`/api/*` không bao giờ qua cache") bị bác bằng bằng chứng E1.
- **Ngày giờ:** 2026-09-19, ~17:15 (đo từ ~15:55).
- **Người soát:** agent QA độc lập, phiên tách, model Claude Opus 5 (1M context), worktree `agent-a96faeb7cfa06dbe3`. Không phải người viết mã/tài liệu của nhánh; đã tự đo trước, chỉ đọc `docs/AUDIT-PWA-IPHONE.md` và `docs/evidence/` **sau** khi có danh sách phát hiện riêng.
- **Bản được soát:** `worktree-pwa-iphone` @ `118be35` (`git rev-parse --short HEAD` → `118be35`). Điểm tách: `9286a10`.
- **Người chốt:** chủ dự án — **chưa ký**.
- **Hạn chế của phép soát:** toàn bộ đo trên `wrangler dev` + D1 local + Chrome headless 390×844 trên macOS. Không có iPhone thật, không có Workers Assets thật, không có mạng thật. Không sửa mã/tài liệu, không commit/push/deploy, không chạm D1 remote. Mọi thử nghiệm phá đã hoàn tác (`git status --short` cuối phiên: sạch; HEAD vẫn `118be35`).

> `docs/AUDIT-PWA-IPHONE.md` được coi là **lời khai**; mọi con số dưới đây đo lại, phần lớn bằng **chính kịch bản của người thi công**.

---

## §1. Bảng phát hiện

Mức: **CHẶN** (phải sửa trước khi gộp) · **SỬA** (nên sửa, không chặn) · **HỎI** (chủ dự án quyết) · **GHI** (ghi nhận).

| ID | Mục | Mô tả | Mức | Bằng chứng |
|---|---|---|---|---|
| **Q2-01** | Bất biến `/api/*` không qua cache | **Service worker LƯU được phản hồi `/api/*` thật.** `sw-policy.ts:25` chặn bằng `pathname === "/api" \|\| pathname.startsWith("/api/")`; nhưng router của chính Worker (`src/shared/router.ts:39`) khớp đường dẫn bằng `split("/").filter(Boolean)`, nên `//api/auth/me` **vẫn trả JSON phiên thật, 200, type basic**, trong khi `routeFor` phân loại nó là `"shell"` → `cache.put`. Đo trên trình duyệt: mục `http://localhost:8891//api/auth/me` nằm trong cache `td-shell-…` với thân `{"staff":{"id":"…","fullName":"Quản trị Thử","phone":"0901000001","role":"admin"}}`. **Mục này SỐNG SÓT qua đăng xuất** — `web/shell.ts:40-43` chỉ gọi `/api/auth/logout` rồi `location.assign("/login")`, không `caches.delete`. Gốc rễ là P6/N7: hai luật khớp đường dẫn khác nhau cho cùng một khái niệm "/api". | **CHẶN** | **E1** — `curl --path-as-is //api/auth/me` → 200 + JSON phiên; `node` gọi `routeFor` → `"shell"`; Chrome headless: `caches.open(...).keys()` chứa `//api/auth/me`, `cache.match()` trả nguyên thân; sau `Đăng xuất` (url về `/login`) mục vẫn còn |
| **Q2-02** | `docs/PWA-IPHONE.md:9` — tắt khẩn cấp | Đoạn mã tắt khẩn cấp ghi trong tài liệu, dán **nguyên văn** vào `web/sw/sw.ts`: `npm run typecheck` **ĐỎ** (`TS2451 Cannot redeclare block-scoped variable 'self'` + `TS2339 Property 'registration' does not exist on WorkerGlobalScope`) và `tests/e2e/pwa.mjs:60-61` **ĐỎ** (`sw.js` không còn `"td-shell-"` và không còn mã 14 chữ số). Nguyên nhân chính xác: đoạn đó không có `import`/`export` nên là *script*, `declare const self` rơi vào phạm vi toàn cục và đụng `lib.webworker`. Bản dựng ra (119 byte) vẫn **đúng chức năng** (esbuild không typecheck). Repo **không có CI** (`.github` không tồn tại) nên cổng chỉ chạy tay → SỬA, không CHẶN. Sửa: thêm `/// <reference lib="webworker" />` + `export {}` vào đoạn mẫu, và ghi rõ trong tài liệu rằng hai khẳng định của `pwa.mjs` sẽ đỏ trong tình huống khẩn cấp. | **SỬA** | **E1** — `npx tsc --noEmit -p web/sw` → 2 lỗi; `npm run build:web` → `public/sw.js` 119 byte, `includes("td-shell-")=false`, `/"\d{14}"/=false` |
| **Q2-03** | Cổng "không viết cứng" của `pwa.mjs:36` | Phép quét **bắt được** `#ff0000`, `2px`, `rgb(` (đã thử, đỏ thật). Nhưng **lọt**: tên màu CSS (`red`, `white`…), `%`, `vw`/`vh`/`ch`, `color-mix()`. Lời khai "không được còn màu hex, `rgb()/hsl()`, `px`, `rem/em`" là đúng nguyên văn, nhưng đọc thành "không viết cứng màu/px" (README, PWA-IPHONE.md:23) thì rộng hơn thực tế. | **SỬA** | **E1** — đột biến M2/M2b bắt được; M2c: chuỗi `border:1px solid red; padding:10%; width:30vw; gap:0.5ch; color-mix(...)` chỉ bị bắt ở `rgb(` |
| **Q2-04** | `initShell()` treo khi mất mạng | `web/shell.ts:83` trả `new Promise<never>(() => undefined)` **trước** khi `document.body.append(tabBar(...))` ở dòng 99. Hệ quả đo được: mất mạng thì trang có thanh đầu trang + câu báo lỗi nhưng **không có thanh tab nào**, người dùng không có đường điều hướng. Spec (Q7) chỉ mô tả câu báo lỗi, không nói mất luôn điều hướng — drift nhỏ so với P4. | **SỬA** | **E1** — CDP `Network.emulateNetworkConditions offline` rồi `goto("/")`: `{"topbarText":"Tour Đảo Desk","error":"Không có kết nối mạng…","errorHidden":false,"tabbar":false}` |
| **Q2-05** | Mã bản dựng là **giờ**, không phải băm nội dung | `package.json` `build:web`: `--define:__BUILD_ID__=\"$(date +%Y%m%d%H%M%S)\"`. Mỗi lần build — kể cả build không đổi một byte mã — sinh mã mới → service worker mới → **xoá toàn bộ cache khung của mọi nhân viên**, lần mở kế tiếp chậm như lần đầu nguội (~713 ms trong phép đo). `wrangler.jsonc` có `build.command` nên mọi `wrangler dev`/`deploy` đều build lại. Tự rà đã ghi hệ quả này (mục "Đã sửa trong lúc rà" #4); tôi xác nhận và nâng thành đề xuất: dùng băm nội dung `sw.js` + `app.css` + `public/js/` thay cho giờ. | **GHI/SỬA** | **E1** — hai lần `npm run build:web` liên tiếp không đổi mã nguồn: `20260919170316` → `20260919170402`, thân file khác nhau (md5 `3baa06…` → `c91cfa…`) |
| **Q2-06** | ETag cũ của `wrangler dev` cho `/sw.js` | Sau khi build lại, `/sw.js` đổi thân (md5 khác) nhưng **ETag giữ nguyên** `"07b238dfa2a91493c9487bb23af98ef0"`, và `If-None-Match` với ETag cũ trả **304**. `Cache-Control: no-store` (`public/_headers`) chặn đúng bẫy này ở trình duyệt. Lời khai của nhánh về bẫy 304 là **đúng và tái tạo được**. Còn lại chưa kiểm: Workers Assets thật. | **GHI** | **E1** — `curl -D` hai lần quanh một lần build; `curl -H "If-None-Match: <etag cũ>"` → `HTTP 304` |
| **Q2-07** | Nút "‹" trong chế độ toàn màn hình | `web/shell.ts:59`: `if (history.length > 1) history.back()`. Trong cửa sổ standalone của iOS không có nút Back của trình duyệt, và `history.length` có thể `>1` vì những lần điều hướng **không liên quan** (chính `logout()` dùng `location.assign`, mỗi lần đăng nhập/đăng xuất cộng vào lịch sử). Khi đó `history.back()` đưa người dùng về nơi khác với `data-back` đã hứa. Không kiểm được nếu không có iPhone thật. | **HỎI** | **E3 có đối chứng** — `web/shell.ts:57-63`; đo trên Chrome headless: nút "‹" hiện đúng ở `/order`, `/order-form`, `/audit` và quay về đúng khi lịch sử "sạch" |
| **Q2-08** | Nút "Lưu đơn nháp" `position: sticky` dưới bàn phím iOS | `app.css` `.form-actions { position: sticky; bottom: 0 }`. iOS thu nhỏ vùng nhìn mà không đổi khung bố cục → nút có thể nằm sau bàn phím. **Nhánh đã tự nêu đây là rủi ro số 1 của danh sách kiểm máy thật** (`docs/PWA-IPHONE.md:33`) — ghi nhận là khai báo có thiện chí, nhưng vẫn là điều kiện ra chưa đóng. | **HỎI** | **E3** — `docs/PWA-IPHONE.md:33`; không có thiết bị thật |
| **Q2-09** | Tên hiển thị "Tour Đảo Desk" | Spec và tự rà đều ghi là **đề xuất của AI, chờ chủ dự án duyệt** (Q5). Đúng P7/Điều 7.1. Chưa có chữ ký. | **HỎI** | **E3** — spec dòng 3 và 31 |
| **Q2-10** | Tốt, đã kiểm | Không thêm dependency (`package.json` chỉ đổi **đúng hai dòng script**, `package-lock.json` **không đổi**); không `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`eval`; không bí mật được theo dõi; `.gitignore` phủ `public/sw.js`; không file ngoài ý muốn trong diff; CSP **không đổi**; `_headers` hoạt động thật trên `wrangler dev` (CSP + `no-store` trên `/sw.js`); không một lỗi console/CSP nào ngoài 401 tiền-đăng-nhập và chính hai lần dò của tôi; không trang nào tràn ngang ở 390 px (7/7 trang `scrollWidth == clientWidth == 390`). | **GHI** | **E1** — `git diff 9286a10..HEAD -- package.json package-lock.json`; `grep -rn innerHTML web/ src/ public/*.html`; log console của Chrome headless; `documentElement.scrollWidth` |

**Có đúng một mục CHẶN: Q2-01.**

---

## §2. Số khai ↔ số đo

Đo lại bằng **chính kịch bản của người thi công** (`docs/evidence/2026-09-19-pwa/kich-ban/*.mjs`, sao ra thư mục tạm ngoài repo, `puppeteer-core` + `axe-core` cài tạm — không đụng `package.json`), trên `wrangler dev --port 8891` + D1 local + đúng hai tài khoản thử mà kịch bản đòi.

| Kiểm | Lời khai | QA2 đo lại (lệnh → kết luận) | Khớp |
|---|---|---|---|
| typecheck | xanh | `npm run typecheck` → không lỗi | ✅ |
| unit test | 55/55 | `npm test` → `# pass 55 / # fail 0` | ✅ |
| e2e | 6/6 xanh (cần mạng, đọc Google Sheet thật) | `npm run test:e2e` → `E2E: 6/6 kịch bản xanh`; `catalog` bootstrap 35 dịch vụ từ Sheet thật (14,3 s) — **mạng chạy tốt, không lỗi** | ✅ |
| axe (9 màn hình) | 0 critical/serious; còn 2 `empty-table-header` (minor, có sẵn từ trước) | `do-luong.mjs` → đúng 2 vi phạm, `/catalog th:nth-child(8)` và `/staff th:nth-child(5)`, cả hai `impact: minor` | ✅ khớp từng nút |
| A. Lần đầu nguội (4G giả lập) | khung 391 / FCP 428 / dữ liệu **718** ms | `do-luong.mjs` → **389 / 424 / 713** | ✅ lệch <1,5% |
| B. Mở lại, KHÔNG service worker | 341 / 336 / **655** | → **341 / 336 / 654** | ✅ |
| C. Mở lại, CÓ service worker | **35** / 48 / **354** | → **34 / 36 / 354** | ✅ |
| Nâng cấp service worker qua "hai lần deploy" | `ĐẠT: cache bản A bị xoá, bản B thay thế, app chạy bình thường` | `kiem-tra-nang-cap-sw.mjs` → `banA 20260919171211` → `banB 20260919171220`, `cacheTruoc:["td-shell-…211"]`, `cacheSau:["td-shell-…220"]`, `loi: []`, cùng câu `ĐẠT` | ✅ |
| Nâng cấp trên MỘT máy chủ (bẫy 304) | `no-cache` không đạt, `no-store` đạt | Kịch bản riêng của tôi: sau `npm run build:web`, **ngay lần mở đầu tiên** `caches.keys()` = `["td-shell-20260919170628"]` (mã mới, đúng một cache, cache cũ đã xoá); và ETag của `wrangler dev` xác nhận là cũ (Q2-06) | ✅ |
| Icon PNG "không kênh trong suốt" | apple-touch 180, 192, 512, logo 96; RGB không alpha | Đọc nhị phân IHDR: `180×180 / 192×192 / 512×512 / 96×96`, **colorType=2** (RGB), bitDepth 8, **không chunk `tRNS`** ở cả 4 file | ✅ |
| "cache không chứa mục nào của `/api`" | 0 mục | Đúng **ở đường dùng bình thường** (cache đủ 14 mục nạp sẵn, 0 mục `/api`). **Sai khi dò `//api/…`** → xem Q2-01 | ⚠️ **BÁC MỘT PHẦN** |
| Ngưỡng SPEC §3 "TTI di động 4G dưới 2 giây" | đạt cả ba tình huống | Dữ liệu sẵn sàng 713 / 654 / 354 ms — đều dưới 2 s. **Nhưng đây là localhost**: `wrangler dev` qua loopback, CDP chỉ bóp băng thông/RTT, không mô phỏng RTT thật tới Cloudflare. **Con số tuyệt đối không phải bằng chứng 4G thật**; điều tái tạo được một cách vững chắc là *hình dạng*: có service worker thì khung nhanh hơn ~10 lần | ⚠️ đạt **có điều kiện về môi trường đo** |

Lệch duy nhất giữa lời khai và thực tế là dòng `/api` trong cache — và đó chính là mục CHẶN (GOVERNANCE §5.1: "lệch giữa lời khai và thực tế là tín hiệu báo động"). Công bằng mà nói: lời khai đó **đúng với phép đo họ đã chạy**; thiếu sót là phép đo chỉ đi đường thuận, không đi đường thù địch.

---

## §3. Điều kiện ra cổng QA2 (GOVERNANCE §4.4)

Năm mục mà chủ dự án tourdaovn chốt 2026-06-12 phần lớn gắn với **site tourdaovn**, không tự động là luật của Desk. Phân định:

| # | Điều kiện (tourdaovn) | Áp cho nhánh này? | Kết quả |
|---|---|---|---|
| 1 | JSON-LD validator 100% xanh (I6) | **KHÔNG** — Desk là app nội bộ, mọi trang `<meta name="robots" content="noindex">`, không có JSON-LD | — |
| 2 | Lighthouse perf ≥90, a11y ≥95 | **KHÔNG như nguyên văn** — ngưỡng gắn "bộ trang đại diện" của site công khai; Desk cần đăng nhập nên Lighthouse chỉ đo được `/login`. **Luật riêng của Desk thay thế:** SPEC §3 "TTI di động 4G dưới 2 giây" | **ĐẠT theo ngưỡng riêng** (713/654/354 ms), **kèm cảnh báo môi trường đo** (localhost). a11y: axe 0 critical/serious, chỉ 2 minor có sẵn từ trước |
| 3 | `prices.yaml` integrity (PY1–PY8) | **KHÔNG** — Desk không có `prices.yaml`; giá sống trong D1 + Google Sheet, đã có cổng riêng (`catalog.mjs`) | — |
| 4 | hreflang/sitemap toàn vẹn (R4) | **KHÔNG** — app `noindex`, không đa ngữ, không sitemap | — |
| 5 | Không hardcode token ngoài `DESIGN.md` | **CÓ** (tương ứng: token ở `:root` của `public/app.css`) | **ĐẠT có lỗ hổng** — khối PWA sạch hex/px/rem/`rgb()`, cổng máy đã thử đỏ thật; nhưng phép quét lọt tên màu/%/vw/ch (Q2-03) |
| — | **Bằng chứng bắt buộc: tối thiểu E1 cho MỌI bất biến dữ liệu (§5.3)** | **CÓ** | **KHÔNG ĐẠT** — bất biến "`/api/*` không bao giờ qua cache" bị **bác** bằng E1 (Q2-01) |
| — | E2 cho visual regression | **CÓ** | **ĐẠT một phần** — 8 ảnh chụp trong `anh/` là E2 hợp lệ; không có ảnh "trước/sau" để so hồi quy |
| — | Người chốt: chủ dự án duyệt báo cáo QA2 | **CÓ** | **Chưa** |

Ngoài §4.4: **§8.5 mặc định từ chối** — có bằng chứng E1 cho điều **không đạt**, nên cổng đóng. Về Hiến pháp: P2/N1 đã được khắc phục (bảng ánh xạ màn hình↔dữ liệu có trong spec, không thêm trường/bảng/API nào — tôi xác nhận `migrations/` không đổi). P5/N3 đạt (bảng quyết định Q1–Q9 có phương án bị loại và phân loại cửa; Q5 khai rõ là đề xuất AI chờ duyệt). P4 có drift nhỏ (Q2-04). **P6/N7 là chỗ đau nhất**: Q2-01 chính là hai nguồn sự thật song song cho khái niệm "đường dẫn /api". `CLAUDE.md` §8 đạt (0 dependency mới, phạm vi hẹp, drift được ghi chứ không giấu). N4 đạt sau khi khai thêm điểm chạm "tài sản logo" ở đầu SPEC. §6.2 đạt (ngưỡng là số, có trong SPEC §3).

---

## §4. Những gì KHÔNG kiểm được

- **iPhone thật:** "Thêm vào Màn hình chính", hình icon sau khi iOS bo góc, thanh trạng thái `black-translucent` + dải navy, tai thỏ/thanh home, vuốt cạnh quay lại, và **rủi ro lớn nhất là nút Lưu bị bàn phím che** (Q2-08). `env(safe-area-inset-*)` luôn bằng 0 ngoài thiết bị có tai thỏ, nên Chrome headless không nói được gì về vùng an toàn.
- **Workers Assets thật:** `_headers` (CSP, `no-store`) và việc nhận service worker mới chỉ kiểm trên `wrangler dev`. ETag của `wrangler dev` là cũ (Q2-06) nên hành vi ở đây **không suy ra được** hành vi ở Cloudflare. Với Q2-01, lưu ý biên chuẩn hoá `//` ở edge **không cứu được**: service worker khoá theo URL mà **trang** yêu cầu, không theo URL mà edge phân giải.
- **Mạng thật:** mọi số đo qua loopback; con số 4G chỉ là hình dạng tương đối, không phải giá trị tuyệt đối.
- **Đường 503 `text/plain`** (`web/sw/sw.ts:40`) cho trang chưa từng vào cache: tôi không ép được tình huống đó trong bộ đo này (mọi trang tôi thử khi mất mạng — kể cả `/catalog`, `/staff`, `/audit` không nằm trong `PRECACHE` — đều mở ra khung thật kèm câu báo mất mạng).
- **Khả năng khai thác Q2-01 từ xa:** tôi **không** dựng được một đường tấn công hoàn chỉnh (CSP `script-src 'self'`, không `innerHTML`; `//api/...` trong thuộc tính HTML bị hiểu là URL tương đối giao thức). Nhưng đây **không phải** lý do hạ mức: bất biến an toàn mà chứng minh được là **vi phạm được** thì không phải là bất biến — và hệ quả (dữ liệu phiên nằm lại trên máy sau khi đăng xuất, trên điện thoại có thể dùng chung) là không giới hạn thời gian.

---

## §5. Kết luận

**Điều kiện để gộp:**

1. **CHẶN — Q2-01.** Cho `routeFor` khớp đúng như router của Worker trước khi phân loại: gộp các dấu `/` lặp (ví dụ so trên `pathname.replace(/\/{2,}/g, "/")`), và bổ sung test cho `//api/…`, `///api/…` vào `src/shared/sw-policy.test.ts`. **Khuyến nghị kèm theo (xin chủ dự án quyết):** cho `logout()` xoá luôn Cache Storage, và/hoặc thêm một lớp chắn cuối trong `staleWhileRevalidate` — chỉ `cache.put` khi phản hồi có `content-type` là HTML/CSS/JS/ảnh, để một lỗ hổng đường dẫn trong tương lai không thành lỗ hổng dữ liệu. Sửa xong cần **chạy lại cổng và gửi lại QA2** (đây là mã, không phải tài liệu).
2. **SỬA — Q2-02.** Sửa đoạn mẫu tắt khẩn cấp trong `docs/PWA-IPHONE.md:9` cho biên dịch được (`/// <reference lib="webworker" />` + `export {}`), và ghi rõ hai khẳng định `pwa.mjs:60-61` sẽ đỏ khi dùng đường khẩn cấp.
3. **SỬA — Q2-03.** Mở rộng phép quét sang tên màu CSS, `%`, `vw/vh/ch`, `color-mix()`; hoặc sửa câu mô tả trong README/`PWA-IPHONE.md` cho khớp đúng phạm vi thật của cổng.
4. **SỬA — Q2-04.** Cho thanh tab dựng **trước** lời gọi `/api/auth/me`, để mất mạng vẫn còn điều hướng; và cập nhật Q7 của spec cho khớp hành vi thật.
5. **SỬA/GHI — Q2-05.** Cân nhắc đổi `__BUILD_ID__` từ giờ sang băm nội dung, để build không đổi mã thì không xoá cache của mọi nhân viên.

**Cần chủ dự án quyết (HỎI):** (a) tên hiển thị "Tour Đảo Desk" — Q2-09; (b) nút "‹" trong chế độ toàn màn hình khi `history.length` bị "bẩn" — Q2-07; (c) chấp nhận gộp trước rồi kiểm danh sách iPhone thật sau, hay kiểm máy thật trước khi gộp — Q2-08 là rủi ro trải nghiệm cao nhất còn mở; (d) ba câu hỏi mà chính tự rà đã nêu và vẫn chưa có người trả lời: ai chạy QA1 cho mockup, ghi quyết định ở đâu (SPEC §7 hay mở thư mục ADR cho Desk), và có gọi `/api/auth/me` + `/api/orders` song song không.

**Ghi nhận công bằng:** ngoài Q2-01, đây là một nhánh có kỷ luật bằng chứng cao hơn mức trung bình — kịch bản đo **chạy lại được và ra đúng số** (lệch <1,5%), cổng máy **thử đột biến thì đỏ thật**, không thêm một dependency nào, tự rà tự khai đúng tình trạng "TỰ RÀ, CHƯA ĐỘC LẬP" và tự ghi cả những chỗ mình từng xác nhận sai (ba cỡ `rem` lọt phép quét đầu). Lỗ hổng Q2-01 không đến từ cẩu thả mà từ chỗ mù cố hữu của tự rà: mọi phép kiểm đều đi đường thuận.

*Ký: QA2 — agent QA độc lập, phiên tách, Claude Opus 5 (1M context), worktree `agent-a96faeb7cfa06dbe3`, 2026-09-19 ~17:15.*

---

**Dọn dẹp đã làm:** tắt mọi `wrangler dev`/`workerd` (`pgrep` → không còn); xoá `.dev.vars`, `.wrangler`, hai file `*.local.sql` seed; hoàn tác mọi đột biến; `git status --short` **sạch**, `HEAD` vẫn `118be35`. Công cụ trình duyệt cài ở `/tmp/qa2-pwa-tools` (ngoài repo). Không sửa gì trong `tourdaovn`.
