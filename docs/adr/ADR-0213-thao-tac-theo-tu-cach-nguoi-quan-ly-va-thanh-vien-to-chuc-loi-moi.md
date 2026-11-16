# ADR-0213 — Thao tác theo tư cách; người quản lý và thành viên của tổ chức; lời mời

- **Trạng thái:** **đề xuất** 2026-11-16 — AI soạn theo đặc tả `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-ca-nhan-va-to-chuc.md` (mục 7 và **mục 8** là lời chủ; mục 8 thay dòng «nhiều người quản lý» của mục 7). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang trình chủ: `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-luot-duyet/TRINH-CHU.md`; trang ghép: `TRANG-GHEP.md` cùng thư mục.
- **Số:** 0213 (số lớn nhất mọi nhánh ngày 16/11 là 0211; 0212 cấp cùng lượt). Tên giữ chỗ trong đặc tả: «lượt B».
- **Nguồn:** lời chủ 16/11, nguyên văn rút gọn: «Tài khoản tổ chức chỉ để gắn đơn, công nợ, cấp đại lý. Tài khoản cá nhân liên kết với tài khoản tổ chức để đảm nhận vai quản lý (cao nhất, duyệt đơn, thêm/gỡ/chuyển quyền quản trị tài khoản tổ chức...). Tóm lại, hệ thống biết được cá nhân thao tác với tư cách cá nhân hay tư cách tổ chức.» — «Quản lý bán hàng, Quản trị và Toàn quyền đổi được người quản lý của tổ chức, và họ cũng có thể tự mời người khác… (tìm số điện thoại, nếu có thì gửi lời mời, nếu chưa có thì mời tạo tài khoản).» — đính chính: «Mỗi tổ chức chỉ 01 người quản lý cao nhất, những người còn lại là thành viên thôi.»
- **Ngày:** 2026-11-16. **Loại:** việc lớn — quyền (ai thấy đơn và công nợ của tổ chức, ai đổi người quản lý, một hàng quyền mới), dữ liệu (hai loại quan hệ mới, một cột trên phiên, một cột trên nhật ký, bảng lời mời), tiền (đổi **bên đặt** của đơn, không đổi luật tính), tài khoản (sửa trigger LC-1c). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về hành vi (bỏ tư cách tổ chức là mọi đơn mới về cá nhân); **một chiều** về dữ liệu đã sinh: đơn đã lập thay mặt tổ chức giữ bên đặt là tổ chức, số tiền đã chụp vào đơn không đổi (Hiến chương 5.6).
- **Sửa ADR cũ:**
  - **ADR-0018 điều 9, đúng một câu.** Câu cũ: «Công ty lữ hành dùng **một tài khoản chung** gắn **hồ sơ công ty**.» Câu mới: «Công ty lữ hành và mọi tổ chức đối tác là **một hồ sơ tổ chức không có đăng nhập riêng**; người của tổ chức đăng nhập bằng **tài khoản cá nhân** của mình, gắn với hồ sơ tổ chức bằng quan hệ «người quản lý» (đúng một người) hoặc «thành viên», và chọn thao tác thay mặt tổ chức (ADR-0213).» Các câu khác của điều 9 giữ nguyên. **Tài khoản đang có không bị đổi** (xem Bối cảnh: mã hôm nay chưa bao giờ tạo được tài khoản trên hồ sơ tổ chức).
  - **ADR-0018 «Rủi ro đã nêu», gạch «Tài khoản chung của công ty lữ hành»:** hết đúng cho tổ chức theo mô hình mới (mỗi người một PIN, biết ai bấm). Không sửa thân ADR cũ; ADR này ghi lại.
  - **ADR-0077 điều 3 (i), thu hẹp ở sổ đại lý đợt 1** (bên đặt máy chủ ép = hồ sơ của tài khoản Đối tác): «hồ sơ của tài khoản» đổi thành «**bên đang thay mặt**» (Đ4).
  - **Giữ:** ADR-0014 điều 1 (một mã quyền Đối tác — không thêm mã quyền), ADR-0136 (đối tác soạn nháp, bấm «Gửi đơn»), ADR-0142, ADR-0182, ADR-0198 (công nợ và Trả sau theo hồ sơ bên đặt), ADR-0161 (bốn trục chiết khấu), ADR-0180 (đóng vai của Toàn quyền — khác việc ở đây), ADR-0048 (LC-1b).
- **Xây trên lỗ đang hở: HC-5.19** — cùng lý do xin phép với ADR-0212. Thêm: các bảng và cột mới chỉ thêm; đơn lập thay mặt tổ chức là đơn bình thường của `orders`; khôi phục D1 về trước một mốc thì liên kết, lời mời và đơn sinh sau mốc mất cùng nhau, không dòng sổ tiền cũ nào đổi. Khoá cho phép đề xuất: `xay_tren_cho_phep_adr_0212_0213`.
- **HC-4.2** (hạn 30/11): **không chạm**. Đổi người quản lý, rời tổ chức không chuyển nợ, không ghi bút toán điều chỉnh; nợ ở lại hồ sơ tổ chức.
- **Hiến chương áp:** 2.1, 2.2, **2.3**, 5.1, 5.3, 5.5, 5.6, **5.8**, 5.12, 5.16, 5.17, 5.20, 5.26, 5.27, **5.28**, 5.29. **Lệch có chủ ý:** không — đối chiếu 5.28 ở Đ3.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0212 — tổng 2).

## Bối cảnh

Đọc mã ngày 16/11:

- **Một hồ sơ tối đa một tài khoản** (`staff_party_uq`, `migrations/0012_staff_permissions_party.sql`). **Không tạo được tài khoản trên hồ sơ tổ chức:** đường tạo tài khoản trên hồ sơ có sẵn trả «Tài khoản chung cho công ty làm ở giai đoạn sau — hãy chọn hồ sơ cá nhân» (`src/modules/staff/index.ts`). Vậy «tài khoản chung gắn hồ sơ công ty» của ADR-0018 điều 9 **chưa từng được làm**; tài khoản công ty lữ hành nào đang có thì gắn hồ sơ cá nhân. **Chưa kiểm:** trên bản chính thức có bao nhiêu tài khoản như vậy (cần một câu đọc do chủ chạy; ADR này không đổi chúng).
- **Bên đặt của đơn đối tác do máy chủ ép** = hồ sơ của tài khoản khi hồ sơ đó mang vai được hưởng (`benDatChoTaiKhoan`, `src/shared/booker.ts`; `benDatCuaTaiKhoan`, `src/modules/orders/index.ts`). Hoa hồng, cấp đại lý, công nợ, Trả sau đều tính theo **hồ sơ bên đặt** (`prc_party_tier`, `noCuaBenDat`, `hanMucHieuLuc`), không theo tài khoản (Hiến chương 2.3). Văn phòng hôm nay đã lập được đơn có bên đặt là một hồ sơ tổ chức.
- **«Của mình» (phạm vi `own`) của đơn = `orders.staff_id`**, tức tài khoản đã lập (`src/shared/permissions.ts`, kiểu `Scope`). «Sổ của tôi» và «khoản của tôi» đọc theo `staff.partyId` (`src/modules/billing/index.ts`).
- Đếm ngày 16/11: khoảng 80 chỗ đọc `staff.partyId` hoặc `actor.partyId` trong 19 tệp (nhiều nhất: `van-chuyen/index.ts`, `parties/index.ts`, `billing/index.ts`, `orders/index.ts`, `dispatch/ban-hang-route.ts`, `orders/xac-nhan-route.ts`). Con số đổi theo mã; bài quét ở Đ4 là nơi giữ danh sách.
- Quan hệ giữa hai hồ sơ có sẵn khuôn: bảng `pty_party_relationship` (hiệu lực theo ngày, chống chồng lấn, «đang mở» = `valid_to_date IS NULL`), loại quan hệ là dữ liệu (`CONTACT_OF`, `DRIVES_FOR`, `REFERRED_BY`). ADR-0048 dùng khuôn này cho «Tài xế của» kèm trigger giữ hai đầu và view công bố.
- Tiền lệ trạng thái theo phiên: ADR-0180 lưu vai đang đóng ở một cột của `aut_session` và ghi cột `acting_role` vào `audit_log` (`migrations/0145_xem_nhu_vai.sql`).
- LC-1c cho quyền Đối tác chỉ khi hồ sơ của tài khoản mang vai bên ngoài hoặc loại đối tác (`migrations/0149_lc1c_doi_tac_can_vai_tro.sql`).

## Quyết định

**Đ1 — Hồ sơ tổ chức không đăng nhập.** Tổ chức đối tác là một hồ sơ `ORGANIZATION` mang vai đối tác (Công ty lữ hành, hoặc loại Kế toán thêm). Hồ sơ đó giữ đơn (là bên đặt), công nợ, hạn mức Trả sau, cấp độ đại lý — như văn phòng đang làm hôm nay. **Không** có dòng `staff` cho tổ chức, không số điện thoại đăng nhập, không PIN. Người thao tác luôn là một tài khoản cá nhân.

**Đ2 — Hai loại liên kết, đúng một người quản lý.**

1. **Mô hình:** hai loại quan hệ mới trong `pty_party_relationship` (thêm bằng migration), đi từ hồ sơ cá nhân tới hồ sơ tổ chức: `MANAGER_OF` («Người quản lý của») và `MEMBER_OF` («Thành viên của»). Tên hiển thị chờ chủ chọn (trang trình).
2. **Đúng một người quản lý đang mở cho mỗi tổ chức:** chỉ mục duy nhất có điều kiện trên `(to_party_id)` khi loại là `MANAGER_OF` và `valid_to_date IS NULL`.
3. **Trigger giữ hai đầu** (khuôn `pty_relationship_drives_for_*`, mỗi trigger một câu `RAISE`): đầu từ là hồ sơ cá nhân; đầu tới là hồ sơ tổ chức đang mở vai đối tác (vai bên ngoài hoặc loại đối tác) lúc mở; một người không vừa là người quản lý vừa là thành viên của cùng tổ chức.
4. **Không để tổ chức có thành viên mà không có người quản lý.** SQLite chạy trigger theo từng dòng và không hoãn tới cuối lô được, nên một lệnh «chuyển» buộc phải có một khoảnh khắc trong lô mà tổ chức chưa có ai, hoặc có hai người. Cách chọn: thêm cột `replaced_by_id` (tham chiếu một dòng quan hệ khác) vào `pty_party_relationship`. Trigger `BEFORE UPDATE`: đóng một dòng `MANAGER_OF` khi tổ chức còn thành viên đang mở thì **bắt buộc** `replaced_by_id` khác rỗng. Lô «chuyển» là: đóng dòng cũ kèm `replaced_by_id` = mã dòng mới → chèn dòng mới đúng mã đó → (mặc định) mở dòng `MEMBER_OF` cho người cũ. Câu chèn hỏng thì cả lô hỏng (lô là một giao dịch). Lưới thứ hai: bất biến mới ở `scripts/audit-checks.mjs` — mọi tổ chức có thành viên đang mở có đúng một người quản lý; mọi `replaced_by_id` trỏ tới một dòng `MANAGER_OF` có thật, cùng tổ chức, mở cùng ngày.
5. **Tổ chức không có thành viên** thì gỡ người quản lý được (tổ chức thôi có người thao tác thay; văn phòng vẫn lập đơn cho tổ chức như hôm nay). Chỉ Quản lý bán hàng, Quản trị, Toàn quyền làm việc này.
6. **Ai được gắn:** tài khoản cá nhân giữ quyền Đối tác, đang hoạt động. Tài khoản giữ quyền nội bộ, tài khoản Tài xế đối tác (LC-1b) không được gắn. Trigger của `parties` không đọc được bảng `staff` (Hiến chương 5.3), nên điều này do máy chủ kiểm, cộng một bất biến định kỳ; nói thẳng: tầng dữ liệu không chặn.
7. **Giới hạn biết trước:** quan hệ hiệu lực theo **ngày**, trigger chống chồng lấn sẵn có chặn mở lại cùng loại cho cùng cặp trong cùng ngày. Hệ quả: chuyển quyền quản lý từ A sang B rồi trả lại A **trong cùng một ngày** bị chặn (câu báo rõ); chuyển qua người thứ ba vẫn được.
8. Một người có thể là thành viên hoặc người quản lý của **nhiều** tổ chức; ô chọn tư cách liệt kê đủ.

**Đ3 — «Đang thao tác với tư cách» chỉ chọn bên đặt, không đổi quyền.**

1. **Lưu ở phiên:** một cột có thể rỗng trên `aut_session` (tên giữ chỗ `acting_party_id`), khuôn ADR-0180. Rỗng = tư cách cá nhân. Đổi bằng một route (cổng `staff`, đi qua lớp chống ghi trùng); trình duyệt không tự khai.
2. **Kiểm lại mỗi yêu cầu, ở một chỗ:** nơi `currentStaff` dựng người gọi đọc cột đó và đối chiếu với liên kết đang mở (view công bố mới của `parties`, chỉ khoá). Liên kết đã đóng thì coi như rỗng và trả kèm một dấu để giao diện báo «Bạn không còn thay mặt <tên tổ chức>». Route không tự tính.
3. **Tư cách cá nhân chỉ có khi hồ sơ cá nhân mang vai đối tác riêng** (vai bên ngoài hoặc loại đối tác). Người chỉ làm việc cho tổ chức thì không có lựa chọn «cá nhân»: phiên luôn thay mặt một tổ chức của họ; gắn nhiều tổ chức thì phải chọn.
4. **Nhật ký:** cột mới của `audit_log` (tên giữ chỗ `acting_party_id`) do hàm ghi duy nhất của `audit` tự điền từ bối cảnh yêu cầu, cấm handler tự truyền (khuôn ADR-0180 Đ2). Chỉ mã hồ sơ, không tên, không mã số thuế.
5. **Đối chiếu Hiến chương 5.28** («không có vai trò đang làm cho người thường»): tư cách **không** đổi bộ quyền. Bộ quyền của người gọi giống hệt ở cả hai tư cách; tư cách chỉ quyết **ai là bên đặt của đơn mới hay đơn nháp đang lưu** (Đ4). Quyền **xem** đơn và công nợ của tổ chức không đi theo phiên mà đi theo **vai của người đó trên chính đối tượng** — «người quản lý của bên đặt» — đúng 5.8 (Đ5). Vì vậy đây không phải «chọn một trách nhiệm mỗi lần» mà 5.28 loại. **Cảnh báo một lần (P18):** nếu về sau có ai muốn tư cách quyết cả quyền (ví dụ thành viên chỉ thấy nút khi đang thay mặt), việc đó chạm 5.28 và phải qua sửa Hiến chương.

**Đ4 — Bên đặt, hoa hồng, công nợ: chỉ đổi «ai là bên đặt», không đổi luật tính.**

1. `benDatChoTaiKhoan` nhận **bên đang thay mặt** thay cho `staff.partyId`: thay mặt tổ chức (tổ chức mang vai được hưởng) ⇒ bên đặt = hồ sơ tổ chức; tư cách cá nhân ⇒ như hôm nay. Luật K1 (`benDatDoiTacBiCam`: đối tác không tự chọn đại lý khác làm bên đặt) xét «khác bên đang thay mặt».
2. **Luật tính không đổi:** chọn mức cụ thể nhất, bốn trục chiết khấu (ADR-0161), cấp độ đại lý của hồ sơ (ADR-0209), công nợ theo giá đại lý (ADR-0182), Trả sau theo hạn mức của hồ sơ bên đặt (ADR-0198), làm tròn, chụp vào đơn lúc gửi. Một đơn y hệt lập bởi văn phòng cho tổ chức và lập bởi người quản lý thay mặt tổ chức phải ra **cùng số tới từng đồng**.
3. **Các bộ sổ vàng phải giữ nguyên, không sửa đáp án** (tên tệp đã thấy ngày 16/11): `src/so-vang.test.ts`, `src/so-vang-so-dai-ly.test.ts`, `src/cong-no-dai-ly.test.ts`, `src/so-vang-dat-coc.test.ts`, `src/so-vang-phi-don.test.ts`, `src/so-vang-don-huy.test.ts`, `src/so-vang-dieu-chinh.test.ts`, `src/so-vang-phan-dinh.test.ts`, `src/so-vang-sua-so-khach.test.ts`, `src/kiem-dinh-ky-so-dai-ly.test.ts`. Thêm ca mới: cùng một đơn, ba đường (văn phòng lập cho tổ chức; người quản lý thay mặt; thành viên thay mặt) cho cùng số.
4. **Các chỗ đọc hồ sơ của tài khoản được xếp từng chỗ** vào một trong hai nhóm: «bên đang thay mặt» (bên đặt khi lập và lưu nháp, «Bên đặt của tôi» ở `/api/auth/me`, lọc danh mục theo luật bán, sổ và khoản của tôi khi đang thay mặt, phiếu nộp tiền, dịch vụ bị chặn bán) hoặc «chính người đó» (hồ sơ của tôi, giấy tờ, xưng hô, tin cho người, mọi việc của văn phòng và tài xế). Một bài quét mới liệt kê mọi chỗ đọc `staff.partyId`/`actor.partyId` cùng nhóm của nó; chỗ mới chưa xếp nhóm thì đỏ.
5. **Tự bật Trả sau cho chính mình** (`TU_DAT_TRA_SAU`, `billing/index.ts`): chặn thêm khi hồ sơ đích là tổ chức người gọi đang gắn (dù chỉ tài khoản nội bộ mới bật được Trả sau và tài khoản nội bộ không gắn được — Đ2.6 — vẫn chặn cho chắc).

**Đ5 — Ai thấy đơn và công nợ của tổ chức.** Theo vai trên đối tượng, khuôn `ctx.isAssigned` (gốc lắp ráp tiêm, `orders` không đọc bảng của `parties`):

- `can()` nhận thêm một cờ (tên giữ chỗ `quanLyBenDat`): người gọi **đang là người quản lý** của hồ sơ bên đặt của đơn. Với cột Đối tác, ô `own` đúng khi đơn do mình lập **hoặc** cờ này đúng. Định nghĩa viết **một lần** trong `src/shared/permissions.ts`; route nào xét ô `own` của đơn phải truyền cờ (bài quét như với `assigned`).
- **Người quản lý** thấy mọi đơn có bên đặt là tổ chức (kể cả đơn thành viên lập), thấy sổ công nợ, hạn mức Trả sau, cấp độ đại lý của tổ chức — dù đang ở tư cách nào.
- **Thành viên** thấy đơn do chính mình lập (như hôm nay); **không** thấy đơn của người khác trong tổ chức, không thấy sổ công nợ của tổ chức. Việc thành viên gửi được đơn hay không: quyết định của chủ ở Đ8.
- Người rời tổ chức hoặc thôi làm người quản lý mất cờ ngay ở yêu cầu kế tiếp.

**Đ6 — Ai đổi được gì.** Một hàng quyền mới (tên giữ chỗ `partner.org.manager.write`) theo khuôn `quanLyBanHang()` sẵn có: **Quản lý bán hàng, Quản trị, Toàn quyền** `any`, còn lại `none`. Việc của người quản lý đi theo vai trên đối tượng (Đ5), không qua hàng này.

| Việc | Người quản lý của tổ chức | Quản lý bán hàng, Quản trị, Toàn quyền | Thành viên |
|---|---|---|---|
| Mời thành viên (Đ7), gỡ thành viên | được | được | không |
| Chuyển quyền quản lý cho **một thành viên hiện có** | được | được (cho bất kỳ người hợp lệ nào) | không |
| Gỡ người quản lý khi tổ chức không còn thành viên | không | được | không |
| Tự rời tổ chức | không (phải chuyển trước) | — | được |

- **Người quản lý cũ sau khi chuyển: mặc định thành thành viên** (cùng lô, Đ2.4). Người làm lệnh bỏ chọn được «giữ làm thành viên» thì người cũ rời hẳn. Lý do mặc định: người cũ thường vẫn làm ở công ty; rời hẳn vẫn làm được bằng một lệnh gỡ.
- **Người duyệt phiếu đăng ký** gắn vào tổ chức đã có người quản lý (ADR-0212 Đ5.3): người đăng ký **không** thành người quản lý; lô duyệt mở họ làm thành viên **chỉ khi** có lời mời còn hạn của người quản lý cho đúng số điện thoại đó (Đ7), còn không thì 409 và người xác minh chọn lại hoặc từ chối.
- **Nhật ký** (hành động mới, đích là hồ sơ tổ chức): mở, đóng, chuyển người quản lý; mời, nhận, huỷ lời mời; gỡ, rời thành viên; đổi tư cách. Ai làm, lúc nào, đích; không số điện thoại. Người làm là văn phòng thì kèm lý do thuộc danh sách đóng.
- **Đơn đang dở khi đổi người:** đơn không đổi bên đặt, không đổi người lập (`staff_id`), không đổi tiền. Đơn nháp của thành viên đã rời: còn nguyên, người quản lý thấy (cờ Đ5) và gửi hoặc huỷ được; người đã rời không còn mở được đơn nháp đó (bên đặt là tổ chức họ không còn gắn). Công nợ ở lại hồ sơ tổ chức. Không dòng sổ tiền nào sinh ra.

**Đ7 — Lời mời theo số điện thoại (mời làm thành viên).**

1. Người quản lý (hoặc văn phòng ở Đ6) nhập một số điện thoại. Máy **luôn trả cùng một câu**, dù số đó đã có tài khoản hay chưa: «Đã tạo lời mời. Mã mời: XXXX-XXXX, dùng được tới <ngày>. Hãy gửi mã này cho người được mời.» Không câu nào nói số đó có tài khoản. Nền tảng chưa có tin nhắn SMS, nên người mời tự chuyển mã.
2. **Mã:** 8 ký tự do máy cấp, chỉ lưu bản băm, gắn với đúng số điện thoại đã chuẩn hoá và tổ chức, dùng một lần, hạn 7 ngày; người quản lý huỷ được lời mời còn mở. Bảng mới của `parties` (tên giữ chỗ `pty_org_invite`, mã theo Hiến chương 5.26), chỉ thêm, trạng thái là tập đóng.
3. **Trần** (dữ liệu chính sách, con số đề xuất): 10 lời mời mỗi ngày mỗi tổ chức; 20 lời mời đang mở mỗi tổ chức; 3 lời mời mỗi ngày cho một số điện thoại trên toàn Nền tảng; vượt thì câu trả lời vẫn y như thường và không tạo lời mời. 5 lần nhập sai mã mỗi tài khoản mỗi giờ.
4. **Người đã có tài khoản:** đăng nhập, thấy lời mời trong ứng dụng **nếu** số đăng nhập trùng số được mời (chỉ chính họ thấy), hoặc nhập mã. Bấm «Nhận» thì máy kiểm: số đăng nhập trùng số của lời mời, tài khoản hợp lệ (Đ2.6), lời mời còn hạn, người mời vẫn là người quản lý; rồi một lô: đánh dấu lời mời đã dùng, mở `MEMBER_OF`, nhật ký.
5. **Người chưa có tài khoản:** dùng đúng đường đăng ký (ADR-0206…0212). Trang đăng ký nhận mã mời như một trường tuỳ chọn của phiếu (cột mới của phiếu, vào tệp ánh xạ của ADR-0212 Đ9). Phiếu đi đủ xác minh và duyệt hai người như mọi phiếu (Hiến chương 5.29); mã mời **không** bỏ qua bước nào. Lô duyệt mở `MEMBER_OF` khi mã còn hạn, số điện thoại của phiếu trùng số của lời mời và người mời vẫn là người quản lý; thiếu một điều thì vẫn duyệt được tài khoản nhưng không mở liên kết, và người duyệt thấy vì sao.
6. Không có lời mời làm **người quản lý**: đổi người quản lý chỉ qua lệnh chuyển ở Đ6.

**Đ8 — Thành viên làm được gì khi thay mặt tổ chức, và «duyệt đơn» là gì — CHỦ CHỌN** (trang trình, quyết định 1). Hôm nay đối tác soạn nháp rồi bấm «Gửi đơn» để đơn lên văn phòng (ADR-0136; ô `order.submit` của Đối tác là `own`).

| Phương án | Thành viên | Người quản lý | Được | Mất |
|---|---|---|---|---|
| **(a) Khuyến nghị:** thành viên chỉ soạn nháp; chỉ người quản lý gửi | soạn, sửa, huỷ nháp của mình thay mặt tổ chức; **không** bấm «Gửi đơn» | thấy mọi nháp của tổ chức; «duyệt» = bấm «Gửi đơn» cho nháp của thành viên | khớp nghĩa thường của «duyệt đơn»; không đơn nào đi lên Tour Đảo hay đẩy nợ cho tổ chức mà người quản lý chưa thấy | đơn gấp chờ người quản lý; cần một tin «có nháp chờ bạn gửi» |
| (b) Thành viên tự gửi; người quản lý xem và huỷ | gửi như đối tác cá nhân | thấy mọi đơn, huỷ được theo luật huỷ sẵn có | nhanh, không đổi luồng | nợ của tổ chức tăng mà người quản lý chưa duyệt; «duyệt» chỉ còn là «xem sau» |
| (c) Mỗi tổ chức tự đặt (công tắc của người quản lý) | theo công tắc | theo công tắc | linh hoạt | thêm một chính sách, hai luồng phải kiểm |

Với (a): ô `order.submit` của Đối tác thêm điều kiện theo vai trên đối tượng — bên đặt là tổ chức thì chỉ người quản lý của tổ chức gửi được (cờ `quanLyBenDat` của Đ5); bên đặt là cá nhân thì như hôm nay. Không thêm hàng quyền, không thêm mã quyền.

**Đ9 — Tài khoản của người chỉ làm việc cho tổ chức** (người quản lý hoặc thành viên mà hồ sơ cá nhân không mang vai đối tác riêng). Họ cần quyền Đối tác để vào Nền tảng soạn đơn, nhưng LC-1c đòi hồ sơ cá nhân mang vai đối tác. Đề xuất: **tạo lại LC-1c** (migration mới, giữ tên) để nhận thêm vế «hồ sơ có liên kết `MANAGER_OF` hoặc `MEMBER_OF` đang mở tới một tổ chức mang vai đối tác» (đọc view công bố của `parties`, như LC-1 đang làm). Hồ sơ cá nhân của họ **không** mang vai được hưởng, nên họ không có hoa hồng riêng và không có tư cách cá nhân (Đ3.3). Liên kết đóng về sau thì trigger không thấy (chỉ canh lúc mở quyền, như hôm nay); cổng sẵn có `congDoiTacChuaCoVaiTro` của `orders` mở rộng cùng vế, chặn họ lập đơn; bất biến `R-LC-1c` mở rộng cùng vế. Phương án thay: mở cho họ vai «Cộng tác viên» — bị loại vì sinh hoa hồng cá nhân sai sự thật.

## Phương án bị loại

- **Tài khoản chung cho tổ chức** (ADR-0018 điều 9 cũ): chủ bỏ ngày 16/11; không biết ai bấm; người nghỉ vẫn giữ PIN.
- **Bảng liên kết riêng thay cho `pty_party_relationship`:** lặp lại hiệu lực theo ngày, chống chồng lấn, view; ADR-0048 đã chọn bảng quan hệ cho đúng loại việc này.
- **Cột «tổ chức» trên `staff`:** gắn điều khoản thương mại vào tài khoản đăng nhập (trái Hiến chương 2.3); một người không thuộc được hai tổ chức.
- **Tư cách gửi kèm từng yêu cầu (trường trong thân):** mỗi route phải tự kiểm; dễ quên một route và đặt đơn nhầm bên. Lưu ở phiên, kiểm ở một chỗ thì một bài quét giữ được.
- **Mã phạm vi mới (`Scope`) cho «đơn của bên đặt»:** thêm một giá trị phạm vi chạm mọi hàng của bảng quyền; cờ vai trên đối tượng theo khuôn `assigned` hẹp hơn và đúng 5.8.
- **Nhiều người quản lý:** chủ đính chính 16/11 — một người quản lý, còn lại là thành viên.
- **Lời mời trả lời «số này chưa có tài khoản»:** cho người lạ dò ai là đối tác (ADR-0206 Đ8 đã cấm).

## Bài kiểm (đỏ trước, xanh sau)

- CSDL: mở `MANAGER_OF` thứ hai cho cùng tổ chức: hỏng; đóng người quản lý khi còn thành viên mà không `replaced_by_id`: hỏng; lô chuyển đúng khuôn: một người quản lý mới, người cũ thành thành viên; giả lỗi ở câu chèn: không gì đổi. Đầu từ là tổ chức, đầu tới là cá nhân hoặc tổ chức không mang vai đối tác: hỏng. Cùng người vừa quản lý vừa thành viên: hỏng. Chuyển qua lại cùng người trong ngày: 409 có câu rõ.
- Quyền: thành viên gọi mời, gỡ, chuyển: 403. Bán hàng, Kế toán, Nhân sự gọi đổi người quản lý: 403; Quản lý bán hàng, Quản trị, Toàn quyền: được. Gắn tài khoản nội bộ hay Tài xế đối tác: 409.
- Tư cách: đặt tư cách tổ chức không gắn: 403; liên kết đóng giữa phiên ⇒ yêu cầu kế tiếp chạy như cá nhân (hoặc bị chặn nếu không có tư cách cá nhân) và có dấu báo. Bộ quyền của người gọi giống hệt ở hai tư cách (so `permissions` trả về). Mọi dòng `audit_log` ghi lúc thay mặt có `acting_party_id`; ngoài lúc thay mặt thì không.
- Bên đặt: thay mặt tổ chức ⇒ bên đặt là tổ chức, thân yêu cầu gửi bên đặt khác bị bỏ qua; cá nhân ⇒ như cũ. Bài quét Đ4.4 đỏ khi thêm một chỗ đọc `staff.partyId` chưa xếp nhóm.
- Xem: người quản lý thấy đơn thành viên lập; thành viên A không thấy đơn thành viên B (404); người đã rời không thấy đơn nháp cũ của tổ chức; người quản lý thấy sổ công nợ tổ chức, thành viên không.
- Đ8 theo phương án chủ chọn (với (a): thành viên bấm «Gửi đơn» cho đơn có bên đặt là tổ chức: 403; người quản lý gửi được).
- Lời mời: số có tài khoản và số chưa có ⇒ câu trả lời và mã trạng thái giống hệt; vượt trần ⇒ y như thường, không tạo dòng; mã dùng lần hai, quá hạn, sai số đăng nhập: từ chối; phiếu đăng ký có mã mời vẫn phải qua xác minh và duyệt hai người.
- LC-1c mới: cấp quyền Đối tác cho hồ sơ chỉ có liên kết tới tổ chức có vai: được; liên kết tới tổ chức không vai: hỏng. Phá thử trigger một lần.
- Sổ vàng: mười tệp ở Đ4.3 xanh, không sửa đáp án; ca ba đường cùng số.
- Nhật ký, lời mời, phản hồi lỗi không chứa số điện thoại, mã số thuế.
- e2e: đăng ký phiếu «chỉ tổ chức» → người quản lý đăng nhập → mời → người được mời đăng ký bằng mã → thành viên soạn nháp → người quản lý gửi → văn phòng xác nhận → sổ công nợ của tổ chức có dòng. Kịch bản Chrome cho ô chọn tư cách và màn thành viên ở 390 và 1280.

## Người dùng sẽ thấy

Người được duyệt từ phiếu có phần tổ chức đăng nhập bằng số điện thoại và PIN của chính mình, thấy ô «Đang thao tác với tư cách: <tên mình> / <tên tổ chức>» ở đầu màn Tạo đơn (người chỉ làm cho tổ chức thì chỉ thấy tên tổ chức). Người quản lý có thêm màn «Thành viên»: mời bằng số điện thoại (nhận một mã để gửi cho người kia), gỡ thành viên, chuyển quyền quản lý; thấy mọi đơn và sổ công nợ của tổ chức. Thành viên thấy đơn của chính mình. Văn phòng (Quản lý bán hàng, Quản trị, Toàn quyền) đổi được người quản lý từ chi tiết hồ sơ tổ chức ở Danh bạ. Đơn lập thay mặt tổ chức hiện «Bên đặt: <tên tổ chức>» như đơn văn phòng lập cho tổ chức hôm nay.

## Hệ quả

- Migration: hai dòng `pty_relationship_type`, cột `replaced_by_id`, chỉ mục duy nhất, các trigger của Đ2, view công bố liên kết, bảng lời mời, cột `aut_session.acting_party_id` (module `auth`), cột `audit_log.acting_party_id` (module `audit`), tạo lại LC-1c. `docs/data-dictionary.json` + `npm run dict`.
- Hàng rào sửa có chủ đích: ảnh chụp bảng quyền (`src/shared/permissions.test.ts`, hàng mới và nghĩa mới của ô `own` cột Đối tác), ảnh chụp cổng (route mới), `src/architecture.test.ts` (cạnh gốc lắp ráp tiêm cờ, không thêm cạnh module), bài vét tầng nhật ký (`cham-tai-khoan.test.ts`: hành động mới đích là tổ chức, không chạm tài khoản), `scripts/audit-checks.mjs` (bất biến Đ2.4, Đ2.6, `R-LC-1c` mở rộng). Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md`.
- `staff`, `auth`, `orders`, `billing`, `pricing` đổi chỗ đọc hồ sơ theo Đ4.4; gốc lắp ráp tiêm «bên đang thay mặt» và cờ «người quản lý của bên đặt».
- **Phải nói thẳng:**
  - Người quản lý giữ quyền lớn nhất trên tổ chức. Tài khoản cá nhân của họ bị lộ PIN thì kẻ gian chuyển được quyền quản lý cho người khác. Lớp bù: chuyển chỉ cho **thành viên hiện có** (không cho số lạ), nhật ký, văn phòng đổi lại được; khuyến nghị buộc bảo mật hai lớp cho người quản lý là việc của ADR-0121, chưa thi công.
  - Tư cách sai (quên đổi) vẫn có thể đặt đơn nhầm bên. Lớp bù: ô tư cách luôn hiện ở màn Tạo đơn và trên phiếu xác nhận; sửa bên đặt sau xác nhận dùng đường «Đổi khách» sẵn có của văn phòng.
  - Số lượng đơn nháp chờ người quản lý (phương án a) chưa có số đo.
  - Tài khoản công ty lữ hành đang có (gắn hồ sơ cá nhân) không tự chuyển sang mô hình mới; chuyển là việc văn phòng làm từng tài khoản, ngoài ADR này.

## Lạm dụng và lớp chặn

| Lạm dụng | Lớp chặn |
|---|---|
| Chiếm tài khoản cá nhân của người quản lý rồi chiếm tổ chức | chỉ chuyển cho thành viên hiện có; mời làm người quản lý không tồn tại; nhật ký «chuyển quyền quản lý»; văn phòng đổi lại; bảo mật hai lớp (ADR-0121, sau) |
| Người quản lý gỡ hết người khác | được gỡ thành viên (đúng quyền của họ), nhưng không tự gỡ mình khi còn thành viên (CSDL Đ2.4); văn phòng thấy nhật ký và mở lại liên kết được |
| Thành viên tự nâng mình thành người quản lý | không có đường; chỉ mục duy nhất và hàng quyền `partner.org.manager.write` |
| Gửi lời mời hàng loạt | trần theo tổ chức, theo số, theo ngày; câu trả lời không đổi; không thư hay SMS nào do Nền tảng gửi tới số lạ |
| Dò số điện thoại nào có tài khoản qua lời mời | câu trả lời giống hệt; lời mời trong ứng dụng chỉ chính chủ số thấy |
| Dò mã mời | 8 ký tự, băm, gắn số, một lần, 7 ngày, 5 lần sai mỗi giờ |
| Nhầm tư cách, đơn ghi nhầm bên | tư cách lưu ở phiên, kiểm một chỗ mỗi yêu cầu; ô tư cách luôn hiện; nhật ký mang `acting_party_id`; bài quét Đ4.4 |
| Người đã rời vẫn đặt đơn cho tổ chức | liên kết kiểm lại mỗi yêu cầu; LC-1c mới và cổng `congDoiTacChuaCoVaiTro` chặn người chỉ còn quyền mà không còn liên kết |
| Tài khoản nội bộ gắn vào tổ chức để tự đẩy giá | máy chủ chặn gắn (Đ2.6); bất biến định kỳ; tự bật Trả sau bị chặn (Đ4.5) |
