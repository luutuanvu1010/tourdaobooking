# Đề xuất ADR-0229 — Giá mùa vụ: bảng quy tắc chỉ-thêm theo ngày đi và một hàm tính duy nhất ở máy chủ

> **Loại tệp:** bản đề xuất (hồ sơ có ngày). Chủ duyệt thì chép từ dòng «Ngày» trở xuống sang `docs/adr/ADR-0229-gia-mua-vu.md`, giữ từng chữ, như ADR-0220 đã làm.
> **Trạng thái:** **đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (Hiến pháp N3). Ba câu của đợt chủ đã trả lời 21/11 (qua phiên điều phối): **10a — KHÁC khuyến nghị**, nguyên văn «Đại lý không hưởng hoa hồng trên phần tăng giá mùa vụ»; **10b — có** (% trước rồi cộng, làm tròn lên 1.000 đ); **10c — có** (người đặt khác người duyệt). Các chỗ ghi [ĐÃ CHỐT 10a/10b/10c] dưới đây theo câu trả lời đó.
> **Người soạn:** phiên thi công Việc 10 (kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` trên nhánh `claude/partner-features-detailed-plan-f32f89`, mục 5 «Việc 10»). Số 0229 và migration 0188–0189 do phiên điều phối giữ trước cho việc này.
> **Điều kiện trước:** nhánh ADR-0218 (`claude/redesign-pricing-subsystem-50496b`, phí đón theo giá gốc) phải vào bản chính trước khi sửa mã tính giá — cùng sửa `src/modules/catalog/{index,rules,service,sheet,repository}.ts`. Kiểm 21/11 22:40: **chưa vào**.
> **Kèm:** sổ vàng `docs/superpowers/specs/2026-11-21-so-vang-gia-mua-vu.md` (bản đọc cho Kế toán) + `src/shared/gia-mua-vu.so-vang.json` (bản máy đọc); trang ghép ở cuối tệp này (CLAUDE.md §9, Hiến chương 5.28).

---

- **Ngày:** 2026-11-21.
- **Nguồn:** kế hoạch 16 việc (21/11), Việc 10; ADR-0201 (hướng của chủ: giá theo mùa tính theo ngày đi; màn Chi tiết dịch vụ đã chừa chỗ «Giá theo mùa»).
- **Loại:** việc lớn (tiền, quyền, dữ liệu). **Cửa:** một chiều mềm — bảng chỉ-thêm ở lại; tắt hành vi bằng cách kết thúc mọi quy tắc.
- **Quan hệ với ADR cũ:** **giữ** ADR-0201 (Sheet là nguồn giá gốc; ghi đè của Quản trị), ADR-0090 (nhóm «quyền tiền» `O_GHI_TIEN` không đổi), ADR-0161 (mức hoa hồng, trần, rào vượt thành tiền giữ nguyên; **bổ sung**: cơ sở của hoa hồng theo % bỏ phần tăng mùa vụ — Đ10), ADR-0218 (phí đưa đón có luật riêng, **không** chịu giá mùa vụ), ADR-0220 (khuôn bảng khoảng ngày và danh sách cửa đổi ngày). **Bổ sung** Q11 (điều kiện giữ bản chụp của nháp) và BK5 (giá danh mục đã xem). Không thay ADR nào.
- **Xây trên lỗ đang hở:** **không.** Đã đối chiếu HC-4.2 (sổ `docs/quyen-hoan.json`, hạn 30/11/2026: bút toán điều chỉnh sổ tiền chưa có người duyệt khác người tạo): ADR này không tạo bút toán, không ghi sổ, không tính lại tiền đơn đã xác nhận — đổi ngày sang mùa khác bị **chặn** (Đ6), nên không đi qua đường điều chỉnh đang hở.

## Bối cảnh

Giá dịch vụ lấy từ Google Sheet (cũng là nguồn của website), không có ngày hiệu lực; Quản trị ghi đè được; giá chụp vào dòng đơn lúc lưu nháp; đơn đã xác nhận không đổi giá (trigger 0081). Hôm nay giá **không theo ngày đi**. Chủ muốn tăng giá theo mùa (Tết, hè) cho một dịch vụ hoặc cả nhóm, theo ngày đi.

## Quyết định

1. **Đ1 — Bảng quy tắc, thuộc phân hệ danh mục, chỉ-thêm** (khuôn `ctl_sales_pause`, migration 0180). Bảng `ctl_seasonal_price` (migration **0188**). Mỗi dòng: phạm vi `SERVICE` (mã dịch vụ) hoặc `GROUP` (mã nhóm); ngày đi đầu, ngày đi cuối (gồm cả hai đầu, ngày dân sự Việt Nam; cuối không trước đầu, không ở quá khứ lúc tạo — kiểm ở máy chủ); **tăng %** (số nguyên 0…trần) và **tăng số tiền** (VNĐ nguyên ≥ 0), ít nhất một trong hai > 0; ghi chú ngắn; người, lúc tạo; **người, lúc duyệt** [ĐÃ CHỐT 10c]; người, lúc kết thúc. Trigger: cấm xoá; cấm sửa mọi cột trừ **đặt mốc duyệt một lần** và **đặt mốc kết thúc một lần**; CSDL ép `approved_by <> created_by`. Chỉ tăng: không có quy tắc giảm giá.
   - **Thứ tự kiểm lúc nhập** (mỗi lần trả đúng một mã, theo thứ tự này): `phan_tram` (không phải số nguyên ≥ 0) → `so_tien` (không phải số nguyên ≥ 0) → `khong_tang` (cả hai bằng 0) → `vuot_tran` (% > trần) → `khoang_ngay` (cuối trước đầu) → `qua_khu` (ngày cuối trước hôm nay) → chồng ngày (Đ3).
   - **Quy tắc chờ duyệt** kết thúc được như quy tắc đã duyệt (nút Kết thúc = bỏ bản chờ duyệt; cùng ô `catalog.seasonal.write`), để bản bị bỏ quên không chặn khoảng ngày mãi. Lúc **duyệt**, máy chủ kiểm lại trần % và chồng ngày, và từ chối (409) nếu ngày cuối đã qua hoặc quy tắc đã kết thúc.
2. **Đ2 — Chọn quy tắc.** Với một dịch vụ có mã và **ngày đi của chính dịch vụ đó**: xét các quy tắc **đã duyệt, chưa kết thúc**, có khoảng chứa ngày đi. Quy tắc theo **mã dịch vụ thắng** quy tắc theo **nhóm hiện hành** của dịch vụ. Không cộng dồn: áp đúng **một** quy tắc hoặc không quy tắc nào. Dịch vụ chưa có ngày đi, dòng nhập tay, phí đưa đón: không xét.
3. **Đ3 — Chồng ngày bị chặn lúc nhập.** Hai quy tắc **cùng phạm vi, cùng mã** (hai quy tắc của cùng dịch vụ, hoặc hai của cùng nhóm) có khoảng chồng nhau ⇒ máy chủ từ chối lúc tạo (409 `seasonal_overlap`), và trigger lưới thứ hai ở CSDL. Quy tắc dịch vụ chồng quy tắc nhóm thì được (Đ2 quyết). Quy tắc chờ duyệt cũng tính vào chồng ngày (không cho hai bản nháp đua nhau).
4. **Đ4 — Một hàm tính duy nhất, ở máy chủ.** Hàm thuần `tinhGiaMuaVu` (tệp mới `src/shared/gia-mua-vu.ts`, để form xem trước cũng gọi đúng hàm này; máy chủ không tin số của trình duyệt). Thứ tự trong chuỗi giá: **giá Sheet → ghi đè Quản trị → giá mùa vụ → đơn giá thoả thuận**. Công thức [ĐÃ CHỐT 10b]: `giá mới = làm tròn LÊN tới 1.000 đ của (giá gốc × (100 + %) / 100 + số tiền)`, tính bằng số nguyên: `ceil((gốc × (100 + %) + tiền × 100) / 100000) × 1000`. Ngoại lệ đứng TRƯỚC công thức: (i) không có quy tắc ⇒ giá gốc giữ nguyên (không làm tròn); (ii) giá gốc 0 đ (khách miễn phí) ⇒ giữ 0 đ, coi như không có quy tắc (ca C19 sổ vàng, chờ Kế toán xác nhận); (iii) chưa có giá ⇒ giữ chưa có giá. Dịch vụ tính theo nhóm (đơn vị «nhóm tối đa N khách»): áp lên giá mỗi nhóm.
5. **Đ5 — Chụp vào dòng đơn (Hiến chương 5.6), mốc = mỗi lần máy chủ dựng dòng từ danh mục** (lập đơn, lưu nháp mà không giữ bản chụp). Migration **0189** thêm cột vào `order_item`: `base_price` (giá sau ghi đè, trước mùa vụ), `seasonal_rule_id`, `seasonal_increase` (số tăng **mỗi đơn vị** = `catalog_price − base_price`, số nguyên ≥ 0). Phần tăng của cả dòng không lưu riêng mà tính từ bản chụp: `seasonal_increase × số lượng HIỆN HÀNH` (để điều chỉnh số khách sau xác nhận kéo theo đúng phần tăng). Đây là chỗ Việc 6 (Kế toán) và mọi nơi đọc giá đại lý lấy phần tăng. **`catalog_price` = giá ĐÃ cộng mùa vụ**, nên luật R2 của đối tác và thực tập (đơn giá = giá danh mục) và BK5 tự đúng, đối tác không thể trả giá gốc. Migration 0189 thêm trigger khoá ba cột mới khi đơn không còn nháp (trigger 0081 liệt kê cột cũ theo tên, không tự phủ cột mới). Dòng cũ: ba cột NULL = «trước giá mùa vụ».
6. **Đ6 — Vá Q11 và chặn đổi ngày sang mùa khác.**
   - **Nháp:** điều kiện giữ bản chụp `kept` trong `catalogService` (`src/modules/orders/service-rules.ts`) hôm nay chỉ so mã và số khách; thêm **«ngày đi không đổi»**. Đổi ngày đi ⇒ dựng lại dòng từ danh mục như chọn mới (giá gốc hiện hành + quy tắc của ngày mới). Hệ quả chấp nhận: nháp có dịch vụ đã ngừng bán thì không đổi ngày được (báo `catalog_unavailable` như chọn mới).
   - **Đơn đã xác nhận (và đơn chờ xác nhận đã chụp):** ở **đúng các cửa đổi ngày đi** mà ADR-0220 Đ3 đã đếm (bài `src/ngung-ban-ngay-moi-cua.test.ts`, danh sách `CUA_NGUNG_BAN_NGAY`: `PUT /api/orders/:id`, `PUT /api/orders/:id/trip`, `POST /api/orders/:id/status`, Gửi xác nhận, Gửi đơn, Còn vé), máy chủ xét **«cùng mùa» theo bản chụp** của từng dòng: (a) dòng đã chụp quy tắc Q ⇒ cùng mùa khi ngày mới nằm trong khoảng của **chính Q** (dù Q đã kết thúc sau đó) **và** không có quy tắc đang áp nào khác thắng Q ở ngày mới (Đ2); (b) dòng chụp «không quy tắc» (hoặc dòng cũ trước ADR này) ⇒ cùng mùa khi ngày mới không có quy tắc đang áp nào. Không cùng mùa ⇒ 409 `seasonal_date_changed`, câu tiếng Việt nêu tên dịch vụ, không ghi gì. Cùng mùa ⇒ cho đổi, **tiền giữ nguyên**. Không tự tính lại tiền (HC-4.2). Có bài canh «mỗi cửa gọi cổng» theo khuôn bài của ADR-0220.
7. **Đ7 — BK5 theo ngày.** Đường đọc danh mục cho form lập đơn (`GET /api/catalog/for-order`, `src/modules/catalog/index.ts`; `GET /api/catalog` của màn Dịch vụ & giá dùng chung nguồn nhưng **giữ giá gốc** (không có ngày đi), quy tắc xem ở danh sách riêng; người dùng: `web/order-form.ts`, xem trước tiền ở `src/shared/service-form.ts`) nhận **ngày đi** và trả giá đã cộng mùa vụ; form gửi `catalogPriceSeen` = giá đó; đổi ngày trên form thì đọc lại. Máy chủ so với giá tính lại lúc lưu — quy tắc vừa được duyệt hay kết thúc giữa chừng thì báo `catalog_changed` như hôm nay (đúng ý BK5: không báo khách một giá rồi lưu giá khác).
7b. **Đ7b — Hai chỗ so «giá danh mục đã đổi» phải so theo ngày đi.** Hôm nay `catalogStatusOf` (`src/modules/orders/service-rules.ts`) so `catalog_price` đã lưu với giá hiệu lực **không theo ngày** (`eff.prices`). Nó được dùng ở hai nơi: cờ «Giá danh mục đã đổi» của nháp (`src/modules/orders/service.ts`) và cổng `congGiaDanhMucDoi` (`src/modules/orders/xac-nhan-chung.ts`, 409 `gia_danh_muc_da_doi`, chặn xác nhận của tài khoản Đối tác và Thực tập). Vì Đ5 cho `catalog_price` gồm mùa vụ, giữ nguyên thì mọi nháp trong mùa của Đối tác và Thực tập **không bao giờ xác nhận được**. Nên: cả hai nơi so `catalog_price` đã lưu với **`tinhGiaMuaVu(giá hiệu lực, ngày đi của chính dịch vụ, quy tắc đang áp)`** — cùng hàm Đ4, cùng câu ở hai nơi (đưa vào `catalogStatusOf`, truyền quy tắc và ngày đi xuống). Hệ quả có chủ ý: nháp của Đối tác hoặc Thực tập lưu **trước** khi quy tắc được duyệt (hay sau khi quy tắc kết thúc) bị chặn lúc xác nhận với câu «bỏ rồi chọn lại» như hôm nay; nháp của văn phòng chỉ hiện cờ, không bị chặn (như hôm nay với đổi giá Sheet).
8. **Đ8 — Quyền: ô mới, «quyền tiền mềm».**
   - `catalog.seasonal.write` (xem danh sách quy tắc, đặt, kết thúc) = hàm `keToanQuanLy()` sẵn có: **Quản lý bán hàng, Quản trị, Toàn quyền, Kế toán**. Tài khoản giữ quyền Đối tác bị từ chối. Không có ô đọc riêng: vai khác (Bán hàng…) không xem danh sách quy tắc, chỉ thấy giá đã cộng và dòng «Giá mùa vụ» trên form (Đ9).
   - `catalog.seasonal.approve` (duyệt) [ĐÃ CHỐT 10c] = cùng bốn vai, **người duyệt ≠ người đặt** (máy chủ + CHECK ở CSDL). Toàn quyền tự đặt rồi tự duyệt cũng không được.
   - `catalog.seasonal.cap` (đặt trần %) = **chỉ Toàn quyền**. Trần ở một dòng chính sách (bảng một dòng trong 0188, mặc định đề xuất **30 %** (Toàn quyền đổi được), chỉ-thêm theo `valid_from`). Hạ trần không đổi quy tắc đã duyệt; quy tắc mới phải ≤ trần lúc tạo **và** lúc duyệt.
   - **Không** thêm vào `O_GHI_TIEN` (ADR-0090): đặt giá không phải ghi tiền; nếu xếp vào thì luật PIN và luật gán vai của Quản trị, Quản lý bán hàng đổi hàng loạt. Ghi rõ đây là «quyền tiền mềm»: Quản trị gán được vai Quản lý bán hàng, nên tách nhiệm vụ dựa vào Đ8 «người duyệt ≠ người đặt» và nhật ký, không dựa vào gán vai.
   - Ba hành động nhật ký: đặt, duyệt, kết thúc — ghi mã dịch vụ hoặc nhóm, khoảng ngày, %, số tiền, người; không thông tin cá nhân.
9. **Đ9 — Giao diện.** Màn Dịch vụ & giá (và chỗ «Giá theo mùa» đã chừa ở Chi tiết dịch vụ): nút đặt ở dòng dịch vụ và ở nhóm, danh sách quy tắc (chờ duyệt / đang áp / đã kết thúc), nút Duyệt, Kết thúc. Nút ẩn/hiện bằng chính ô quyền (5.28). Form lập đơn hiện giá đã cộng mùa vụ; **người dùng văn phòng** thấy thêm một dòng nhỏ «Giá mùa vụ: +10 % +20.000 đ». **Tài khoản Đối tác chỉ thấy giá cuối**, không thấy % hay số tiền tăng (máy chủ không gửi hai số đó cho Đối tác). Tên nút, nhãn: chủ chọn theo 5.27 lúc thi công (đề xuất «Giá mùa vụ»).
10. **Đ10 — Hoa hồng không tính trên phần tăng** [ĐÃ CHỐT 10a]. Hôm nay hoa hồng theo % = làm tròn nửa lên tới đồng của (tỷ lệ × thành tiền dịch vụ) (`hoaHongDong`, `src/shared/hoa-hong-dong.ts`). Từ ADR này:
    - **Cơ sở hoa hồng theo %** của một dịch vụ = Σ trên các dòng tiền `max(0, đơn giá thoả thuận − seasonal_increase) × số lượng hiện hành` (dòng cũ: `seasonal_increase` NULL tính 0 ⇒ bằng thành tiền như hôm nay). Đơn giá thoả thuận thấp hơn giá danh mục thì **vẫn trừ đủ** phần tăng (đại lý không hưởng phần tăng dù văn phòng bớt giá); không âm.
    - **Hoa hồng theo số tiền mỗi khách / theo loại khách / theo lượt:** không đổi.
    - **Giá đại lý** = thành tiền − hoa hồng (thành tiền vẫn **gồm** phần tăng). Ví dụ chủ yêu cầu: 450.000 + mùa vụ 10 % và 20.000 đ ⇒ thành tiền 515.000, cơ sở hoa hồng 450.000; mức 10 % ⇒ hoa hồng 45.000, giá đại lý 470.000.
    - **Giá vốn nhà cung cấp:** **không đổi** (vẫn tính trên thành tiền đầy đủ) — AI tự quyết vì câu 10a chỉ nói hoa hồng; chủ bác thì thêm vào Đ10.
    - **Một chỗ tính:** `tinhDongDoiTac` (`src/shared/hoa-hong-dong.ts`) nhận thêm `coSoHoaHong` **bắt buộc** (không mặc định, để không nơi gọi nào quên); ba nơi gọi hôm nay đều phải truyền: DTO phần thương mại (`orders/thuong-mai.ts` `tinhCacDong`), giá đại lý (`orders/gia-dai-ly.ts`, Việc 6 đọc ở đây), và dòng thương mại lúc «Đã giao» (`billing/rules.ts` `dongThuongMaiTu`). Hàm thuần `coSoHoaHong` ở `src/shared/gia-mua-vu.ts`.
    - **Đường cấp dữ liệu** (đều phải sửa, liệt kê để người thi công không đoán): `tienChoHoaHong` (`orders/xac-nhan-chung.ts`) hôm nay chỉ nhận `{quantity, lineTotal}` — phải nhận thêm `unitPrice` và `seasonalIncrease` của từng dòng và trả thêm `coSoHoaHong`; năm nơi gọi nó (`xac-nhan-chung.ts` ở `donChoTran`, ba chỗ trong `orders/index.ts`, `orders/gia-dai-ly.ts`) truyền theo; các câu đọc dòng tiền phải lấy cột `seasonal_increase` (`ITEM_SELECT` ở `orders/repository.ts`, `orders/thuong-mai-repo.ts`, `docGiaDaiLyNhieu`), kiểu `StoredService.items`, và nhánh tính lại từ bản chụp ở `gia-dai-ly.ts` (`snapshotService` hôm nay chỉ mang `catalogPrice`).
    - **Hai chỗ tính hoa hồng không qua `tinhDongDoiTac`:** `chenhGiamGiaSauGhiTay` (`src/shared/hoa-hong-dong.ts`, cảnh báo khi Kế toán ghi mức tay) **phải** nhận `coSoHoaHong` và tính mức % trên đó, nếu không cảnh báo lệch số sẽ vào sổ. `cauXemTruocGiaDaiLy` (`src/shared/hoa-hong-hien-thi.ts`, xem trước ở màn chính sách giá — không có ngày đi) **để nguyên** và ghi rõ là xem trước theo giá gốc, chưa gồm mùa vụ.
    - **Không lộ cho Đối tác:** `coSoHoaHong`, `seasonal_increase`, `base_price`, `seasonal_rule_id` **không** vào DTO hẹp của Đối tác (phần thương mại `orders/thuong-mai.ts`, `phan-doi-tac-hien-thi.ts`) — từ cơ sở hoa hồng suy ra được phần tăng, trái Đ9. Cảnh báo ghi mức tay của Kế toán lấy cơ sở từ DTO văn phòng hoặc máy chủ.
    - **Bài canh:** mọi lời gọi `tinhDongDoiTac(` và `chenhGiamGiaSauGhiTay(` truyền `coSoHoaHong` đọc từ bản chụp. Bảng `GOI_HAM` của hàng rào `src/hoa-hong-mot-nguon.test.ts` không đổi nếu không thêm nơi gọi `hoaHongDong(` mới (`coSoHoaHong` không nhân/chia với 10000 nên không chạm luật (1) của hàng rào đó).
    - **Đụng sổ và rào «Đã giao»:** số hoa hồng ghi sổ lúc «Đã giao» nhỏ đi theo cơ sở mới; rào «hoa hồng + giá vốn ≤ thành tiền» (`billing/rules.ts`, trigger `bil_posting_delivered_terms` 0112) giữ nguyên phép so với thành tiền — hoa hồng nhỏ hơn nên rào này chỉ dễ qua hơn. **Nhưng trần giảm giá của đại lý thấp xuống:** trần giảm giá cấp đơn của bên đặt có người hưởng = tổng hoa hồng của đơn (ADR-0079 điều 8, `donChoTran`), nên đơn mùa vụ có trần nhỏ hơn hôm nay (ví dụ 2 người lớn 515.000 đ, mức 10 %: trần 90.000 đ thay vì 103.000 đ). Đây là hệ quả trực tiếp của câu 10a và là cách an toàn (đại lý không giảm cho khách quá phần mình được hưởng); không thêm luật trần riêng. Đơn trước ADR này không đổi số (cột chụp NULL).

## Hệ quả

- Hai migration (0188 bảng + trần + trigger; 0189 cột chụp + trigger khoá); cập nhật `docs/data-dictionary.json` + `npm run dict`, `SYSTEM-DESIGN` §5–§7, `CHANGE-GUIDE` (công thức mới), bảng tham chiếu (tên nút), sổ hàng rào (bài «mỗi cửa gọi cổng» + bài sổ vàng sau khi quan sát đỏ thật). HC-5.19: mỗi migration cần dòng cho phép riêng tới khi diễn tập khôi phục.
- Website công khai đọc cùng Sheet nên **không thấy giá mùa vụ**.
- Chuyển dịch vụ sang nhóm khác đổi quy tắc nhóm áp cho đơn mới; đơn đã chụp không đổi (như ADR-0220).
- Trang Đơn hàng: thêm dòng giá mùa vụ ăn vào trần gói trang — đo thật và trình chủ một con số.
- Cạnh `orders` → `catalog` qua `index.ts` đã có (`getEffectiveServices`, `kiemNgungBanTheoNgay`); hàm đọc quy tắc công bố cùng chỗ.

## Tiêu chí nghiệm thu

1. Sổ vàng (`src/shared/gia-mua-vu.so-vang.json`, Kế toán xác nhận) qua **100 %** trong `npm test`, gồm 11 ca hoa hồng / giá đại lý (H1–H11).
1b. Đơn 2 người lớn đi 05/02 của bên đặt có mức hoa hồng 10 %: màn phần thương mại, giá đại lý của Việc 6, cảnh báo ghi mức tay và dòng ghi sổ lúc «Đã giao» đều ra hoa hồng **90.000 đ**, giá đại lý **940.000 đ** (không phải 103.000 / 927.000); trần giảm giá của đơn = **90.000 đ**.
1c. Đối tác lưu nháp mùa vụ đúng giá rồi xác nhận ⇒ qua. Đối tác lưu nháp ngày 05/02 **trước** khi quy tắc được duyệt (900.000 đ), quy tắc được duyệt, rồi xác nhận ⇒ 409 `gia_danh_muc_da_doi`. Nháp văn phòng cùng tình huống ⇒ hiện cờ «Giá danh mục đã đổi», không chặn.
1d. Tài khoản Đối tác mở form: phản hồi `GET /api/catalog/for-order` không chứa % hay số tiền tăng; DTO đơn của Đối tác không chứa `coSoHoaHong`, `seasonal_increase`, `base_price`, `seasonal_rule_id`. `GET /api/catalog` trả giá gốc.
2. Ví dụ của kế hoạch: Tour 3 đảo người lớn 450.000 đ; quy tắc nhóm «Tour đảo» +10 % +20.000 đ, 01/02–15/02/2027 (đã duyệt bởi người thứ hai). Đơn 2 người lớn đi 05/02 ⇒ 1.030.000 đ; đi 20/02 ⇒ 900.000 đ.
3. Đơn xác nhận 25/01 cho ngày 05/02 giữ 1.030.000 đ sau khi quy tắc bị kết thúc. Sau khi kết thúc: đổi ngày đơn đó sang 08/02 (vẫn trong khoảng của chính quy tắc đã chụp, không quy tắc khác thắng) ⇒ được, tiền giữ nguyên; sang 20/02 ⇒ 409 `seasonal_date_changed`. Đơn xác nhận đi 20/02 (không quy tắc) đổi sang 05/02 khi quy tắc nhóm đang áp ⇒ 409.
4. Nháp lưu ngày 20/02 (900.000 đ), đổi ngày sang 05/02 rồi lưu ⇒ 1.030.000 đ (Q11 đã vá).
5. Bán hàng, Thực tập, Đối tác, Nhân sự, Tài xế gọi route đặt/duyệt/kết thúc ⇒ 403; Quản lý bán hàng, Quản trị, Kế toán, Toàn quyền ⇒ đặt được. Người đặt tự duyệt ⇒ 409; người khác duyệt ⇒ được. Chỉ Toàn quyền đặt được trần.
6. Hai quy tắc cùng nhóm chồng một ngày ⇒ 409 `seasonal_overlap`; quy tắc dịch vụ chồng quy tắc nhóm ⇒ được, dịch vụ thắng.
7. `DELETE`/`UPDATE` thẳng vào bảng bị trigger từ chối, trừ đặt mốc duyệt một lần và kết thúc một lần; sửa ba cột chụp của đơn đã xác nhận bị trigger từ chối.
8. Bài canh «mỗi cửa đổi ngày gọi cổng mùa vụ» đỏ khi gỡ lời gọi ở một cửa.
9. Nhật ký có ba hành động mới, không chứa thông tin cá nhân.

## Điều chủ cần biết

- Đơn đã xác nhận **không bao giờ tự đổi giá**; khách muốn dời sang mùa khác thì văn phòng huỷ và lập đơn mới.
- Quy tắc mới chưa áp cho tới khi người thứ hai duyệt [ĐÃ CHỐT 10c].
- Phí đưa đón không tăng theo mùa.
- **Nháp lưu trước khi quy tắc được duyệt:** của Đối tác hoặc Thực tập thì bị chặn lúc xác nhận, phải bỏ dịch vụ rồi chọn lại để nhận giá mới (như hôm nay khi giá Sheet đổi). Của văn phòng thì chỉ hiện cờ «Giá danh mục đã đổi», văn phòng vẫn xác nhận được theo giá cũ (ví dụ 900.000 đ thay vì 1.030.000 đ) — văn phòng tự quyết, như hôm nay.
- **Đại lý được giảm giá cho khách ít hơn trong mùa:** trần giảm giá bằng hoa hồng, mà hoa hồng không tính trên phần tăng (ví dụ 90.000 đ thay vì 103.000 đ cho đơn 2 người lớn 515.000 đ, mức 10 %).
- **Giá vốn nhà cung cấp vẫn tính trên thành tiền đầy đủ** (AI tự quyết, bạn bác được).

---

## Trang ghép (CLAUDE.md §9 «bước ghép khi duyệt»; Hiến chương 5.28 tách nhiệm vụ)

Lượt duyệt này có **một** quyết định chạm quyền/dữ liệu (ADR-0229) kèm ba câu nhỏ; dưới trần 3.

**(1) Bảng mới chứa gì.** `ctl_seasonal_price` chỉ chứa **một loại thực thể**: quy tắc tăng giá theo khoảng ngày đi (phạm vi dịch vụ hoặc nhóm). Bảng trần % chứa một loại: chính sách trần. Ba cột mới của `order_item` chỉ chứa bản chụp của dòng dịch vụ có mã; dòng nhập tay để NULL.

**(2) Ô quyền chạm bảng.**

| Ô quyền | Ai | Áp cho | Ghi chú |
|---|---|---|---|
| xem danh sách quy tắc | cùng ô `catalog.seasonal.write` (bốn vai) | mọi quy tắc | không ô đọc riêng; văn phòng khác thấy dòng «Giá mùa vụ» trên form; Đối tác chỉ thấy giá cuối |
| `catalog.seasonal.write` | Quản lý bán hàng, Quản trị, Kế toán, Toàn quyền (`keToanQuanLy()`) | quy tắc dịch vụ và nhóm | Đối tác bị chặn dù tài khoản lai |
| `catalog.seasonal.approve` | cùng bốn vai | quy tắc **người khác** đặt | máy chủ + CHECK CSDL `approved_by <> created_by` |
| `catalog.seasonal.cap` | chỉ Toàn quyền | dòng trần % | |
| `O_GHI_TIEN` | **không đổi** | — | ba ô mới không vào nhóm này (ADR-0090) |

**(3) Cổng nào canh cửa nào.**

| Cửa | Cổng |
|---|---|
| Route đặt / duyệt / kết thúc / đặt trần | `access` của route + `can()` ô tương ứng; người duyệt ≠ người đặt ở máy chủ |
| Dựng dòng đơn (lập, lưu nháp) | `catalogService` gọi `tinhGiaMuaVu` theo ngày đi; BK5 so giá đã cộng mùa vụ |
| Xác nhận của Đối tác / Thực tập | `congGiaDanhMucDoi` so theo ngày đi (Đ7b) |
| Hoa hồng, giá đại lý, trần giảm giá, «Đã giao» | `tinhDongDoiTac` + `chenhGiamGiaSauGhiTay` nhận `coSoHoaHong` (Đ10) |
| Đổi ngày đơn đã chụp (các cửa đổi ngày trong `CUA_NGUNG_BAN_NGAY`, trừ lập đơn mới) | cổng `seasonal_date_changed`; bài canh mỗi cửa |
| Đơn đã xác nhận | trigger 0081 (cột tiền cũ) + trigger mới 0189 (ba cột chụp) |
| **Giao diện ẩn/hiện** | nút «Giá mùa vụ» ở màn Dịch vụ & giá: `can(write) && isOffice && !holdsPartner`; nút Duyệt: `can(approve)` và ẩn trên quy tắc chính mình đặt; ô trần: chỉ Toàn quyền. Bán hàng **không** thấy nút. Dòng «Giá mùa vụ: +% +đ» trên form: chỉ người dùng văn phòng (`isOffice && !holdsPartner`), Đối tác không nhận hai số đó từ máy chủ. Không ô quyền cũ nào bị đổi nghĩa; trần giảm giá của đại lý (ADR-0079 điều 8) đổi **giá trị** trên đơn mùa vụ (thấp hơn), không đổi cổng. |

**(4) Tách nhiệm vụ — ai kiêm được gì, và lưới bắt.**

| Chồng vai | Rủi ro | Lưới |
|---|---|---|
| Kế toán đặt giá **và** xác nhận sổ vàng | Kế toán xác nhận công thức mình hưởng lợi | Sổ vàng xác nhận **công thức** (ca mẫu), không xác nhận từng quy tắc; quy tắc cần người thứ hai duyệt |
| Người đặt giá cũng là người thu tiền | tăng giá rồi tự thu phần chênh | quy tắc chỉ hiệu lực sau người thứ hai duyệt; nhật ký ghi người đặt, người duyệt; số tăng chụp từng dòng (`seasonal_increase`) để Kế toán đối chiếu |
| Quản trị tự gán vai Quản lý bán hàng | vòng qua tách vai | tách nhiệm vụ đặt ở **người trên đối tượng** (người duyệt ≠ người đặt), không ở vai; Quản trị gán vai cho chính mình vẫn không tự duyệt được quy tắc mình đặt |
| Toàn quyền | làm được mọi việc | vẫn không tự duyệt quy tắc mình đặt (CHECK CSDL); trần % chỉ Toàn quyền đặt |

**Nhật ký đối chiếu:** ba hành động (đặt, duyệt, kết thúc) + `seasonal_rule_id` trên từng dòng đơn ⇒ Kế toán lọc được «đơn nào đã áp quy tắc nào, ai đặt, ai duyệt».
