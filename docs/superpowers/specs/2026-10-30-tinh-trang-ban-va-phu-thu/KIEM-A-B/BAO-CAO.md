# Báo cáo kiểm độc lập (chỉ đọc) — Lượt A và Lượt B, 30/10/2026

- **Người kiểm:** AI kiểm độc lập, chỉ đọc. Không sửa tệp nào ngoài tệp này.
- **Bản đối chiếu:** worktree `tinh-trang-ban`, HEAD `a129d3d` (trùng `main` trong máy; `git worktree list` chỉ có hai worktree này).
- **Đầu vào chủ đã chốt:** `00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md` (tệp mới nhất), `QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md` (B1–B7), cùng ba tệp mà lượt chốt đó trỏ tới (`PHIEU-CHOT-…`, `DE-XUAT-TINH-TRANG-BAN-DICH-VU-…`, `BO-SUNG-…`).
- **Lệnh đã chạy:** chỉ đọc (`git grep`, `grep`, `sed`), và một lệnh `node -e` trên SQLite trong bộ nhớ để xem `PRAGMA foreign_key_list` trả gì với khoá ngoại hai cột. Không chạm D1, không chạy migration.

## Kết luận

| Đề xuất | Kết luận | CHẶN | NÊN SỬA | GHI NHẬN |
|---|---|---|---|---|
| **A** — `A-dac-diem-dich-vu/DE-XUAT-ADR.md` + `TRANG-GHEP.md` | **ĐẠT CÓ ĐIỀU KIỆN**: trình chủ được sau khi sửa A-1 và A-2 | 2 | 2 | 4 |
| **B** — `B-dong-ban/DE-XUAT-ADR.md` + `TRANG-GHEP.md` | **ĐẠT CÓ ĐIỀU KIỆN**: trình chủ được sau khi sửa B-1 | 1 | 5 | 4 |

Đếm lại độc lập số quyết định chạm quyền / dữ liệu:
- **A: 3** (Đ1, Đ2, Đ3). Đồng ý với người soạn. Nếu sửa A-1 bằng cách nới hàng rào, hoặc A-2 thành «lệch có chủ ý», thì chủ phải duyệt thêm một mục. Mục đó không phải quyết định chạm quyền / dữ liệu, nhưng phải nêu ở mục «Đếm».
- **B: 3 theo tiêu chí người soạn, 4 nếu theo tiền lệ ADR-0146** (ADR-0146 đã tính Đ4 «Danh mục cho form»). Xem B-4. Người soạn đã tự hỏi chủ điều này (câu C6), nên đây không phải lỗi giấu.

Trang ghép: cả hai có đủ ba phần (1) loại thực thể, (2) bản đồ quyền, (3) cổng × cửa, kèm 3b «giao diện ẩn/hiện» (`CLAUDE.md` §9).

«Xây trên lỗ đang hở»: đã đối chiếu `docs/quyen-hoan.json` mục `phat_hien` (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2). Kết luận «không» của cả hai đúng. Không lượt nào thêm câu ghi vào đường Cron đồng bộ (HC-5.11). Không lượt nào chạm tiền hay sổ. Migration chỉ thêm bảng.

---

## Kiểm mục «bảng ở catalog, đọc qua view, không cạnh mới» (cả hai). Đã mở tệp kiểm

| Điều | Kết quả | Bằng chứng |
|---|---|---|
| `catalog` chỉ phụ thuộc `audit`; `orders → catalog`, `pricing → catalog`, `thongbao → orders` là cạnh đã có; `thongbao` không tới `catalog` | **Đúng** | `src/architecture.test.ts:33, 54, 57, 62` |
| Bảng mới tiền tố `ctl_` phải thuộc `catalog`; view `v_ctl_…` thuộc `catalog` | **Đúng** (A ghi dòng 213 cho VIEW_PREFIX, B ghi dòng 212 cho TABLE_PREFIX, cả hai đúng) | `src/architecture.test.ts:212–213`, bài ở 324–332 và 355–363 |
| `catalog` còn LEGACY tới 2027-03-31; SQL mới chỉ ở tệp nửa nghiêm; tệp mới phải vào `NUA_NGHIEM` (bài K-A-1) | **Đúng** | `:113–120`, `:160–174`, bài `:673` |
| Module nghiêm (`pricing`) được đọc **view** của module có cạnh, không được đọc thẳng **bảng** | **Đúng** | hàm `violations`, `:446–458` |
| **Trigger** của `prc_sales_block` (pricing) đọc `v_ctl_attribute_value` (A) | **Hợp lệ**: thân trigger được đọc view công bố của module mà module chủ bảng được phép phụ thuộc | `triggerBodyViolations`, `:1295–1308`; bài `:1335` |
| Trigger của `ctl_sale_suspension` đọc `catalog_item`, `ctl_group` (B) | **Hợp lệ**: cùng module | như trên |
| `pricing` đã đọc `v_ctl_service_group` cùng kiểu (A) | **Đúng** | `src/modules/pricing/repository.ts:91` (`groups_of`) |
| Hàng rào «`orders` không đọc bảng `ctl_*`» | **Có**, quét đúng ba tên `ctl_group`, `ctl_service_group`, `ctl_service_transfer_rule` | `src/orders-khong-doc-nhom-truc-tiep.test.ts:24–31` |
| Hàm hẹp mới của `orders` (B Đ6) và danh sách `CONG_BO` | **Đúng** dòng 67 | `src/orders-cong-bo.test.ts:67` |
| **Khoá ngoại hai cột** `(attribute_code, value_code) → ctl_attribute_value` (A Đ1 mục 2–3, Đ2) | **SAI: làm đỏ bài kiến trúc**. Xem **A-1** | `src/architecture.test.ts:334–353` (dòng kiểm `pk.length === 1 && pk[0] === fk.to`) |

---

## Phát hiện — Lượt A (đặc điểm dịch vụ, sửa ADR-0146)

### A-1 — CHẶN — Khoá ngoại hai cột làm đỏ bài `ADR-0002 điều 5/6`; câu «không phá luật» là quá tay
- **Vị trí:** `DE-XUAT-ADR.md` Đ1 mục 2 («Khoá duy nhất `(attribute_code, code)` để bảng gắn và bảng luật trỏ được bằng khoá ngoại hai cột»), Đ1 mục 3 (`value_code` «khoá ngoại hai cột»), Đ2 («`attribute_code`, `value_code` (khoá ngoại hai cột → `ctl_attribute_value` …)»). Bảng «Chỗ dễ nhầm» khẳng định «không phá luật phụ thuộc».
- **Bằng chứng (đã mở tệp và chạy thử):**
  - `src/architecture.test.ts:334–353`, bài «khoá ngoại xuyên module đúng chiều phụ thuộc hoặc là cạnh toàn vẹn đã khai». Bài duyệt **mọi** khoá ngoại của **mọi** bảng trong sổ, kể cả khoá ngoại cùng module. Mỗi dòng của `PRAGMA foreign_key_list` phải trỏ đúng **khoá chính một cột** của bảng cha. Nếu không, bài ghi «phải trỏ khoá chính của …».
  - Chạy thử trên SQLite trong bộ nhớ: một khoá ngoại `(attribute_code, value_code) REFERENCES v(attribute_code, code)` cho **hai** dòng. Dòng đầu có `to = 'attribute_code'`, không phải khoá chính `code`, nên bài đỏ. Đỏ ở cả `ctl_attribute_assignment` lẫn `prc_sales_block`.
  - `grep` toàn bộ `migrations/`: không có khoá ngoại nhiều cột nào, tức không có tiền lệ.
- **Câu sửa đề nghị:** «`value_code` khoá ngoại **một cột** tới khoá chính `ctl_attribute_value(code)` (mã máy sinh, duy nhất toàn bảng). Ràng buộc "giá trị thuộc đúng đặc điểm" đặt ở trigger:
  - trigger của `ctl_attribute_assignment` đọc bảng cùng module;
  - trigger `BEFORE INSERT` của `prc_sales_block` đọc `v_ctl_attribute_value(attribute_code, code, active)`. View này đã có trong Đ1, và trigger đó cũng đã có trong Đ2.
  Bỏ khoá duy nhất hai cột.» Nếu người soạn muốn giữ khoá ngoại hai cột thì phải ghi rõ đó là **nới hàng rào** (Điều 9.4, chủ duyệt), và thêm một mục duyệt vào phần «Đếm». Tiêu chí 5 («chèn dòng có giá trị thuộc đặc điểm khác») vẫn giữ, chỉ đổi cơ chế.

### A-2 — CHẶN — Tự kết luận «không lệch Hiến chương 5.2» không đứng được: 5.2 nêu đích danh «flexfield»
- **Vị trí:** `DE-XUAT-ADR.md` dòng «Hiến chương áp» và mục «Lệch hay không lệch Hiến chương 5.2». Lập luận ở đó: «Chữ "kiểu flexfield" … chỉ là cách ví von».
- **Bằng chứng (đã mở tệp):**
  - `docs/ARCHITECTURE.md:93`, điều 5.2: «**Không** dùng cơ chế "trường mở rộng tự do" (flexfield/JSON không lược đồ) cho dữ liệu nghiệp vụ», và «Điều doanh nghiệp hay đổi … là **dòng dữ liệu có ngày hiệu lực** trong bảng có cột rõ kiểu».
  - `00-dau-vao/BO-SUNG-2026-10-30-DAC-DIEM-VA-PHU-THU.md` dòng 18 tự gọi khung này là «kiểu flexfield của Oracle».
  - Điều 6.1 (`docs/ARCHITECTURE.md:139`): lệch thì ghi «lệch có chủ ý: điều X, vì …», và chỉ hợp lệ khi chủ duyệt.
- **Phán xét (suy luận của người kiểm):** thiết kế mang đúng dấu hiệu định nghĩa của một «descriptive flexfield». Người dùng tự đặt **tên thuộc tính** trên màn hình. Mỗi thuộc tính có một **bộ giá trị có kiểm**, gắn vào một thực thể có sẵn. Mã không biết nghĩa của thuộc tính nào. Flexfield của Oracle **cũng** có bộ giá trị có kiểm, nên lý do «giá trị là dòng tra cứu có khoá» không đủ để tách thiết kế này khỏi flexfield.
  - Thiết kế **có** nhiều điểm giảm rủi ro mà 5.2 nhắm tới: không chữ tự do, không JSON, có khoá ngoại, có hiệu lực và nhật ký cho bảng gắn, chỉ một bộ máy chung đọc theo khoá.
  - Vì vậy kết luận đúng là «**lệch hẹp, có lý do**». Kết luận «không lệch» thì sai. Người soạn không có thẩm quyền tự phán «không lệch».
  - Thêm một chỗ nhỏ: `ctl_attribute` và `ctl_attribute_value` chỉ có cờ `active`, không có ngày hiệu lực như vế đầu của 5.2 đòi. Cách này giống `ctl_group`.
- **Câu sửa đề nghị:** sửa dòng «Hiến chương áp» thành «**lệch có chủ ý: điều 5.2 (hẹp)**. Lý do: chủ chốt Đ-2 và nguyên tắc "logic nghiệp vụ là dữ liệu". Giới hạn: (1) giá trị chỉ chọn từ danh sách có khoá, không chữ tự do, không JSON; (2) bảng gắn có hiệu lực theo thời gian và nhật ký; (3) mã không rẽ nhánh theo mã hay tên đặc điểm cụ thể (thêm bài quét); (4) chưa dùng cho tiền khi chưa có ADR.» Đưa điều này thành **câu hỏi C4 cho chủ**, có khuyến nghị. Đừng để nó nằm trong «Điều chưa chắc».

### A-3 — NÊN SỬA — Không nói chỗ đụng với Lượt B ở phần cổng, dù kế hoạch thi công ADR-0146 viết ngay sau khi A được duyệt
- **Vị trí:** `DE-XUAT-ADR.md` Đ2 «Cổng: không đổi ADR-0146 Đ3, Đ4»; `TRANG-GHEP.md` mục 5 điểm 7 (chỉ nói về phạm vi theo đặc điểm của B).
- **Bằng chứng:**
  - B đề xuất một **hàm cổng chung ở `orders`** (tên tạm `congBanDuoc`: luật bán → đóng bán), và **gọi thêm cổng luật bán trước `tinhCanXacNhan`** ở `/status` và Gửi xác nhận. Nguồn: `B-dong-ban/DE-XUAT-ADR.md` Đ3 (a), (d), câu C5. B ghi rõ việc này «phải ghi vào kế hoạch thi công ADR-0146 (Lượt A)».
  - Mã hiện nay: ở `/status`, `tinhCanXacNhan` chạy **trước** `kiemCongXacNhan` (`src/modules/orders/index.ts:1702–1703`). Ở Gửi xác nhận, `tinhCanXacNhan` nằm ở `src/modules/orders/xac-nhan-route.ts:116`, trước chốt nhóm tắt ở `:118`.
  - Nếu chủ chọn C5 = (a), chỗ người dùng gặp `sales_blocked` của ADR-0146 ở `/status` sẽ đổi.
- **Câu sửa đề nghị:** thêm vào `TRANG-GHEP.md` mục 5: «Lượt B đề xuất bọc hàm luật bán của `pricing` trong một hàm cổng chung ở `orders`, và gọi thêm một lần trước `tinhCanXacNhan` ở `/status` và Gửi xác nhận (B câu C5). Kế hoạch thi công ADR-0146 phải theo câu trả lời C5 của chủ. Lượt A không quyết thay.» Đổi câu «không đổi ADR-0146 Đ3» thành «A không đổi; chỗ đặt có thể đổi theo B câu C5».

### A-4 — NÊN SỬA — «Bật lại» một giá trị hoặc đặc điểm đã tắt là cửa đổi kết quả luật chưa được liệt kê
- **Vị trí:** Đ1 «Tắt đặc điểm / giá trị»; Đ4 (ba cửa); `TRANG-GHEP.md` mục 3b («dòng luật trỏ tới giá trị đã tắt hiện nhãn "không phủ dịch vụ nào"»).
- **Bằng chứng (suy luận từ chính đề xuất):**
  - Bất biến «luật chỉ trỏ giá trị đang dùng» chỉ canh lúc **thêm** luật (trigger `BEFORE INSERT`, Đ2).
  - Một luật cũ vẫn còn hiệu lực khi giá trị nó trỏ tới bị tắt.
  - Nếu sau đó giá trị được bật lại (`active = 1`; đề xuất không cấm việc này) rồi được gắn cho dịch vụ, luật cũ sẽ **tự chặn lại** mà màn hình không cảnh báo. `catalog` không đọc được `pricing`, nên không tự kiểm được điều này.
- **Câu sửa đề nghị:** chọn một trong hai.
  - (a) «Tắt đặc điểm / giá trị là **một chiều** (trigger cấm `active` 0 → 1). Muốn dùng lại thì tạo giá trị mới.»
  - (b) Liệt kê «bật lại» thành cửa (d) của Đ4, kèm cảnh báo giao diện như các cửa khác, và thêm một tiêu chí nghiệm thu.

### A-5 — GHI NHẬN — Lệch số trong chính bản A
- Đầu tệp viết «Đ3 (thêm một "cửa đổi kết quả của luật")», còn Đ4 viết «Lượt này thêm **ba** cửa». `TRANG-GHEP.md` mục 0 và mục 1 nói «ba cột phạm vi», nhưng Đ2 chỉ thêm **hai** cột (`attribute_code`, `value_code`). Cột nhóm là cột ADR-0146 đã có.
- Câu sửa: «Đ3 (thêm ba cửa)»; «hai cột mới».

### A-6 — GHI NHẬN — Mốc «14 ngày» của danh sách «mới, đang theo nhóm» là hằng số trong mã
- Vị trí: Đ5 mục 2. Đây là tham số hiển thị, không phải luật nghiệp vụ. Nó vẫn hợp với nguyên tắc chủ («mã giữ rào an toàn và bộ máy chung») nếu được ghi rõ là «bề mặt, đảo ngược được». Không cần đưa lên bảng điều khiển.

### A-7 — GHI NHẬN — Đếm trần
- Đếm lại được **3** (Đ1, Đ2, Đ3). Đ4 không thêm cổng, bảng hay ô, nên không tính là hợp lý. Tiền lệ: ADR-0146 tính Đ3 vì Đ3 thêm cổng 409.
- Nếu A-1 được sửa bằng cách nới hàng rào, hoặc A-2 thành «lệch có chủ ý», chủ phải duyệt thêm mục. Ghi rõ điều đó vào bảng «Đếm».

### A-8 — GHI NHẬN — Các khẳng định hiện trạng của A đã mở tệp và **xác nhận đúng**
- `kiemCongXacNhan` ở `orders/xac-nhan-chung.ts:83`. Gửi xác nhận có chốt riêng ở `xac-nhan-route.ts:100, 118`.
- `benDatCuaToi` ở `src/index.ts:184`; kiểu ở `router.ts:205, 358, 494`.
- Route for-order ở `catalog/index.ts:167–171`. 409 `group_not_empty` ở `:264–266`. Route `transfer-rule` ở `:335–360`.
- Đồng bộ dùng `ON CONFLICT DO UPDATE`, chỉ đặt `in_sheet = 0` (`catalog/repository.ts:114–132`). Đồng bộ không đụng `ctl_*`.
- `first_seen_at` có ở `0006:38`. `0127:7–41` đúng mô tả. Mã `HTA` chỉ có trong dữ liệu gieo `0055`. `maNhomMoi` ở `nhom-repo.ts:179`.
- Các dòng của `permissions.ts`: `row()` 44–48, `quanTri` 58, `partner.commission.write` 162, `admin.manage` 185, cổng 376 và 387. Cổng admin chặn ở `router.ts:441`.
- Menu `/catalog` chỉ cho `admin.manage` (`muc-giao-dien.ts:71`).
- Không tệp nào trong `src`, `migrations`, `web`, `tests` nhắc `prc_sales_block`, `sales_blocked` hay `sales.block`.
- Hàng ô mới `row("any","none","any","none","none","any",…)` đúng thứ tự cột: Bán hàng, Quản trị, Toàn quyền.

---

## Phát hiện — Lượt B (đóng bán)

### B-1 — CHẶN — B4 bị nới mà không đánh dấu: B cho «Còn vé kèm đổi ngày đi», trong khi chốt chỉ cho Hết vé hoặc Huỷ
- **Vị trí:** `DE-XUAT-ADR.md` Đ3 (e) dòng «Chờ xác nhận» («Còn vé kèm đổi sang ngày đi không bị đóng thì được»); Đ3 tiêu chí 9 vế 2; bộ câu báo `sale_suspended` ở Còn vé («hoặc đổi sang ngày đi không bị ngừng»); `TRANG-GHEP.md` mục 5 điểm 2 («ba lối»).
- **Bằng chứng (đã mở tệp):**
  - `00-dau-vao/DE-XUAT-TINH-TRANG-BAN-DICH-VU-2026-10-30.md:74`: «không cho bấm "Còn vé", **chỉ cho "Hết vé" hoặc "Huỷ"** (Q3)». Câu Q3 ở `:110` có khuyến nghị (a).
  - `QUYET-DINH-…-TINH-TRANG-BAN-VA-GIA-MUA.md` ghi B4 là «không cho bấm "Còn vé"». Chủ chấp nhận mọi khuyến nghị của tệp đề xuất.
  - B ghi B4 vào bảng «Điều đã chốt … không hỏi lại», nhưng lối thứ ba này không mang nhãn **[người soạn]** và không có câu hỏi nào.
- **Câu sửa đề nghị:** chọn một trong hai.
  - (a) Bỏ lối «Còn vé kèm đổi ngày». Người xét duyệt chỉ có Hết vé hoặc Huỷ, đúng chữ đã chốt.
  - (b) Giữ lối đó nhưng đánh dấu «[người soạn] cách hiểu B4: đổi sang ngày không bị đóng thì không còn "gặp dịch vụ đang đóng"», và thêm câu hỏi C7 cho chủ, khuyến nghị (a) hoặc (b).
  - Cả hai cách: sửa tiêu chí 9, câu báo, và trang ghép mục 5.2 cho khớp.

### B-2 — NÊN SỬA — Còn vé: thiết kế tự mâu thuẫn, vì cổng trong `kiemCongXacNhan` xét theo ngày **đã lưu**
- **Vị trí:** Đ3 (a), (c) và (d). B nói hàm cổng chung «đứng đầu `kiemCongXacNhan`», như ADR-0146, và Gửi đơn đi «qua `kiemCongXacNhan`». Ở Còn vé, B gọi hàm cổng chung với «ngày **mới** nếu thân có `ngayDi`».
- **Bằng chứng (đã mở tệp):**
  - Còn vé đọc `order` ở `xac-nhan-route.ts:255` và nhận `ngayDi` ở `:262–268`. Nó gọi `kiemCongXacNhan(env.DB, { …, order, … })` ở `:309` với **`order` đã nạp**, tức ngày cũ. Ngày mới chỉ vào lô ghi ở `:312–314`.
  - Nếu bước (2) «đóng bán» nằm trong hàm chung đứng đầu `kiemCongXacNhan`, thì Còn vé đổi sang ngày ngoài khoảng đóng vẫn nhận 409 ở `:309`. Như vậy tiêu chí 9 vế 2 («Còn vé kèm `ngayDi` ngoài khoảng đóng → 200») **không đạt được** theo đúng thiết kế đã viết.
- **Câu sửa đề nghị:** «Bước đóng bán chỉ gọi **một** lần ở mỗi cửa, với danh sách dòng sau khi áp thay đổi của lệnh. Bên trong `kiemCongXacNhan` chỉ đặt bước luật bán, vì luật bán không phụ thuộc ngày đi. Nếu không làm vậy thì `kiemCongXacNhan` phải nhận danh sách dòng đã áp ngày mới.» Thêm vào tiêu chí 15 (hàng rào văn bản) một vế canh điều này.

### B-3 — NÊN SỬA — «7 cửa» của B không cùng tập với 7 cửa của ADR-0146 Đ3; hợp lại là 8
- **Vị trí:** `DE-XUAT-ADR.md` Đ3 «Phương án bị bác» («hai lần đặt chỗ móc ở 7 cửa»), bảng «Đếm» («7 cửa»); `TRANG-GHEP.md` mục 5 điểm 1 («cùng chỗ móc ở 7 cửa»).
- **Bằng chứng (đã mở tệp):**
  - ADR-0146 Đ3 (`docs/adr/ADR-0146-…md:49–52`) có 7 cửa: lập đơn, sửa nháp, `/status`, **đổi bên đặt `PUT …/booker`**, Gửi xác nhận, Còn vé, Gửi đơn.
  - B có 7 cửa: lập đơn, lưu nháp, **`PUT …/trip`**, `/status`, Gửi xác nhận, Gửi đơn, Còn vé.
  - Hợp lại là **8 cửa**: `booker` chỉ có bước luật bán; `trip` chỉ có bước đóng bán. Chính B cũng viết điều này ở chỗ khác (Đ3 «Không cần cổng đóng bán: … `booker` (… luật bán ADR-0146 vẫn canh)»).
  - Hàng rào ở tiêu chí 15 không nhắc lời gọi của route `booker`.
- **Câu sửa đề nghị:** «Hàm cổng chung được gọi ở **8 cửa**. Bảng: cửa × (bước luật bán có / không) × (bước đóng bán có / không) × ngày đi dùng để xét.» Sửa trang ghép mục 5.1 cho khớp.

### B-4 — NÊN SỬA — Đếm trần: tiền lệ viện dẫn chỉ đúng một nửa
- **Vị trí:** bảng «Đếm» (Đ2 «tiền lệ: ADR-0146 không tính Đ2») và Đ4 «Vì sao không tính vào trần».
- **Bằng chứng:** `docs/adr/ADR-0146-…md:6`: «Bốn điều chạm quyền / dữ liệu: Đ1, Đ3, **Đ4** và Đ5». Đ4 của ADR-0146 chính là «Danh mục cho form».
  - Đ4 của B cũng đổi DTO danh mục mà **Đối tác và Thực tập** nhận: thêm trường `tamNgung` có **lý do là chữ tự do** do nhân viên gõ. Như vậy B đưa ra ngoài một nội dung trước đây không lộ.
  - Đếm độc lập: **3** theo tiêu chí của B, **4** theo tiền lệ ADR-0146.
- **Câu sửa đề nghị:** trong câu C6, nêu cả hai tiền lệ: «ADR-0146 không tính Đ2 (luật tính), nhưng **có** tính Đ4 (danh mục form)». Sau đó mới khuyến nghị. Hoặc khuyến nghị C1 = (c) (Đối tác chỉ thấy «Tạm ngừng bán», không thấy lý do), để Đ4 thật sự không đổi «ai thấy gì».
  - Lưu ý: B7 có lý do «câu báo cho người đặt cần lý do» (`PHIEU-CHOT-…:178`). Vì vậy C1 = (a) cũng có gốc trong chốt. Chủ cần thấy cả hai vế.

### B-5 — NÊN SỬA — `scope` «kiểm ở mã» trái chữ Hiến chương 2.2 và lệch cách làm của Lượt A
- **Vị trí:** Đ1, bảng cột (`scope`: «tập đóng, kiểm ở mã (khuôn `ord_service_confirm_flag`, 0119)»). Mục «Hiến chương áp» ghi 2.2: tập đóng, đổi bằng ADR.
- **Bằng chứng:**
  - `docs/ARCHITECTURE.md` 2.2: «Mã phải rẽ nhánh theo giá trị → tập đóng (`CHECK`)».
  - Lượt A dùng `CHECK` cho kiểu phạm vi của `prc_sales_block` (A Đ2, Đ6 (g)).
  - Tiền lệ B viện dẫn có thật: `migrations/0119_yeu_cau_xac_nhan.sql:4, 48`, «kiểm ở MÃ, không CHECK liệt kê».
  - Tiêu chí Đ1 của B không có ca «`scope` lạ bị từ chối».
- **Câu sửa đề nghị:** dùng `CHECK (scope IN ('SERVICE','GROUP'))`. Nếu giữ cách kiểm ở mã (để sau này thêm phạm vi đặc điểm mà không phải dựng lại bảng SQLite), thì ghi rõ lý do, viện tiền lệ 0119, và thêm tiêu chí «route trả 400 với `scope` lạ; bài lược đồ ghi nhận không có CHECK». Hai lượt nên thống nhất một cách.

### B-6 — NÊN SỬA — Quy tắc «mở lại» xung đột ở hai ca biên, tiêu chí chưa phủ
- **Vị trí:** Đ1. Các quy tắc: mở lại đặt `valid_to_at = reopened_at`; «không được kéo dài `valid_to_at` đã có»; «`valid_to_at > valid_from_at` lúc tạo».
- **Suy luận:**
  - (i) Mở lại một lần đóng **chưa bắt đầu** («đóng sau 5 giờ», mở lại sau 1 giờ) cho ra `reopened_at < valid_from_at`. Nếu ràng buộc `>` là `CHECK` cấp bảng thì lần mở lại bị từ chối.
  - (ii) Lần đóng có kết thúc dự kiến đã qua (đã hết hiệu lực) mà bấm mở lại thì `reopened_at > valid_to_at` cũ, tức bị coi là «kéo dài», nên bị từ chối.
- **Câu sửa đề nghị:** nói rõ ràng buộc nào là trigger lúc chèn, ràng buộc nào là `CHECK`. Mở lại đặt `valid_to_at = min(valid_to_at cũ, reopened_at)`, và cho phép `valid_to_at ≤ valid_from_at` khi đã mở lại (lần đóng rỗng). Hoặc cấm mở lại lần đóng đã hết hạn (409 «đã hết hiệu lực»). Thêm hai ca này vào tiêu chí Đ1.

### B-7 — GHI NHẬN — Thông báo hình chiếu dùng «mốc = lúc tạo lần đóng» có thể không bao giờ hiện là «chưa đọc»
- **Vị trí:** Đ6 mục 2.
- **Bằng chứng:** dấu «đã đọc» là **một mốc mỗi người** (`ntf_read_mark.doc_den_luc`, `src/modules/thongbao/repository.ts:88–89, 139`). Nháp lập **sau** lần đóng, hoặc nháp đổi ngày vào khoảng đóng sau khi người đó đã mở hộp thư, sẽ có tin mang mốc cũ hơn `doc_den_luc`. Tin đó không làm tăng số đỏ.
- Đây là một vế của B6 («báo»). Nên nêu trong câu C3, hoặc lấy mốc tin = max(lúc tạo lần đóng, lúc đơn bắt đầu trúng).

### B-8 — GHI NHẬN — «Không sửa chữ nào của ADR-0146» đúng về chữ, nhưng C5 = (a) đổi hành vi của ADR-0146 ở `/status`
- Ở «Quan hệ với ADR cũ», nên ghi thêm «**bổ sung** ADR-0146 Đ3 về chỗ đặt (nếu chủ chọn C5 = (a))». Đi cùng A-3.

### B-9 — GHI NHẬN — Sai nhỏ hoặc nói gọn quá ở phần hiện trạng
- H6 viết «cờ ẩn chỉ chặn thêm mới». Mã (`service-rules.ts:201–210`) giữ bản chụp chỉ khi dòng đã lưu **cùng mã và cùng số khách**. Đổi số khách của một dòng đã lưu mà dịch vụ đang ẩn **cũng** nhận 400 `catalog_unavailable`. Kết luận chính của B vẫn đúng (cờ ẩn không chặn nháp giữ nguyên, `kiemCongXacNhan` không xét `visible`).
- `catalogStatusOf` ở `service-rules.ts:301`, không phải `:306`.

### B-10 — GHI NHẬN — Các khẳng định B được giao soi riêng: đã mở tệp, **xác nhận đúng**
- **Không có đồng hồ tiêm:** `router.ts` chỉ tiêm `mocToiThieu` (`:157–161`, `:339–342`). Các route đọc `Date.now()` trực tiếp. `kiemCongXacNhan` tự đọc `vnToday(new Date())` ở `xac-nhan-chung.ts:88`. Khuôn `mock.timers.enable({ apis: ["Date"] … })` có ở `pricing/sua-muc-route.test.ts:33`, `van-chuyen/chinh-sach-route.test.ts:157`; đếm được 6 tệp thử dùng.
- **Hộp thông báo là hình chiếu của nhật ký đơn:** tập hành động đóng `HANH_DONG_TIN_DON` (`src/shared/thong-bao.ts:10–14`). Sự kiện danh mục không có `order_id`. `bangtin` là module lá, không đọc CSDL (`bangtin/index.ts:1–3`). Không có đường sẵn cho sự kiện danh mục.
- **Cờ ẩn:** `service-rules.ts:201–210` đúng như H6, có lưu ý ở B-9.
- **Thứ tự ở `/status`:** `tinhCanXacNhan` ở `index.ts:1702`, **trước** `kiemCongXacNhan` ở `:1703`.
- **Gửi xác nhận:** `tinhCanXacNhan` ở `:116`, trước chốt nhóm tắt ở `:118`, không qua hàm chung. **Gửi đơn:** `kiemCongXacNhan` ở `:150` trước `tinhCanXacNhan` ở `:152`; chỗ móc ghi ở `:131–134`. **Còn vé:** đổi ngày ở `:262–268`, chốt nhóm tắt ở `:296`, `kiemCongXacNhan` ở `:309`.
- **Đường ghi `order_service`:** chỉ ba tệp của `orders`. Câu đổi ngày ở `repository.ts:1385` và `xac-nhan-repo.ts:83`.
- **Các dòng khác:** `chanKhoanThu` ở `xac-nhan-route.ts:123, 154`. Cờ cần xác nhận là bảng của `orders`, `scope` kiểm ở mã (`0119:47–63`). `settings.ops` ở `permissions.ts:202`. `web/catalog.ts:837` chặn người không có `admin.manage`.
- **Đúng B1–B7:**
  - B1: Đ1, bảng bốn thao tác, mặc định «chỉ hôm nay».
  - B2: `catalog.sale.suspend` cho Bán hàng, Quản trị, Toàn quyền; `catalog.sale.resume` **chỉ** Quản trị, Toàn quyền; tiêu chí «Bán hàng mở lại → 403».
  - B3: không có cửa vượt, có phương án bị bác ghi rõ.
  - B4: **lệch, xem B-1**.
  - B5: mờ kèm nhãn «Tạm ngừng bán», cùng DTO cho văn phòng và Đối tác.
  - B6: người lập của nháp và đơn chờ, qua hình chiếu; mức «báo» hỏi ở C3.
  - B7: lý do bắt buộc, `CHECK` 1–200 ký tự.
- **Không khoá cứng logic nghiệp vụ:** không tên dịch vụ, nhóm hay loại nào trong mã. Phạm vi và hiệu ứng là tập đóng. Mốc «sau X giờ» và khoảng ngày là dữ liệu nhập. B tự nhận là chưa có máy canh việc này (Đ7 (f)).

---

## Nhất quán giữa A và B

| Điểm | A nói | B nói | Đánh giá |
|---|---|---|---|
| Nơi xét luật bán | «một hàm ở `pricing`», gọi ở các cửa ADR-0146 Đ3 | hàm cổng chung `congBanDuoc` ở `orders` gọi (1) luật bán, rồi (2) đóng bán | **Không trái nhau**: B bọc hàm của `pricing`, không xét lại. Nhưng A không nhắc lớp bọc này (A-3) |
| Thứ tự | luật bán đứng đầu `kiemCongXacNhan` | luật bán → đóng bán, cả hai đứng **trước** `tinhCanXacNhan` ở `/status` và Gửi xác nhận (C5) | **Lệch chỗ đặt ở `/status`** nếu chủ chọn C5 = (a). A phải biết (A-3, B-8) |
| Mã lỗi | 409 `sales_blocked`, câu kèm «(đặc điểm: giá trị)» | 409 `sale_suspended`; khuôn câu `sales_blocked` «chỉ gợi ý»; thân lỗi có `details` | Khớp về mã. Khuôn câu `sales_blocked` của B chưa có vế đặc điểm của A. Người thi công chọn một khuôn |
| Danh sách cửa | 7 (theo ADR-0146 Đ3, `TRANG-GHEP.md` mục 3) | 7, nhưng khác tập | **Hợp là 8** (B-3) |
| Phạm vi theo đặc điểm cho đóng bán | «Lượt B có thể muốn; nếu có thì đọc cùng `v_ctl_service_attribute`; lượt này không quyết» | C2: (a) chưa; thêm bằng ADR nhỏ sau | **Khớp** |
| Tập phạm vi | `CHECK` | kiểm ở mã | **Lệch cách làm** (B-5) |
| Tên bảng / ô | `ctl_attribute*`, `catalog.attribute.assign`; ADR-0146 `sales.block.write` | `ctl_sale_suspension`, `catalog.sale.suspend` / `.resume` | Không trùng tên. Ba trang văn phòng mới (Đặc điểm, Luật bán, Tình trạng bán) đều dành cho Bán hàng, Quản trị, Toàn quyền. Không mâu thuẫn, nhưng menu văn phòng dài thêm ba mục |
| Cảnh báo ở màn gán nhóm | mở rộng cho giá trị thừa hưởng | mở rộng cho lần đóng theo nhóm | **Khớp**. Một cảnh báo chung, B trang ghép 5.5 đã nói |

## Tách: điều đã mở tệp kiểm và điều suy luận

- **Đã mở tệp kiểm:**
  - mọi dòng «bằng chứng» trong bảng và trong các phát hiện ở trên;
  - `src/architecture.test.ts` (cạnh, tiền tố, STRICT / LEGACY / NUA_NGHIEM, bài khoá ngoại, bài trigger);
  - Hiến chương 2.2, 5.2, 6.1; `CLAUDE.md` §9;
  - ADR-0146 toàn văn; năm tệp đầu vào; `docs/quyen-hoan.json`.
  - Chạy thử `PRAGMA foreign_key_list` cho khoá ngoại hai cột.
- **Suy luận (chưa chạy mã, chưa thi công):**
  - A-2: phán xét 5.2 là cách đọc của người kiểm; chủ là người quyết.
  - A-4: cửa «bật lại».
  - B-2: dựa trên đọc luồng; chưa chạy bài.
  - B-6: tuỳ cách viết trigger, chưa có migration.
  - B-7.
  - Đánh giá «3 hay 4» ở B-4.
- **Chưa kiểm:** nhánh trên máy khác của chủ; dữ liệu D1 thật; khuôn «bỏ người làm» của hộp thư mà B Đ6 tiêu chí 5 viện dẫn; số bài đỏ khi thêm ô.

---

## Vòng 2 — A (soát lại bản A đã sửa, 30/10)

- **Phạm vi:** `A-dac-diem-dich-vu/DE-XUAT-ADR.md` (297 dòng) và `TRANG-GHEP.md` (124 dòng), bản sửa theo A-1 … A-6. Chỉ đọc; không chạy lệnh nào ngoài đọc tệp.
- **Kết luận: ĐẠT.** Không còn phát hiện CHẶN. Còn 2 NÊN SỬA, đều chỉ phải sửa chữ. Tôi khuyên sửa trước khi trình chủ, nhưng chúng không chặn việc trình: R2-1 (câu C4 thiếu giới hạn 5) và R2-2 (vế 2 của hàng rào (l) chưa kiểm được). Thêm 3 GHI NHẬN.

### Các phát hiện vòng 1 đã đóng chưa

| Phát hiện | Trạng thái | Bằng chứng trong bản sửa |
|---|---|---|
| **A-1 (CHẶN)** khoá ngoại hai cột | **Đã đóng** | Đ1 mục 2–3: `value_code` là khoá ngoại **một cột** tới khoá chính `ctl_attribute_value(code)`, `attribute_code` là khoá ngoại tới `ctl_attribute(code)`. Việc kiểm «giá trị thuộc đúng đặc điểm» giao cho trigger `BEFORE INSERT` cùng module. Đ2: `prc_sales_block` có hai khoá ngoại một cột, việc kiểm cặp giao cho trigger đọc `v_ctl_attribute_value`. Người soạn ghi rõ là **không** nới hàng rào. Bài `src/architecture.test.ts:334–353` sẽ xanh: mỗi khoá ngoại trỏ đúng khoá chính một cột `code`, và cạnh `pricing → catalog` có trong `ALLOWED_EDGES` (`:57`). Đ6 (g) và tiêu chí 5, 13 đã đổi theo |
| **A-2 (CHẶN)** 5.2 | **Đã đóng** | Dòng «Hiến chương áp» ghi «lệch có chủ ý, hẹp: điều 5.2 — chỉ hợp lệ khi chủ duyệt (Điều 6.1)». Mục riêng ở Đ1 thừa nhận khung mang dấu hiệu flexfield, có năm giới hạn. Có câu C4. Tóm tắt mục 6 và bảng «Đếm» ghi đây là «mục duyệt thêm». Chỗ còn thiếu ở C4: xem R2-1 |
| A-3 chỗ đụng với B (lớp bọc, C5) | Đã đóng | Đ2 «Hệ quả cho kế hoạch thi công ADR-0146». `TRANG-GHEP.md` mục 5.7 có số dòng `index.ts:1702–1703` và `xac-nhan-route.ts:116, 118`. Tôi đã mở lại hai tệp đó: số dòng vẫn đúng |
| A-4 bật lại giá trị đã tắt | Đã đóng | Đ1 mục «Bật lại»; Đ4 cửa (d); `TRANG-GHEP.md` mục 3 có dòng «Bật lại», mục 3b có nút «Bật lại»; tiêu chí 17b |
| A-5 lệch số | Đã đóng | Đầu tệp nói «bốn cửa: ba mới, một có sẵn», khớp Đ4 (a)–(d). Trang ghép mục 5.2 nói «sáu cửa» = 3 cửa của ADR-0146 + 3 cửa mới, cũng khớp. Cả hai tệp đều ghi «hai cột đặc điểm» |
| A-6 mốc 14 ngày | Đã đóng | Đ5 mục 2 ghi «hằng số hiển thị, bề mặt, đảo ngược được» |

### Trigger của `prc_sales_block` đọc `v_ctl_attribute_value`: có hợp với bài thân trigger không

**Hợp.** Tôi đã mở tệp kiểm.
- Bài `src/architecture.test.ts:1335` gọi `triggerBodyViolations` (`:1295–1308`):
  - lấy module chủ của bảng mang trigger (`prc_sales_block` → `pricing`);
  - với mỗi quan hệ thân trigger đọc mà không thuộc module đó: nếu là **view** có trong sổ và module chủ của view nằm trong `ALLOWED_EDGES[pricing]` thì hợp lệ.
- `v_ctl_attribute_value` mang tiền tố `ctl`, nên thuộc `catalog` (`:213`). `catalog` nằm trong `ALLOWED_EDGES.pricing` (`:57`).
- Ca tự kiểm `t_tu_kiem_ok` (`:1329–1330`) chứng minh đúng kiểu này: trigger trên `orders` đọc `v_pty_owner_company` → không vi phạm.
- **Hai điều kiện để bài xanh**, người thi công phải làm:
  - (1) view vào `docs/data-dictionary.json` với `module: "catalog"`; bài `:318` buộc điều này, Đ1 cũng đã ghi;
  - (2) thân trigger chỉ đọc **view**, không đọc thẳng `ctl_attribute_value`.
- Khoá ngoại của `prc_sales_block` làm SQLite đọc bảng cha `ctl_attribute` / `ctl_attribute_value` lúc chèn. Phần đọc này không bị tính cho trigger: bài trừ số lần đọc của câu chèn **không trigger** (`base`, `:1270–1283`). Ở bài 8(b), các lần đọc đó rơi vào nhánh «khoá ngoại của bảng đang ghi» (`:449–453`), hợp lệ vì có cạnh.
- Trigger `BEFORE INSERT` của `ctl_attribute_assignment` chỉ đọc `ctl_attribute_value`, cùng module: hợp lệ.

### Phát hiện vòng 2

#### R2-1 — NÊN SỬA — Câu C4 trình thiếu một vế của chỗ lệch 5.2
- **Vị trí:** `DE-XUAT-ADR.md`, bảng «Câu hỏi cho chủ», dòng C4, phương án (a) «kèm năm giới hạn: …».
- **Bằng chứng:** điều 5.2 có hai vế (`docs/ARCHITECTURE.md:93`):
  - vế 1: «dòng dữ liệu **có ngày hiệu lực**»;
  - vế 2: «không flexfield / JSON không lược đồ».
- Mục «Lệch có chủ ý» ở Đ1 liệt kê đủ năm giới hạn. Giới hạn 5 ghi rõ hai bảng định nghĩa **chỉ có cờ `active`, không có ngày hiệu lực**, và gọi đó là «cũng là một phần của chỗ lệch, chủ duyệt cùng».
- C4 (a) không nhắc giới hạn 5. Chữ «năm giới hạn» trong C4 thật ra là năm mục khác: tách «không chữ tự do» và «không JSON» thành hai mục, rồi bỏ mục bảng gắn có hiệu lực / định nghĩa không có ngày. Như vậy câu chủ trả lời hẹp hơn chỗ lệch thật.
- C4 nói «có hàng rào máy». Đúng một phần: hàng rào (l) chỉ phủ một phần giới hạn 4, xem R2-2.
- **Câu sửa đề nghị:** C4 (a) đổi thành «Duyệt lệch hẹp, kèm năm giới hạn ở Đ1: (1) đặc điểm, giá trị là dòng có kiểu, có khoá; (2) không chữ tự do, không JSON; (3) chỉ làm điều kiện của luật đã có ADR, dùng cho tiền phải có ADR riêng; (4) mã không rẽ nhánh theo đặc điểm cụ thể (hàng rào (l)); (5) bảng gắn có hiệu lực theo thời gian và nhật ký, **hai bảng định nghĩa chỉ có cờ bật/tắt, không có ngày hiệu lực** (giống nhóm dịch vụ).»

#### R2-2 — NÊN SỬA — Hàng rào (l): vế 1 kiểm được nhưng yếu; vế 2 chưa kiểm được như đang viết
- **Vị trí:** Đ6 (l).
- **Vế 1** («không chuỗi hằng mang dạng mã do máy sinh, tiền tố riêng»): **kiểm được**.
  - Cách làm: quét bản đã che chú thích, tìm chuỗi kiểu `/["'`]<tiền tố>[0-9a-f]{12}["'`]/` trong `src/**/*.ts` (trừ `*.test.ts`) và `web/**/*.ts`.
  - Quan sát đỏ thật được (cài một chuỗi mã giả rồi gỡ).
  - Điều kiện: tiền tố phải khác `g` của `maNhomMoi` (`nhom-repo.ts:179`), nếu không bài sẽ bắt nhầm mã nhóm. Bản đề xuất chưa nói điều này.
  - Giới hạn: chỉ bắt **mã** viết cứng. Mã đọc từ biến môi trường hay từ bảng cấu hình khác thì bài không thấy. Điều này chấp nhận được với «canh quên, không canh cố ý», như `orders-cong-bo.test.ts` tự ghi.
- **Vế 2** («không so `name` của `ctl_attribute` / `ctl_attribute_value` với chuỗi hằng»): **chưa kiểm được bằng máy như đang viết**. Tên do người nhập nên không có danh sách để quét. Còn tìm «phép so `.name ===` với chuỗi» trên cả kho thì không phân biệt được `name` của bảng nào.
- **Câu sửa đề nghị:** viết lại vế 2 thành một luật kiểm được, dựa trên sổ đăng ký `defineSql`:
  - «không câu SQL nào của `pricing` hay `orders` đọc cột `name` của hai bảng định nghĩa». Hai view công bố đã «chỉ khoá; không tên» (Đ1), nên điều này có sẵn: `pricing` không đọc được tên nào;
  - «trong `catalog`, chỉ tệp nửa nghiêm mới đọc `name`, và chỉ để trả DTO hiển thị».
  - Hoặc ghi vế 2 là «dựa vào kỷ luật, người kiểm độc lập soát» (Điều 6.2) thay vì gọi là hàng rào.
  - Tiêu chí 20 («quan sát đỏ thật (l)») chỉ đạt được cho vế 1.

#### R2-3 — GHI NHẬN — Câu 409 «(Vận chuyển cảng–đảo: Không gồm)» lấy tên từ đâu chưa nói
- Đ2 «Cổng» viết: chữ lấy từ dữ liệu, không viết trong mã. Nhưng hai view công bố cho `pricing` chỉ có khoá, không có tên (Đ1), và `pricing` không được đọc thẳng bảng `ctl_*` (bài 8(b)). Tên phải đi qua một hàm công bố của `catalog` (`pricing → catalog` import `index.ts` được phép), hoặc do `orders` ghép.
- Đường nào cũng hợp lệ. Nên ghi một dòng để người thi công không thêm cột `name` vào view. Nếu thêm cột tên vào view, vế 2 của (l) theo R2-2 sẽ mất chỗ dựa.

#### R2-4 — GHI NHẬN — Cảnh báo «bật lại» dựa vào việc Quản trị giữ `sales.block.write`, nhưng không có hàng rào
- Đ4 (d) và trang ghép 3b: màn bật lại (ô `admin.manage`) đọc route luật của `pricing` để cảnh báo. Hàng rào (i) chỉ canh `catalog.attribute.assign ⊆ sales.block.write`, không canh `admin.manage ⊆ sales.block.write`.
- Hôm nay ADR-0146 Đ5 cho Quản trị và Toàn quyền giữ ô này, nên không sao. Nếu sau này bỏ Quản trị khỏi `sales.block.write`, cảnh báo bật lại sẽ im lặng. Rẻ nhất là mở rộng (i) thêm vế này, hoặc ghi một dòng «dựa vào kỷ luật».

#### R2-5 — GHI NHẬN — Lời A nói về B đã khớp với bản B đang sửa, nhưng chỉ xác nhận lúc soát vòng 2 B
- A ghi «Lượt B thống nhất theo cách này (`CHECK`)» và «hợp lại là 8 cửa». Bản B hiện trên đĩa (dòng 7, dòng 107) đã có `CHECK (scope IN ('SERVICE','GROUP'))`.
- Tôi chưa soát bản B; người soạn B ghi là chưa được soát lại. Sẽ đối chiếu khi soát vòng 2 B.
- Thứ tự mục ở Đ6: (l) đứng trước (k). Chỉ là trình bày.

### Bản sửa có gây lỗi mới không
- Không thấy lỗi sự thật mới. Các số dòng mới viện dẫn đều khớp mã tại `a129d3d`: `architecture.test.ts:334–353, 1335, 57`; `index.ts:1702–1703`; `xac-nhan-route.ts:116, 118`.
- Đếm trần vẫn **3**, cộng một mục duyệt thêm (C4). Cách đếm đúng: sửa A-1 bằng trigger nên không nới hàng rào, không thêm mục.
- Tiêu chí mới 13 (giá trị không thuộc đặc điểm, kiểu phạm vi lạ) và 17b kiểm được. Riêng vế «màn hiện cảnh báo» của 17b dựa vào kịch bản Chrome, máy chủ không ép; bản đề xuất đã ghi rõ điều đó.

---

## Vòng 2 — B (soát lại bản B đã sửa, 30/10)

- **Phạm vi:** `B-dong-ban/DE-XUAT-ADR.md` (479 dòng) và `TRANG-GHEP.md` (134 dòng), bản sửa theo B-1 … B-9. Chỉ đọc. Đã mở lại `src/modules/orders/index.ts` và `xac-nhan-route.ts` để đối chiếu.
- **Kết luận: ĐẠT.** Không còn phát hiện CHẶN. Còn 2 NÊN SỬA, đều chỉ phải sửa chữ. Tôi khuyên sửa trước khi trình chủ, nhưng chúng không chặn việc trình: R2B-1 (kẽ của `CHECK` khi chèn) và R2B-2 (chữ hàng rào tiêu chí 15). Thêm 3 GHI NHẬN.

### Các phát hiện vòng 1 đã đóng chưa

| Phát hiện | Trạng thái | Bằng chứng trong bản sửa |
|---|---|---|
| **B-1 (CHẶN)** B4 bị nới | **Đã đóng** | Đ3 (a) «Riêng Còn vé có thân `ngayDi`»: xét cả ngày đã lưu lẫn ngày mới, trúng một trong hai là 409. Đ3 (e) ghi: đơn chờ «không bấm Còn vé được (409), kể cả khi kèm đổi ngày; chỉ còn Hết vé hoặc Huỷ». Câu báo ở Còn vé đã bỏ lối đổi ngày. Tiêu chí 9 có vế «Còn vé kèm `ngayDi` 05/11 → vẫn 409». Có thêm phương án bị bác ghi đích danh B4. Lối cũ chỉ còn ở «gợi ý cho sau», ghi rõ là trái B4 và phải có quyết định mới. Trang ghép 3, 3b, 5.2 đã khớp |
| B-2 Còn vé xét ngày đã lưu | Đã đóng | Quy ước mới (đối chiếu ở mục dưới) làm lời gọi bên trong `kiemCongXacNhan` (ngày đã lưu) nhất quán với lời gọi tường minh. Tiêu chí 9 và 9b không còn tự mâu thuẫn |
| B-3 8 cửa | Đã đóng | Bảng Đ3 (c) có 8 dòng, mỗi dòng ghi bước luật bán / bước đóng bán. Đối chiếu ở mục dưới |
| B-4 đếm trần | Đã đóng | Cuối Đ4 có «hai cách nhìn». Bảng «Đếm» ghi «3 nếu không tính Đ4; 4 theo tiền lệ ADR-0146». C6 nêu tiền lệ, khuyến nghị (b) tách B-lõi / B-hiển thị, phát hành cùng nhau |
| B-5 `CHECK` cho `scope` | Đã đóng | Đ1: `CHECK (scope IN ('SERVICE','GROUP'))`, có lý do khác tiền lệ 0119. Thêm tiêu chí 1b. Khớp Lượt A |
| B-6 mở lại ở hai ca biên | Đã đóng; còn một kẽ nhỏ, xem R2B-1 | Đ1 «Quy tắc mở lại ở hai ca biên», «Ràng buộc nào ở đâu», tiêu chí 1c |
| B-7 mốc tin | Đã đóng | Đ6 mục 2: mốc tin = muộn nhất của (lúc tạo lần đóng; lúc bắt đầu nếu đã qua; `orders.updated_at`) |
| B-8, B-9 | Đã đóng | «Quan hệ với ADR cũ» ghi «Bổ sung ADR-0146 Đ3 về chỗ đặt nếu C5 = (a)». H6 đã sửa đủ hai trường hợp cờ ẩn chặn. `catalogStatusOf` ghi dòng 301 |

### Quy ước «Còn vé xét cả ngày đã lưu lẫn ngày mới» có đúng với mã không

**Đúng.** Đã mở tệp `src/modules/orders/xac-nhan-route.ts`:
- Còn vé nạp `order` ở `:255`. `body.ngayDi` được kiểm (dạng, không quá khứ, trong cửa sổ) ở `:262–268`. Chốt nhóm tắt ở `:296`, mốc đặt gấp ở `:297–305`, `kiemCongXacNhan(…, order, …)` ở `:309` với **order đã nạp**, tức ngày đã lưu.
- Ngày mới chỉ đi vào lô ở `:312–314` (`cauDoiNgayChang`). Câu này ghi **mọi** dòng của đơn, vì `xac-nhan-repo.ts:83` là `UPDATE order_service SET depart_date = ?1 WHERE order_id = ?2 …`. Vì vậy «ngày mới» áp cho cả đơn.
- Lời gọi tường minh đặt trước `:296` có đủ cả hai ngày: ngày đã lưu (trong `order`) và ngày mới (biến `ngayDi`, đã kiểm hợp lệ). Lời gọi lặp lại ở đầu `kiemCongXacNhan` (`:309`) chỉ thấy ngày đã lưu. Như vậy nó luôn trùng hoặc ít hơn lời gọi tường minh, không bao giờ cho kết quả khác chiều, nên đúng là «vô hại».
- Tiêu chí 14 (đóng bán thắng `short_notice_required`) đạt được, vì cổng đứng trước `:297–305`.
- Về nghĩa: chặn khi trúng ở ngày đã lưu là đúng chữ B4. Chặn khi trúng ở ngày mới là đúng B3 (không bán vượt bằng cách đổi ngày vào khoảng đóng).

### Bảng 8 cửa có khớp ADR-0146 Đ3 không

**Khớp.**
- ADR-0146 Đ3 (`docs/adr/ADR-0146-…md:49–52`) có 7 cửa: lập đơn, sửa nháp, `/status`, đổi bên đặt, Gửi xác nhận, Còn vé, Gửi đơn. Cả 7 đều có «bước luật bán: có» trong bảng Đ3 (c) của B.
- Cửa thứ 8 là sửa chuyến, có «bước luật bán: không». Điều này đúng, vì ADR-0146 không canh sửa chuyến.
- Số dòng đều khớp mã:
  - `index.ts`: lập đơn `:1110`, sửa nháp `:1225`, sửa chuyến `:1289`, đổi bên đặt `:1595`, `/status` `:1664`;
  - `xac-nhan-route.ts`: Gửi xác nhận `:100`, Gửi đơn `:135`, Còn vé `:254`.
- Thứ tự ở route đổi bên đặt (`order.trip.edit` → `chanBenDatDoiTac` → cổng) khớp mã: `can` ở `index.ts:1602`, `chanBenDatDoiTac` ở `:1610`.
- Riêng `/status` và Gửi xác nhận, chỗ đặt «trước `tinhCanXacNhan`» phụ thuộc câu C5. Bảng ghi đúng là [người soạn — xem (d)].

### `CHECK` cho phép «lần đóng rỗng» khi mở lại sớm có hợp lý không

**Hợp lý.**
- `CHECK (valid_to_at IS NULL OR reopened_at IS NOT NULL OR valid_to_at > valid_from_at)` giữ được bất biến lúc tạo. Nó cho phép đúng một ca lệch: dòng đã mở lại có `valid_to_at ≤ valid_from_at`.
- Luật xét `valid_from_at ≤ bây giờ < valid_to_at` trên khoảng rỗng không bao giờ đúng, nên lần đóng không bao giờ có tác dụng.
- Cách khác là kẹp `valid_to_at = max(reopened_at, valid_from_at)`. Cách đó giữ được `≥` mà không cần ngoại lệ, nhưng làm vỡ quy tắc đơn giản `valid_to_at = reopened_at`. Hai cách đều đúng; cách của B dễ kiểm hơn.
- Quy tắc «không mở lại lần đóng đã quá kết thúc dự kiến» (409, và trigger từ chối `NEW.valid_to_at > OLD.valid_to_at`) đúng với SQLite. Khi `OLD.valid_to_at` là NULL, phép so cho NULL, nên trigger không từ chối. Đúng ý: lần đóng không có hạn thì luôn mở lại được.
- Còn một kẽ ở lúc **chèn**, xem R2B-1.

### Phát hiện vòng 2

#### R2B-1 — NÊN SỬA — Ngoại lệ «đã mở lại» của `CHECK` có thể bị lách ngay lúc chèn
- **Vị trí:** Đ1, cột `valid_to_at` và đoạn «Ràng buộc nào ở đâu».
- **Suy luận:** danh sách trigger không có luật nào buộc `reopened_at`, `reopened_by`, `reopen_note` phải trống **lúc chèn**. Một câu `INSERT` có sẵn `reopened_at` sẽ:
  - qua được vế `reopened_at IS NOT NULL` của `CHECK`, nên chèn được dòng có `valid_to_at ≤ valid_from_at`;
  - tạo ra một dòng «sinh ra đã mở lại», mang người mở lại giả, không qua ô `catalog.sale.resume`.
- Dòng như vậy vô hại về chặn bán (rỗng), nhưng làm sai sổ người mở lại. Máy chủ sẽ không viết câu này; đây là lỗ ở lưới CSDL mà Đ1 nhận là lưới.
- **Câu sửa đề nghị:**
  - thêm trigger `BEFORE INSERT`: `reopened_at`, `reopened_by`, `reopen_note` phải NULL;
  - thêm `CHECK (reopened_at IS NULL OR valid_to_at = reopened_at)`, đưa luật «`valid_to_at = reopened_at`» lên cấp bảng;
  - thêm tiêu chí 1d: «CSDL từ chối chèn dòng có `reopened_at`».

#### R2B-2 — NÊN SỬA — Chữ của hàng rào tiêu chí 15 vế 1 sẽ đỏ oan ở Gửi đơn
- **Vị trí:** Đ3 tiêu chí 15, gạch đầu: «mọi thân route … có lời gọi … `soanXacNhan(` / `moYeuCau(` phải có lời gọi hàm cổng chung đứng trước».
- **Bằng chứng (đã mở tệp):** thân route Gửi đơn gọi `kiemCongXacNhan(` ở `xac-nhan-route.ts:150`, `moYeuCau(` ở `:156`, `soanXacNhan(` ở `:162`. Theo bảng Đ3 (c) dòng 7, cổng chung của cửa này nằm **trong** `kiemCongXacNhan`, nên thân route không có lời gọi trực tiếp. Bài văn bản viết đúng chữ trên sẽ đỏ với mã đúng, hoặc ép thêm một lời gọi thừa.
- **Câu sửa đề nghị:** đổi thành «… phải có lời gọi hàm cổng chung **hoặc `kiemCongXacNhan(`** đứng trước». Vế «`kiemCongXacNhan` có lời gọi hàm cổng chung ở đầu thân» đã có sẵn, nên vẫn kín.

#### R2B-3 — GHI NHẬN — «Sắp hiệu lực» phải loại lần đóng rỗng và lần đóng đã mở lại
- `dongBanChoForm` («đang và sắp hiệu lực»), trang «Tình trạng bán» (Đang / Sắp / Đã kết thúc) và tin hình chiếu ở Đ6 đều cần điều kiện `valid_to_at IS NULL OR valid_to_at > bayGio`.
- Nếu chỉ lọc theo `valid_from_at > bayGio`, lần đóng «sau 5 giờ» đã được mở lại sau 1 giờ vẫn hiện là «Sắp», vẫn làm mờ thẻ, vẫn sinh tin.
- Nên thêm một tiêu chí ở Đ4 hoặc Đ6: «đóng sau 5 giờ, mở lại sau 1 giờ → form không mờ, tin biến mất, trang xếp vào Đã kết thúc».

#### R2B-4 — GHI NHẬN — Trang ghép mục 5.1 còn câu cũ
- «Hàm chung nhận danh sách dòng **sau khi áp thay đổi**» không còn đúng hẳn với Đ3 (a) mới. Ở các cửa gửi và xác nhận, hàm nhận ngày **đã lưu**; ở Còn vé, hàm nhận cả hai ngày.
- Sửa câu cho khớp Đ3 (a).

#### R2B-5 — GHI NHẬN — Đối chiếu A ↔ B sau vòng 2
- Hai bản nhất quán ở bốn điểm:
  - `CHECK` cho tập phạm vi ở cả hai bảng;
  - 8 cửa (A, trang ghép 5.7 ↔ B, Đ3 (c));
  - lớp bọc `congBanDuoc` và câu C5;
  - đặc điểm cho đóng bán: «chưa» (B C2 ↔ A 5.7).
- Không thấy mâu thuẫn mới về tên bảng, tên hàm, mã lỗi hay ô quyền.

### Bản sửa có gây lỗi mới không
- Không thấy lỗi sự thật mới. Các số dòng mới đều khớp mã tại `a129d3d`: `index.ts:1595, 1602, 1610`; `xac-nhan-route.ts:150, 156, 162, 255, 296, 309, 312–314`; `xac-nhan-repo.ts:83`.
- Đếm trần: được trình đúng, 3 hoặc 4 tuỳ câu C6. Phương án tách B-lõi (Đ1, Đ3, Đ5) / B-hiển thị (Đ4) hợp lệ: không điều nào của B-lõi cần Đ4 để đúng. Cái giá là Đối tác có thể gặp 409 khi B-hiển thị chưa lên; người soạn đã ghi «phát hành cùng».
- Kẽ duy nhất do bản sửa sinh ra là R2B-1, vì ngoại lệ trong `CHECK` là phần mới.

---

## Vòng 3 — A (bản viết lại theo lượt 4 của chủ, 30/10)

- **Phạm vi:** `A-dac-diem-dich-vu/DE-XUAT-ADR.md` (330 dòng) và `TRANG-GHEP.md` (126 dòng), đối chiếu với bản ghi `00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-4-LUAT-BAN-CHUNG.md`. Chỉ đọc.
- **Cách đối chiếu:** `diff` giữa bản viết lại và bản trước lượt 4 (`/tmp/A-DE-XUAT-truoc-L4.md`, `/tmp/A-TRANG-GHEP-truoc-L4.md`). Tôi đã kiểm hai bản `/tmp` này trùng từng byte với bản trong commit `417c1fe` (`git show HEAD:… | diff -q` không ra gì).
- **Kết luận: ĐẠT.** Không có phát hiện CHẶN. 1 NÊN SỬA (R3-1, ca vàng CV-4), 3 GHI NHẬN.

### (1) Bản viết lại có đổi nghĩa kỹ thuật không

**Không.** Mọi dòng khác nhau trong `diff` đều thuộc ba loại:
- dòng trạng thái và các câu «chủ đã chọn …»;
- câu trình bày khả năng chung (tiêu đề, khối «Khả năng chung», tóm tắt, đoạn mở Đ2);
- đưa ví dụ Hòn Tằm ra khỏi thân bài, sang mục «Ca vàng».

Từng phần kỹ thuật được giữ nguyên:
- **Bảng, trigger:** Đ1 (ba bảng, khoá ngoại một cột, trigger, view, tắt / bật lại) và Đ2 (bảng kiểu phạm vi, `CHECK`, trigger đọc `v_ctl_attribute_value`, cách xét ba vế) không đổi chữ nào, trừ câu ví dụ về miễn một vé. Câu đó vẫn cùng nghĩa: không có ngoại lệ «chặn nhóm trừ một vé»; muốn miễn một vé thì dùng luật `ATTRIBUTE` kèm nhóm cùng giá trị riêng.
- **Quyền, cổng:** Đ3, Đ4 và phần «Cổng» của Đ2 không đổi. Riêng câu 409, ví dụ cụ thể được thay bằng «(<tên đặc điểm>: <tên giá trị>)».
- **Hàng rào, đếm:** Đ6 (e)–(l) không đổi. Đếm vẫn **3** cộng một mục lệch 5.2. Câu «nếu C2 = (b) thì vượt trần» được thay bằng «chủ đã chọn A-C2 = (a)»; đây là hệ quả của lựa chọn, không phải đổi nghĩa.
- **Trang ghép:** chỉ đổi tiêu đề, thêm hai dòng trạng thái và khả năng chung, đổi chữ ở dòng đếm và hai câu ví dụ đưa đón. Mục 1–3 (thực thể, quyền, cổng) không đổi.
- **Các bản sửa sau vòng 2** (đã có trong `417c1fe`, nay mới được soát): đã đóng R2-1 đến R2-4.
  - C4 / A-C4 có đủ năm giới hạn, kể cả giới hạn 5 (định nghĩa không có ngày hiệu lực).
  - (l) tách thành (l1) quét được, (l2) trên sổ `defineSql`, (l3) dựa vào kỷ luật.
  - Có nguồn tên cho câu 409: lấy qua hàm hẹp của `catalog`, không thêm cột tên vào view.
  - (i) có thêm vế `admin.manage ⊆ sales.block.write`.
  - Ghi chú về (l2): vế này gần trùng với những gì bài 8(b) và (e), (f) đã chặn. Lý do: `pricing` không đọc được bảng `ctl_*`, và `orders` không được nhắc tên bảng. Vì vậy (l2) gần như tự đúng nhưng vô hại.

### (2) Các lựa chọn của chủ ghi có đúng bản ghi lượt 4 không

**Đúng.** Bảng «Chủ đã chọn 30/10» khớp từng mục L4-0, L4-1, L4-2, L4-3, A-C1, A-C2, A-C3, A-C4 của bản ghi:
- L4-2 ghi đúng là «chưa chọn», hai nghĩa đều là dữ liệu;
- A-C4 «kèm năm giới hạn» khớp năm giới hạn ở Đ1 và ở C4 của bản trước (bản chủ đã đọc);
- lời chủ chép đúng nguyên văn, kể cả chính tả «ôk».

Bảng ghi rõ cột «Đã chọn» là cách người ghi chép ghi lại, không phải lời chủ.

### (3) Tám ca vàng có đúng theo luật trong đề xuất không

| Ca | Đánh giá |
|---|---|
| CV-1 | Đúng: Đ2 vế 1, ADR-0146 Đ4 (chỉ danh mục của tài khoản Đối tác bị ép bên đặt mới bỏ vé) |
| CV-2 | Đúng: vế 2; gán nhóm là cửa đổi kết quả, Đ4 (c) |
| CV-3 | Đúng: vế 3 kèm nhóm. Vé mới vào nhóm thừa hưởng giá trị chung qua view (nhóm phải đang dùng). H1 đặt riêng nên thoát luật (riêng thắng chung). Vé «Không gồm» ngoài nhóm không bị chặn |
| CV-4 | **Kết quả đúng**; xem R3-1 về cách dựng dữ liệu. **Hai dòng luật hợp với «mỗi luật một điều kiện đặc điểm»**: điều cấm là gộp nhiều điều kiện vào **một** dòng («A = x **và** B = y», Đ2). Hai dòng, mỗi dòng một giá trị, là hai luật riêng, cộng dồn theo «chặn thắng» (Đ2: không có thứ tự ưu tiên). Kết quả là phép **hoặc** giữa các giá trị, đúng như ca mô tả |
| CV-5 | Đúng: hai luật cho hai loại khác nhau, độc lập. Xem R3-2 |
| CV-6 | Đúng: Đ5 (không giá trị hiệu lực thì vế 3 không phủ); danh sách chưa khai tính lúc đọc. Ghi thêm: nếu nhóm Hòn Tằm đã gắn chung «Không gồm» (dữ liệu của CV-3) thì chỉ cần gán H9 vào nhóm là bị chặn; khai riêng là thừa nhưng không sai |
| CV-7 | Đúng theo ADR-0146 Đ1 / tiêu chí 5. Xem R3-3 |
| CV-8 | Đúng: Đ4 (a), A-C2. Nháp bị xét ở lần lưu kế tiếp; đơn đã xác nhận giữ nguyên. «Đổi ngược lại» (đặt riêng «Không gồm», hoặc đóng dòng riêng để theo nhóm) đều đưa giá trị hiệu lực về «Không gồm», nên đúng |

### (4) Tiêu chí 10b, 12b có kiểm được không

- **10b: kiểm được** bằng bài route: dựng hồ sơ bên đặt mang `L` / `L2`, gọi lập đơn, nhận 201 hoặc 409. Thiếu vế nhóm của CV-4 / CV-5, nhưng tiêu chí 9 đã phủ vế nhóm. Có thể thêm ca bên đặt mang cả `L` lẫn `L2` (R3-2).
- **12b: kiểm được**, nhưng trùng tiêu chí 5 của ADR-0146. Chữ «ngay» phụ thuộc cách hiểu «ngày kết thúc» (R3-3).

### Phát hiện vòng 3

#### R3-1 — NÊN SỬA — CV-4 dựng một đặc điểm **trùng tên** với CV-3 nhưng khác bộ giá trị; hai bộ dữ liệu không cùng tồn tại được
- **Bằng chứng:**
  - Đ1 mục 1: «Tên trùng chỉ cấm giữa các đặc điểm đang dùng (chỉ mục duy nhất một phần)».
  - CV-3 dùng «Vận chuyển cảng–đảo» = {Gồm, Không gồm}. CV-4 dùng «Vận chuyển cảng–đảo» = {Khứ hồi, Một chiều, Không gồm}.
  - CV-5 lại viện dẫn «theo CV-3».
- **Hệ quả:** người đọc (và người viết bài e2e theo ca vàng) dễ hiểu CV-4 là bộ dữ liệu cộng thêm vào CV-3, trong khi CSDL sẽ từ chối.
- **Câu sửa đề nghị:** ghi ở CV-4: «**Bộ dữ liệu thay cho CV-3** nếu chủ chọn nghĩa (i). Cách làm trên màn: thêm giá trị «Một chiều» vào đặc điểm có sẵn, và (nếu muốn) đổi tên «Gồm» thành «Khứ hồi». Đổi tên một giá trị đang bị luật trỏ tới thì màn cảnh báo (Đ4 mục 4); mã không đổi.» Bài kiểm vẫn dùng tên tự sinh, nên không bị ảnh hưởng.

#### R3-2 — GHI NHẬN — CV-5 nói «cộng dồn kiểu chặn thắng», nhưng ca này chỉ có cộng dồn khi một bên đặt mang cả hai loại
- Hai luật của CV-5 thuộc hai loại khác nhau. Một hồ sơ chỉ mang một loại thì chỉ chịu một luật. Hồ sơ mang **cả** Lễ tân khách sạn lẫn Công ty lữ hành thì không đặt được vé Hòn Tằm nào, dù «Gồm» hay «Không gồm». Đây là hệ quả đúng của Đ2, nhưng nên nói ra.
- Đề nghị thêm vế đó vào 10b: «bên đặt mang cả `L` và `L2` ⇒ không đặt được vé `x1`, `x2`, `x3`».

#### R3-3 — GHI NHẬN — «Đặt lại được **ngay**» (CV-7, 12b) phụ thuộc nghĩa «ngày kết thúc» của ADR-0146 Đ1
- ADR-0146 Đ1 ghi «ngày kết thúc», còn Đ2 ghi «xét theo ngày giờ Việt Nam lúc thao tác». Nếu ngày kết thúc là ngày dân sự tính **trọn** ngày, thì kết thúc luật «hôm nay» vẫn còn chặn tới hết hôm nay, và «ngay» không đúng.
- Câu này kế thừa nguyên từ ADR-0146 tiêu chí 5, không phải lỗi của bản viết lại. Kế hoạch thi công ADR-0146 phải chốt một nghĩa: mốc giờ, hay ngày tính trọn / không tính trọn. Tiêu chí 12b phải theo nghĩa đó.

#### R3-4 — GHI NHẬN — Chữ nhỏ
- Bảng «Đếm», dòng lệch 5.2, vẫn ghi «không — nhưng chủ phải duyệt riêng», trong khi các chỗ khác ghi «đã duyệt». Nên đổi thành «không — đã duyệt riêng (A-C4)».
- Khối «Khả năng chung» viết «Quản trị / Bán hàng nhập». Ô `sales.block.write` gồm Bán hàng, Quản trị, **Toàn quyền**.
- Tóm tắt mục 1 viết «Mỗi quy tắc có ngày bắt đầu, ngày kết thúc». Nên thêm «ngày kết thúc có thể để trống», đúng ADR-0146 Đ1.
