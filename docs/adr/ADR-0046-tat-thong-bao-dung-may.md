# ADR-0046 — Thông báo điện thoại: đăng xuất chỉ tắt đúng máy đó, đổi vai/quyền không tắt (sửa ADR-0036 điều 6)

- **Trạng thái:** **accepted**. Chủ dự án chọn trong chat 2026-09-28 (21:5x giờ VN, sau khi bản 1.35 lên production), trực tiếp với phiên điều phối, phương án *"Chỉ tắt đúng máy"*: *"Đăng xuất: chỉ tắt trên chính máy đó. Đổi vai/quyền: không tắt. Đổi PIN, gỡ Face ID, ngưng tài khoản, đổi SĐT: vẫn tắt mọi máy (thao tác bảo mật)."* Hai phương án chủ không chọn:
  - "như trên + tự bật lại sau khi đăng nhập lại";
  - "giữ luật cũ, thêm dòng nhắc".
- **Ngày:** 2026-09-28. **Loại:** cửa **hai chiều**. Chỉ là luật, không có migration; lý do tắt (`revoke_reason`) giữ nguyên bộ chữ cũ.
- **Thay:** ADR-0036 **điều 6**. Các điều khác của ADR-0036 giữ nguyên.
- **Liên quan:**
  - ADR-0036: Web Push;
  - ADR-0022: Bảng tin, KN-2 "đóng kết nối khi tài khoản đổi", không đổi;
  - ADR-0016, ADR-0042: Face ID, quản trị gỡ Face ID cấp dưới.

## Bối cảnh

**Chủ báo 2026-09-28:** *"mỗi lần chạy npm run day-len thì chức năng thông báo trên điện thoại của ứng dụng lại tự động huỷ kích hoạt, phải kích hoạt thủ công"*. Chủ xác nhận điện thoại thật sự **không nhận** thông báo nữa, không chỉ hiển thị sai.

**Bằng chứng.** Chủ tự chạy truy vấn chỉ đọc trên bảng `ntf_push_sub` của production tối 2026-09-28. Trong ngày 28/9, iPhone của chủ bị tắt **3 lần, cả 3 lần đều do máy chủ, đúng theo ADR-0036 điều 6**:

| Lúc (giờ VN) | Lý do máy chủ ghi | Nghĩa |
|---|---|---|
| 04:25 | `dang-xuat` | một máy của cùng tài khoản đăng xuất |
| 07:53 | `tai-khoan-doi` | tài khoản thay đổi |
| 14:32 | `dang-xuat` | một máy của cùng tài khoản đăng xuất |

- Không lần nào có lý do `het-han`, tức iPhone hay dịch vụ đẩy của Apple không tự huỷ.
- Việc phát hành không trực tiếp tắt thông báo. Các thao tác thường làm quanh lúc phát hành mới tắt, ví dụ đăng xuất ở máy tính để thử tài khoản khác, hay chỉnh vai.
- Giờ 07:53 trùng lúc chủ nhận vai IT (bản 1.30/1.31), nhưng điều này **suy từ giờ**, chưa đối chiếu nhật ký.

**Vì sao điều 6 cũ quá rộng:**
- Đăng xuất ở **bất kỳ** máy nào cũng tắt **mọi** máy của tài khoản, trong khi phiên đăng nhập là **theo từng máy**. Các máy kia vẫn đăng nhập hợp lệ mà mất thông báo.
- Đổi vai/quyền cũng tắt mọi máy, dù không cần:
  - Máy lấy nội dung tin bằng **chính phiên của nó**, theo **quyền hiện tại**: `GET /api/thong-bao/moi-nhat` → `hop(staff, "cua-toi")`.
  - Người nhận được tính **lúc gửi**, cũng theo quyền hiện tại.
  - Vì vậy giữ thông báo sau khi đổi vai/quyền không lộ thêm gì.

## Quyết định

1. **Đăng xuất chỉ tắt thông báo của chính máy đang đăng xuất**: địa chỉ nhận của máy đó, nếu máy có bật. Lý do ghi là `dang-xuat`. Các máy khác của cùng tài khoản, vẫn đang đăng nhập, giữ nguyên.
2. **Đổi vai / đổi quyền không tắt thông báo.** Áp cho mọi trường hợp: Quản trị đổi quyền hay vai cấp dưới, Toàn quyền gán vai, kể cả vai IT.
   - Kết nối Bảng tin vẫn đóng để máy nối lại với quyền mới (ADR-0022 KN-2, không đổi).
3. **Thao tác bảo mật vẫn tắt mọi máy của tài khoản**, như điều 6 cũ. Lý do ghi là `tai-khoan-doi`. Gồm:
   - **đổi PIN:** tự đổi, đổi bằng Face ID, quản trị đặt lại;
   - **gỡ Face ID:** tự gỡ một, tự gỡ tất cả, quản trị gỡ tất cả;
   - **ngưng tài khoản;**
   - **đổi SĐT đăng nhập.**
4. **Giữ như cũ:**
   - người dùng tự bấm "Tắt" trên một máy thì chỉ tắt máy đó (`tu-tat`);
   - dịch vụ đẩy trả 410 thì địa chỉ đó hết hiệu lực (`het-han`);
   - địa chỉ chuyển sang tài khoản khác trên máy dùng chung (`doi-tai-khoan`);
   - bật hay tắt chế độ bảo trì không tắt máy.
5. **Không tự bật lại** sau khi đăng nhập lại. Máy đã bị tắt thì người dùng bấm "Bật" như cũ. Nhờ vậy máy dùng chung không tự nhận thông báo của người đăng nhập sau.

## Hệ quả

- **Được:**
  - đăng xuất ở máy tính, ví dụ để thử tài khoản khác sau khi phát hành, không làm điện thoại mất thông báo;
  - gán hay đổi vai/quyền không làm ai mất thông báo.
- **Mất máy hoặc nghi lộ tài khoản:** đổi PIN hoặc gỡ Face ID vẫn cắt thông báo ở mọi máy (điểm 3).
- **Chỉ đăng xuất ở máy khác thì không cắt được máy bị mất.** Trường hợp này trước đây cũng không an toàn hơn, vì đăng xuất ở máy khác chưa bao giờ đăng xuất máy bị mất. Máy mất vẫn còn phiên và mở app đọc được như thường.
- **Máy còn chạy mã giao diện CŨ (đã lưu trong bộ nhớ đệm):**
  - lần đăng xuất đầu tiên sau khi triển khai có thể vẫn tắt mọi máy theo cách cũ (`{ tatCa: true }`);
  - từ lần mở app kế tiếp thì theo luật mới;
  - chấp nhận được, vì chỉ xảy ra một lần.
- **Lối `tatCa: true` của `POST /api/account/thong-bao/may/huy` vẫn giữ** cho việc chủ động "tắt mọi máy của tôi" (hôm nay giao diện không có nút này; e2e dùng để dọn). Luật tự tắt KHÔNG còn dùng lối này.

## Cưỡng chế và tiêu chí nghiệm thu (viết trước khi làm — Hiến pháp P20)

**Trình duyệt:** `logout()` (`web/shell.ts`) gửi địa chỉ của **máy này** kèm cờ đăng xuất. Máy không có đăng ký cục bộ thì không gửi gì. KHÔNG gửi `tatCa: true`. Vẫn gọi `unsubscribe()` cục bộ.

**Máy chủ:**
- `POST /api/account/thong-bao/may/huy` nhận `{ endpoint, dangXuat: true }` → chỉ tắt đúng địa chỉ đó của chính tài khoản, lý do `dang-xuat`.
- `dongBangTin` của gốc lắp ráp nhận thêm cờ bắt buộc "có tắt máy không". Route đổi quyền (`PUT /api/staff/:id/permissions`) và đổi vai (`PUT /api/staff/:id/roles`) truyền **không tắt**. Các route ở điểm 3 truyền **có tắt**.

**Tiêu chí (máy kiểm được):**
1. Tài khoản có 2 máy bật; một máy gọi huỷ với `{ endpoint: <máy 1>, dangXuat: true }` → máy 1 hết hiệu lực (`dang-xuat`), máy 2 vẫn bật.
2. Quản trị đổi quyền, rồi đổi vai của một tài khoản có máy bật → máy vẫn bật (`soMay` không đổi, `revoked_at` vẫn NULL).
3. Đổi PIN, ngưng tài khoản, đổi SĐT → mọi máy hết hiệu lực (`tai-khoan-doi`), giữ nguyên như e2e hiện có.
4. `web/shell.ts` không còn gửi `tatCa: true` khi đăng xuất.
5. `npm test`, typecheck, e2e `thongbao` xanh. Mỗi hàng rào mới có P16 (sửa cố ý → đỏ → hoàn nguyên) và có dòng ở `docs/SO-HANG-RAO.md`.
