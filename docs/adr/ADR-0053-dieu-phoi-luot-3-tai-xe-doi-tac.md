# ADR-0053 — Bảng điều phối chung, lượt duyệt 3: tài xế nhà xe đối tác dùng app cho chuyến (cửa một chiều); Từ chối chuyến; Báo bận

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 hộp hỏi: "Bạn có duyệt A-2 — ADR-0053 (tài xế đối tác dùng app, thấy khách trong ngày chạy sau hạn Từ chối, Từ chối trước 12 giờ, Báo bận; siết cả tài xế công ty) không? Đây là cửa một chiều về dữ liệu khách." → **"Duyệt A-2"** (mô tả phương án chủ chọn: "Ghi thành quyết định; siết tài xế công ty áp trước khi Bảng điều phối lượt 1 phát hành (báo phiên điều phối)."). **Cửa một chiều** về dữ liệu khách với người ngoài — chủ chọn khi đã được báo. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17 (hệ quả ADR-0057 lần 18–19); người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt A; kiểm nhanh cuối @ `3bc38d7`, sửa chữ theo đó ở `eebcf15`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)* **Thay câu bởi [ADR-0096](ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md)** (accepted 2026-10-03): `:59` "mã hôm nay không có mốc 'xuất bến sớm nhất'" — nay có cửa sổ xuất bến (mặc định 12 giờ); `:31`, `:220` "xuất bến sớm tối hôm trước" đọc là "xuất bến trong cửa sổ" (ca `:220` vẫn đúng); D7.2 `trongNgayChay` giữ nguyên nghĩa.
  - Soạn từ bản đề xuất `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-3.md` (giữ nguyên nội dung từ đây trở xuống; lượt duyệt A-2, trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`).
  - **Ngày duyệt:** 2026-09-30. **Người phê chuẩn:** chủ dự án.
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt A, trang ghép chung `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`. **Ba quyết định chạm dữ liệu/quyền: D7, D8, D9** — đúng trần 3 của `CLAUDE.md` §9. **Duyệt sau ADR-0052** (D7 dùng ô `trip.transfer`, `trip.passenger.add` và luật người nhận tin của ADR-0052).
- **Thay:** lượt duyệt II (D3 Từ chối, D4 Báo bận) của `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` (gọi **[L2]**, chưa từng được duyệt). D5 cũ của [L2] (thông báo) đã sang ADR-0052 D6.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):**
  - [HĐ] = `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`, "Trả lời lần 16" (30/9):
    - **Q2 cũ = a — "Tới 12 giờ trước"**: "Tài xế Từ chối chuyến được tới 12 giờ trước giờ chạy (con số là chính sách, đổi được)";
    - **Q1 cũ = a — "Từ lúc hết hạn Từ chối"**: "Tài xế đối tác thấy tên, năm sinh, SĐT khách từ lúc hết hạn Từ chối tới hết ngày chạy";
    - **ĐP12 = a — "Có, như tài xế công ty"**: "**Cửa một chiều** (chủ chọn khi đã được báo): tài xế nhà xe đối tác dùng app cho chuyến, cùng luật tài xế công ty";
    - **ĐP11 = a — "Được, như nhau"**: "Tài xế công ty và tài xế đối tác nhờ nhau đón như nhau";
    - **Q3 cũ = c — "Không, chỉ đối tác"**: "Tài xế **công ty** không có Từ chối / Báo bận; chỉ tài xế đối tác có (mở sau = đổi một ô quyền)";
    - **Q7 cũ = a — "Trong Vận chuyển"**: "**Cửa một chiều:** lịch bận của tài xế lưu trong module `van-chuyen`, không ở hồ sơ người".
  - Phương án nguyên văn: [L2] `:534-538` (Q1), `:540-544` (Q2), `:546-550` (Q3), `:567-570` (Q7); [TK] = `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` `:1146-1149` (ĐP11), `:1151-1155` (ĐP12). ĐP12(a) nguyên văn: *"**Có, cùng luật với tài xế công ty:** chỉ chuyến mình lái; tên, năm sinh, số điện thoại chỉ trong ngày chạy (mốc sớm nhất trả lời cùng câu Q1 cũ của lượt 2, ví dụ "từ lúc hết hạn Từ chối")."* Q1(a) nguyên văn: *"Chỉ từ lúc **hết hạn Từ chối** (xem Q2) tới hết ngày chạy chuyến. Được: không có kiểu "xem số rồi từ chối"."*
  - Tệp gom câu: `docs/superpowers/specs/2026-09-30-van-chuyen-cau-hoi-cho-chu.md` mục 3, mục 10 (ghi "ĐP12 là cửa một chiều: số khách đã đưa người ngoài xem thì không rút lại được").
- **Thiết kế dẫn:** [TK] §5.11 (`:847-856`), §6.1 (`:866-879`), §6.3 (`:895-902`), §6.4 D7–D9 (`:914-916`), §6.5.3 (`:979-985`), §9.2 mục 5 (`:1311`), lát 3.1–3.4; [L2] D2 (danh sách trường tài xế đối tác, `:198-221`), D3 (`:275-341`), D4 (`:343-392`), tiêu chí 13–19 (`:676-691`). Đề xuất Kernel lượt 2 `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md` (gọi **[K2]**) VK2-A — bảng `vc_unavailability` dùng chung.
- **ADR liên quan:** ADR-0048 (cột `DRIVER_PARTNER`, LC-1, LC-1b, "không thấy đơn hàng" — **bị thay** câu D2 ô quyền), ADR-0049 (DTO tài xế, "trong ngày chạy", `vc_trip_driver.close_reason` `REFUSED` để sẵn), ADR-0052 (ô `trip.transfer`, `trip.passenger.add`, người nhận tin), ADR-0030 (khuôn Từ chối), ADR-0040 D2, ADR-0018 điều 9, ADR-0014 điều 2, ADR-0019. Hiến chương Phần I (đã duyệt): 1.2, 2.1, 2.2, 2.3, K4, 4.4, 5.1, 5.5, 5.6, 5.7, 5.8, 5.12.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 2026-09-30, HEAD `3fc295b`). Không dùng ô hoãn nào của `thao_tac`.
- **Xây trên nền chưa có (Hiến chương 5.13) — ghi rõ:** lượt này xây trên **ADR-0049, ADR-0050, ADR-0051 CHƯA gộp `main`, CHƯA phát hành** (nhánh `thi-cong-adr-0049-tiep`; `0034`, `0035`, `0040`–`0043` chưa áp remote — kiểm chỉ-đọc 30/9, [HĐ] lần 15), và trên **ADR-0052 mới là đề xuất**. ADR-0048 đã lên production (bản 1.37).
- **Không đụng tiền:** Từ chối, Báo bận không sinh bút toán. Phí huỷ với nhà xe ghi tay trước, bảng mốc huỷ làm sau ([HĐ] lần 16, tiền Q7 "Đồng ý") — thuộc ADR tiền xe thuê. Tài xế đối tác **không bao giờ** thấy số tiền nào, kể cả giá thuê của chuyến mình (ADR-0048 D2).

---

## Tóm tắt cho chủ (lời thường)

1. **Tài xế nhà xe đối tác dùng app cho chuyến mình lái**, cùng nút như tài xế công ty (ĐP12).
2. Họ thấy **tên, năm sinh khách; mã đơn; tên + SĐT người liên hệ** (có khi là nhân viên đại lý) — **chỉ trong ngày chạy và sau khi hết hạn Từ chối**. Chuyến 06:00 sáng mai: tối nay chưa thấy. Không bao giờ thấy tiền hay chi tiết đơn.
3. **Tài xế công ty cũng bị siết** cùng luật "chỉ trong ngày chạy" — nếu áp sớm, bản phát hành đầu của Bảng điều phối sẽ đã siết tài xế công ty; nếu muộn, ghi nợ có hạn. Bấm Xuất bến tối hôm trước không mở danh sách sớm (bạn chọn lần 17).
4. **Cửa một chiều:** số khách người ngoài đã thấy thì không lấy lại được.
5. **Từ chối chuyến** (chỉ tài xế đối tác): tới 12 giờ trước giờ chạy; hạn đã qua thì không mở lại dù chuyến bị dời. Chuyến về "chưa có tài xế", người xếp xe nhận tin. Giao lại cho xe / nhà xe khác thì **giá thuê được tính lại**; giá thoả thuận cũ phải nhập lại (ADR-0057).
6. **Báo bận** (chỉ tài xế đối tác): tự ghi, tự rút; văn phòng không xếp vào khung đó; **không** báo bận đè chuyến đã được xếp — phải Từ chối hoặc gọi văn phòng (bạn chọn lần 17).
7. Tài xế công ty không có Từ chối, Báo bận (Q3 c).
8. Nhờ đón chéo xe công ty ↔ xe nhà xe được như nhau (ĐP11).
9. Bạn cần: vẽ V15; thử bằng một tài khoản tài xế đối tác thật trước khi báo nhà xe.

---

## Quyết định

### D7. Tài xế đối tác trên chuyến (ĐP12 = a, ĐP11 = a, Q1 cũ = a) — cửa một chiều

**D7.1 Ô quyền, cột `DRIVER_PARTNER`** (cột thứ 9 — `src/shared/permissions.ts:5@thi-cong-adr-0049-tiep`)
- `trip.view`, `trip.progress` (ADR-0049), `trip.transfer`, `trip.passenger.add` (ADR-0052): `none` → **`assigned`** — y như cột `DRIVER` ("cùng luật tài xế công ty"). `trip.passenger.add` chỉ mở nếu lượt A-1b (ADR-0052 D5b) đã duyệt.
- `trip.refuse` (D8) = `assigned`; `unavailability.self` (D9) = `own`.
- **Mọi ô khác giữ nguyên** (hôm nay chỉ `feedback.submit = any`, `feedback.view = own`, `party.document.view = own` — `permissions.ts:106, :107, :122`): `none` ở mọi ô đơn, tiền, liên hệ, danh mục, hồ sơ, `trip.dispatch`, `trip.override`, `trip.call_ack`.
- **Nới bài ghim cả hàng `DRIVER_PARTNER`** (ADR-0048; sổ hàng rào `docs/SO-HANG-RAO.md:132@thi-cong-adr-0049-tiep`) — Điều 9.4: chủ duyệt ADR này là duyệt việc nới. Bài ghim mới liệt kê đúng 6 ô `assigned`/`own` trên + 3 ô cũ; ô mới sau này mặc định `none`.
- **Không thêm mã quyền** ⇒ `EXTERNAL_PERMISSIONS = ["PARTNER","DRIVER_PARTNER"]` (`permissions.ts:29`) và trigger LC-1 (`migrations/0037_tai_xe_doi_tac.sql:10-12`, tập `NOT IN ('PARTNER','DRIVER_PARTNER')`) **không đổi**; trigger LC-1b (`0037:18-23`) vẫn bảo đảm tài khoản giữ `DRIVER_PARTNER` **không giữ quyền nào khác** — đó là lý do một tài xế đối tác không thể đồng thời xem đơn, tiền hay danh mục (`CLAUDE.md` §10: chỉ khi **thêm mã quyền bên ngoài** mới phải sửa `EXTERNAL_PERMISSIONS` + LC-1; lượt này không thêm).
- **Cổng:** `DRIVER_PARTNER` vẫn **chỉ** vào `staff` (chú thích `permissions.ts:69`; `OFFICE_GATE :206`, `ORDERS_GATE :211`, `ADMIN_GATE :201` không có mã này). Route tài xế của ADR-0049/0052 đã ở cổng `staff` với `can(trip.*, { assigned })` trước mọi truy vấn (`src/modules/van-chuyen/index.ts:912-1117@thi-cong-adr-0049-tiep`) — mở cho tài xế đối tác **chỉ bằng ô**, không thêm route, không đổi cổng.
- `assigned` = đang có dòng lái mở trên chuyến (`vc_trip_driver`, theo `ctx.staff.partyId`) — không đổi định nghĩa.

**D7.2 Khung thấy dữ liệu cá nhân của tài xế đối tác** (Hiến chương 4.4; DTO dựng từng khoá — `src/modules/van-chuyen/tai-xe-dto.ts:36`)
- **Luật đọc giao** của hai câu chủ trả lời (ĐP12 a "trong ngày chạy" **và** Q1 a "từ lúc hết hạn Từ chối"): tài xế đối tác thấy **họ tên + năm sinh khách, tên + SĐT người liên hệ** khi và chỉ khi **bây giờ ≥ hạn Từ chối hiệu lực của cặp (tài xế, chuyến)** (D8.2) **VÀ** một trong hai:
  - hôm nay (ngày VN) là ngày chạy; **hoặc**
  - chuyến đang `RUNNING` **và** ngày VN của giờ xuất bến ≥ ngày chạy (chỉ để phủ chuyến qua nửa đêm).
  - **Không có đường nào thấy khách trước hạn Từ chối** — kể cả xuất bến trong ngày chạy nhưng trước hạn (vd chuyến 14:00, hạn 02:00, bấm Xuất bến 00:05).
  - Vì sao có vế ngày xuất bến: mã hôm nay **không** có mốc "xuất bến sớm nhất" (`kiemGioXayRa` chỉ chặn xuất bến sớm hơn lần sửa kế hoạch cuối / chuyến trước kết thúc — `src/shared/gio-xay-ra.ts:5-11@thi-cong-adr-0049-tiep`); không có vế này, bấm Xuất bến 18:30 hôm trước là mở tên khách từ tối hôm trước.
  - Ngoài khung: các khoá đó **vắng mặt** (không phải chuỗi rỗng).
- Vì sao "giao": chỉ cách đọc này thoả **cả hai** câu. Đọc Q1(a) một mình cho phép thấy từ tối hôm trước (chuyến 06:00 hết hạn Từ chối lúc 18:00 hôm trước), trái "cùng luật tài xế công ty — trong ngày chạy"; [TK] `:1164` đã ghi Q1 cũ "chỉ có thể **siết** thêm" luật trong ngày chạy.
- Mọi cặp (tài xế, chuyến) đều có hạn (migration gieo cho dòng lái đang mở — D8.1), nên không có nhánh "không có hạn".
- **Một hàm thuần** ở `src/shared/` (mở rộng `trongNgayChay` — `src/shared/dieu-phoi-kiem.ts:364`, tên đề xuất `trongKhungXemKhach(chuyen, dongLai, bayGio)`) dùng cho DTO, câu ghi tên của tài xế (`trip.passenger.add`) và `lienHeChoTaiXe`. Không nơi nào tự tính khung.
- **Tài xế công ty (`DRIVER`) — Q-L3-B = a ([HĐ] "Trả lời lần 17" (30/9): nguyên văn nhãn "Có, chỉ thấy trong ngày chạy"):** **cùng hàm**, không có vế hạn Từ chối (tài xế công ty không Từ chối), có vế "đang chạy **và** xuất bến từ ngày chạy". Đây là **sửa hành vi của ADR-0049 D3** (câu thay ở mục "Câu ADR bị thay"); đóng kẽ G3-9 (`src/shared/dieu-phoi-kiem.ts:364@thi-cong-adr-0049-tiep`).
  - **Thời điểm áp — khuyến nghị: ngay trong lượt 1 của ADR-0049, trước khi ADR-0049 phát hành.** Lý do: ADR-0049 chưa gộp, chưa phát hành; đây là **siết** (chỉ bớt thấy), đổi một hàm và bài kiểm; để tới lúc thi công lượt A-2 thì bản phát hành đầu tiên sẽ ra với kẽ "bấm Xuất bến tối hôm trước là thấy tên khách". Vế này **không phụ thuộc** A-1 (không dùng ô hay bảng nào của ADR-0052), nên thi hành được ngay khi chủ duyệt A-2; nếu A-2 chưa duyệt lúc ADR-0049 phát hành → điều phối ghi nợ có hạn.
- **Mã đơn và liên hệ cho tài xế đối tác — Q-L3-A = a** ([HĐ] "Trả lời lần 17" (30/9): nguyên văn nhãn "Có cả hai"; không bao giờ tiền hay chi tiết đơn) — xem D7.3.

**D7.3 Tài xế đối tác thấy / không thấy**
- **Thấy** (chỉ chuyến mình có dòng lái mở): như tài xế công ty ở ADR-0049 D3 (mã chuyến, biển số, số chỗ, giờ, trạng thái; điểm dừng — chữ tự do che dãy ≥ 8 chữ số; giờ hẹn, giờ xe tới; **mã đơn**, số người mỗi điểm; trạng thái suất; điều kiện xuất bến còn thiếu) + khung D7.2 + danh sách xe khác khi nhờ đón (ADR-0052 D4.4: mã chuyến, **tên tài xế**, chỗ trống, điểm sắp tới — gồm cả chuyến xe công ty, ĐP11 a).
- **Mã đơn và người liên hệ (Q-L3-A = a, "Có cả hai"):** tài xế đối tác thấy **mã đơn** (nhãn để gọi văn phòng) và **tên + SĐT người liên hệ** của đơn có khách trên chuyến mình (người liên hệ **có thể là nhân viên đại lý / công ty lữ hành**), trong khung D7.2. Không tiền, không chi tiết đơn. Đây là ngoại lệ có tên của câu "không thấy đơn hàng" (ADR-0048 D2).
- **Không bao giờ:** mọi số tiền (kể cả giá thuê của chuyến mình); dịch vụ khác của đơn; ghi chú đơn; người lập, người phụ trách, tên bên đặt/đại lý; danh mục, giá; hồ sơ người khác; số giấy tờ đầy đủ (kể cả của mình); khách, số người, mã đơn của **xe khác**; lịch bận của người khác; tin "Toàn công ty" (`laNoiBo` giữ nguyên — ADR-0048).
- **Máy tài xế:** hàng đợi ngoại tuyến chỉ giữ lệnh, không giữ danh sách khách ([L2] D2; bất biến "không lưu đệm `/api/*`").

**D7.4 Nhờ đón giữa xe công ty và xe nhà xe (ĐP11 = a)**
- LC-14 (ADR-0052) **không** thêm điều kiện chủ xe: tài xế công ty ↔ tài xế đối tác, hai nhà xe khác nhau — như nhau.
- LC-13 "không chéo xe–tài xế" (ADR-0048 B1.4) nói về **ai lái xe nào**, không nói khách ở xe nào — không đụng.
- Tiền: tiền xe thuê tính theo chuyến ([HĐ] lần 16 tiền Q9 a); khách nhận giữa đường không đổi tiền ở lượt này. [TK] `:1147` đã ghi: nếu sau này nhà xe đòi tính thêm, ADR tiền thêm điều kiện.

**D7.5 Thông báo:** không luật mới. Người nhận tin chuyến của ADR-0052 D6.2 tính theo `can(trip.view, …)` hiện hành ⇒ tài xế đối tác **tự động** nhận tin chuyến của mình khi ô D7.1 mở. Bảng tin: chỉ nhãn `nguoi:<id>` (ADR-0048 giữ nguyên). Nội dung tin không có tên, SĐT khách.

### D8. Từ chối chuyến — chỉ tài xế đối tác (Q2 cũ = a, Q3 cũ = c)

**D8.1 Dữ liệu** (khuôn ADR-0030 điều 1–2; [L2] D3)
- `vc_trip_driver.close_reason` đã có `REFUSED` (`0042_chuyen_xe.sql:70@thi-cong-adr-0049-tiep`) — **không** dựng lại bảng.
- **Thêm cột** (chỉ thêm) trên `vc_trip_driver`:
  - `refuse_reason_code` — lý do Từ chối, **dòng `vc_reason` nhóm mới `TU_CHOI_CHUYEN`** (Quản trị sửa — `admin.manage`; gieo "Bận lịch khác", "Ốm / việc riêng", "Xe không chạy được", "Khác"); `CHECK`: có khi và chỉ khi `close_reason = 'REFUSED'`. Không ô chữ (ADR-0030 điều 2);
  - `closed_by_party_id` — **hồ sơ** người đóng dòng (máy chủ ghi từ `ctx.staff.partyId`), để trigger B8.2 so với `driver_party_id` **trong cùng module** (`closed_by` hôm nay là id tài khoản; so với hồ sơ phải đọc `staff` — vượt module).
- **Bảng mới `vc_refuse_deadline`** — hạn Từ chối **theo cặp (tài xế, chuyến)**, không theo dòng lái: `trip_id`, `driver_party_id`, `UNIQUE (trip_id, driver_party_id)`, `deadline_ms`, `lead_minutes` (số phút chính sách chụp lúc cặp được xếp **lần đầu** — 5.6), đủ bốn cột WHO.
  - Chèn khi cặp được xếp lần đầu: `deadline_ms` = giờ xuất bến dự kiến − `lead_minutes`. Xếp lại **đúng** tài xế đó sau khi bị đổi người → **dùng lại** dòng cũ (không đặt lại).
  - `deadline_ms` **chỉ được giảm** (trigger: `UPDATE` chỉ khi `NEW.deadline_ms < OLD.deadline_ms`; cấm `DELETE`).
  - Trigger `AFTER UPDATE OF planned_start_ms ON vc_trip` (cùng module): `UPDATE vc_refuse_deadline SET deadline_ms = NEW.planned_start_ms − lead_minutes × 60000 WHERE trip_id = NEW.id AND deadline_ms > NEW.planned_start_ms − lead_minutes × 60000` — **chỉ chạm dòng thật sự giảm**; dời muộn thì không dòng nào bị cập nhật, nên trigger "chỉ giảm" (nghiêm `NEW.deadline_ms < OLD.deadline_ms`) không bắn và lệnh dời chuyến không hỏng. Không phụ thuộc lệnh nào nhớ gọi.
  - Migration gieo dòng cho mọi dòng lái đang mở lúc áp (giờ xuất bến dự kiến − 720 phút).
- **Chính sách:** cột mới `vc_dispatch_policy.refuse_lead_minutes` (gieo **720** = 12 giờ; Toàn quyền — `settings.ops`; khuôn thêm cột có `DEFAULT` như `proxy_backdate_max_minutes` của `0041`).
- Nhóm lý do mới `TU_CHOI_CHUYEN` thêm vào `NHOM_LY_DO` (`src/shared/dieu-phoi-kieu.ts:14` — danh sách nhóm ở mã, không phải `CHECK`).

**D8.2 Hạn Từ chối hiệu lực — "khoá dính", không mở lại**
- Hạn hiệu lực = `vc_refuse_deadline.deadline_ms` của cặp — **mốc thấp nhất từng có**. Hệ quả:
  - văn phòng dời chuyến **muộn hơn** → hạn **không** tăng (không có kiểu "đã xem khách rồi được trả chuyến" — lý do chính của Q1 a);
  - dời **sớm hơn** rồi **dời lại** → hạn giữ mốc sớm;
  - đổi người rồi xếp lại đúng tài xế → hạn cũ của cặp;
  - Toàn quyền đổi con số chính sách → chỉ áp cho cặp xếp **lần đầu** sau đó.
- Tiền lệ: "khoá dính" mốc 6 giờ chủ chọn ([HĐ] lần 9, Q-A4-1).
- Tài xế được xếp **sau** khi hạn đã qua (xếp sát giờ) → không Từ chối được, thấy khách ngay trong ngày chạy (D7.2).

**D8.3 Ô quyền:** ô mới **`trip.refuse`**: `DRIVER_PARTNER = assigned`; **`DRIVER = none`** (Q3 c); `SUPER_ADMIN = any` (ADR-0014 điều 2); mọi cột khác `none`. Route chốt thêm **"người gọi đang lái chuyến này"**, áp cả Toàn quyền (403) — Toàn quyền không Từ chối thay; muốn đổi người thì dùng xếp xe (khuôn ADR-0030 điều 1). Chuyến không phải của mình → **404**.

**D8.4 Luồng — một lô** (thứ tự lô ADR-0049 D1)
1. `can(trip.refuse, { assigned })` + chốt "đang lái"; lý do thiếu / ngoài danh sách / đã ngưng → 400.
2. Lô: câu cổng `UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd WHERE id = :T AND status = 'PLANNED'` → nhật ký `trip_driver_refused` (`changes() > 0`; `detail` = mã chuyến + mã lý do; không tên, không biển số, không SĐT) → sự kiện `DRIVER_REFUSED` (thêm vào `LOAI_SU_KIEN_CHUYEN`) → câu đóng dòng lái có điều kiện: đúng chuyến, đúng hồ sơ người gọi, dòng còn mở, bây giờ ≤ hạn hiệu lực D8.2; ghi `REFUSED`, `refuse_reason_code`, người đóng = người gọi.
3. Cổng thua → đọc lại, trả đúng lỗi: quá hạn → 409 "Đã quá hạn từ chối, hãy gọi văn phòng để đổi người"; chuyến đã xuất bến / kết thúc / huỷ → 409; vừa bị văn phòng đổi người → 409 `stale`.
4. Sau lô: chuyến **không có tài xế** (suy từ không có dòng lái mở, không thêm cột) → **giữ** ở cổng xuất bến ("chưa có tài xế — văn phòng", ADR-0049 D2, Hiến chương 5.7). Văn phòng thấy "Tài xế <tên> đã từ chối lúc … — <lý do>" đọc từ dòng đã đóng (cột có kiểu). Gợi ý tài xế thay (MQ-01) khi lát 2.5 có.
5. Thông báo (sau lô, ADR-0052 D6): tới người có **`trip.dispatch = any`** (Bán hàng, Quản trị, Toàn quyền — người xếp lại được), ngăn "Của tôi".
6. Sau khi Từ chối, tài xế mở lại chuyến → 404.
- **Không đếm, không hạn mức số lần Từ chối** ở lượt này ([L2] D3); nhật ký đủ để đếm sau.

**D8.5 Bất biến hai lớp** (mọi dữ liệu là `vc_`, cùng module)

| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B8.1 | Dòng lái chỉ đi tiến (mở → đóng), không mở lại, không sửa dòng đã đóng, không xoá | trigger có sẵn (LC-04, ADR-0049) | câu ghi có điều kiện |
| B8.2 | `REFUSED` ⇒ người đóng là chính tài xế của dòng | trigger `BEFORE UPDATE`: `NEW.closed_by_party_id = OLD.driver_party_id` khi `REFUSED` (cột cùng module — D8.1) | chốt "đang lái" |
| B8.3 | `REFUSED` chỉ khi chuyến `PLANNED` và bây giờ ≤ `deadline_ms` của cặp | trigger đọc `vc_trip.status`, `vc_refuse_deadline`, so giờ CSDL hiện tại (test được bằng cách gieo `planned_start_ms` tương đối với bây giờ) | câu ghi có điều kiện + hàm thuần tính hạn, có test |
| B8.4 | `refuse_reason_code` có ⇔ `close_reason = 'REFUSED'`; `deadline_ms` chỉ giảm; không xoá dòng hạn | `CHECK` + trigger | hàm kiểm thân yêu cầu |
| B8.5 | (phát hiện) chuyến trong 48 giờ tới chưa có tài xế | — | câu kiểm định kỳ (cảnh báo) |

- **Không có phương án dự phòng duyệt sẵn cho B8.3.** Trigger so giờ hiện tại test được bằng dữ liệu gieo tương đối. Nếu thi công vẫn không làm được, **quay lại chủ** (lệch 5.1 mới cần chủ duyệt riêng).

**D8.5a Giá thuê khi Từ chối rồi giao lại (ADR-0057 T2, đã duyệt):** Từ chối **không** tự đổi xe hay nhà xe, nên giá chuyến giữ nguyên nếu văn phòng chỉ xếp **tài xế khác của cùng nhà xe, cùng xe**. Nếu văn phòng **giao lại** cho xe khác / nhà xe khác / tuyến khác (trước xuất bến), lô đổi của ADR-0057 **tự đảo** nguồn giá cũ (`SNAPSHOT` hoặc `AGREED`) và **chụp lại giá bảng**; giá thoả thuận cũ **không** tự chuyển — Quản trị / Kế toán / Toàn quyền **nhập lại**; không có giá thì chuyến bị giữ `THIEU_GIA`, không xuất bến. Phí huỷ với nhà xe (nếu có) do Quản trị / Kế toán ghi tay (tiền Q7). Tài xế đối tác không thấy số tiền nào.
- **Thứ tự thi công với ADR-0057:** phần "xe nhà xe phải có giá" dựa vào cổng `THIEU_GIA` và ô `transport.cost.*` của ADR-0057, mà các ô này **chỉ vào ở bản phát hành T2** của ADR-0057 (sau khi ADR-0049 lượt 1 gộp `main`). Nếu A-1b / A-2 phát hành **trước** T2 thì cổng giá chưa có ⇒ chuyến xe thuê chưa có đường nhập giá trong app. **Khuyến nghị: thi công A-1b và A-2 sau T2**; nếu buộc phải trước, điều phối ghi nợ có hạn và phần giá của D5c / D8.5a thi hành cùng T2.

**D8.6 Route:** `POST /api/van-chuyen/cuoc-cua-toi/:id/tu-choi` (cổng `staff`, thân `{ lyDo, requestId }`, cần `Origin` cùng site). `GET …/cuoc-cua-toi/:id` trả thêm `hanTuChoi` và `tuChoiDuoc` (máy tính sẵn, cùng hàm thuần).

### D9. Báo bận của tài xế đối tác (Q7 cũ = a, Q3 cũ = c)

**D9.1 Dữ liệu — một bảng dùng chung với khung bận của xe**
- **Bảng `vc_unavailability`** của module `van-chuyen` (Q7 a — cửa một chiều), **một bảng cho hai loại đối tượng** (`subject CHECK IN ('VEHICLE','DRIVER')`, định trọn; `CHECK` đúng một trong `vehicle_id` / `driver_party_id` theo `subject`) — **cùng thiết kế** với [K2] VK2-A (`kernel-luot-2.md:61-71`), đang được soạn thành ADR song song.
  - Nếu ADR Kernel lượt 2 (đề xuất **ADR-0055 tạm**, `docs/superpowers/specs/2026-09-30-de-xuat-adr-kernel-luot-2.md` A1, soạn song song cùng ngày) được duyệt / thi công **trước**: bảng đã có đủ `subject`, kèm trigger **chặn ghi `DRIVER`** tới lượt này (`kernel-luot-2:59`); D9 **bỏ trigger đó bằng migration mới** và mở dòng `subject = 'DRIVER'` (ô, route, lý do).
  - Nếu D9 đi **trước**: D9 tạo bảng với **đủ** tập `subject` và cột `vehicle_id`, chỉ mở phần `DRIVER`.
  - Điều phối chốt thứ tự lúc cấp số; **không** được có hai bảng khung bận.
- Cột (phần của D9): `driver_party_id`; bắt đầu / kết thúc (mili-giây để so, giờ VN để hiện; `CHECK` kết thúc > bắt đầu); `reason_code` = dòng `vc_reason` nhóm mới **`BAN_TAI_XE`** (gieo "Việc riêng", "Ốm", "Khác" — theo đề nghị của [K2] `:115`, khớp nhóm `BAN_XE`); `withdrawn_at`, `withdrawn_by`; dấu vết; khoá lạc quan.
- Không sửa giờ: đổi = rút khung cũ + ghi khung mới. Không xoá.
- Giới hạn (giả định, kế hoạch chốt số): một khung ≤ 14 ngày; không bắt đầu trong quá khứ.
- **Không làm ở lượt này** ([L2] D4 "phạm vi gọn"): văn phòng ghi thay / rút thay khung bận của tài xế.

**D9.2 Ô quyền**
- Ô mới **`unavailability.self`** (báo, rút khung **của chính mình**): `DRIVER_PARTNER = own`; **`DRIVER = none`** (Q3 c); `SUPER_ADMIN = any` (ADR-0014 điều 2; route luôn dùng hồ sơ của người gọi); mọi cột khác `none`.
- **Văn phòng xem** khung bận của mọi tài xế: ô **`trip.dispatch`** (Bán hàng, Quản trị, Toàn quyền) — thêm nghĩa, không ô mới; người xếp xe cần thấy để xếp. Kế toán (`trip.view` không kèm `trip.dispatch`) **không** thấy khung bận của tài xế (lý do có thể là "Ốm").
- Tài xế chỉ thấy khung của mình; khung người khác → 404.

**D9.3 Bất biến hai lớp**

| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B9.1 | Kết thúc > bắt đầu; lý do thuộc nhóm `BAN_TAI_XE` | `CHECK` | hàm kiểm thân |
| B9.2 | **Q-L3-C = a** ([HĐ] "Trả lời lần 17" (30/9): nguyên văn nhãn "Không"): không ghi khung bận chồng chuyến tài xế đang được xếp (chưa kết thúc, chưa huỷ), để Báo bận không thành đường vòng qua hạn Từ chối | trigger `BEFORE INSERT` trên `vc_unavailability` đọc `vc_trip_driver` + `vc_trip` | 409 "Bạn đang có chuyến <mã> lúc …, hãy Từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng" — cùng hướng Q-L2-1 a (xe) |
| B9.3 | **Không xếp tài xế vào chuyến chồng khung bận còn hiệu lực** | trigger `BEFORE INSERT` trên `vc_trip_driver` và khi đổi giờ `vc_trip` | hàm chồng giờ LC-03 (`kiemTaoSuaChuyen`) nhận khung bận như khoảng chặn — **một** hàm cho xe và tài xế ([K2] `:84`) |
| B9.4 | Khung chỉ đi tiến (hiệu lực → đã rút); không sửa giờ, người; không xoá | trigger | câu rút có điều kiện |
| B9.5 | Khung chồng khung của cùng tài xế | **cho phép** (hiện gộp) | — |

**D9.4 Route:** `GET /api/van-chuyen/ban/cua-toi`, `POST /api/van-chuyen/ban`, `POST /api/van-chuyen/ban/:id/rut` (cổng `staff`, `can(unavailability.self, { ownerId })`); `GET /api/van-chuyen/ban-tai-xe?tu=&den=` (cổng `office`, `can(trip.dispatch)`). Không thông báo.

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0048 D2, ô quyền | "Ô xem chuyến, Từ chối, Báo bận: thuộc ADR-0047 và lượt duyệt II; tới lúc đó vẫn `none`." | "Cột `DRIVER_PARTNER`: `trip.view`, `trip.progress`, `trip.transfer`, `trip.passenger.add`, `trip.refuse` = `assigned`; `unavailability.self` = `own` (ADR-0053). Mọi ô khác giữ `none`." — **nới** bài ghim cả hàng (Điều 9.4) |
| ADR-0048 D2, "Tài xế đối tác không thấy" | "đơn hàng, Trang chủ, danh mục giá" | (Q-L3-A a) giữ nguyên; thêm: "**mã đơn** và tên + SĐT người liên hệ trên chuyến mình lái (trong khung D7.2) là ngoại lệ có tên, không phải 'đơn hàng'" |
| ADR-0049 D3, "Tài xế đối tác chưa dùng app cho chuyến (lượt 3, hỏi riêng)" / bảng ô cột `DRIVER_PARTNER` = `none` | `trip.view`, `trip.progress` cột `DRIVER_PARTNER` = `none` | = `assigned`; khung thấy dữ liệu khách của tài xế đối tác theo D7.2 (giao "trong ngày chạy" và "sau hạn Từ chối") |
| ADR-0049 D3, "Trong ngày chạy" | "= hôm nay (ngày dân sự VN) là `service_date` của chuyến, **hoặc** chuyến đang chạy." | tài xế đối tác: D7.2 (qua hạn Từ chối **và** (ngày chạy **hoặc** đang chạy đã xuất bến từ ngày chạy)). **Tài xế công ty (Q-L3-B a — sửa hành vi ADR-0049):** "= hôm nay (ngày dân sự VN) là `service_date` của chuyến, **hoặc** chuyến đang chạy **đã xuất bến từ ngày chạy trở đi**." Một hàm cho mọi tài xế; áp khuyến nghị ngay trong lượt 1 của ADR-0049 (D7.2) |
| ADR-0049 D1, `vc_trip_driver` | cột: `trip_id`, `driver_party_id`, `valid_from_at`, `valid_to_at`, `close_reason` (… `REFUSED` để sẵn), `closed_by` | thêm `refuse_reason_code`, `closed_by_party_id` (D8.1); bảng mới `vc_refuse_deadline` |
| ADR-0049 D2, `vc_dispatch_policy` | các cột lượt 1 | thêm `refuse_lead_minutes` (720) |
| ADR-0049 D1, LC-03 | "Xe và tài xế không chồng giờ; …" | "… ; chuyến không xếp tài xế vào khung bận còn hiệu lực của người đó (ADR-0053 D9)." (phần xe: ADR Kernel lượt 2) |
| ADR-0052 D4.3, D5b | `trip.transfer`, `trip.passenger.add`: `DRIVER_PARTNER = none` ở lượt 2 | = `assigned` (`trip.passenger.add` chỉ nếu lượt A-1b đã duyệt) |
| ADR-0019 (bản đồ ô) | — | thêm `trip.refuse`, `unavailability.self`; không đổi danh sách cổng |
| ADR-0040 D3 | tài xế công ty: "xem cuốc xe của mình" | không đổi — tài xế công ty **không** có Từ chối, Báo bận (Q3 c) |

## Lệch có chủ ý khỏi Hiến chương 5.1

- **Không thêm lệch mới** (không có phương án dự phòng duyệt sẵn cho B8.3 — xem D8.5).
- Khung thấy dữ liệu khách (D7.2) là luật quyền đọc ở máy chủ (khuôn LC-08, LC-18), không phải bất biến dữ liệu.

## Cửa một chiều / hai chiều

- **Một chiều:**
  - **mỗi lần tài xế đối tác (người ngoài công ty) đã thấy tên, năm sinh, SĐT khách** — không rút lại được. Chủ chọn ĐP12 a **khi đã được báo** ([HĐ] lần 16; tệp câu hỏi mục 3);
  - tên khách do tài xế đối tác nhập đã vào `ord_passenger` (`source = 'DRIVER'`);
  - chủ, tiền tố bảng `vc_refuse_deadline` (mốc hạn chỉ giảm);
  - chủ và tiền tố bảng `vc_unavailability` (Q7 a — chủ chọn khi đã được báo "cửa một chiều"); tập `subject`;
  - mỗi lần Từ chối (dòng đóng không mở lại; nhật ký chỉ-thêm).
- **Hai chiều:** từng ô của cột `DRIVER_PARTNER` (đóng lại được — nhưng không lấy lại dữ liệu đã xem); con số hạn Từ chối; danh mục lý do; ô Từ chối / Báo bận của cột `DRIVER` (Q3: mở sau = đổi một ô); giới hạn độ dài khung bận.

## Hệ quả

- **Migration:** chỉ-thêm, **số ≥ 0044, lấy lúc thi công** sau khi liệt kê migration của mọi nhánh, worktree chưa gộp (`CLAUDE.md` §10; `docs/adr/README.md:77`). Gồm: hai cột trên `vc_trip_driver`, bảng `vc_refuse_deadline` (+ gieo cho dòng lái đang mở) + trigger B8.2–B8.4; cột chính sách; bảng `vc_unavailability` (nếu Kernel lượt 2 chưa tạo) + trigger B9.2–B9.4; gieo lý do hai nhóm mới. Phải đứng sau `0042` và sau migration của ADR-0052 trên cùng nhánh phát hành.
- **Ô quyền:** `trip.refuse`, `unavailability.self` mới; cột `DRIVER_PARTNER` mở 6 ô; hàng `DRIVER` không đổi so với ADR-0052. **Không** mã quyền mới ⇒ không sửa `EXTERNAL_PERMISSIONS`, trigger LC-1, và không nhân đôi bài "tập con quyền".
- **Bài phải đổi có chủ đích** (sửa trong cùng commit với ô): ghim hàng `DRIVER_PARTNER` (`permissions.test.ts`; SO-HANG-RAO `:132`); e2e "tài khoản chỉ-`DRIVER_PARTNER` gọi mọi route tài xế → 403" của ADR-0049 lát 1.6 (nay chỉ còn 403 ở route văn phòng) và `src/tai-xe-cong.test.ts` (SO-HANG-RAO `:139`); `homeRedirect`/`coPhanTaiXe` (SO-HANG-RAO `:138`) — trang đầu của tài xế đối tác có "Cuốc của tôi".
- **Bất biến `audit-invariants` (câu mới):** dòng lái `REFUSED` có người đóng ≠ tài xế; `REFUSED` sau giờ xuất bến thật; khung bận `DRIVER` chồng chuyến chưa huỷ đang xếp cho người đó; chuyến 48 giờ tới chưa có tài xế (cảnh báo). (Tài khoản giữ `DRIVER_PARTNER` kèm quyền khác đã có câu R-LC-1b — SO-HANG-RAO `:134`.)
- **Hàng rào mới** (mỗi cái một dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật):
  - bài ghim hàng `DRIVER_PARTNER` mới (9 ô có tên); bài ghim `trip.refuse`, `unavailability.self` cột `DRIVER` = `none`;
  - trigger B8.2–B8.4, B9.2–B9.4;
  - bài khung thấy dữ liệu khách (ba ca giờ dưới) — sửa cố ý hàm thành "hoặc" → đỏ;
  - bài "một hàm khung" (quét: không nơi nào tự so `ngayChay === homNay` ngoài hàm);
  - `src/hanh-khach-khong-lo-ten.test.ts` phải sửa cụ thể: regex chọn route điều phối (`:163-164@thi-cong-adr-0049-tiep`, nhóm `lich|chuyen|cuoc-cua-toi|chang|nhac-goi-khach|chinh-sach-dieu-phoi`) thêm `ban`, `ban-tai-xe`; route Từ chối nằm dưới `cuoc-cua-toi` (đã phủ); thêm ca chạy với tài khoản **`DRIVER_PARTNER`** (trong / ngoài khung D7.2); `src/giay-to-khong-lo-so.test.ts` mở rộng cho route mới. (Route ghi hành khách của tài xế và `TRA_TEN :166` — xem ADR-0052.)
  - `src/shared/cong-quyen.test.ts`: `DRIVER_PARTNER` ∉ `office`, `orders`, `admin` (giữ).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md` (công thức y — giấy tờ + chữ `DRIVER`; thêm dòng tài xế đối tác trên chuyến); `web/CLAUDE.md` (dòng kịch bản Chrome cho màn tài xế đối tác — đề xuất sửa luật, chủ duyệt riêng).
- **Việc lớn** (quyền + dữ liệu cá nhân cho người ngoài, **một chiều**) ⇒ người kiểm độc lập chỉ đọc cuối lượt; chủ thử bằng **tài khoản tài xế đối tác thật** trên iPhone trước khi báo nhà xe dùng.

## Tiêu chí nghiệm thu (kiểm bằng máy)

1. **Ghim:** hàng `DRIVER_PARTNER` đúng 9 ô có tên (6 mở mới + 3 cũ), còn lại `none`; sửa một ô → đỏ. Cột `DRIVER` của `trip.refuse`, `unavailability.self` = `none`.
2. **IDOR:** tài xế đối tác A mở / Từ chối / xem khách / bổ sung tên / báo bận thay trên chuyến của tài xế B → **404**; đổi id trong đường dẫn không lộ gì.
3. **Khung thấy khách (D7.2)** — DTO của tài xế đối tác, bài liệt kê khoá, hạn 12 giờ:
   - chuyến **06:00** ngày D: lúc 18:30 ngày D−1 (đã qua hạn Từ chối, chưa tới ngày chạy) → khoá `hoTen`, `namSinh`, `lienHe` **vắng mặt**; lúc 00:05 ngày D → có;
   - chuyến **14:00** ngày D: lúc 01:00 ngày D (trong ngày chạy, chưa qua hạn 02:00) → vắng; lúc 02:05 → có;
   - chuyến **23:30** ngày D qua nửa đêm: lúc 11:00 ngày D → vắng; 12:00 → có; 00:30 ngày D+1 khi `RUNNING` (xuất bến 23:20 ngày D) → có; 00:30 ngày D+1 sau `ENDED` → vắng;
   - **xuất bến sớm:** chuyến 06:00 ngày D, tài xế đối tác bấm Xuất bến lúc 18:30 ngày D−1 (chuyến `RUNNING`) → khoá tên, SĐT **vắng** tới 00:00 ngày D;
   - **xuất bến trong ngày chạy nhưng trước hạn:** chuyến 14:00 ngày D (hạn 02:00), bấm Xuất bến 00:05 ngày D → **vắng** tới 02:00;
   - **tài xế công ty (Q-L3-B a):** chuyến 06:00 ngày D, bấm Xuất bến 18:30 ngày D−1 → **vắng** tới 00:00 ngày D; chuyến 23:30 qua nửa đêm, `RUNNING` lúc 00:30 ngày D+1 (xuất bến ngày D) → có; không có vế hạn Từ chối;
   - mọi lúc: không khoá tiền, không khoá dữ liệu xe khác ngoài bốn khoá ĐP9.
4. **Từ chối:** (giá — ADR-0057) giao lại cho xe nhà xe khác → nguồn giá cũ bị đảo, giá bảng chụp lại; nguồn cũ là giá thoả thuận → chuyến `THIEU_GIA` tới khi nhập lại; chỉ đổi tài xế cùng nhà xe, cùng xe → giá giữ nguyên. Lý do ngoài danh sách → 400; sau hạn → 409; chuyến đã xuất bến → 409; Toàn quyền không lái → 403; tài xế công ty → 403; **hai lệnh song song** (Từ chối + văn phòng đổi tài xế) → đúng một thắng, bên kia 409 `stale`, đúng một dòng nhật ký.
5. **Khoá dính (theo cặp):** hạn đã qua, văn phòng dời chuyến muộn thêm 1 ngày → Từ chối vẫn 409, khung thấy khách không đổi; Toàn quyền hạ `refuse_lead_minutes` → cặp cũ không đổi hạn; dời sớm hơn → hạn sớm theo; **dời sớm rồi dời lại** giờ cũ → hạn giữ mốc sớm; **đổi người rồi xếp lại đúng tài xế cũ** → dùng hạn cũ của cặp (không mở lại); SQL `UPDATE vc_refuse_deadline` tăng hoặc giữ nguyên `deadline_ms` → `RAISE`; **dời chuyến muộn hơn → lệnh dời thành công (200), không lỗi trigger, hạn không đổi**.
6. **Lớp CSDL Từ chối** (chèn thẳng SQL): `REFUSED` với người đóng ≠ tài xế → `RAISE`; mở lại dòng đã đóng → `RAISE`; `REFUSED` khi chuyến `RUNNING` → `RAISE`; `refuse_reason_code` khi không `REFUSED` → `RAISE`.
7. **Sau Từ chối:** chuyến bị giữ "chưa có tài xế — văn phòng"; tin tới người có `trip.dispatch = any`, không tới tài xế khác; tài xế mở lại chuyến → 404.
8. **Báo bận:** chồng chuyến đang xếp → 409 **và** SQL → `RAISE`; văn phòng xếp tài xế vào khung bận → 409 **và** `RAISE`; sửa giờ / xoá khung → `RAISE`; tài xế xem khung người khác → 404; tài xế công ty ghi khung → 403; Kế toán gọi route xem khung bận → 403.
9. **Nhờ đón chéo (ĐP11):** tài xế đối tác gửi đề nghị sang xe công ty → xác nhận bình thường; tài xế công ty gửi sang xe nhà xe → như nhau.
10. **Không lộ:** mọi route mới + DTO tài xế đối tác với dữ liệu mẫu có tên, năm sinh, SĐT, số bằng lái → nhật ký, tin, Bảng tin không chứa; không dãy ≥ 8 chữ số.
11. **Cổng:** tài khoản chỉ-`DRIVER_PARTNER` gọi `GET /api/orders`, `/api/orders/dashboard`, `/api/parties`, `/api/catalog`, `/api/van-chuyen/lich`, `/api/van-chuyen/xe` → 403; `GET /api/van-chuyen/cuoc-cua-toi` → 200 chỉ chuyến mình.
12. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` (thoát 0 sạch / 1 gieo lỗi).

## Phương án bị loại

- **ĐP12 (b) không SĐT / (c) văn phòng bấm thay mọi nút:** chủ chọn a.
- **Q1 (b) thấy ngay khi được xếp:** chủ chọn a (chặn "xem rồi trả").
- **Đọc Q1(a) một mình — thấy từ lúc hết hạn Từ chối kể cả tối hôm trước:** trái "cùng luật tài xế công ty — trong ngày chạy" (ĐP12 a).
- **Hạn Từ chối tính lại mỗi lần đọc theo giờ xuất bến hiện tại:** dời chuyến muộn hơn sẽ **mở lại** Từ chối sau khi tài xế đã thấy khách — đúng lỗ Q1(a) muốn chặn.
- **Q2 (b) như hướng dẫn viên / (c) tới lúc xuất bến:** chủ chọn a.
- **Q3 (a)/(b) mở cho tài xế công ty:** chủ chọn c.
- **Q7 (b) lịch bận ở hồ sơ người:** chủ chọn a.
- **Hai bảng khung bận (xe, tài xế):** hai luật chồng giờ; [K2] đã thiết kế một bảng `subject`.
- **Lý do Từ chối là hằng trong mã** (khuôn `CANCEL_REASONS` của [L2] D3): `vc_reason` đã là danh mục lý do có kiểu của chính `van-chuyen` (Hiến chương 2.2 — lý do là dữ liệu); ràng buộc "orders không đọc `vc_`" không áp ở đây.
- **Thêm mã quyền mới cho tài xế đối tác trên chuyến:** không cần — `DRIVER_PARTNER` đã tách khỏi `DRIVER` đúng để khác cột (ADR-0048 D2 lý do 3).

## Câu hỏi còn mở

**Đã trả lời lần 17** ([HĐ] "Trả lời lần 17" (30/9)), nguyên văn nhãn: **Q-L3-A** "Có cả hai" (→ D7.3); **Q-L3-B** "Có, chỉ thấy trong ngày chạy" (→ D7.2, câu thay ADR-0049 D3; khuyến nghị áp ngay ở lượt 1 ADR-0049); **Q-L3-C** "Không" (→ B9.2). Không còn câu mở.

## Giả định và tự chốt (người kiểm soi)

| Mã | Điều | Loại |
|---|---|---|
| G3-1 | Khung thấy khách của tài xế đối tác = **giao** hai câu trả lời (D7.2) | áp lời chủ (cách đọc duy nhất thoả cả hai) |
| G3-2 | Hạn Từ chối chụp lúc xếp, "khoá dính" (D8.2) | thi hành lý do nêu trong Q1(a); tiền lệ Q-A4-1 |
| G3-3 | Mã đơn là nhãn — chủ chốt Q-L3-A a | đã trả lời lần 17 |
| G3-4 | Lý do Từ chối, lý do bận là dòng `vc_reason` (Quản trị sửa) | bề mặt, hai chiều |
| G3-5 | Tin Từ chối tới mọi người có `trip.dispatch = any` | hai chiều ([L2] giả định 6) |
| G3-6 | Khung bận ≤ 14 ngày, không bắt đầu trong quá khứ | bề mặt |
| G3-7 | Migration gieo hạn (giờ xuất bến − 720 phút) cho dòng lái đang mở lúc áp | bề mặt |
| G3-8 | Kế toán không thấy khung bận của tài xế | quyền đọc hẹp hơn (siết) |
| G3-9 | Kẽ tài xế công ty — chủ chốt Q-L3-B a | đã trả lời lần 17 |
| G3-10 | B9.2 — chủ chốt Q-L3-C a | đã trả lời lần 17 |

## Việc vẽ cần chủ

- **V15** — Từ chối chuyến (hạn còn / đã qua; chọn lý do) và Báo bận (danh sách khung của tôi, thêm, rút; lỗi "đang có chuyến") — [TK] `:706`. Nguồn: tệp câu hỏi mục 8.
- Màn tài xế cho tài xế đối tác dùng lại V5–V9 (không vẽ riêng nếu giống); thêm dòng "Thấy danh sách khách từ … " khi chưa tới khung (nhãn — bề mặt).

## Chưa kiểm

- Trigger so "giờ CSDL hiện tại" của B8.3 có test được trên `node:sqlite` và D1 local không (xem dự phòng).
- Thứ tự thật giữa ADR này và ADR Kernel lượt 2 (ai tạo `vc_unavailability`).
- Số tài xế đối tác thật sẽ có tài khoản; nhà xe nào dùng.
- Pháp lý: đưa danh sách hành khách cho tài xế nhà xe (người ngoài) — luật buộc xe mang danh sách hành khách (tra 27/9, **chưa có người chuyên môn kiểm**).
- Tệp đề xuất này chưa có người kiểm độc lập.
