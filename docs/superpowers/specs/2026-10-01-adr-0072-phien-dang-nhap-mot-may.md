# ADR-0072 (BẢN NHÁP): Phiên đăng nhập có sổ — mỗi tài khoản một máy, IT/Toàn quyền gỡ phiên

- **Trạng thái:** proposed — bản nháp ở `docs/superpowers/specs/`; chủ duyệt thì chép sang `docs/adr/ADR-0072-phien-dang-nhap-mot-may.md` + dòng `docs/adr/README.md`.
- **Ngày:** 2026-10-01
- **Đặc tả:** `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (§5b, §13 trang ghép).
- **Liên quan:** ADR-0071 (lớp hai), ADR-0016 (Face ID), ADR-0036/0046 (thông báo màn hình khoá, tắt khi thao tác bảo mật), ADR-0038/0044 (Toàn quyền, vai IT, nhật ký im lặng), ADR-0042 (đặt lại PIN), Hiến chương K1, 5.12.

## Bối cảnh

Phiên hôm nay là cookie ký, **không có sổ ở máy chủ**: không biết tài khoản đang mở trên những máy nào, không gỡ được riêng một máy (chỉ đá mọi phiên bằng `credentials_changed_at`). Chủ dự án yêu cầu (2026-10-01): biết tài khoản nào từng đăng nhập trên máy nào, phiên còn hiệu lực không; **tại một thời điểm chỉ một máy**; IT và Toàn quyền gỡ được phiên. Chủ đã chốt: máy mới vào thì máy cũ bị đăng xuất; áp cho mọi tài khoản **trừ IT và Toàn quyền**; mọi người đăng nhập lại **một lần** khi phát hành; IT + Toàn quyền xem/gỡ của mọi người, mỗi người xem được của mình.

## Quyết định

1. **Sổ phiên.** Bảng `aut_session` (module `auth`): một dòng mỗi lần cấp phiên mới (đăng nhập PIN hoặc Face ID). Token cookie mang thêm **mã phiên**; mỗi request kiểm dòng phiên còn hiệu lực (chưa kết thúc, chưa hết hạn) cùng lúc với kiểm tài khoản. Token kiểu cũ (không có mã phiên) bị từ chối → **mọi người đăng nhập lại một lần** khi phát hành (thay câu Q3 của ADR-0071: phiên cũ không được sống tiếp).
2. **Mỗi tài khoản một máy.** Cấp phiên mới cho tài khoản **không được miễn** → trong **cùng một lô ghi**: kết thúc mọi phiên đang hiệu lực của tài khoản đó (lý do "bị thay bởi máy khác") rồi chèn phiên mới. Cơ sở dữ liệu cũng chặn: cột `single` + chỉ mục duy nhất có điều kiện `(staff_id) WHERE ended_at IS NULL AND single = 1` — hai lần đăng nhập chạy đua không thể cùng sống. `audit-invariants` thêm kiểm luật này.
3. **Miễn luật một máy** = tài khoản đang giữ quyền `SUPER_ADMIN` **hoặc** vai `IT` còn hiệu lực, máy chủ đọc lúc cấp phiên (`single = 0`). **Mất miễn** (bị bỏ Toàn quyền/vai IT) → trong cùng lô đổi quyền/vai: kết thúc mọi phiên trừ phiên mới nhất, lý do "mất quyền nhiều máy".
4. **Lý do kết thúc** (cố định): đăng xuất · bị thay bởi máy khác · bị IT/Toàn quyền gỡ · đổi PIN · bị đặt lại PIN · bị tắt lớp hai · tài khoản ngưng · hết hạn · mất quyền nhiều máy. Mỗi dòng giữ người gỡ (khi do IT/Toàn quyền).
5. **Bốn nơi cấp lại phiên cho người đã đăng nhập** (`accounts/index.ts`): đổi PIN, gỡ Face ID, gỡ mọi Face ID, đặt PIN bằng Face ID → **giữ mã phiên hiện tại**, kết thúc mọi phiên **khác** của tài khoản (thay cho vai trò của `credentials_changed_at`, cột này vẫn giữ làm lưới an toàn).
6. **Máy bị đăng xuất phải tắt hẳn:** (a) đóng kết nối Bảng tin **của đúng phiên đó** (kết nối gắn mã phiên; không đóng của máy mới); (b) tắt địa chỉ nhận thông báo màn hình khoá **của đúng máy đó** — đăng ký thông báo ghi kèm mã phiên; tắt qua `index.ts` của module thông báo, không ghi chéo bảng; (c) khi IT/Toàn quyền gỡ: bỏ luôn "máy được tin" của lớp hai gắn với phiên đó (lần sau phải nhập mã). Áp đúng nguyên tắc ADR-0046 (thao tác bảo mật tắt thông báo) ở mức từng máy.
7. **Quyền.** Ô mới `auth.session.viewAll` và `auth.session.revoke` → chỉ `SUPER_ADMIN` (vai IT mặc định mang Toàn quyền). Route kiểm thật bằng `can()`; có test: Quản trị không giữ Toàn quyền → 403. Xem lịch sử phiên **của chính mình** và tự đăng xuất: tự phục vụ, ngoại lệ có ghi trong `docs/quyen-hoan.json`. Toàn quyền gỡ được phiên của Toàn quyền khác (cùng cấp).
8. **Nhật ký.** Gỡ phiên ghi `session_revoked` (ai gỡ, tài khoản bị gỡ, mã phiên; không IP). **Đề xuất** thêm vào `SILENT_AUDIT_ACTIONS` (cùng loại với `pin_reset`, `passkey_removed` ở ADR-0038) — chủ chốt khi duyệt.
9. **Tên máy** = loại máy + trình duyệt rút gọn từ User-Agent (vd "iPhone · Ứng dụng đã cài", "Windows · Chrome") + địa chỉ IP + giờ. Không đọc được tên thật của điện thoại. `last_seen_at` cập nhật tối đa 5 phút một lần. Sổ phiên không xoá (lịch sử); IP và User-Agent là dữ liệu cá nhân — chỉ IT/Toàn quyền và chính chủ tài khoản xem; ghi trong từ điển dữ liệu.

## Hệ quả

- Mỗi request thêm một lần đọc dòng phiên (gộp vào truy vấn tài khoản hiện có); ghi `last_seen_at` thưa.
- **Gỡ phiên không phải khoá tài khoản**: người có PIN (+ lớp hai) đăng nhập lại được ngay. Muốn đuổi hẳn kẻ gian: gỡ phiên **và** đặt lại PIN/tắt lớp hai — màn gỡ phiên có nút gộp "Gỡ phiên + đặt lại PIN".
- Ứng dụng đã cài và Safari trên **cùng một iPhone** là **hai máy** (hai kho cookie): đăng nhập Safari sẽ đá ứng dụng ra. Lời báo trên máy bị đá: "Tài khoản vừa đăng nhập trên máy khác lúc HH:MM"; ghi trong Trợ giúp.
- Lịch sử chỉ có từ lúc phát hành.
- Phát hành **cùng bản hoặc trước** lớp hai (ADR-0071) để chỉ phải đăng nhập lại một lần; 14 ngày ân hạn lớp hai chạy trong các phiên mới này.
- Bài kiểm e2e chạy song song đang dùng chung tài khoản → sẽ đá nhau; kế hoạch phải cho mỗi tài khoản test một phiên dùng chung giữa các nhóm hoặc tách tài khoản theo nhóm (không được nới luật cho môi trường test).

## Phương án đã cân nhắc

- **Chặn máy mới đến khi máy cũ đăng xuất:** chủ không chọn — mất máy là bị khoá ngoài, kẻ gian vào trước khoá được chủ tài khoản.
- **Giữ cookie không sổ, chỉ ghi nhật ký đăng nhập:** biết lịch sử nhưng không gỡ được riêng máy, không ép được một máy → không đạt yêu cầu.
