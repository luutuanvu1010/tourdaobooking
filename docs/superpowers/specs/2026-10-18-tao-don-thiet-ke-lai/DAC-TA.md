# Màn Tạo đơn thiết kế lại theo bản vẽ Claude Design (2026-10-18)

Đặc tả viết TRƯỚC khi thi công (hồ sơ có ngày; sửa thì viết bản mới trỏ về bản này). **Trạng thái: chờ chủ dự án duyệt** (mục 5 gom hai câu hỏi vào một lần). Chưa viết mã sản phẩm.

Nguồn: quyết định chủ 17–18/10/2026 ở Artifact `claude.ai/artifact/GkS8roeycQCtkdgCHFrZXX` (chép nguyên văn ở `PROMPT-CLAUDE-DESIGN.md` cùng thư mục); bản vẽ ở `docs/design/tao-don-2026-10-18/` (đọc `Tao don thiet ke lai.dc.html` trước, `TaoDonForm.dc.html` để bấm thử). Nền: `docs/superpowers/specs/2026-10-14-tao-don-bon-buoc/README.md` (bốn bước, giữ nguyên), `docs/adr/ADR-0058-nhom-dich-vu.md` Đ8.

## 1. Phạm vi

Đổi **cách vẽ và cách thao tác** màn Tạo đơn (và bảng "Đổi khách" ở trang đơn): chọn dịch vụ một chạm, khối "Đơn của", thẻ dịch vụ gập, dòng tiền, thanh dính cuối trang. **Không đổi** luật nghiệp vụ, bảng, migration, quyền, cách máy chủ tính tiền (`buildLines`), thân gửi lên khi Lưu. Mọi `id`, `data-*`, khoá DOM mà bài kiểm hay kịch bản đang dùng phải còn nguyên (khuôn tiêu chí T2 của đợt bốn bước), trừ chỗ mục 4 nói rõ. Dữ liệu trong bản vẽ là dữ liệu giả; máy dùng dữ liệu thật.

## 2. Thứ tự ưu tiên khi lệch

Quyết định trong đề bài → token trong `public/app.css` (đổi **giá trị** token phải hỏi chủ; **thêm** token mới vào nhóm "Riêng của Tour Đảo Booking" thì được, `web/CLAUDE.md`) → câu chữ thật của máy chủ (đặt gấp, cảnh báo tiền, mất mạng) → dữ liệu mẫu của bản vẽ.

## 3. Thiết kế, ánh xạ vào mã (chi tiết hành vi ở đề bài, không chép lại)

- **A. Chọn dịch vụ** — `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts`: bỏ nút xổ "Nhóm dịch vụ" và bảng tick; thay bằng hàng nút nhóm cuộn ngang (chọn MỘT, "Tất cả" đầu, mép phải mờ + "›"), khung danh sách luôn mở, cao cố định, chạm dòng là thêm, khung đứng yên, dòng hiện "✓ đã thêm", báo bằng vùng `aria-live` chứ không thông báo nổi. Dịch vụ gắn sao: ở "Tất cả" chỉ nằm trong mục "★ Hay dùng"; khi chọn một nhóm thì xếp lên đầu nhóm. Tìm kiếm: ô trống → có chữ thì hàng nhóm về "Tất cả"; đã chạm thu hẹp một nhóm thì gõ thêm không nhảy; xoá hết chữ thì về nhóm đã chọn trước khi tìm. Nhóm không có kết quả mờ đi, không hiện số. Số "N dịch vụ" ở đầu khung **đếm từ dữ liệu lúc chạy** (Sheet hiện 114, không chép số 113 của đề bài). Đơn đủ 20 dịch vụ: ô tìm và khung khoá, giữ câu "Đơn đã đủ 20 dịch vụ.".
- **B. Ngày đi và khối khách** — `web/booker-picker.ts`, `web/dat-qua-doi-tac.ts`, `web/o-nhan-noi.ts`, phần khách của `web/order-form.ts`: công tắc "Đơn của: Khách lẻ | Qua đối tác" thay hàng "Khách tự đặt | Đặt qua đối tác"; tên và SĐT khách dùng ô nhãn nổi sẵn có (nhãn "Tên khách đi tour *" / "Số điện thoại khách *", đổi nhãn khi đã chọn đối tác); dòng xám "Hồ sơ khách: chưa liên kết (không bắt buộc)"; tra hồ sơ trùng số giữ nguyên hành vi. Ai thấy công tắc **không đổi**: đúng `coODatQuaDoiTac` (`src/shared/phan-doi-tac-hien-thi.ts`); tài khoản Đối tác thuần thấy dòng chỉ đọc; tài khoản lai không có công tắc.
- **C. Thẻ dịch vụ** — `web/order-card.ts` (và phần thẻ của `web/order-form.ts`): chỉ một thẻ mở, trừ thẻ có lỗi chặn lưu luôn mở; thẻ gập có thể hai, ba dòng ở khổ 390 (tên không cắt); số khách thành lưới hai cột; dòng tiền "2 người lớn × 1.350.000 = 2.700.000", dòng "Thành tiền dịch vụ" chỉ khi từ hai dòng; thùng rác (`trash`, mới, cùng luật nét với bộ có sẵn) thay chữ "Xoá" (`aria-label` "Xoá dịch vụ …", hành vi xoá giữ nguyên); mỗi chặng đưa đón MỘT ô "Nơi đón" và MỘT ô "Nơi trả" kèm gợi ý, dòng cuối "Gõ tự do…". Biểu tượng `search` dùng cái đã có ở `web/icons.ts`.
- **D. Phần còn lại** — thang nút ba cấp (chỉ "Lưu, chờ xác nhận" là nút chính; "Đúng, qua …" trong khung chặn nhầm là nút phụ viền — đề bài tự mâu thuẫn chỗ này, đây là cách gỡ), ô "Hình thức"/"Người nhận tiền" chỉ hiện khi có tiền trả trước, thanh dính cuối trang (số dịch vụ, tổng, trả trước, chạm mở bảng chi tiết) thay khối Tóm tắt trên điện thoại, lỗi khi lưu hiện ngay trên nút Lưu. Giữ: thanh bốn bước (`web/thanh-buoc.ts`), khối Hành khách, khối Người phụ trách, dải đặt gấp (`web/dat-gap-ui.ts`). Máy tính ≥ 960px: hai cột, cột phải dính; hàng nhóm có nút ‹ › khi rê chuột và đi được bằng phím.
- **Biến thể theo vai** (bản vẽ khung 11): Đối tác (dòng chỉ đọc, đơn giá khoá theo danh mục, giảm giá khoá), tài khoản lai (không công tắc), bảng "Đổi khách" (`web/booker-sheet.ts`, cùng khối "Đơn của" và hai ô khách).

## 4. Điều vượt ra ngoài bề mặt (đề bài buộc phải nêu)

1. **Hàng nhóm chọn MỘT đảo ngược ADR-0058 Đ8** (Đ8 viết "chọn một chip" rồi đợt 1 ngày 13/10 đổi thành bảng tick nhiều nhóm theo ý chủ; nay chủ chọn lại một nhóm, duyệt trong chat 17/10) và thay phần 2 của `docs/superpowers/specs/2026-10-13-dot-1-giao-dien-tao-don/README.md`. Cần **bản ghi quyết định mới** (đề xuất ADR-0130, xem câu 1 mục 5); không sửa hồ sơ cũ. **Bản nhớ nhóm trên máy:** khoá `td.dmLoc.v1` giữ nguyên; khoá nhóm theo tài khoản (`khoaNhoNhom`) hôm nay lưu MỘT MẢNG; `docNhoNhom` đã chịu được chuỗi lẫn mảng. Luật mới: đọc mảng nhiều nhóm thì lấy phần tử hợp lệ đầu tiên, nhóm không còn trong `groups` thì về "Tất cả", bộ nhớ bị chặn thì "Tất cả"; **vẫn ghi dạng mảng một phần tử** để bản cũ lỡ chạy lại không gãy. Không migration.
2. **Lớp chặn nhầm cần biết "hồ sơ trùng số này đang mang vai được hưởng hoa hồng".** `GET /api/parties/lookup` chỉ trả `roleCodes`; `web/` không được tự suy luật từ mã vai. **Chạm hợp đồng API nếu thêm cờ → dừng hỏi chủ** (câu 2 mục 5).
3. **Đổi tên nút kéo theo** ("Khách tự đặt | Đặt qua đối tác" → "Khách lẻ | Qua đối tác", "Đúng, qua …", bỏ "Chọn từ danh mục"/"Nhóm dịch vụ" ở chỗ nào còn): `src/shared/huong-dan-ban-hang.ts`, `huong-dan-doi-tac.ts`, `huong-dan-quan-tri.ts`, `so-do-trang.ts`, `changelog.ts` (số phiên bản tạm, quyết ở bước A.0 khi phát hành), `web/booker-sheet.ts`, `web/dat-qua-doi-tac.ts`, `web/so-dai-ly-ui.ts`; bài kiểm khoá chữ cũ cần sửa có chủ đích: `src/ben-dat-doi-tac-noi-day-giao-dien.test.ts`, `src/shared/loc-danh-muc.test.ts`, `booker.test.ts`, `phan-doi-tac-hien-thi.test.ts`, `tro-ly-van-nghia.test.ts` (kho trợ lý đo lại nghĩa). Các `data-action` (`dat-qua-mo`, `dat-qua-huy`…) giữ nguyên để kịch bản không gãy.
4. **Đổi cách hiển thị tiền** (dòng tiền, thanh dính, bỏ khối Tóm tắt điện thoại) là **việc lớn** (CLAUDE.md §3): sau thi công phải có `nguoi-kiem-doc-lap` chỉ đọc, chạy lại lệnh, so thân POST/PUT cũ–mới từng byte (khuôn T5 đợt bốn bước) và so con số trên thanh dính với `buildLines` của máy chủ. Người thi công không tự nghiệm thu.
5. **Kịch bản Chrome** theo bảng `web/CLAUDE.md`: ba `a2-smoke-form|order|sheet`, `v1-nguoi-phu-trach`, `chip-nhom-smoke` (khoá hành vi bảng tick — **phải viết lại có chủ đích** cho hàng nhóm một chọn), `danh-muc-lap-don-smoke`, `dat-gap-smoke`, `doi-tac-lap-don-smoke`, `chon-hdv-lap-don-smoke`. Ba kịch bản đỏ sẵn từ trước (`a2-smoke-sheet`, `v1-xac-nhan-png`, `dat-gap-smoke` bước 4, ghi ở đợt 1) cần dựng lại bản gốc để so, không tính là hỏng do đợt này.
6. **Số hiệu:** 0129 là số ADR lớn nhất đã dùng, kiểm bằng `git log --all` trên mọi nhánh lúc 18/10; số 0130 là **tạm**, kiểm lại ở mọi nhánh và worktree ngay trước khi cấp. Không có migration.

## 5. Hai câu cần chủ quyết (một lần hỏi; nếu im lặng thì áp phương án đầu, đều đảo ngược được)

**Câu 1. Bản ghi quyết định cho hàng nhóm chọn một.** (a) *Khuyến nghị:* soạn ADR-0130 ngắn một trang, "chọn một nhóm, thay Đ8 phần bảng tick, nhớ theo tài khoản như cũ", để chủ duyệt; AI không tự duyệt. (b) Chỉ ghi vào nhật ký thi công, không ADR — nhưng Đ8 vẫn còn đó nên mã lệch tài liệu chuẩn tắc. → Khuyến nghị (a).

**Câu 2. Lớp chặn nhầm lấy dữ kiện "hồ sơ này được hưởng hoa hồng" ở đâu.**
- (a) *Khuyến nghị, không đổi hợp đồng API:* khi số trùng hồ sơ, `web/` gọi thêm `GET /api/pricing/nguoi-huong?q=<tên hồ sơ>` (route đã có, cùng cổng `coODatQuaDoiTac` với công tắc) và chỉ báo "Số này là của đối tác …" nếu `partyId` có trong kết quả. Được: không ADR, máy chủ vẫn là người quyết "được hưởng". Mất: thêm một lời gọi mỗi hồ sơ trùng, máy chủ cắt 20 kết quả nên hai hồ sơ trùng tên dày đặc có thể sót (hiếm; sót thì chỉ không cảnh báo, không sai tiền).
- (b) Thêm cờ `huongHoaHong` vào `PartyLookupResponse`: gọn nhất nhưng chạm hợp đồng giữa `parties` và `pricing` (module `parties` không import `pricing`, phải đi qua view `v_prc_*`) → cần ADR riêng và kiểm độc lập.
- (c) Bỏ lớp chặn nhầm đợt này, ghi nợ. Nhân viên có thể lập nhầm đơn khách lẻ cho đối tác như hôm nay.

**Trang ghép (Bước ghép khi duyệt):** không bảng nào nhận loại dữ liệu mới; không dòng bản đồ quyền nào đổi; cổng canh: `coODatQuaDoiTac` (công tắc "Đơn của") và `GET /api/pricing/nguoi-huong` (máy chủ trả 403 ngoài cổng) giữ nguyên; chỗ giao diện ẩn/hiện theo quyền bị đổi nghĩa duy nhất là công tắc thay hai nút (cùng điều kiện hiện). Hai câu trên không câu nào chạm tiền hay dữ liệu thật.

## 6. Điểm lệch giữa bản vẽ, quyết định và mã (đã gỡ sẵn; chủ sửa được)

| Điểm trong bản vẽ | Cách xử lý |
|---|---|
| Màu và phông nền `#eaf2f8`, viền `#d3e1ec`, phông Nunito; thanh bên và thanh trên nền xanh | Dùng token thật (`--c-surface-alt` `#f2f5f9`, `--c-border` `#e1e7ef`, Be Vietnam Pro); thanh bên/thanh trên không thuộc phạm vi, giữ như đang chạy |
| Token MỚI `--h-catalog` (392/448px), `--fade-edge` (56px) | Thêm vào nhóm "Riêng của Tour Đảo Booking", đặt tên theo quy ước nhóm đó; không đổi giá trị token có sẵn |
| Biểu tượng `trash` và `search` đánh dấu MỚI | `search` đã có ở `web/icons.ts`; chỉ thêm `trash` |
| "113 dịch vụ" (đề bài), 114 (ghi chú bản vẽ, đúng) | Đếm lúc chạy |
| Giá trẻ em 80%, "Cảng du lịch Cầu Đá", "Nguyễn Thị Hoa", "Tôi (người bán)" | Dữ liệu giả, bỏ |
| Câu đặt gấp, cảnh báo tiền, mất mạng là chữ đề xuất | Dùng câu thật của máy chủ (`src/shared/order-errors.ts`, `dat-gap-hien-thi.ts`) |
| "Đối tác, Thực tập" cùng có "Đơn của" chỉ đọc | **Cần xác minh khi thi công:** mã thật chỉ cho Đối tác (và tài khoản lai) dòng chỉ đọc/ẩn; quyền Thực tập (`INTERN`, ADR-0018) có lập đơn và không giữ quyền Đối tác nên theo `coODatQuaDoiTac` nhiều khả năng vẫn thấy công tắc (chưa chạy thử). Mặc định: theo mã, không đổi quyền |
| Quy tắc "nhóm có tên khớp chữ gõ lên đầu" | Bỏ (không có trong quyết định) |
| Dấu ✓ trong công tắc, "Chi tiết ▴ / Thu gọn ▾", tiêu đề mục dính, "· tính theo nhóm 5 khách", lớp chặn nhầm trong bảng Đổi khách | Nhận nếu không chạm dữ liệu/hợp đồng; lớp chặn nhầm ở bảng Đổi khách theo cùng câu trả lời của câu 2 |
| Thẻ gập hai, ba dòng ở 390 | Chấp nhận (tên không cắt) |

## 7. Tiêu chí nghiệm thu (đỏ trước, xanh sau; đo được)

1. Chọn nhóm = đúng một chạm, danh sách không biến mất; chọn dịch vụ = đúng một chạm; khung đứng yên và vị trí cuộn không nhảy. (Kịch bản Chrome 390 + 1040, đếm số lần chạm.)
2. Đơn mẫu ba dịch vụ ở 390: chiều cao trang đến nút Lưu giảm so với số đo trước (đo bằng kịch bản chụp của đợt bốn bước; ngưỡng cụ thể chốt khi lập kế hoạch sau khi đo lại bản `main`), không khối Tóm tắt trên điện thoại.
3. Luật tìm/nhóm: trống→có chữ về "Tất cả"; đã thu hẹp thì gõ thêm không nhảy; xoá chữ về nhóm trước đó (bài thuần trong `src/shared/loc-danh-muc.test.ts`).
4. Bản nhớ cũ đọc an toàn: mảng ba nhóm, chuỗi đơn, JSON hỏng, nhóm đã xoá, bộ nhớ bị chặn → không ném lỗi, kết quả hợp lệ.
5. Thân POST/PUT cho cùng thao tác giống nhau từng byte với bản trước (bỏ id ngẫu nhiên và dấu khoá lạc quan); tổng trên thanh dính bằng tổng máy chủ trả sau khi lưu nháp.
6. Mọi `id`/`data-*` mà bài kiểm hiện có dùng vẫn tới được; thẻ có lỗi chặn lưu luôn mở; chỉ một thẻ mở còn lại.
7. Lớp chặn nhầm: SĐT của đối tác được hưởng hoa hồng → hiện khung; "Đúng" chuyển công tắc, xoá hai ô khách, con trỏ về ô tên; SĐT khách thường → không hiện; Đối tác/tài khoản lai → không hiện.
8. Thang nút: một nút chính duy nhất; không còn nút viên thuốc, nền xanh nhạt, nét đứt (quét class trong `public/app.css`).
9. `npm run typecheck` 0 lỗi, `npm test` xanh, `npm run test:e2e` xanh (chạm form gửi lên API), axe không thêm vi phạm, console sạch; ảnh thật 390 + 1040 cho Bán hàng, Đối tác, Thực tập, Toàn quyền để chủ duyệt một lượt.
10. Hàng rào mới (nếu dựng) chỉ ghi vào `docs/SO-HANG-RAO.md` sau khi đã quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên); chưa quan sát thì ghi "dựa vào kỷ luật".

## 8. Xây trên lỗ đang hở

`docs/quyen-hoan.json` không có mục nào nhắc Tạo đơn, bộ chọn dịch vụ, tra hồ sơ hay đặt qua đối tác (tìm theo `order-form`, `catalog-picker`, `booker`, `lookup`, `tao-don`: không khớp). Đợt này không chạm vùng đang hở nào đã biết; người lập kế hoạch rà lại sổ ngay trước khi chốt.

## 9. Việc kế tiếp

Chủ duyệt đặc tả (trả lời hai câu mục 5, hoặc im lặng để áp phương án đầu) → `superpowers:writing-plans` (tách việc theo A/B/C/D, mỗi việc đỏ→xanh, việc B có nhánh theo câu 2) → thi công trong worktree → `nguoi-kiem-doc-lap` → PR dạng thường, chủ tự gộp bằng `npm run day-len`; sau gộp ghi rõ "cần `npm run trien-khai`" (có thay đổi người dùng thấy, không migration).
