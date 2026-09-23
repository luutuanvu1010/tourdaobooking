# Trang Trợ giúp + Nhật ký thay đổi (Changelog): đặc tả

**Trạng thái:** CHỜ CHỦ DUYỆT bản viết. Thiết kế tóm tắt đã được chủ đồng ý trong trò chuyện ngày 2026-09-23.

**Việc lớn?** Có, vì chạm **triển khai** (thêm bước vào quy trình phát hành) và **luật** (đề xuất thêm một dòng vào `CLAUDE.md`). Không chạm dữ liệu, quyền hay tiền. Thi công xong phải có người kiểm độc lập, chỉ đọc (CLAUDE.md §3).

## 1. Quyết định của chủ dự án (2026-09-23, trả lời bằng lựa chọn)

| Câu hỏi | Chủ chọn |
|---|---|
| Nhật ký viết cho ai | **Mọi nhân viên.** Lời thường, mỗi lần phát hành vài gạch "có gì mới / đã sửa gì", không thuật ngữ. |
| "Tự động cập nhật" nghĩa là gì | **AI soạn, đi cùng bản phát hành.** Mục nhật ký nằm trong mã, deploy xong thì tự hiện. Số phiên bản lấy từ mục mới nhất. |
| Menu Trợ giúp | **Trang Trợ giúp mới**, mở từ trang "Tôi" và thanh menu máy tính. Lúc đầu gồm phiên bản hiện tại, Nhật ký thay đổi, lối tắt Góp ý/Báo lỗi. |
| Báo bản mới | **Chấm đỏ nhỏ, mở trang Trợ giúp thì tắt.** Không bật hộp thoại chen ngang. |
| Triển khai | **Giữ làm tay** (không nối Cloudflare với GitHub). |

## 2. Hiện trạng (khảo sát chỉ đọc, 2026-09-23, `main` d808c36)

- App **chưa có** trang/menu Trợ giúp, cũng chưa có nhật ký thay đổi nào (`playbook/CHANGELOG.md` là lịch sử bộ luật, không phải của app).
- Số phiên bản là hằng ghi tay ở `src/shared/app-info.ts` (`APP_VERSION = "1.0"`, `APP_RELEASE_DATE = "2026-09-21"`), chỉ hiện ở màn đăng nhập (`web/login.ts` → `#release`). Sau 1.0 đã có ít nhất 9 lần deploy nhưng số vẫn là 1.0: đây là hệ quả của việc bump bằng tay (công thức j, `docs/CHANGE-GUIDE.md`) không nằm trong runbook.
- Kịch bản Chrome `v1-dang-nhap.mjs` ghi CỨNG dòng phiên bản trong `EXPECT`. Mỗi lần đổi số là phải sửa kịch bản.
- Tiêu đề commit viết cho người làm kỹ thuật ("8b", "Task 0", "kiểm độc lập"), không dùng làm ghi chú phát hành được. Vì vậy nhật ký phải được **soạn**, không sinh từ git.
- Điều hướng: `web/shell.ts` dựng thanh menu máy tính (`initShell()`), thanh tab điện thoại (`tabsFor()`), và `web/account.ts` dựng danh sách liên kết ở trang "Tôi". Service worker: nội dung gói trong JS cập nhật sau deploy + một lần mở lại (stale-while-revalidate).
- `GET /api/auth/config` là route công khai, hiện trả `{ turnstileSiteKey, maintenance, passkey }` (`AuthConfigResponse`, `src/shared/contracts.ts`).

## 3. Thiết kế

### 3.1 Nguồn dữ liệu: `src/shared/changelog.ts` (mới, thuần)

- Một mảng hằng `CHANGELOG: readonly ReleaseNote[]`, **mới nhất ở đầu**.
  ```ts
  type ChangeKind = "moi" | "sua" | "doi";          // hiển thị: "Mới" | "Đã sửa" | "Thay đổi"
  interface ReleaseNote { version: string; date: string /* YYYY-MM-DD, giờ VN */; items: readonly { kind: ChangeKind; text: string }[] }
  ```
- `src/shared/app-info.ts`: `APP_VERSION` và `APP_RELEASE_DATE` **dẫn xuất** từ `CHANGELOG[0]`, không còn là chuỗi viết tay. Mọi chỗ đang dùng hai hằng này giữ nguyên chữ ký.
- Thuộc `src/shared/`: server và `web/` cùng import được; không import `src/modules/` (luật kiến trúc giữ nguyên).
- Không có bảng D1, không có migration, không có màn soạn thảo.

**Quy ước số phiên bản:** dạng `1.N`. **Mỗi lần deploy mã mới lên production = một mục mới, N tăng 1** (1.9 → 1.10, so sánh theo số, không theo chữ). Không tăng khi chỉ triển khai lại đúng bản đang chạy hoặc lùi về bản cũ. Lần có thay đổi lớn mà chủ muốn đánh dấu thì lên `2.0` theo quyết định của chủ.

**Cách viết một mục** (ghi vào công thức mới ở CHANGE-GUIDE, xem §5):
- Viết cho nhân viên bán hàng/kế toán/hướng dẫn viên: nói điều họ **thấy hoặc làm được khác đi**, mỗi gạch một câu, tối đa khoảng 160 ký tự.
- Không tên tệp, không mã, không "route/API/migration/commit/Task…", không tiếng Anh lộ ra (trừ tên riêng đã dùng trong app như "Face ID").
- Lần deploy không có gì người dùng thấy (chỉ sửa bên trong): một gạch loại "doi", ví dụ "Cải thiện độ ổn định và an toàn bên trong, không đổi cách dùng."

### 3.2 Trang Trợ giúp `/help` (mới)

- Tệp: `public/help.html`, `web/help.ts`; thêm vào `PAGES` (`src/shared/sw-policy.ts`) và script `build:web`. Dùng khung `initShell()` như mọi trang; không thêm API.
- Ai xem được: **mọi tài khoản đã đăng nhập** (mọi quyền, kể cả Hướng dẫn viên). Chưa đăng nhập thì đi theo luồng chuyển về đăng nhập sẵn có của `initShell()`.
- Nội dung, theo thứ tự:
  1. Tiêu đề "Trợ giúp"; dòng "Tour Đảo Booking · Phiên bản X · ngày …" (`formatReleaseLine()`).
  2. Mục "Nhật ký thay đổi": mỗi bản một khối, gồm tiêu đề "Phiên bản X — ngày …" và danh sách gạch, mỗi gạch có nhãn nhỏ Mới / Đã sửa / Thay đổi. Bản mới nhất ở trên; bản người dùng chưa xem có nhãn "Mới cập nhật".
  3. Nút "Góp ý / Báo lỗi" dẫn tới trang Góp ý sẵn có.
  - Chừa chỗ (chưa làm) cho "Hướng dẫn sử dụng" sau này.
- Dựng bằng `h()`, không `innerHTML`; giá trị CSS qua token; tuân `web/CLAUDE.md`.

### 3.3 Đường vào + chấm đỏ

- **Máy tính:** thêm mục "Trợ giúp" `/help` vào thanh menu trên (`initShell()`), cho mọi người, đặt cuối, cạnh "Góp ý".
- **Điện thoại:** thêm dòng "Trợ giúp" vào danh sách liên kết ở trang "Tôi" (`web/account.ts`), cho mọi người. **Không** thêm tab mới vào thanh tab dưới đáy (giữ gọn).
- **Chấm đỏ** hiện ở: mục "Trợ giúp" (menu máy tính), tab "Tôi" (thanh tab điện thoại), dòng "Trợ giúp" ở trang "Tôi". Dùng lại kiểu chấm đỏ đã có của Góp ý nếu hợp.
- **Nhớ "đã xem":** `localStorage` khoá `td_help_seen` = số phiên bản mới nhất đã xem, **theo từng máy**, không lên máy chủ.
  - Hàm thuần `hasUnseenRelease(seen: string | null, current: string): boolean` (trong `src/shared/changelog.ts`, có test): `null` (chưa từng xem) ⇒ `true`; nhỏ hơn bản hiện tại ⇒ `true`; còn lại ⇒ `false`.
  - Mở `/help` thì ghi `td_help_seen = APP_VERSION`, chấm tắt.
  - `localStorage` lỗi/bị chặn ⇒ coi như đã xem (không hiện chấm), không ném lỗi, trang vẫn chạy.
- Đánh đổi đã chấp nhận: người dùng nhiều máy thấy chấm trên từng máy; xoá dữ liệu trình duyệt thì chấm hiện lại một lần.

### 3.4 Phiên bản đang chạy lộ qua cấu hình công khai

- `GET /api/auth/config` thêm trường `version: string` (= `APP_VERSION`). Công khai, không bí mật (đã hiện ở màn đăng nhập).
- Mục đích: để máy kiểm được "bản sắp deploy đã có mục nhật ký mới chưa" (§4) và "production đang chạy bản nào" chỉ bằng một GET.
- Sửa kèm: `AuthConfigResponse`, e2e `tests/e2e/turnstile.mjs` (đang `deepEqual` cả đối tượng).

## 4. Gắn vào quy trình phát hành (đơn giản nhất)

Chỉ **một bước mới** trong runbook, do AI làm lúc chuẩn bị phát hành (trước "A. Trước khi deploy"):

> **A.0 Nhật ký thay đổi.** AI thêm một mục vào đầu `CHANGELOG` (số tăng 1, ngày = ngày deploy dự kiến, lời thường theo §3.1), commit cùng nhánh sẽ deploy. Chủ đọc lướt mục này khi duyệt phát hành. Sau đó chạy `node scripts/kiem-phien-ban.mjs`, phải báo ĐẠT.

**Máy tự chặn:**

| Kiểm | Ở đâu | Bắt được |
|---|---|---|
| Mục đầu tiên đúng dạng: số tăng dần nghiêm ngặt (so theo số), ngày hợp lệ và không giảm, mỗi mục ≥ 1 gạch, gạch không rỗng, ≤ 160 ký tự, loại hợp lệ | `src/shared/changelog.test.ts` (`npm test`) | viết sai dạng, đảo thứ tự, trùng số |
| Không lọt chữ kỹ thuật: danh sách từ cấm (không phân biệt hoa thường, theo ranh giới từ) gồm `task`, `commit`, `api`, `route`, `migration`, `worker`, `deploy`, `e2e`, `d1`, `null`, `undefined`, dấu `` ` ``, và mẫu định danh kiểu `snake_case` | cùng tệp test | lời kỹ thuật lộ ra nhân viên |
| `APP_VERSION === CHANGELOG[0].version` | `src/shared/app-info.test.ts` | (dẫn xuất nên luôn đúng; khoá lại để không ai tách ra viết tay) |
| **Quên viết mục mới:** `scripts/kiem-phien-ban.mjs` GET `https://booking.tourdao.vn/api/auth/config` (chỉ đọc), so `version` của production với `CHANGELOG[0].version` ở máy. Mã thoát 0 (ĐẠT) khi bản ở máy **lớn hơn**; 1 khi **bằng hoặc nhỏ hơn** (quên tăng số); 2 khi không đọc được (không phải ĐẠT). Cờ `--sau-deploy` đảo lại: ĐẠT khi **bằng** (xác nhận production đã lên đúng bản). | runbook bước A.0 và B (sau deploy) | quên nhật ký; deploy nhầm bản |

- Lần đầu chạy (production chưa có trường `version`): script coi là "production = 1.0" và báo rõ điều đó.
- **Dựa vào kỷ luật (chưa cưỡng chế):** việc có chạy `kiem-phien-ban.mjs` trước `wrangler deploy` hay không. Hook chặn `wrangler deploy` khi chưa chạy kiểm là việc khác, không làm ở đây (chủ có thể yêu cầu sau).
- Mọi cơ chế kiểm mới phải được **quan sát chặn thật một lần** trong lúc thi công (sửa cố ý → đỏ → hoàn nguyên), P16.

## 5. Tài liệu và luật phải sửa

- `docs/CHANGE-GUIDE.md`: viết lại công thức **j** (số phiên bản giờ lấy từ nhật ký) và thêm công thức mới "Ghi nhật ký thay đổi khi phát hành" (quy ước số, cách viết, cách kiểm). Bảng §1 và ma trận §3 thêm dòng tương ứng.
- `docs/HANDOFF-N1.md`: thêm bước A.0 vào khuôn runbook; mục "TRẠNG THÁI TRIỂN KHAI" từ nay ghi thêm "Phiên bản X".
- `docs/SYSTEM-DESIGN.md`: trang `/help`, trường `version` của cấu hình công khai.
- `web/CLAUDE.md`: đăng ký kịch bản Chrome mới của trang Trợ giúp.
- `v1-dang-nhap.mjs`: dòng phiên bản trong `EXPECT` đọc từ `formatReleaseLine()` thay vì ghi cứng, để không phải sửa mỗi lần phát hành.
- **`CLAUDE.md` §8 (luật, chỉ ĐỀ XUẤT, N9):** thêm vào chuỗi deploy "… → **nhật ký thay đổi + `kiem-phien-ban.mjs` ĐẠT** → test + typecheck + e2e xanh → …" và `--sau-deploy` sau `wrangler deploy`. Commit riêng trên nhánh, ghi "(chờ chủ duyệt)"; chủ duyệt mới có hiệu lực.

## 6. Ghi bù lịch sử

Soạn các mục từ sổ `docs/HANDOFF-N1.md` (các mục "TRẠNG THÁI TRIỂN KHAI") và danh sách deploy thật (`wrangler deployments list`, chỉ đọc). Mỗi **đợt tính năng đã lên production** thành một bản (các lần deploy sửa nhỏ trong cùng đợt gộp vào bản đó), bản Face ID là mới nhất:

| Bản | Ngày | Nội dung chính (soạn chi tiết lúc thi công) |
|---|---|---|
| 1.0 | 2026-09-21 | Bản đầu: lập đơn, xác nhận đơn (ảnh), người phụ trách, đăng nhập an toàn, Góp ý/Báo lỗi, chế độ bảo trì |
| 1.1 | 2026-09-22 | Giao diện mới cho các trang; ghi người đặt trên đơn; quyền Hướng dẫn viên sửa/huỷ đơn, màn "Việc của tôi" |
| 1.2 | 2026-09-23 | Trang chủ mới (số liệu, chuyến đón hôm nay, doanh thu) |
| 1.3 | 2026-09-23 | Đăng nhập bằng Face ID |

Lời từng gạch do AI soạn, chủ duyệt khi duyệt kế hoạch (danh sách đầy đủ đưa vào kế hoạch thi công). Bản 1.4 là bản mang chính trang Trợ giúp này lên production, soạn theo bước A.0 như mọi lần sau.

## 7. Tiêu chí nghiệm thu (hành vi kiểm được)

1. `/help` mở được với tài khoản mỗi quyền (SALES, ACCOUNTING, ADMIN, FIELD), hiện đúng dòng phiên bản và các bản 1.0 → mới nhất theo thứ tự giảm dần; nút Góp ý dẫn đúng trang.
2. Máy tính: mục "Trợ giúp" có ở thanh menu cho mọi quyền. Điện thoại: dòng "Trợ giúp" có ở trang "Tôi" cho mọi quyền; thanh tab không thêm tab.
3. Máy chưa từng xem: chấm đỏ hiện ở ba chỗ (§3.3). Mở `/help` rồi quay lại: chấm tắt. Tăng số phiên bản: chấm hiện lại. `localStorage` bị chặn: không chấm, không lỗi trong console.
4. Màn đăng nhập hiện "Phiên bản 1.3 · ngày 23 tháng 9 năm 2026" (hoặc bản mới nhất lúc đó), lấy từ `CHANGELOG`.
5. `GET /api/auth/config` có `version` bằng `CHANGELOG[0].version`; e2e xanh.
6. `changelog.test.ts` đỏ khi: số không tăng, ngày sai, gạch rỗng, gạch có "API"/`` ` ``/`snake_case`. Đã quan sát đỏ thật mỗi loại ít nhất một lần.
7. `kiem-phien-ban.mjs`: thoát 1 khi số ở máy bằng số production (quan sát thật bằng cách tạm để bằng), 0 khi lớn hơn, 2 khi không có mạng; `--sau-deploy` ngược lại.
8. `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e -- pwa turnstile` xanh; kịch bản Chrome trang Trợ giúp + `v1-dang-nhap.mjs` xanh.
9. Mọi chữ người dùng thấy là tiếng Việt có dấu; không `innerHTML`.

## 8. Ngoài phạm vi

- Hướng dẫn sử dụng trong trang Trợ giúp (chừa chỗ).
- Lưu "đã xem" trên máy chủ (đồng bộ giữa các máy).
- Hộp thoại "Có gì mới" sau đăng nhập; thông báo đẩy.
- Tự động deploy từ GitHub; hook chặn `wrangler deploy` khi chưa chạy `kiem-phien-ban.mjs`.
- Ghi bù trạng thái deploy Face ID vào `docs/HANDOFF-N1.md` (việc riêng, nhỏ, làm ngoài đặc tả này).

## 9. Giả định và điều chưa chắc

- **Ranh giới bản 1.1/1.2 trong lịch sử** dựa trên sổ HANDOFF và thời điểm deploy; có thể xếp lệch một tính năng sang ngày bên cạnh. Chấp nhận được vì là lịch sử cho người dùng đọc, chủ sửa khi duyệt kế hoạch.
- Việc Hướng dẫn viên sửa/huỷ đơn (ADR-0014 Phase A+B) đã lên production theo bộ nhớ phiên trước và việc production không còn migration chờ (0020–0022 đã áp); sổ HANDOFF còn ghi "CHỜ TRIỂN KHAI" cho Phase A. Lúc thi công kiểm lại bằng GET/lệnh chỉ đọc trước khi ghi vào 1.1.
- Danh sách từ cấm có thể chặn nhầm một câu hợp lý; khi đó sửa câu, không nới danh sách trừ khi chủ đồng ý.
