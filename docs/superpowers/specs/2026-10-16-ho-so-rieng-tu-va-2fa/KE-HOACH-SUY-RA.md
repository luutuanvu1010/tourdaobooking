# Kế hoạch suy ra: các lát thi công theo thứ tự

> Hồ sơ có ngày (2026-10-16). Thứ tự theo Hiến chương 5.13 (định danh & quyền → bên → …). Mỗi lát: tiêu chí nghiệm thu bằng hành vi (P20), bài đỏ-trước-xanh-sau, dòng sổ hàng rào **đề xuất** (AI thi công thêm vào `docs/SO-HANG-RAO.md` chỉ sau khi đã quan sát chặn thật — P16), loại việc. "Việc lớn" = cần người kiểm độc lập chỉ đọc (CLAUDE.md §3). Không lát nào được tự nghiệm thu (N8).

## GÓI 1 — Đăng nhập hai lớp

Gói 1 dùng nguyên kế hoạch đã duyệt: `docs/superpowers/plans/2026-10-01-dang-nhap-b-hai-lop-ung-dung-xac-thuc.md` (Phần B) và `…-c-hai-lop-email.md` (Phần C), tiêu chí nghiệm thu ở đặc tả 10-01 §11 (21 mục). Bảng dưới chỉ ghi phần **thêm / đổi**.

| Lát | Việc | Tiêu chí nghiệm thu thêm (hành vi) | Bài đỏ→xanh | Loại |
|---|---|---|---|---|
| G1-0 | Đồng bộ nhánh với `main`, đánh lại số migration (đặc tả còn ghi `0058`), số bản; đọc lại `issueLoginSession` sau ADR-0085, ADR-0094 (vé chống ghi trùng) | Kế hoạch B, C ghi đúng số migration, đúng tên hàm hiện có; ghi vào sổ thi công | — | nhỏ |
| G1-1 | Phần C Task 0 (kiểm gửi email) — chạy **song song**, độc lập với B | Có kết luận "gửi được / không" kèm nguồn chính thức; có dòng đề xuất cho `RANG_BUOC_NGOAI.md` mục 2 | — | chờ chủ (thử gửi tới hộp thư của chủ) |
| G1-2 | Phần B nguyên văn (TOTP, mã dự phòng, máy được tin, ân hạn 14 ngày, Quản trị tắt lớp hai) | Đặc tả 10-01 §11 mục 1–14; thêm: **đăng nhập máy B đã được tin vẫn đá phiên máy A** (X7) | e2e mới "máy được tin không miễn một máy" — đỏ khi cố ý bỏ câu kết thúc phiên cũ ở nhánh máy được tin | **việc lớn** |
| G1-3 | Phần C nguyên văn (chỉ khi G1-1 = "gửi được") | Phần C Review Focus 1–5; thêm: email hồ sơ (nếu có) **không** tự thành yếu tố email — bật yếu tố luôn đòi mã | Bài thuần: tạo yếu tố email mà không qua mã xác nhận → đỏ | **việc lớn** |
| G1-4 | (chỉ khi chủ chọn Q1 = B) ADR-G1: ô cấu hình "bắt buộc đối tác", ân hạn | Toàn quyền bật cấu hình → đối tác chưa bật lớp hai thấy dải nhắc; hết ân hạn → bị chặn ở PIN, lời nhắn lời thường; tắt cấu hình → trở lại tự chọn | e2e đủ hai chiều | **việc lớn** |

**Hàng rào Gói 1 đề xuất cho sổ:** đã có sẵn trong đặc tả 10-01 §11 mục 11, 13 (cổng lớp hai, "nơi cấp phiên"). Thêm một dòng: *"Máy được tin không miễn luật một máy — e2e `G1-2`; phá thử: bỏ câu kết thúc phiên cũ ở nhánh `PIN_TRUSTED` → đỏ → hoàn nguyên."*

## GÓI 2 — Hồ sơ, giấy tờ, xác minh, quyền riêng tư

Bắt đầu sau khi L2a (Hiến chương 5.20–5.25 + ADR-H1 + ADR-H2) được duyệt. L2b (ADR-H3, H4) duyệt trước lát H-4.

| Lát | Việc | Tiêu chí nghiệm thu (hành vi) | Bài đỏ→xanh | Hàng rào đề xuất (chặn gì · cơ chế · phá thử) | Loại |
|---|---|---|---|---|---|
| H-0 | Hạng dữ liệu N0–N4 vào `docs/data-dictionary.json` cho mọi cột `pty_*`, `aut_*`, `staff` hiện có | Mọi cột người có hạng; `npm run dict` sinh lại; tài liệu mô tả cập nhật | Bài mới: cột `pty_*` không có hạng → đỏ | Cột cá nhân mới lọt không phân loại · bài quét sổ dữ liệu ↔ schema · xoá hạng một cột → đỏ | nhỏ, chạy nền được (không phụ thuộc câu hỏi) |
| H-1 | Migration: `birth_date`, loại liên hệ `ADDRESS`, `pty_organization_document_type` + `pty_organization_document` (+ trigger khuôn 0032, trigger "một GPKD một tổ chức") + `pty_verification` (chỉ-thêm) | Thêm, gia hạn, huỷ giấy tờ tổ chức chạy như giấy tờ người; số GPKD trùng tổ chức khác → 409; `UPDATE`/`DELETE` trên `pty_verification` bị CSDL chặn | `src/migrations-*.test.ts` mới (tìm theo đuôi tên tệp) | Xoá/sửa dòng xác minh · trigger chỉ-thêm · bỏ trigger trong bản sao → bài đỏ | **việc lớn** (dữ liệu) |
| H-2 | Route giấy tờ tổ chức + xác minh do Quản trị/Toàn quyền nhập hộ (chưa tự khai) | Màn Danh bạ thêm/gia hạn giấy tờ tổ chức; cờ kiểm trùng hiện; sửa giá trị đã xác minh → nhãn "Cần xác minh lại" | `giay-to-khong-lo-so.test.ts` thêm mọi route mới vào `TUYEN` | Số giấy tờ tổ chức của hộ kinh doanh (N3) lọt nhật ký · bài không-lộ · nối số vào `detail` → đỏ | **việc lớn** (quyền) |
| H-3 | Kho tệp: binding, `pty_attachment(_link)`, tải lên/xuống, `sw-policy` | Tệp đuôi `.jpg` mà nội dung HTML → 415; tải xuống trả `no-store` + `nosniff`; không có quyền → 403 và **không** có dòng nhật ký "đã xem"; có quyền → dòng nhật ký có trước khi trả thân; service worker không lưu | e2e tệp; bài thuần chữ ký tệp; bài `sw-policy` | (a) Đường tệp hồ sơ bị lưu đệm · bài `sw-policy` · bỏ luật loại trừ → đỏ. (b) Tệp phục vụ không qua `can()` · bài quét route tệp phải gọi `can(` trước `R2.get` · đảo thứ tự → đỏ | **việc lớn**; chờ chủ tạo bucket |
| H-4 | Tự khai: chính sách + đồng ý, phiếu, hàng chờ xác minh, ô quyền mới | Đối tác A gọi hồ sơ / tệp của đối tác B (đổi id trên đường dẫn) → 403; khai tên mới → tên trên đơn và biên nhận **không đổi** cho tới khi được chấp nhận; người khai tự chấp nhận phiếu của mình → 403; chưa đồng ý chính sách → 409 | `permission-enforcement`, `route-write-guard` phủ route mới; e2e đối tác chéo | (a) Phạm vi `own` lấy từ đường dẫn · e2e chéo · cố ý đọc id từ đường dẫn → đỏ. (b) Tự xác minh · điều kiện câu ghi + bài · bỏ điều kiện → đỏ | **việc lớn** (quyền) |
| H-5 | Phiếu xoá + ẩn danh hoá + trigger ngoại lệ hẹp + xoá R2 sau lô + bản danh sách mã phiếu ngoài D1 | Sau khi thực hiện: số giấy tờ đọc ra là dấu ẩn danh ở mọi route, kể cả "xem đủ số"; ảnh tải về → 404; đơn/sổ tiền của người đó còn nguyên; nhật ký `party_erased` không chứa tên, số; mọi sửa khác trên dòng đã gia hạn/huỷ vẫn bị chặn; hồ sơ công ty chủ → 409; R2 xoá lỗi → tệp hiện "chờ xoá", bấm lại được | Bài migration (chuyển hợp lệ qua, mọi chuyển khác đỏ); e2e phiếu; `audit-invariants` thêm kiểm "dòng `erased_at` không còn số thật" | Ẩn danh hoá đi ngược / sửa lén dòng khoá · trigger một chiều + bài · thử đặt `erased_at` về rỗng → đỏ | **việc lớn** (dữ liệu); xây trên lỗ đang hở HC-5.19 |
| H-6 | Hàm công bố `hoSoXuatHoaDon` (chỉ hàm, chưa luồng hoá đơn) | Trả đúng trường + cờ xác minh; không trả số CCCD | Bài SQL đăng ký cấm cột số (khuôn `expiringDriverDocuments`) | Hàm hoá đơn lộ số định danh · bài đọc SQL · thêm cột số → đỏ | nhỏ |
| H-7 | Trợ giúp, hướng dẫn theo vai, Hướng dẫn quyền riêng tư (chữ chính sách do chủ duyệt) | Mục Trợ giúp có "Hồ sơ của tôi", "Yêu cầu xoá dữ liệu" | bài `huong-dan.test.ts` (trần chữ) | — | nhỏ |

**Chạy nền độc lập** (không phụ thuộc câu trả lời của chủ): G1-0, G1-1 (phần đọc tài liệu), H-0.

## Phần phải chờ người khác

| Chờ ai | Việc |
|---|---|
| Chủ | Trả lời README Q1–Q3; duyệt L1/L2a/L2b; tạo bucket R2; thử gửi email tới hộp thư mình; chạy `day-len` / `trien-khai`; duyệt chữ chính sách riêng tư |
| Luật sư | Thời hạn trả lời yêu cầu xoá; phần nào phải giữ và bao lâu; CCCD thuộc loại dữ liệu nào; có cần thông báo/đăng ký gì với cơ quan nhà nước khi xử lý dữ liệu cá nhân của ~1000 đối tác (kiến thức chung: luật mới có nghĩa vụ hồ sơ đánh giá tác động — chưa tra) |
| Kế toán | Hoá đơn/chứng từ giữ bao lâu và có cần tên người trên sổ quản trị nội bộ không (`RANG_BUOC_NGOAI.md` L1) |
| Cloudflare (tra tài liệu) | Email Service gửi địa chỉ bất kỳ, giới hạn, giá; số ngày Time Travel giữ (C4); R2 có giữ phiên bản / quét mã độc không |

## Rủi ro và điều chưa kiểm

1. **Email không gửi được tới địa chỉ bất kỳ** → phần email dừng; nếu chủ chọn bắt buộc đối tác (Q1 = B) thì Q1 cũng dừng theo.
2. **Bản sao lưu còn dữ liệu đã xoá** trong số ngày chưa biết; khôi phục chưa từng diễn tập (HC-5.19). Phiếu trả lời phải nói thẳng.
3. **Ẩn danh hoá đụng trigger cũ**: tạo lại trigger `_superseded`, `_voided` là chạm hàng rào đã có người kiểm; sai một chữ là mở lỗ sửa dòng khoá. Bắt buộc người kiểm độc lập + phá thử từng chuyển.
4. **Nhật ký còn tên** (và SĐT cũ) sau khi xoá — đúng luật dự án hiện hành, có thể chưa đúng luật nhà nước (chưa luật sư xác nhận).
5. **Gánh xác minh** ~1000–3000 lượt lần đầu; nếu chỉ Toàn quyền xác minh (Q2 = A) thì dồn vào một người.
6. **Xoá EXIF trên Worker** không thêm thư viện: chưa kiểm khả thi.
7. **D-2 (Medium, kiểm toán 13/10):** Nhân sự tạo được tài khoản Bán hàng rồi đăng nhập xem đơn — chưa vá; không chặn gói này nhưng chạm cùng vùng tài khoản.
8. **Ngày 16/10 là ngày brief**; tài liệu soạn 15/10 theo đồng hồ máy. Số migration, số ADR phải kiểm lại lúc thi công.
