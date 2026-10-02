# Lớp chống ghi trùng ở tầng Nền tảng: Cloudflare, chuẩn ngành, Oracle và đề xuất một cơ chế chung

> **Trạng thái:** **CHỦ ĐÃ TRẢ LỜI 3 câu ở §7** (chat 2026-10-02). Đã soạn thành **ADR-0094** (`docs/adr/ADR-0094-…`, proposed), chờ chủ duyệt văn bản. Khi đề xuất này và ADR khác nhau, **ADR thắng**.
>
> **Lời chủ (nguyên văn) cho §7:**
>
> > "1- Vé là dữ liệu kỹ thuật nhưng cũng không dọn sau 30 ngày, vì có thể sau này cần dùng lịch sử của quá khứ để đánh giá tỷ lệ thành công, huỷ, hoanf của đơn. Tôi đề xuất vẫn giữ với thời gian lâu hơn, tạm thời là 365 ngày (cụ thể hoá bằng lựa chọn trong tài khoản Toàn quyền). 2- Theo đề xuất. 3- ok ."
>
> - Câu 1 → **giữ vé 365 ngày, Toàn quyền chọn được thời hạn** (không phải 30 ngày như khuyến nghị A).
> - Câu 2 → **R2**.
> - Câu 3 → **từ từ** (cũng là CT2).
>
> **Lời chủ dự án (nguyên văn, chat 2026-10-02):**
>
> > "1- Chúng ta chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này. Tìm trong Cloudflare và/hoặc Oracle xem họ có cách nào chống ghi trùng dữ liệu."
>
> Trước đó: "Đồng ý, đều phải có cơ chế chống trùng, truy ngược lại khung của Oracle xem nên làm kiểu gì".
>
> **Tài liệu này thay** phần kỹ thuật của đặc tả `2026-09-22-chong-gui-trung.md` và §3.3 mục 3 của `2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`, nếu chủ duyệt hướng này.
>
> **Người soạn:** trợ lý nghiên cứu, chỉ đọc kho; nguồn đọc ngày 2026-10-02 (§9). Chưa có người kiểm độc lập.
>
> **Bước của chủ khi triển khai:** khoá bí mật cho vân tay nội dung (HMAC, §3) đặt bằng `wrangler secret put` — việc của chủ (CLAUDE.md §8).


> **Lời chủ dự án (nguyên văn, 2026-10-02):** "Chúng ta chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này. Tìm trong Cloudflare và/hoặc Oracle xem họ có cách nào chống ghi trùng dữ liệu."
>
> **Cách hiểu đã ghi lại:** chủ không muốn mỗi màn, mỗi lệnh tự vá chống trùng (§3.2–§3.3 của `docs/superpowers/specs/2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`). Chủ muốn **một** cơ chế ở tầng Nền tảng, áp cho mọi lệnh ghi.
>
> **Trạng thái:** tài liệu nghiên cứu và **đề xuất**, chưa phải quyết định. Đề xuất chạm dữ liệu (bảng mới, migration), luật (Hiến chương, router, ngoại lệ "không xoá cứng") và mọi route ghi. Vì vậy đây là **việc lớn**: cần ADR, chủ duyệt, và người kiểm độc lập sau khi thi công (CLAUDE.md §3).
>
> **Người soạn:** trợ lý nghiên cứu, chỉ đọc kho (worktree `quyet-dinh-thu-nghiep-vu`, HEAD 4598221f). **Ngày đọc nguồn:** 2026-10-02.
>
> **Nhãn tin cậy:**
> - **[NV]** = nguyên văn, lấy từ trang chính thức đã mở được. Riêng các trang Cloudflare, IETF, Stripe, AWS đều đọc qua **công cụ tải trang có tóm tắt**. Câu trong ngoặc kép là câu công cụ trả về là trích; chưa đối chiếu từng chữ bằng mắt.
> - **[SL]** = suy luận của người soạn.
> - **[CXM]** = chưa xác minh.

---

## 0. Kết luận cho chủ (lời thường, ≤ 180 từ)

**Cloudflare không có sẵn công tắc chống ghi trùng.** Chỉ có viên gạch (ghi "tất cả hoặc không", khoá cấm trùng) và lời dặn tự làm.

**Chuẩn ngành và Oracle:** mỗi lần bấm mang một **số vé**.
- Gửi lại cùng vé: trả kết quả cũ.
- Cùng vé, khác nội dung: từ chối.
- Đang làm dở: báo "đang xử lý".

**Đề xuất:** làm **một** lớp như vậy ở cổng chung của Nền tảng.
- Điện thoại tự gắn vé cho mọi lệnh ghi.
- Máy chủ ghi vé **cùng lô** với dữ liệu, nên "có vé" nghĩa là "đã ghi".
- Không màn nào phải tự vá.

**Cái giá:**
- Một bảng mới.
- Mỗi lệnh ghi thêm một lần tra.
- Chi phí gần bằng không.
- Không bắt được hai người nhập cùng một việc; phần đó vẫn cần lớp nghiệp vụ.

**Cần bạn quyết:** giữ vé bao lâu; gửi lại thì trả gì; bắt buộc ngay hay từ từ (trùng câu CT2 đang chờ) (§7).

---

## 1. Cloudflare có gì để chống ghi trùng

| # | Sản phẩm | Có cơ chế chống trùng dựng sẵn cho lệnh ghi qua HTTP? | Điều Cloudflare viết | Mức | Nguồn (đọc 2026-10-02) |
|---|---|---|---|---|---|
| 1 | **Workers** (nơi chạy Nền tảng) | **Không.** Không thấy tài liệu nào về lớp idempotency cho yêu cầu đến Worker | `ctx.waitUntil()` "can extend execution for up to 30 seconds after the response is sent or the client disconnects"; "If any Promises have not settled after 30 seconds, they are canceled." | NV | [Context (ctx)](https://developers.cloudflare.com/workers/runtime-apis/context/) (cập nhật 28/9/2026) |
| 2 | Workers, khi máy khách ngắt giữa chừng | Trang lỗi chỉ định nghĩa "Cancelled": "The Client disconnected before the Worker completed its response." Phần việc Worker **đang làm dở** có bị huỷ không: trang **không nói** | — | NV + **CXM** | [Errors and exceptions](https://developers.cloudflare.com/workers/observability/errors/) (30/9/2026) |
| 3 | **D1** (cơ sở dữ liệu của Nền tảng) | **Không có lớp chống trùng**, nhưng có viên gạch chính: lô nguyên tử. `batch()` là "SQL transactions… If a statement in the sequence fails, then an error is returned for that specific statement, and it aborts or rolls back the entire sequence."; "each statement in the list will execute and commit, sequentially, non-concurrently." | — | NV | [D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/) |
| 4 | D1: tự gửi lại | "D1 automatically retries read-only queries up to two more times…"; với lệnh ghi: "It is useful to retry write queries from your application when you encounter a transient error." Nghĩa là D1 **không** tự gửi lại lệnh ghi. Nếu Nền tảng tự gửi lại thì chính Nền tảng phải lo chống trùng | — | NV + SL | [Retry queries](https://developers.cloudflare.com/d1/best-practices/retry-queries/) (10/8/2026) |
| 5 | D1: khoá UNIQUE, `INSERT … ON CONFLICT` | Trang D1 API **không nhắc**. Đây là SQLite chuẩn và kho đã dùng (Góp ý, Thông báo, Vận chuyển) | — | SL (kho đã chạy thật) | — |
| 6 | D1: giới hạn, giá | 10 GB mỗi cơ sở dữ liệu (gói trả phí); tối đa 1.000 truy vấn mỗi lần gọi Worker; 100 tham số mỗi câu; giới hạn từng câu áp cho từng câu trong lô. Giá: 50 triệu dòng ghi/tháng đã gồm trong gói, sau đó $1/triệu; 5 GB lưu trữ đã gồm, sau đó $0,75/GB-tháng | — | NV | [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) (21/4/2026); [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) (21/4/2026) |
| 7 | **Durable Objects** (đã dùng cho Bảng tin) | **Không có lớp chống trùng.** Có viên gạch: "Each Durable Object is a single-threaded, globally-unique instance with its own persistent storage"; "output gates hold outgoing network messages until pending storage writes complete"; nhiều lệnh ghi không xen `await` thì "automatically batched into a single atomic implicit transaction"; khuyên "one Durable Object per… a user's data" | — | NV | [Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/) (20/8/2026) |
| 8 | Durable Objects: báo thức để dọn | "guaranteed at-least-once execution", thử lại "starting at a 2 second delay… up to 6 retries"; mỗi Durable Object "a single alarm at a time"; "In rare cases, alarms may fire more than once. Your alarm() handler should be safe to run multiple times" | — | NV | [Alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) (21/4/2026); trang Rules ở dòng 7 |
| 9 | Durable Objects: giá | Yêu cầu: 1 triệu/tháng đã gồm, sau đó $0,15/triệu. Dòng ghi SQLite: 50 triệu/tháng đã gồm, sau đó $1/triệu | — | NV | [DO Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) (30/9/2026) |
| 10 | Durable Objects + D1 trong **một** giao dịch | Không tìm thấy tài liệu nào cho phép một giao dịch trải trên cả hai. Hai kho lưu tách rời, nên ghi D1 và ghi Durable Object **không** nguyên tử với nhau | — | **SL / CXM** (không thấy tài liệu nói "có", cũng không thấy câu nói "không") | — |
| 11 | **Workers KV** | **Không hợp.** "KV achieves high performance by being eventually-consistent"; "Changes may take up to 60 seconds or more to be visible…"; "KV is not ideal for applications where you need support for atomic operations…"; "If you need stronger consistency guarantees, consider using Durable Objects." | — | NV | [How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/) (21/4/2026) |
| 12 | **Queues** | **Không có khử trùng dựng sẵn.** "Queues provides *at least once* delivery by default"; "in rare occasions, may be delivered more than once". Khuyên bên nhận tự dùng khoá idempotency. Không có chế độ "đúng một lần" | — | NV (phần "không có khử trùng" là kết luận của công cụ tóm tắt từ trang) | [Delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) (21/4/2026) |
| 13 | **Workflows** | **Không phải chống trùng yêu cầu HTTP.** "Because a step might be retried multiple times, your steps should (ideally) be idempotent." Bước đã chạy xong được nhớ kết quả theo tên. Với việc không lặp lại được (ví dụ trừ tiền) thì phải kiểm "đã làm chưa" trước khi làm | — | NV (một câu) + tóm tắt | [Rules of Workflows](https://developers.cloudflare.com/workflows/build/rules-of-workflows/) (10/9/2026) |
| 14 | **Agents SDK**: `startFiber({ idempotencyKey })` | **Có**, nhưng cho tác vụ nền của "agent": "Duplicate calls with the same idempotency key join an active in-memory execution when possible, then return the retained status with `accepted: false`". Dọn bằng `deleteFibers()`. Thuộc gói `agents`, chạy trên Durable Objects | — | NV | [Durable execution with fibers](https://developers.cloudflare.com/agents/runtime/execution/durable-execution/) (20/8/2026) |
| 15 | **API của chính Cloudflare** | **Có** header `Idempotency-Key`, nhưng chỉ thấy ở **API tạo tài khoản**: "Every Free account creation request requires exactly one valid `Idempotency-Key`"; "Reuse the same key when retrying the same request."; lỗi khi dùng lại cho yêu cầu khác: "The idempotency key was used for a different request. Use a new key for the new request." | — | NV. Các API Cloudflare khác có header này không: **CXM** | [Create account](https://developers.cloudflare.com/fundamentals/account/create-account/) (17/9/2026) |

**Kết luận về Cloudflare [SL]:**
- Không có công tắc nào bật lên là Worker + D1 tự chống ghi trùng.
- Tài liệu chỉ lặp lại một lời dặn: tự làm cho lệnh ghi lặp lại được an toàn.
- Hai viên gạch dùng được: **lô D1 nguyên tử + khoá UNIQUE**, và **Durable Object đơn luồng**.
- KV loại vì chỉ nhất quán sau. Queues và Workflows cũng loại vì chính chúng đòi bên dùng tự chống trùng.
- Agents SDK có khoá idempotency, nhưng: kéo thêm một gói chạy thật (CLAUDE.md §1: dự án **không có dependency runtime**); làm cho tác vụ nền kiểu "agent", không cho lệnh ghi CRUD; vẫn không nguyên tử với D1. **Không khuyến nghị.**

---

## 2. Chuẩn ngành và Oracle làm thế nào

### 2.1 IETF: bản nháp "The Idempotency-Key HTTP Header Field"

- **Tình trạng:** draft-ietf-httpapi-idempotency-key-header-**07**, ngày 2025-10-15. Datatracker ghi "**Expired** Internet-Draft", WG Document của nhóm httpapi. Tức đây **là bản nháp đã hết hạn, không phải tiêu chuẩn** [NV]. Nguồn: [datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), [bản txt -07](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt).
- **Nội dung chính** (qua công cụ tóm tắt, ghi số mục) [NV]:
  - §2.1: giá trị "MUST be a String".
  - §2.2: "It is RECOMMENDED that a UUID… or a similar random identifier be used".
  - §2.4: "dấu vân tay" của yêu cầu có thể là checksum toàn thân, checksum một phần, so từng trường…
  - §2.5.2: "Resources MUST publish a idempotency related specification… MUST include expiration related policy if applicable".
  - §2.6: lặp lại một yêu cầu đã xong thì máy chủ "SHOULD respond with the result of the previously completed operation, success or an error".
  - §2.7: **thiếu header → 400; dùng lại khoá với nội dung khác → 422; yêu cầu cùng khoá đang được xử lý → 409.**

### 2.2 Stripe

Nguồn: [Idempotent requests](https://docs.stripe.com/api/idempotent_requests), [Advanced error handling](https://docs.stripe.com/error-low-level).

- **Cái được lưu:** "saving the resulting status code and body of the first request made for any given idempotency key, regardless of whether it succeeds or fails. Subsequent requests with the same key return the same result, including `500` errors." [NV]
- **Khoá:** dài tối đa 255 ký tự. Gợi ý "V4 UUIDs". Tránh dùng email hay định danh cá nhân làm khoá [NV].
- **Thời hạn:** "remove keys… after they're at least 24 hours old"; khoá bị dùng lại sau khi đã dọn thì thành yêu cầu mới [NV].
- **So nội dung:** "compares incoming parameters to those of the original request and errors if they're not the same" [NV].
- **Khi không lưu kết quả:** "We save results only after the execution of an endpoint begins. If incoming parameters fail validation, or the request conflicts with another request that's executing concurrently, we don't save…" [NV].
- **Phía máy khách:**
  - Lỗi mạng: gửi lại "with the same idempotency keys and the same parameters".
  - Lỗi 4xx: "the safest strategy… is to always generate a new idempotency key".
  - Lỗi 500: "Treat… as indeterminate", khuyên **không** đổi khoá "because the original key may have produced side effects" [NV].
- **Phát lại:** có header `Idempotent-Replayed: true`. Phát hiện yêu cầu chạy đồng thời: mã 409 [NV].

### 2.3 AWS Powertools (mẫu "đang chạy" có hạn)

Nguồn: [Powertools TS, Idempotency](https://docs.aws.amazon.com/powertools/typescript/latest/features/idempotency/).

- Bản ghi có ba trạng thái **INPROGRESS → COMPLETE → EXPIRED**.
- Yêu cầu thứ hai đến lúc bản đầu còn INPROGRESS thì ném `IdempotencyAlreadyInProgressError`, gửi lại được.
- Hàm chết giữa chừng: quá mốc `inProgressExpiryTimestamp` thì chạy lại như đã hết hạn.
- Mặc định giữ 1 giờ. Lệch nội dung thì `IdempotencyValidationError`.
- Kết quả lưu **sau** khi hàm chạy xong. Hàm ném lỗi thì **xoá** bản ghi để gửi lại được [NV qua tóm tắt].

### 2.4 Oracle

Chi tiết và nguồn ở tệp nghiên cứu Oracle (§1). Tóm tắt:
- **OCI:** `opc-retry-token` cho lệnh tạo, giữ 24 giờ; 409 `InvalidatedRetryToken` [NV].
- **Sửa, xoá:** ETag/If-Match [NV].
- **Fusion:** không dùng vé ngẫu nhiên, mà dùng **khoá do hệ nguồn cấp** (`SourceTransactionSystem` + `SourceTransactionId`) cộng `Upsert-Mode` [NV].
- **Tầng nghiệp vụ** (hoá đơn, biên lai, sao kê, hồ sơ khách) là **lớp riêng**: có số do bên ngoài cấp thì chặn cứng, chỉ "trông giống" thì cảnh báo [NV + SL].

### 2.5 Mẫu chung rút ra [SL]

1. Khoá do **máy khách** sinh, một khoá cho **một ý định**, giữ nguyên qua các lần gửi lại.
2. Phạm vi khoá theo **chủ thể**: tài khoản (Stripe), tenancy (OCI). Phạm vi của OCI: **CXM**.
3. Máy chủ ghi nhớ khoá cùng **dấu vân tay nội dung**. Bốn trường hợp:
   - lặp và đã xong: trả kết quả cũ;
   - khác nội dung: 422;
   - đang chạy: 409;
   - thiếu khoá: 400.
4. Có **thời hạn giữ** công bố (24 giờ ở Stripe và OCI; 1 giờ mặc định ở Powertools).
5. Lớp này **không** thay lớp nghiệp vụ, vì hai người hay hai máy luôn có hai khoá khác nhau.

---

## 3. Đề xuất: "Sổ lần gửi", một lớp cho mọi lệnh ghi (ĐỀ XUẤT, KHÔNG PHẢI SỰ THẬT)

### 3.1 Nguyên lý: vé đi cùng lô

Khoá lần gửi (gọi là **vé**) được chèn vào bảng `lg_lan_gui` **trong chính `db.batch()` ghi dữ liệu nghiệp vụ** của lệnh. D1 chạy lô "tất cả hoặc không" (§1 dòng 3), nên:

> **Có dòng vé ⇔ lô ghi của lệnh đã thành công.** Không có trạng thái "giữ chỗ" treo, không cần hạn "đang chạy", không có cửa sổ "đã ghi dữ liệu nhưng chưa ghi vé".

Lần gửi thứ hai cùng vé có ba khả năng:
- **Đến sau khi lần đầu đã xong:** máy chủ tra trước, thấy vé, không chạy lệnh, trả "đã ghi".
- **Đến đồng thời:** lô của lần đến sau đụng khoá chính của `lg_lan_gui`, D1 huỷ **cả lô**. Không ghi gì thêm.
- **Lần đầu chưa từng ghi** (lỗi kiểm dữ liệu, chết trước khi ghi): không có vé, nên lần sau chạy như mới. Giống Stripe "chưa bắt đầu thì không lưu".

Đây là khuôn đã chạy thật ở Vận chuyển (`vc_trip_event.request_id UNIQUE` trong lô, `chayLo` ở `src/modules/van-chuyen/dieu-phoi-route.ts:90-103`). Khác ở chỗ: **một bảng chung** do lớp Nền tảng ghi, không phải cột riêng của từng bảng.

### 3.2 Máy khách: `web/api.ts` tự gắn vé (không màn nào phải làm gì)

Hiện mọi lời gọi ghi đi qua `api()` (`web/api.ts:76`). Đếm phía giao diện: 88 `POST`, 25 `PUT`, 8 `PATCH`, 3 `DELETE`. Hai chỗ gọi `fetch` thẳng (`web/maintenance-screen.ts:92` đăng xuất; `web/api.ts:48` `session-ended`) đều là route **công khai**, được miễn.

**Quy tắc vé** (một chỗ, trong `api()`):

1. **Phương thức ghi** (`POST`, `PUT`, `PATCH`, `DELETE`): tính `dấu` = mã băm của (phương thức + đường dẫn + thân JSON).
   - Đã có **vé đang mở** cho `dấu` này thì dùng lại.
   - Chưa có thì sinh `crypto.randomUUID()`, ghi vé **trước khi gửi**.
   - Gửi header `Idempotency-Key: <vé>`.
2. **Đóng vé** (xoá) khi máy chủ trả lời **rõ ràng**:
   - mọi 2xx;
   - mọi 4xx, trừ `409 dang_xu_ly`;
   - và `da_ghi_truoc_do`.
3. **Giữ vé** khi **không rõ kết quả**:
   - mất mạng;
   - hết 45 giây (`REQUEST_TIMEOUT_MS`);
   - 5xx (Stripe: 500 là "indeterminate", đừng đổi khoá).

   Lần bấm kế tiếp **cùng nội dung** dùng lại vé đó. Bấm hai lần liên tiếp (vé đang mở) cũng dùng chung vé, nên chống được bấm đúp mà không cần khoá nút.
4. **`409 dang_xu_ly`:** `api()` tự chờ 1–2 giây rồi gửi lại **cùng vé**, tối đa 3 lần. Sau đó báo "Đang xử lý, chờ chút rồi bấm lại".
5. **`da_ghi_truoc_do`** (§3.4): `api()` không trả dữ liệu cho màn gọi. Một chỗ chung hiện "Lần bấm trước đã được ghi", rồi `location.replace(ketQua)` nếu máy chủ cho địa chỉ kết quả, không thì tải lại trang.
6. **Nơi giữ vé:** `localStorage`, khoá `lg:<staffId>`, mỗi mục `{dấu → vé, lúc}`. Hạn 24 giờ, tối đa ~50 mục. Đọc, ghi đều bọc `try/catch`; hỏng thì lùi về bộ nhớ của trang.
   - **Vì sao không dùng `sessionStorage`:** iOS hay giết PWA khi người dùng chuyển sang Zalo hay máy ảnh ở bến. `sessionStorage` mất theo, lần bấm lại sau khi mở app sẽ mang vé mới và có thể ghi trùng.
   - `localStorage` cũng làm hai tab cùng nội dung dùng chung vé. Đó là điều muốn có.
   - Mục chỉ chứa **mã băm**, không chứa thân yêu cầu.
   - **Nhưng mã băm không che được bí mật ít khả năng.** Thân chứa PIN (vài chữ số), SĐT hay số giấy tờ có ít giá trị có thể có. Ai cầm máy đều thử hết được và tìm ra giá trị gốc.
   - Vì vậy route có **thân chứa bí mật** chỉ giữ vé **trong bộ nhớ của trang**, không ghi `localStorage`. Mất vé khi iOS giết app thì chấp nhận; những route này không phải lệnh tiền.
     - Đổi PIN: `/api/account/change-pin`, `/api/account/pin-by-passkey`, `/api/staff/:id/reset-pin`.
     - Giấy tờ của người: `/api/parties/:id/documents*`.
   - Danh sách này đặt ở **một** tệp thuần `src/shared/`, dùng chung máy chủ và giao diện, có bài kiểm.
7. **Không xoá vé khi bị đá về đăng nhập** (`goLogin`). Phạm vi vé ở máy chủ là **tài khoản**, không phải phiên. Người bị đá phiên ở bến đăng nhập lại rồi bấm "Lưu" lại vẫn trúng vé cũ, nên không ghi trùng. Người khác đăng nhập cùng máy dùng ngăn `lg:<staffId>` khác. Vé của người trước, nếu bị gửi nhầm, cũng không khớp phạm vi ở máy chủ nên vô hại.

**Lệch có ghi nhận:**
- `web/dieu-phoi-ui.ts:32` hiện coi **mọi** `ApiError` (kể cả 5xx) là kết quả rõ và bỏ `requestId`. Quy tắc mới giữ vé khi 5xx.
- Hai cơ chế cùng tồn tại được: vé ở header, `requestId` ở thân. Sau này có thể gộp.

**Điều kiện để dùng lại vé:** thân phải **giống hệt từng byte**. Màn nào nhét vào thân một trường đổi theo từng lần gửi (giờ máy, mã sinh lại sau lỗi) thì lần gửi lại mang vé mới, và lặng lẽ mất chống trùng. Vận chuyển đang sinh `requestId` mới sau 5xx (`web/dieu-phoi-ui.ts:32`). Bài kiểm H1 phải có ca "gửi lại từ màn thật", không chỉ từ khung thử.

**Giới hạn đã biết (lớp kỹ thuật KHÔNG bắt được):**
- Người dùng **sửa nội dung** sau một lần mất mạng rồi gửi lại. Khác nội dung thì khác vé; nếu lần đầu thật ra đã ghi thì sẽ có hai bản.
- Hai người, hai máy nhập cùng một việc.

Cả hai thuộc **lớp nghiệp vụ** (§4).

### 3.3 Máy chủ: router làm thay mọi route

Chen vào `createApp` (`src/shared/router.ts:274`), **sau** khi biết ai đăng nhập và qua cổng bảo trì, **trước** khi gọi handler. Chỉ áp cho route **ghi** (`WRITE_METHODS`, dòng 194) **có đăng nhập**. Route `public` tự miễn (không có tài khoản để làm phạm vi).

| Bước | Việc | Ghi chú |
|---|---|---|
| 1 | Đọc `Idempotency-Key`. Kiểm dạng: 16–64 ký tự `[A-Za-z0-9-]` | Thiếu: **giai đoạn 1** cho qua và đếm (log `thieu_ma_lan_gui` + mẫu route, không dữ liệu cá nhân); **giai đoạn 2** trả **400** "Ứng dụng cần tải lại để dùng bản mới" (IETF §2.7) |
| 2 | `vân tay = HMAC-SHA-256(khoá bí mật của Worker, phương thức + đường dẫn thật + thân)`. Đọc thân bằng `request.clone()` **trước** handler | Phải là **HMAC có khoá bí mật**, không phải SHA-256 trơn: thân có PIN hay số giấy tờ thì mã băm trơn dò ngược được. Khoá do chủ đặt bằng `wrangler secret put` (việc của chủ, không phải câu hỏi). Thân trống (POST không thân, DELETE): băm phương thức + đường dẫn |
| 3 | **Tra trước:** `SELECT … FROM lg_lan_gui WHERE staff_id = ? AND khoa = ?` | Một lần đọc. Chặn **gửi lại tuần tự** mà không chạy lại handler. Nhờ vậy handler không trả nhầm "409 đã có người sửa" như hiện nay ("An toàn, báo sai" ở tệp Oracle §3.2) |
| 3a | Có dòng, **khác** vân tay | **422** `ma_lan_gui_khac_noi_dung` "Lần gửi trước đã ghi với nội dung khác. Tải lại để xem." (IETF §2.7) |
| 3b | Có dòng, cùng vân tay, đã có kết quả | Phát lại (§3.4), kèm header `Idempotent-Replayed: true` (tên của Stripe) |
| 3c | Có dòng, cùng vân tay, chưa có kết quả, mới ghi < 10 giây | **409** `dang_xu_ly` (IETF §2.7). Lần đầu đã ghi xong lô, đang dựng phản hồi |
| 3d | Có dòng, chưa có kết quả, ≥ 10 giây | Phát lại kiểu "đã ghi, không rõ địa chỉ kết quả", rồi tải lại trang |
| 4 | Chưa có dòng: chạy handler với `env` **đã bọc** (§3.5) | Lô ghi **đầu tiên** của handler được nối thêm câu chèn vé |
| 5 | Lô đụng khoá của `lg_lan_gui` (lần gửi đồng thời): bộ bọc đặt cờ `dungVe` và ném lỗi riêng | Router **bỏ qua** mọi phản hồi handler tự dựng (kể cả khi handler nuốt lỗi), đọc dòng vé rồi xử lý như 3a–3d |
| 6 | Handler trả lời xong và lệnh **đã ghi vé**: cập nhật dòng vé `ma_tra` (mã HTTP), `ma_loi` (mã lỗi máy, nếu 4xx), `ket_qua` (header `Location` nếu có), `xong_luc` | Chạy trong `exec.waitUntil`, không làm chậm phản hồi. Mất bước này (Worker bị ngắt) chỉ mất **địa chỉ kết quả**, dữ liệu vẫn đúng |
| 7 | Handler trả **lỗi** mà lệnh **không** ghi vé: tra lại dòng vé một lần | Có rồi nghĩa là một lần gửi đồng thời cùng vé đã thắng. Trả như 3b–3d thay vì lỗi handler tự dựng |
| 8 | Handler **ném lỗi** (500) | Đã ghi vé: lưu `ma_tra = 500`, lần sau phát lại "đã ghi, tải lại để xem". Chưa ghi vé: không lưu gì, gửi lại an toàn |

**Hai lớp** đúng Hiến chương điều 5.1:
- **mã** (tra trước, bước 3);
- **cơ sở dữ liệu** (khoá chính `(staff_id, khoa)` trong cùng lô, bước 4–5).

### 3.4 Gửi lại thì trả gì: hai cách (chủ quyết, §7 câu 2)

| | **R2: không lưu nội dung, trả "đã ghi" + địa chỉ kết quả** (khuyến nghị) | **R1: lưu nguyên phản hồi ~24 giờ** (giống Stripe/IETF) |
|---|---|---|
| Người dùng thấy | "Lần bấm trước đã được ghi", rồi tự mở trang kết quả (đơn vừa tạo…) hoặc tải lại | Màn tiếp tục như chưa có gì xảy ra |
| Dữ liệu cá nhân | Không chép nội dung. Dòng vé chỉ có mã, mẫu route, vân tay HMAC (không dò ngược được nếu không có khoá bí mật) | **Chép thêm** SĐT, tên, cả **số căn cước**: `POST /api/parties/:id/documents/:did/reveal` trả số đầy đủ (`src/modules/parties/index.ts:802-815`), trái ADR-0040 và Hiến chương 5.12. Phải miễn route đó và rà mọi route khác |
| Dung lượng | ~250 byte/lệnh, giữ được lâu | Vài KB/lệnh. **Bắt buộc** dọn sau 24 giờ, kéo theo ngoại lệ "xoá cứng" |
| Theo chuẩn | Lệch câu **SHOULD** (khuyên, không bắt buộc) của IETF §2.6 | Đúng IETF, Stripe |
| Việc kèm | Route tạo mới phải cho **địa chỉ kết quả**. Kho có **28** chỗ trả 201 ở 8 module (`grep ", 201)" src/modules/*/index.ts`). Hai cách: (i) mỗi route thêm header `Location`, mỗi chỗ một dòng, máy móc; (ii) **một** bảng tra "mẫu route → trang" ở giao diện, router lưu `id` lấy từ phản hồi. Bài kiểm chung: mọi route trả 201 phải có địa chỉ. Route **tạo nhưng trả 200** thì lọt bài kiểm đó, phải rà tay. **Thiếu địa chỉ thì phát lại chỉ tải lại trang. Với "Lập đơn", người dùng sẽ thấy form trống** và không biết đơn đã tạo là đơn nào | Không |

Ở R2, lần đầu bị từ chối mà vẫn ghi vé (lô có câu điều kiện "thua" nhưng vẫn ghi xong): lần gửi lại trả **đúng mã HTTP và mã lỗi máy** của lần đầu, kèm câu cố định "Lần gửi trước đã bị từ chối, tải lại để xem". Không lưu câu chữ, vì câu chữ có thể chứa tên.

### 3.5 Bộ bọc cơ sở dữ liệu theo từng yêu cầu: chi tiết và bẫy

Router dựng `envBoc = { ...env, DB: bocDb(env.DB, phạmVi) }` và đưa vào `ctx.env`. Handler gọi `env.DB` như cũ: kho có ~900 chỗ dạng `env.DB` / `ctx.env.DB`. Theo các mẫu đã đọc, `env` đều lấy từ `ctx`; chưa rà hết từng chỗ. Bẫy phải xử lý:

1. **Gỡ bọc trước khi gọi D1 thật.**
   - `prepare(sql)` trả câu bọc nhớ chữ SQL; `bind()` cũng trả câu bọc.
   - `batch()` thật cần câu **gốc**, nên phải gỡ hết trước khi gọi.
   - Câu không do bộ bọc tạo (không biết chữ SQL) thì coi là **câu ghi** (thận trọng).
2. **Nối câu vé ở CUỐI lô, cắt kết quả của nó trước khi trả.**
   - `chayLo` đọc `kq[i]` theo vị trí (`dieu-phoi-route.ts:92-95`); `doiNguoiDat` đọc `results[booker.before.length]` (`orders/repository.ts:1383`).
   - Chèn vé ở đầu sẽ lệch chỉ số. Câu vé cuối lô hỏng thì D1 vẫn huỷ **cả lô**.
3. **`.run()` lẻ và `INSERT … RETURNING` qua `.first()`.**
   - Kho có 17 chỗ `.run()` và 10 câu `RETURNING`.
   - Câu ghi (nhận theo từ khoá đầu `INSERT|UPDATE|DELETE|REPLACE|WITH…`) đi qua `batch([câu, vé])` rồi trả lại đúng hình kết quả.
   - Câu đọc chạy thẳng.
4. **Chỉ lô ghi ĐẦU TIÊN mang vé.**
   - Handler ghi nhiều lần thì lần ghi phụ có thể ăn vé. Ví dụ `demThanCu` (`orders/repository.ts:1389-1395`) ghi một dòng đếm bằng `.run()` **trước** lô chính và nuốt lỗi.
   - Khi đó, lô chính hỏng sẽ để lại vé mà dữ liệu nghiệp vụ chưa ghi. Lần gửi lại bị báo nhầm "đã ghi".
   - **Không tự khẳng định là ổn.** Giai đoạn 1 cho bộ bọc **đếm số lần ghi mỗi yêu cầu theo mẫu route**, chạy toàn bộ e2e, lập danh sách route > 1 lần ghi.
   - Route trong danh sách đó là **nợ có tên** theo Hiến chương 1.2 ("một lô ghi nguyên khối"). Mỗi route: gộp về một lô, hoặc đăng ký câu ghi phụ là "ngoài vé" (tên cố định, có bài kiểm).
5. **Lỗi đụng vé bị handler nuốt.**
   - Kho có 53 khối `catch (`. `loiRangBuocChuyen` (`van-chuyen/rules.ts:152-161`) đổi một số lỗi `UNIQUE`/`CHECK` thành 409 `trip_rule`. Hôm nay nó không bắt tên bảng mới, nhưng một biểu thức chính quy rộng hơn sau này có thể bắt.
   - Vì vậy router **không tin phản hồi của handler** khi cờ `dungVe` bật. Bộ bọc cũng **từ chối mọi lệnh ghi tiếp theo** trong yêu cầu đó, để không ghi nửa vời.
6. **Hàm tiêm của gốc lắp ráp** (`newOrderHandler`, `gopHoSo.cauDoiDon`…) nhận `envBoc`, để câu của chúng được nhận diện.
   - Các bước của router **trước** handler (`currentStaff` chạm phiên `touchSessionStatement(...).run()`, cổng bảo trì) **giữ `env` gốc**, để không ăn vé.
7. **Ranh giới module (Hiến chương 5.3).**
   - Bảng `lg_lan_gui` thuộc một module **mới** `lan-gui` (module nghiêm, `defineSql`).
   - Module này cấp **câu lệnh chưa chạy** để nối vào lô của module khác, đúng luật "ghi chung giao dịch bằng câu lệnh chưa chạy do module chủ cấp".
   - Router không import module: gốc lắp ráp tiêm `opts.injected.lanGui` (khuôn `maintenanceBlock`, `isAssigned`).

### 3.6 Nơi lưu vé: so sánh

| Tiêu chí | **(a) Bảng D1, vé trong cùng lô** (khuyến nghị) | (b) Durable Object theo người dùng | (c) Kết hợp: Durable Object làm khoá nhanh + dấu trong D1 |
|---|---|---|---|
| Nguyên tử với dữ liệu nghiệp vụ | **Có** (cùng `db.batch`) | **Không** (§1 dòng 10). Ghi D1 xong mà Worker bị ngắt trước khi báo Durable Object "xong" thì Durable Object vẫn ghi "đang chạy". Hết hạn, lần gửi lại chạy lại handler ⇒ **ghi trùng**, đúng cái cần chặn | Có, nhưng chỉ nhờ phần D1, tức là phải làm cả (a) |
| Gửi đồng thời | Khoá chính huỷ lô thua | Đơn luồng, chặn được ngay từ đầu | Như (b) |
| Thành phần mới | 1 bảng + 1 module + bộ bọc | 1 lớp Durable Object + binding + migration lớp (đổi vòng đời: `wrangler.jsonc:39` đã ghi "CHẶN rollback" khi thêm lớp) + bộ bọc vẫn cần | Cộng cả hai |
| Độ trễ thêm | 1 lần đọc D1 (tra trước). Cập nhật kết quả chạy nền | 2 lời gọi tới Durable Object (giữ chỗ, xong). Vị trí đặt Durable Object có thể xa người dùng: **CXM** | 2 lời gọi Durable Object + phần D1 |
| Chi phí (giá §1) | Thêm ~2 dòng ghi/lệnh. Ví dụ 10.000 lệnh/ngày ≈ 0,6 triệu dòng/tháng, trong 50 triệu đã gồm ⇒ **gần 0 đồng** | Thêm ~2 yêu cầu Durable Object/lệnh ≈ 0,6 triệu/tháng, trong 1 triệu đã gồm ⇒ gần 0 (đã gồm cả Bảng tin: **CXM**) | Cộng cả hai |
| Dọn theo hạn | Không có báo thức. Muốn dọn thì dùng Cron đã có (`*/15 * * * *`) | Báo thức tự dọn, ít nhất một lần (§1 dòng 8) | — |
| Luật "không xoá cứng" | Bảng mới bị `R-N1-9` (`src/architecture.test.ts:402-404`) chặn `DELETE`. Muốn dọn cần **ngoại lệ có tên** mới cạnh `XOA_CUNG_NHAP` | Ngoài D1 nên bài kiểm không thấy, nhưng vẫn là xoá dữ liệu, vẫn nên chủ duyệt | — |
| Kết luận | **Chọn** | Loại: không nguyên tử là thua ngay ở trường hợp chính (sóng yếu, Worker bị ngắt) | Loại: phức tạp gấp đôi, không thêm bảo đảm |

### 3.7 Bảng `lg_lan_gui` và dung lượng

Lược đồ phác (để lập ADR, chưa phải migration):

```sql
CREATE TABLE lg_lan_gui (
  staff_id TEXT NOT NULL,   -- phạm vi: tài khoản (không phải phiên)
  khoa     TEXT NOT NULL,   -- vé do máy khách sinh (UUID)
  van_tay  TEXT NOT NULL,   -- HMAC-SHA-256 (khoá bí mật của Worker) của phương thức + đường dẫn + thân
  duong    TEXT NOT NULL,   -- MẪU route, vd "POST /api/orders/:id/payments" — không id, không dữ liệu cá nhân
  ghi_luc  TEXT NOT NULL,   -- ISO UTC, ghi trong lô nghiệp vụ
  ma_tra   INTEGER,         -- mã HTTP lần đầu (cập nhật sau)
  ma_loi   TEXT,            -- mã lỗi máy nếu 4xx (không lưu câu chữ)
  ket_qua  TEXT,            -- header Location nếu có (đường dẫn id, không dữ liệu cá nhân)
  xong_luc TEXT,
  PRIMARY KEY (staff_id, khoa)
) WITHOUT ROWID;
```

- **Dữ liệu này là gì:** dữ liệu **kỹ thuật**, không phải dữ liệu nghiệp vụ.
  - Hiến chương 5.5 nói về "mọi dòng dữ liệu nghiệp vụ".
  - Nhật ký nghiệp vụ vẫn ở `audit_log`.
  - Tiền lệ xoá dữ liệu kỹ thuật: `login_attempt` bị dọn (`src/modules/auth/repository.ts:73-75`), nhưng đó là **bảng cũ** (bảng thuộc diện `legacy`, ngoài phạm vi R-N1-9), không phải tiền lệ cho bảng mới.
- **Dung lượng ước tính** (giả định, **chưa đo**):
  - Mỗi dòng ~250–300 byte (kể cả khoá chính).
  - Công thức: số lệnh ghi mỗi ngày × 365 × ~0,3 KB.
  - 3.000 lệnh/ngày (30 nhân viên văn phòng × ~60 + đối tác, tài xế ~1.200) ⇒ ~1,1 triệu dòng, **~0,3 GB/năm**.
  - 10.000 lệnh/ngày ⇒ **~1,1 GB/năm**.
  - Trần D1 là 10 GB; dữ liệu nghiệp vụ cũng lớn dần. Giữ vĩnh viễn vé tốn **3–11% trần mỗi năm**.
  - Dọn sau 30 ngày ⇒ ổn định ở ~25–90 MB.
  - **Cách đo trước khi chốt:** đếm dòng `audit_log` mỗi ngày bằng lệnh chỉ đọc, do chủ chạy hoặc cho phép.

### 3.8 Liên hệ với tài liệu và mã đã có

- **Đề xuất này THAY khuyến nghị ở §3.3 mục 3** của tệp nghiên cứu Oracle 2026-10-02 ("**Không** dựng bảng nhật ký yêu cầu riêng có hạn xoá… mã được giữ **vĩnh viễn**", tức cột `client_request_id` trên từng bảng). **Lý do:**
  - Khuyến nghị cũ buộc thêm cột, chỉ mục, mã cho **từng** bảng và từng lệnh. Đó chính là cách chủ gọi là "vá".
  - Muốn **một** cơ chế thì vé phải ở **một** bảng chung.
  - Nỗi lo "phình mãi" của khuyến nghị cũ được đưa thành câu hỏi thời hạn (§7 câu 1).
- **Đặc tả 22/9** `2026-09-22-chong-gui-trung.md` (cột `orders.client_request_id`): phần kỹ thuật được lớp chung thay thế. Phần hành vi mong muốn vẫn đúng (gửi lại được trả đơn cũ). Chủ quyết bỏ hay giữ đặc tả.
- **Ba cơ chế đang chạy** (Góp ý `clientRequestId`, Thông báo `clientRequestId`, Vận chuyển `requestId`):
  - **giữ nguyên** (đổi theo kiểu mở rộng rồi thu hẹp; không xoá cột đang có);
  - sau khi lớp chung chạy ổn có thể gộp; trước đó chúng là lớp thứ hai vô hại.
- **Hiến chương:**
  - Lớp này là một **khái niệm lõi mới**: "mỗi lệnh ghi chạy đúng một lần dù gửi lại". Gần K8 (ranh giới giao dịch) và K14 (hiện chỉ nói "hợp đồng tích hợp chạy lại không sinh trùng").
  - Thêm vào Phần I là sửa Hiến chương ⇒ chỉ chủ duyệt (Điều 6.4), đi kèm ADR của lớp này.
- **Điều 5.16 (hộp thư đi):** việc bên ngoài chạy **sau** lô (Web Push, email Góp ý, Bảng tin) chỉ chạy ở lần gửi thắng. Lần thua bị huỷ ở lô hoặc dừng ở bước tra trước, nên **không gửi lần hai**.
  - Việc bên ngoài chạy **trước** lô (OpenAI ở trợ lý; đọc Google Sheet khi "Đồng bộ ngay") có thể chạy hai lần khi hai lần gửi **đồng thời**. Dữ liệu vẫn chỉ ghi một lần.
  - Cái giá là tiền gọi OpenAI thêm một lần, hiếm. Chấp nhận, hoặc cho các route đó chế độ "giữ chỗ trước" (bản ghi "đang chạy" có hạn kiểu Powertools §2.3) nếu chủ muốn.

---

## 4. Lớp nghiệp vụ: trùng "ngoài đời" vẫn phải làm, và cũng làm chung

Lớp kỹ thuật **không thay được** lớp này. Hai nhân viên nhập cùng một khách, hay một người sửa số rồi gửi lại sau khi mất mạng, sinh **hai vé khác nhau**. Đây cũng là kết luận của Oracle (tệp Oracle §2.6 mục 3) và mẫu chung ở §2.5.

Để không "vá từng màn", đề xuất làm **một bộ luật so trùng khai báo theo loại dữ liệu** (hướng thiết kế, các quyết định cụ thể đã nằm ở lượt B/C của tệp Oracle §3.5, **không hỏi lại ở đây**):

- **Một bảng khai báo** (tệp thuần `src/shared/`), mỗi loại một dòng: loại dữ liệu → **khoá chặn cứng** + **khoá cảnh báo** + **ai được bỏ qua** + **có bắt lý do không**.
  - Khoá chặn cứng là số do bên ngoài cấp, giữ bằng `UNIQUE` trong cơ sở dữ liệu. Ví dụ: mã giao dịch ngân hàng + đơn.
  - Khoá cảnh báo là "trông giống". Ví dụ: SĐT chuẩn hoá + ngày dịch vụ gần nhau; đơn + số tiền + ngày + phương thức.
- **Một hàm máy chủ** `kiemTrung(loai, duLieu)`. Route tạo của loại đã khai gọi nó **trước** lô ghi. Có cảnh báo mà thân yêu cầu chưa ghi "đã xem cảnh báo X" thì trả **409 `co_the_trung`**, kèm danh sách. Câu chữ dựng ở máy chủ, chỉ những trường được phép xem.
- **Một hộp thoại chung** ở giao diện: "Có thể trùng với …: Xem bản cũ / Vẫn ghi". "Vẫn ghi" gửi lại kèm mã cảnh báo đã xem. Đây là **ý định mới** nên dùng **vé mới**. Bỏ qua thì ghi nhật ký.
- **Một bài kiểm kiến trúc:** mọi route tạo của loại có trong bảng khai báo phải gọi `kiemTrung`; mọi khoá chặn cứng phải có `UNIQUE` tương ứng (hai lớp, Hiến chương 5.1).

---

## 5. Thi công không vá từng màn

### 5.1 Phạm vi đếm được (đọc 2026-10-02)

- `grep -h -o -E 'route\("(POST|PUT|PATCH|DELETE)"' src/modules/*/index.ts | wc -l` ⇒ **133** route ghi: 107 POST, 20 PUT, 4 PATCH, 2 DELETE.
- Theo module: van-chuyen 43, parties 18, accounts 16, orders 11, tro-ly 9, billing 9, catalog 7, thongbao 6, auth 5, feedback 3, dispatch 3, locations 2, maintenance 1.
- Không có route nào khai ngoài `src/modules/*/index.ts`.
- **5** route ghi công khai (tự miễn): `/api/auth/login`, `/api/auth/passkey/options`, `/api/auth/passkey/login`, `/api/auth/logout`, `/api/auth/session-ended`.
  - **128** route còn lại tự động đi qua lớp này. Phần chống trùng **không cần sửa handler nào**.
  - **Có hai chỗ vẫn phải chạm từng route, nói rõ để không gọi là "không sửa gì":**
    - (1) Các route lộ ra ở bước đo §3.5 mục 4 (ghi nhiều lần trong một lệnh).
    - (2) Nếu chọn R2: ~28 route trả 201 cần cho địa chỉ kết quả (§3.4), hoặc thay bằng một bảng tra chung.
    - Cả hai là sửa máy móc theo một luật chung có bài kiểm, không phải mỗi màn tự nghĩ cách chống trùng.

### 5.2 Các mảnh

1. Migration bảng `lg_lan_gui`; dòng ở `docs/data-dictionary.json` + `npm run dict`.
   - **Việc của chủ khi triển khai:** đặt khoá HMAC bằng `wrangler secret put` (AI không được chạy lệnh này, CLAUDE.md §8).
   - Thiếu khoá thì `checkConfig` báo cấu hình sai, giống các bí mật khác.
2. Module `lan-gui` (nghiêm):
   - câu tra trước;
   - câu chèn vé (chưa chạy);
   - câu cập nhật kết quả;
   - `bocDb`.
3. Router: bước 1–8 của §3.3; `opts.injected.lanGui` bắt buộc (thiếu thì router từ chối khởi động lệnh ghi, không lặng lẽ tắt).
4. `web/api.ts`: quy tắc vé §3.2; chỗ xử lý chung `da_ghi_truoc_do` / `dang_xu_ly`.
5. `tests/e2e/lib.mjs` (chỗ `fetch` dòng 42) tự gắn vé. Còn **8** tệp e2e gọi `fetch` thẳng: rà ở giai đoạn 2.
6. **Tệp miễn** (ví dụ `docs/lan-gui-mien.json`): mỗi dòng một route + lý do, chủ duyệt.
   - Mặc định **chỉ** 5 route công khai (tự miễn qua `access`).
   - Đề xuất thêm phải có lý do, ví dụ thao tác tự nhiên lặp an toàn và rất dày như đánh dấu "đã xem".

### 5.3 Hàng rào

Mỗi hàng rào chỉ tính khi **đã thấy chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và có dòng ở `docs/SO-HANG-RAO.md` (P16).

| # | Hàng rào | Chặn cái gì | Cơ chế |
|---|---|---|---|
| H1 | Bài hành vi qua **router thật** trên D1 giả = SQLite thật (khung thử `tests/audit/harness.mjs`, `taoAppChoKhungThu`) | Cùng vé gửi 2 lần ⇒ **1** dòng nghiệp vụ + lần 2 nhận "đã ghi". Cùng vé khác thân ⇒ 422. Hai lần đồng thời ⇒ 1 dòng. Lỗi kiểm dữ liệu ⇒ không vé, gửi lại chạy. Handler nuốt lỗi đụng vé ⇒ router vẫn trả "đã ghi" | `node --test` |
| H2 | Bài **phủ route** | Mọi route ghi có đăng nhập trong bảng route thật phải đi qua lớp, trừ dòng trong tệp miễn. Mục miễn cho route không tồn tại ⇒ đỏ (khuôn `route-write-guard.test.ts` + `quyen-hoan.json`) | Tĩnh + chạy |
| H3 | Bài **giao diện** | Không có `fetch(` với phương thức ghi trong `web/` ngoài danh sách đã biết (2 chỗ công khai) | Tĩnh (khuôn `giao-dien-hoi-bang-quyen.test.ts`) |
| H4 | Bài **hai lần ghi thật liên tiếp** | Cùng hộp thoại, hai lần thu hợp lệ giống hệt nhau, lần 1 thành công ⇒ **2** dòng (vé đổi sau thành công). Chặn rủi ro "nuốt lần ghi thật thứ hai" của tệp Oracle §3.4 mục 1 | Kịch bản Chrome hoặc e2e |
| H5 | Đếm số lần ghi mỗi yêu cầu | Route > 1 lần ghi phải nằm trong danh sách nợ có tên | Bộ bọc đếm, e2e đọc log |
| H6 | `R-N1-9` hiện có | `DELETE` trên `lg_lan_gui` ⇒ đỏ, trừ khi chủ duyệt ngoại lệ có tên | `src/architecture.test.ts` |

### 5.4 Thứ tự phát hành (theo kiểu mở rộng rồi thu hẹp)

1. **Bản mở rộng:**
   - bảng + module + router ở chế độ "có vé thì áp, thiếu vé thì cho qua và đếm";
   - giao diện gửi vé;
   - đo H5.
2. **Theo dõi:** cột "Đăng nhập gần nhất" cho thấy mọi người đã lên bản mới, và số đếm `thieu_ma_lan_gui` bằng 0 trong N ngày.
3. **Bản siết:** thiếu vé ⇒ 400.

Thứ tự này chỉ áp nếu chủ chọn "từ từ" ở §7 câu 3.

### 5.5 Tiêu chí nghiệm thu (viết trước khi làm)

- (T1) Tắt mạng sau khi bấm "Ghi lần thu", bật lại, bấm lại ⇒ đơn có **một** lần thu, màn báo "Lần bấm trước đã được ghi".
- (T2) Bấm đúp "Lập đơn" ⇒ **một** đơn.
- (T3) Lập đơn, mất phản hồi, iOS giết app, mở lại, gửi lại cùng nội dung ⇒ **một** đơn.
- (T4) Hai lần thu thật giống hệt nhau, nối tiếp, cả hai thành công ⇒ **hai** dòng.
- (T5) Sửa số tiền sau khi mất mạng rồi gửi ⇒ lớp kỹ thuật **không** chặn. Lớp nghiệp vụ hiện cảnh báo, nếu loại dữ liệu đó đã khai.
- (T6) Route ghi mới thêm vào mà không đi qua lớp ⇒ `npm test` đỏ.

---

## 6. Rủi ro và cách chặn

| Rủi ro | Cách chặn |
|---|---|
| **Form còn mở sau khi lưu, lần ghi thật thứ hai bị nuốt** (nguy hiểm nhất) | Vé đóng ngay khi có 2xx (§3.2 mục 2); H4 |
| **bfcache / nút Back** đưa về form đã lưu | Vé đã đóng nên gửi lại là ý định mới. Giữ luật `location.replace` sau khi lưu (`web/CLAUDE.md`). Lớp nghiệp vụ bắt trùng nội dung |
| **Hai tab** cùng nội dung | `localStorage` dùng chung vé, nên máy chủ khử trùng. Khác nội dung là hai ý định |
| **Bị đá phiên** (ADR-0074/0075) giữa lúc gửi | Phạm vi vé theo tài khoản, vé không bị xoá khi về đăng nhập (§3.2 mục 7) |
| **iOS giết PWA** | `localStorage` (§3.2 mục 6) |
| **App cũ trong bộ nhớ đệm** không gửi vé | Giai đoạn cho qua và đếm. Siết sau khi đo (§5.4) |
| **Worker bị ngắt giữa chừng** (máy khách mất sóng; việc dở có bị huỷ không: **CXM**) | Vé và dữ liệu cùng lô nên **không** có trạng thái nửa vời. Chỉ có thể mất `ket_qua`, khi đó lần sau là "đã ghi, tải lại" |
| **Handler gọi dịch vụ ngoài trước lô** (OpenAI, Google Sheet) | Tra trước chặn gửi lại tuần tự. Gửi đồng thời có thể gọi ngoài hai lần nhưng chỉ ghi một lần. Muốn chặn hẳn: chế độ "giữ chỗ trước" cho riêng route đó (§3.8) |
| **Handler ghi nhiều lần** (vé có thể bị lần ghi phụ ăn) | Đo H5; nợ có tên theo Hiến chương 1.2 (§3.5 mục 4) |
| **Handler nuốt lỗi đụng vé** | Cờ `dungVe` + từ chối ghi tiếp + router không tin phản hồi handler (§3.5 mục 5); H1 |
| **Chép dữ liệu cá nhân** vào bảng kỹ thuật hoặc máy người dùng | Phương án R2 không lưu nội dung. Dòng vé có vân tay **HMAC có khoá bí mật**, không phải mã băm trơn. Ở máy người dùng: route có PIN hay số giấy tờ không ghi `localStorage` (§3.2 mục 6) |
| **Lô thua nhưng không lỗi** (câu điều kiện ghi 0 dòng, lô vẫn xong nên vé vẫn ghi) | Lưu `ma_tra` + `ma_loi`. Gửi lại nhận đúng "bị từ chối", không nhận nhầm "đã ghi" (§3.4) |
| **Bảng phình** | §7 câu 1 (giữ vĩnh viễn hay dọn) |

---

## 7. Câu cần chủ quyết (gom một lần)

1. **Giữ vé bao lâu?**
   - **(A, khuyến nghị)** Dọn sau **30 ngày** bằng Cron sẵn có. Cần chủ duyệt một **ngoại lệ có tên** cho luật "không xoá cứng", vì đây là dữ liệu kỹ thuật, không phải nghiệp vụ. Bảng ổn định ở vài chục MB.
   - (B) Giữ vĩnh viễn: không cần ngoại lệ, nhưng tốn ~0,3–1,1 GB/năm trên trần 10 GB (ước tính, chưa đo).
2. **Gửi lại thì trả gì?**
   - **(R2, khuyến nghị)** Báo "đã ghi" rồi mở trang kết quả. Không chép dữ liệu khách vào bảng kỹ thuật (có route trả số căn cước).
   - (R1) Trả lại nguyên phản hồi cũ trong 24 giờ: mượt hơn, nhưng chép SĐT, số giấy tờ vào bảng kỹ thuật và bắt buộc dọn.
3. **Bắt buộc ngay hay từ từ?**
   - **(Từ từ, khuyến nghị)** Bản đầu nhận cả lệnh thiếu vé (đếm lại). Khi mọi người đã lên bản mới thì mới chặn.
   - (Ngay) Máy còn app cũ sẽ bị từ chối cho đến khi tải lại.

Kèm theo, không phải câu hỏi riêng: lớp này cần **một ADR** + **thêm một khái niệm lõi vào Hiến chương** (chỉ chủ sửa được Phần I).

**Đối chiếu với câu đang chờ ở phiếu `2026-10-02-phieu-tra-loi-de-xuat-cho-chu.md`** (mục C; đọc 2026-10-02, CT1–CT4 còn ở phần "Còn chờ chủ trả lời"). Mục đích: chủ không phải trả lời hai bộ câu chồng nhau.

| Câu cũ | Quan hệ với tài liệu này |
|---|---|
| **A1** (tệp Oracle §3.5: gắn mã bắt buộc cho từng lệnh tiền) | **Được thay** bằng lớp chung: mọi lệnh ghi đều có vé, không riêng lệnh tiền |
| **CT1** (cùng mã khác nội dung ở lệnh tiền: báo lỗi 409) | **Gộp vào lớp chung**, cùng hành vi "báo lỗi, không ghi". Mã kỹ thuật đổi 409 → **422** theo IETF §2.7; chủ không cần quyết con số này |
| **CT2** (thứ tự phát hành: tuỳ chọn trước rồi bắt buộc) | **Chính là câu 3 ở trên**. Trả lời một lần là đủ cả hai |
| **CT3, CT4** (cảnh báo tiền mặt giống nhau; ai được bỏ qua) | **Giữ nguyên**. Thuộc lớp nghiệp vụ §4, không bị tài liệu này thay |
| **CT5–CT8**, **QH4** ("chống đặt trùng làm về sau") | Giữ theo lời chủ: **để sau**. §4 chỉ nêu hướng làm chung, không hỏi lại |

Đặc tả 22/9 và §3.3 mục 3 của tệp Oracle được thay về mặt kỹ thuật (§3.8). Nếu chủ duyệt hướng này, AI sẽ ghi chú "đã thay bởi …" ở hai tệp đó trong cùng lượt.

---

## 8. Điều chưa xác minh (CXM)

1. Worker có huỷ phần việc đang làm khi máy khách ngắt kết nối không. Trang "Errors" chỉ định nghĩa "Cancelled", không nói. Thiết kế chịu được cả hai trường hợp (§6).
2. `Idempotency-Key` ở API Cloudflare: chỉ thấy ở API **tạo tài khoản**. Các API khác: chưa kiểm.
3. Bản IETF là **draft-07 đã hết hạn**, không phải tiêu chuẩn. Nội dung §2.1–§2.7 đọc qua công cụ tóm tắt, chưa đối chiếu từng chữ.
4. Mọi trích dẫn Cloudflare, Stripe, AWS ở đây đều đọc qua công cụ tải trang có tóm tắt. Câu "Queues không có khử trùng dựng sẵn" là kết luận của công cụ từ trang, không phải câu nguyên văn.
5. Durable Object và D1 không có giao dịch chung: suy ra vì không thấy tài liệu nào nói có; chưa thấy câu nói "không".
6. Vị trí đặt Durable Object so với người dùng Việt Nam (độ trễ của phương án b).
7. Dung lượng, chi phí ở §3.6–§3.7 dựa trên **giả định** số lệnh/ngày. Chưa đo trên dữ liệu thật (không được đọc production).
8. Trong kho:
   - số route ghi nhiều lần (§3.5 mục 4): chưa đo;
   - hình phản hồi hiện nay khi gửi lặp ở Đã giao / Hoàn thành (tệp Oracle §4 mục 9): chưa chạy;
   - không chạy `npm test`, không chạy e2e (đề bài chỉ cho đọc);
   - con số "28 route trả 201" là số **chỗ** `, 201)` trong mã, chưa đối chiếu từng route; danh sách route tạo mà trả 200 chưa lập.
9. Phạm vi `opc-retry-token` của OCI (theo người hay theo tenancy), và OCI trả gì khi cùng vé khác nội dung: vẫn CXM như tệp Oracle §4.

---

## 9. Nguồn (tất cả đọc ngày 2026-10-02)

**Cloudflare**
- Context (ctx), `waitUntil`: https://developers.cloudflare.com/workers/runtime-apis/context/
- Errors and exceptions (Cancelled): https://developers.cloudflare.com/workers/observability/errors/
- D1 Database API (`batch`, Sessions): https://developers.cloudflare.com/d1/worker-api/d1-database/
- D1 Retry queries: https://developers.cloudflare.com/d1/best-practices/retry-queries/
- D1 Limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 Pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Rules of Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Durable Objects Alarms: https://developers.cloudflare.com/durable-objects/api/alarms/
- Durable Objects Pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- How KV works: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Rules of Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/
- Agents, durable execution with fibers: https://developers.cloudflare.com/agents/runtime/execution/durable-execution/
- Create account (`Idempotency-Key`): https://developers.cloudflare.com/fundamentals/account/create-account/

**Chuẩn ngành**
- IETF datatracker: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- IETF draft-07 (txt): https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt
- Stripe Idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe Advanced error handling: https://docs.stripe.com/error-low-level
- AWS Powertools TypeScript, Idempotency: https://docs.aws.amazon.com/powertools/typescript/latest/features/idempotency/

**Oracle**
- Xem §5 của `docs/superpowers/specs/2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`. Chính: OCI REST APIs https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm; OCI API Errors https://docs.oracle.com/en-us/iaas/Content/API/References/apierrors.htm.

**Trong kho** (chỉ đọc, HEAD 4598221f)
- `src/shared/router.ts`
- `web/api.ts`
- `wrangler.jsonc`
- `docs/ARCHITECTURE.md` Phần I
- `src/modules/feedback/index.ts:80-104`
- `src/modules/thongbao/index.ts:172-199`
- `src/modules/van-chuyen/dieu-phoi-route.ts:85-103`
- `src/modules/van-chuyen/rules.ts:152-161`
- `src/modules/parties/index.ts:800-815`
- `src/modules/orders/repository.ts:1383-1395`
- `src/modules/auth/repository.ts:73-75`
- `src/architecture.test.ts:153,392-404`
- `web/dieu-phoi-ui.ts:26-32`
- `tests/audit/harness.mjs`
