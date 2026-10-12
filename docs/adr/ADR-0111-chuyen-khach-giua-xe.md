# ADR-0111 — Chuyển khách giữa hai xe: danh mục điều kiện chuyển, dấu vết và tin; cứu hộ chỉ sang xe đang chạy; thu hồi xuất bến sau khi chuyển; chặng đặt gấp

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời hai lần hỏi chọn phương án của lượt duyệt 8d, cả bảy hộp chọn phương án khuyến nghị. Nhãn đã chọn nguyên văn: lượt **8d-1** — hộp 1 `Điều kiện` (Đ1, Đ2): **"Duyệt (Recommended)"**; hộp 2 `Dấu vết` (Đ3): **"Duyệt (Recommended)"**; hộp 3 `Nới bài kiểm` (N2, N3 ở mục "Hàng rào nới"): **"Đồng ý nới (Recommended)"**; hộp 4 `Tình huống` (xác nhận mười tình huống mẫu, không phải quyết định): **"Đúng hết (Recommended)"**; lượt **8d-2** — hộp 5 `Cứu hộ` (Đ4): **"Duyệt (Recommended)"**; hộp 6 `Thu hồi` (Đ5): **"Duyệt (Recommended)"**; hộp 7 `Đặt gấp` (Đ6): **"Vẫn chờ Quản trị (Recommended)"**, tức phương án (1) của Đ6. Nguyên văn câu hỏi và phương án ở mục "Lời chủ dự án". Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8d-1" (`:87-94`) và "Lượt duyệt 8d-2" (`:96-102`) (nhánh `claude/van-chuyen-goi-a-c` @ `9434c9b2`). Dòng ★ ở mục "Câu ADR bị thay" (ADR-0104 `:277`) do người soạn bản chép thêm, vì thiếu thì ADR đã duyệt tự mâu thuẫn với chỗ nới N2 mà chủ đã đồng ý. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Đính chính mã (2026-10-12):** gói A4 gộp vào nền trước và đã dùng mã bất biến R-VC-26 đến R-VC-30; năm bất biến định kỳ của ADR này ở mục "Bất biến định kỳ" nay mang mã **R-VC-31 đến R-VC-35** (cùng nội dung, chỉ đổi số cho khỏi trùng); nơi nào trong ADR này còn ghi R-VC-26..30 cho chuyển khách thì đọc là R-VC-31..35 (bảng `scripts/audit-checks.mjs`, `docs/SO-HANG-RAO.md` đã ghi theo số mới).
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-8d/01-de-xuat-adr-0111-chuyen-khach-giua-xe.md`; hộp hỏi `00-trang-trinh.md`; trang ghép `02-trang-ghep.md`; phiếu kiểm độc lập tổng hợp `phieu-kiem-tong-hop.md` (cùng thư mục với tệp 01; bốn hồ sơ có ngày, đóng băng). Chủ đọc `00-trang-trinh.md` @ `2bbb1632`; tệp 00, 01, 02 và tệp tình huống không đổi từ `2bbb1632` tới `9434c9b2`.
- **Thuộc lượt:** lượt duyệt 8d, hai lần hỏi, mỗi lần tối đa 3 quyết định chạm dữ liệu, quyền hoặc bất biến (trần 3 của `CLAUDE.md` §9), theo khuôn một ADR hai lượt của ADR-0052 (`ADR-0052:7`, lượt A-1 rồi A-1b):
  - **lượt 8d-1:** Đ1, Đ2, Đ3; cùng lần hỏi có hộp **nới hai bài kiểm** (N2, N3 — duyệt theo Hiến pháp Điều 9.4, không thêm quyền hay dữ liệu, không tính trần) và hộp xác nhận mười tình huống mẫu (không tính trần — `ADR-0052:233`, `:274` đòi chủ xác nhận bộ ca mẫu);
  - **lượt 8d-2:** Đ4, Đ5, Đ6, hỏi ngay sau khi chủ trả lời 8d-1.
  - Mười tình huống: `golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json` — chủ đã xác nhận 2026-10-08 (hộp 4); bước `TH02-4-DAT-GAP` theo Đ6 (hộp 7), bước `TH07-5-NEU-C-CHUA-CHAY` theo Đ4 (hộp 5). Vì sao tệp không nằm ở `golden/dieu-phoi/`: `00-trang-trinh.md`, mục "Khác kế hoạch".
- **Mã quyết định:** "Đ1–Đ6" trong tệp này là quyết định của ADR này (khớp mã Đ1–Đ6 ở kế hoạch A5 §1b), **không** phải Đ1/Đ2 của ADR-0104.
- **Sửa:** ADR-0052 (D4, D5c, D6, bảng câu thay, tiêu chí nghiệm thu 1), ADR-0097 (Đ3.2), dòng **Xếp** của ADR-0049 D2 (Đ6, phương án (1)); ★ ADR-0104 bài kiểm 3 (`:277`, theo N2). Từng câu ở mục "Câu ADR bị thay"; câu trỏ cho dòng Trạng thái của các ADR đó ở `docs/superpowers/specs/2026-10-08-luot-duyet-8d/chep-vao-adr/dong-tro-adr-cu-8d.md`.
- **Mốc đo mã:** mọi `tệp:dòng` của mã đo trên nhánh làm việc `claude/van-chuyen-goi-a-c` **@ `046fb6b5`** (đã gộp ADR-0104 Đ1 ở `4d076bed`), đọc bằng `git show 046fb6b5:<tệp>`. Nhánh của người soạn dựng từ `d4a4bdee` (trước khi gộp Đ1). Giữa hai mốc có nhiều tệp mã đổi; trong số tệp được trích ở đây, các tệp đổi là `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/dieu-phoi-lenh.ts`, `src/modules/van-chuyen/lop-vuot.test.ts` (mới), `src/modules/thongbao/repository.ts`, `src/shared/permissions.ts`, `src/shared/tin-chuyen.ts`, `src/shared/dieu-phoi-kieu.ts`, `web/chuyen.ts`; số dòng các tệp đó lấy ở `046fb6b5`. Migration, `scripts/`, `src/architecture.test.ts`, `src/shared/gio-xay-ra.ts`, `src/shared/cam-ket-xe.ts`, `src/modules/van-chuyen/dieu-phoi.ts`, `web/cuoc-chuyen.ts`, `web/shell.ts`, `web/account.ts`, `web/chinh-sach-dieu-phoi.ts`, `docs/quyen-hoan.json` như nhau ở hai mốc. Dòng ADR đo trên chính tệp ở `docs/adr/` (ADR-0107, ADR-0109, ADR-0110 đọc ở `6820b86b`). **Mốc chép `9434c9b2`:** `git diff --stat 046fb6b5 9434c9b2 -- src web migrations scripts tests` rỗng (giữa hai mốc chỉ `golden/` đổi: thêm tệp tình huống 8d và một dòng `golden/README.md`); trong `docs/adr/`, giữa hai mốc chỉ dòng Trạng thái của ADR-0063, ADR-0079, ADR-0081, ADR-0096 đổi, thêm ADR-0109, ADR-0110, và README thêm hai dòng 0109, 0110 cùng đổi dòng số kế tiếp — ngoài các dòng Trạng thái vừa kể (mỗi tệp đúng một dòng thay), các ADR được trích ở đây không đổi, nên mọi số dòng giữ nguyên.
- **Nguồn — lời chủ (chuẩn, không hỏi lại):**
  - **2/10** (chat chiều, "Thu gọn Đợt 5" — chủ: *"ok"*): *"Khi làm D4: tập mã luật để dạng **danh mục** (thêm luật = thêm dòng), không khoá cứng bằng `CHECK`."* — `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:169` (tiêu đề mục `:165`). Cùng mục, `:170`: mốc bật lại D4 (≥ 15 xe đối tác hoặc > ~40 chuyến/ngày).
  - **P4, 1/10** (Lượt II câu 4, chủ: *"Đồng ý"*): *"một đề nghị được nhận ⇒ các đề nghị khác cùng điểm thành `VOID` trong cùng lô"* — lộ trình `:151` (tiêu đề mục `:142`, chat 2026-10-01); câu hỏi gốc `:192`; kế hoạch Đợt 5 `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md:525`. (Kế hoạch A5 ghi "lời chủ 2/10" cho cả hai ý; P4 thật ra là 1/10.)
  - **30/9:** ADR-0052 (accepted, lượt A-1 và A-1b — `ADR-0052:3`) là luật gốc của việc chuyển khách; ADR này chỉ thay đúng các câu ở mục "Câu ADR bị thay".
- **Nguồn — không phải lời chủ nguyên văn:** **Mở lại 8/10** — `docs/BACKLOG.md:200` (BL-VC-D4) ghi *"Mở lại 8/10 (nhiệm vụ "Vận chuyển & Bán hàng Gói A & C", Giai đoạn 3 mục A5: ADR-0052 D4, D5c)"*. Đây là ghi chép của điều phối khi chủ giao nhiệm vụ Gói A & C, bỏ qua mốc bật lại ở lộ trình `:170`.
- **Thiết kế dẫn:** kế hoạch A5 (bản sửa 8/10) §0.3–0.6, §1a (G-A5-x), §1b, §5; phiếu phản biện `docs/superpowers/plans/2026-10-08-giai-doan-3-a5-phan-bien.md`; thiết kế bảng điều phối §5.5, §5.9 (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:766-790`, `:822-836`); đánh giá bản vẽ Đợt 5 (`docs/design/van-chuyen-dot-3-7/danh-gia/dot-5.md`).
- **ADR liên quan:** ADR-0049 (bảng `vc_trip*`, mốc 6 giờ dòng Xếp `:162`), ADR-0050 (VK1-A, trigger `vc_trip_departed_after_plan`), ADR-0051 (`:149` — chuyển điểm không chụp lại mốc giờ hẹn), ADR-0052 (luật gốc), ADR-0053 (`:46` ô tài xế đối tác; `:50` không thêm mã quyền), ADR-0056 (cam kết xe riêng / số chỗ tối thiểu, A2 `:56-59`, A3 `:61-70`), ADR-0096 Đ1 (LC-19 đón trước trả), ADR-0097 (thu hồi xuất bến, `:52`, `:59`), ADR-0104 (`:74` nhãn nhóm `PHA_LE`; `:101`, `:244` duyệt / bác vẫn `trip.override`; `:220` đơn huỷ khi xe đang chạy; `:221`, `:230`, `:233` sửa chữ mốc khi chuyển; `:232` mở danh sách tin), ADR-0107 (`:54` Bán hàng tự đóng dấu đặt gấp — ô `order.leg.short_notice` SALES `any`; accepted 8/10), ADR-0109, ADR-0110 (accepted 8/10, đã chép vào `docs/adr/` ở `49a589e5`; ADR-0110 chỉ từ chối lệnh tạo chỗ đảo mới, không chạm việc chuyển khách).
- **Xây trên lỗ đang hở:** **không.** Đối chiếu `docs/quyen-hoan.json` mục `phat_hien` (kiểm 2026-10-08 @ `d4a4bdee`, tệp không đổi tới `046fb6b5`: sáu mục, cả sáu HIGH, chưa mục nào đóng):
  - **TNV-G1, TNV-G3, TNV-G4, HC-4.2** (sổ tiền; hạn 2026-10-31): ADR này không ghi bảng `bil_*`, không đọc, không tính, không hiển thị tiền. Chuyển khách không sinh bút toán; tiền xe thuê tính theo chuyến (`ADR-0052:20`).
  - **HC-5.11** (tác vụ tự động không định danh; hạn 2026-11-15): **không xây trên lỗ này, với điều kiện** hết hạn đề nghị vẫn tính lười trong lô lệnh của người (`ADR-0052:78`, MQ-08 — không Cron) và mọi dòng nhật ký ghi `staff_id` của người bấm. Nếu sau này đổi sang quét nền hay Cron đóng đề nghị hết hạn, phải ghi "xây trên lỗ đang hở: HC-5.11" và dừng chờ chủ (khuôn `ADR-0104:319`).
  - **HC-5.19** (chưa diễn tập khôi phục; hạn 2026-10-31): áp chung cho mọi lần phát hành có migration, không riêng ADR này. Ghi để người duyệt thấy khi lên lịch phát hành.
  - Ô hoãn `thao_tac` (`task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`) không được dùng.
- **Xây trên nền chưa có (Hiến chương 5.13):** Đ1 của ADR-0104 đã gộp vào nhánh làm việc (`4d076bed`, chưa lên `main`); còn chờ Đ2 (nhánh `adr-0104-d2`, migration 0089), ADR-0105 (0090), ADR-0109, G17 — thứ tự ở kế hoạch A5 dòng 9–14. Số dòng các tệp `index.ts`, `dieu-phoi.ts`, `dieu-phoi-lenh.ts`, `tin-chuyen.ts`, `chuyen-repo.ts` sẽ lệch tiếp sau khi các nhánh đó gộp (kế hoạch T0 đo lại).
- **Không đụng tiền.** Không thêm mã quyền, không đổi giá trị ô quyền nào ngoài ô `trip.transfer` đã duyệt ở ADR-0052 D4.3 (`:84`).

---

## Lời chủ dự án

- **Trước lượt này** (2/10 danh mục điều kiện; 1/10 P4 tự huỷ; 30/9 ADR-0052): mục "Nguồn — lời chủ" ở đầu tệp.
- **Cách hỏi** (sổ thi công `:89`, `:98`): hai lần hỏi chọn phương án ngày 2026-10-08, chữ lấy từ `00-trang-trinh.md` @ `2bbb1632`. Hộp 1–3 và 5–7 dán nguyên văn; hộp 4 gộp mười tình huống thành một đoạn đánh số (1)–(10) cho vừa ô hỏi, chữ từng tình huống giữ nguyên. Chủ được nói đoạn "Cho chủ dự án" của tệp 00 trước các hộp 8d-1 (tự huỷ cùng điểm theo lời chủ 1/10; người đi kèm sang xe cứu hộ); sổ không ghi đoạn đó có dán nguyên văn hay không. Đoạn thứ hai của nó, nơi chủ được báo hai điều không cần chọn, nguyên văn ở tệp 00 (`:9`); sổ chỉ ghi chủ được nói hai điều đầu, câu cuối về thứ tự các bước lưu có trong tệp 00 nhưng sổ không ghi chủ đã nghe:

  > Có hai điều bạn nên biết mà không cần chọn. Thứ nhất, khi một xe đã nhận đón một điểm thì các lần nhờ khác cho cùng điểm đó tự huỷ, đúng như bạn đồng ý ngày 1/10; tài xế có lần nhờ bị huỷ không nhận tin, chỉ thấy "Đã huỷ" khi mở màn hình. Thứ hai, khi cứu hộ xe hỏng, người đi kèm đoàn (ví dụ hướng dẫn viên) sang xe cứu hộ cùng khách và được tính vào số chỗ, đọc theo chữ văn bản 30/9 (cứu hộ chuyển mọi chỗ đang có người của xe hỏng). Ngoài ra, văn bản 30/9 ghi thứ tự các bước lưu theo một cách máy không chạy được, nên văn bản mới viết lại thứ tự cho đúng; kết quả không đổi.

### Lượt 8d-1 (2026-10-08; sổ thi công `:87-94`)

- **Hộp 1**, tiêu đề `Điều kiện` (Đ1, Đ2). Câu hỏi (`00-trang-trinh.md:19`):

  > Khi một tài xế nhờ xe khác đón khách giúp, Nền tảng tự kiểm một danh sách điều kiện trước khi chuyển, ví dụ xe nhận còn đủ chỗ không, có vướng mốc 6 giờ không, có đủ giờ nghỉ giữa hai chuyến không. Văn bản ngày 30/9 khoá cứng 9 điều kiện; vài điều kiện trong đó (giấy tờ xe, bằng lái, trùng giờ) thực tế gần như luôn đạt, vì xe và tài xế của xe nhận không đổi. Ngày 2/10 bạn đồng ý để danh sách này ở dạng danh mục, tức mỗi điều kiện là một dòng trong một bảng, chứ không khoá cứng, nên cần văn bản mới thay đúng chỗ đó. Văn bản mới cũng thêm hai điều kiện mà các quyết định bạn đã duyệt buộc phải có. Một là nếu việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe đang chở một đoàn đặt xe riêng), việc chuyển phải chờ Quản trị duyệt kèm lý do. Hai là khách thuộc đơn đã huỷ, hoặc thuộc chặng đã bị sửa không còn hiệu lực, thì không chuyển được, vì Nền tảng vốn không cho đưa những khách đó lên xe nào. Bạn duyệt văn bản này không?

  - Chủ chọn: **"Duyệt (Recommended)"** — "Được: đúng điều bạn đồng ý ngày 2/10; sau này thêm điều kiện không phải dựng lại bảng dữ liệu, chỉ thêm một dòng cùng phần kiểm tương ứng (vẫn do người làm phần mềm làm); khách xe riêng không bị ghép chung mà không ai xem. Mất: một số lần nhờ xe phải chờ Quản trị duyệt; và nếu trong nhóm khách được nhờ có dù chỉ một khách của đơn đã huỷ hoặc của chặng không còn hiệu lực, cả lần nhờ đó chỉ bác được, văn phòng phải xếp xe theo cách cũ."
  - Không chọn: "Chưa duyệt" — "Được: bạn có thêm thời gian xem lại. Mất: chưa làm được phần nhờ xe khác đón; tài xế vẫn gọi văn phòng như hôm nay."

- **Hộp 2**, tiêu đề `Dấu vết` (Đ3). Câu hỏi (`00-trang-trinh.md:25`):

  > Mỗi lần chuyển khách, Nền tảng ghi lại để sau này tra được và để báo đúng người. Văn bản mới quy định cách ghi như sau. Mỗi khách ghi rõ được chuyển vào xe theo lần nhờ nào và chuyển ra theo lần nhờ nào, vì một khách có thể được chuyển vào rồi lại chuyển ra. Nền tảng ghi tài xế bấm Nhận và chỉ chấp nhận khi người bấm đúng là tài xế xe nhận, nên văn phòng không bấm Nhận thay được. Khi lần nhờ phải chờ Quản trị, Nền tảng ghi thêm ai duyệt hoặc bác và lúc nào, vẫn giữ tên tài xế đã bấm Nhận. Thời gian chờ trả lời (10 phút) tính theo cài đặt lúc gửi; còn công tắc "tự đồng ý" (bạn tắt thì mọi lần nhờ đều phải qua Quản trị) tính theo cài đặt lúc tài xế bấm Nhận, để khi bạn tắt công tắc thì cả các lần nhờ đang chờ cũng phải qua Quản trị; văn bản ngày 30/9 có hai câu nói khác nhau ở chỗ này. Khi tài xế xe nhận bấm "Không nhận", tài xế nhờ được báo ngay; văn bản cũ chưa có tin này. Nhật ký chỉ ghi mã chuyến, số khách và tên điều kiện không đạt; không ghi tên, năm sinh hay số điện thoại khách. Những gì đã ghi thì không xoá được, nên cách ghi phải duyệt trước khi làm. Bạn duyệt không?

  - Chủ chọn: **"Duyệt (Recommended)"** — "Được: tra lại được mọi lần chuyển; tắt công tắc có hiệu lực ngay; tài xế nhờ biết sớm khi bị từ chối. Mất: cách ghi cố định từ lần ghi đầu, muốn đổi sau phải làm thêm."
  - Không chọn: "Chưa duyệt" — "Được: bạn xem lại cách ghi trước. Mất: chưa bắt đầu được phần dữ liệu của việc nhờ xe."

- **Hộp 3**, tiêu đề `Nới bài kiểm` (N2, N3). Câu hỏi (`00-trang-trinh.md:31`):

  > Để khớp điều bạn đã duyệt, văn bản mới nới hai bài kiểm tự động. Một: bài canh "chỗ nào được hỏi quyền vượt luật" cho thêm đúng hai nút Duyệt và Bác lần nhờ. Rủi ro mới: bài này không còn soi kỹ hai nút đó, nên nếu ai sửa nhầm để người ít quyền hơn (ví dụ Bán hàng) bấm được Duyệt thì bài này không chắc báo đỏ; phần bù là một bài thử riêng "Bán hàng bấm Duyệt thì bị chặn", đã có trong kế hoạch nhưng chưa viết. Hai: câu kiểm định kỳ "điểm đón khác nơi hẹn" bỏ qua khách lên xe cứu hộ ở nơi gặp. Rủi ro mới: khách ở nơi gặp bị xếp nhầm điểm thì câu này không báo; chỗ này chưa có bài bù. Bạn đồng ý nới không?

  - Chủ chọn: **"Đồng ý nới (Recommended)"** — "Được: làm được phần Quản trị duyệt hoặc bác lần nhờ và phần cứu hộ có nơi gặp; câu kiểm định kỳ không báo nhầm mỗi lần cứu hộ. Mất: hai rủi ro mới nói trên."
  - Không chọn: "Chưa nới" — "Được: hai bài kiểm giữ nguyên độ chặt. Mất: chưa làm được phần duyệt, bác và cứu hộ có nơi gặp; lần nhờ phải chờ Quản trị khi đó không ai xử lý được, chỉ tự huỷ khi xe tới điểm hoặc kết thúc chuyến."

- **Hộp 4**, tiêu đề `Tình huống` (xác nhận mười tình huống; không phải quyết định, không tính trần). Câu hỏi (`00-trang-trinh.md:37`):

  > Trước khi nghiệm thu phần chuyển khách, văn bản ngày 30/9 yêu cầu bạn xác nhận các tình huống mẫu. Dưới đây là 10 tình huống, dùng ví dụ xe A, xe B của bạn:
  > 1. Kẹt xe, xe A không kịp đón 3 khách ở Mường Thanh. Xe B đang chạy gần đó, nhận thêm thì chở 25 trên 29 chỗ, không vướng giờ. Tài xế A nhờ, tài xế B bấm Nhận: Nền tảng tự đồng ý, 3 khách sang xe B, tài xế A được báo.
  > 2. Như tình huống 1 nhưng xe B chưa xuất bến và còn dưới 6 giờ tới giờ chạy (khách không đặt gấp): tài xế B bấm Nhận xong, việc chuyển chờ Quản trị duyệt kèm lý do. Duyệt thì khách sang xe B; bác thì khách ở lại xe A.
  > 3. Xe A chỉ còn 1 chỗ mà điểm Alibu của xe B có 2 khách. Tài xế B nhờ, tài xế A bấm Nhận: Nền tảng không cho vì xe A sẽ chở 16 trên 15 chỗ, báo Quản trị; Quản trị chỉ được bác, không được duyệt cho qua.
  > 4. Tài xế B bấm "Không nhận" và chọn lý do (ví dụ "Không kịp giờ"): lần nhờ đóng lại, tài xế A được báo ngay. Nếu tài xế B để quá 10 phút không trả lời: màn hình tài xế A hiện "hết giờ chờ" để A nhờ xe khác hoặc gọi văn phòng; Nền tảng không tự gửi tin đúng lúc phút thứ 10, mà báo "đã hết hạn" khi có người bấm tiếp vào lần nhờ đó (ví dụ tài xế B bấm Nhận muộn).
  > 5. Tài xế A nhờ cùng lúc xe B và xe C đón Mường Thanh. Tài xế B bấm Nhận trước: lần nhờ gửi xe C tự huỷ; tài xế C không nhận tin, thấy "đã huỷ" khi mở màn hình. Tương tự, nếu tài xế A đã nhờ xe B đón Mường Thanh rồi xe A hỏng và tài xế C nhận cứu hộ cả xe, lần nhờ gửi xe B cũng tự huỷ, tài xế B không nhận tin.
  > 6. Xe A tới Mường Thanh (hoặc tài xế A bấm bỏ qua điểm, hay kết thúc gián đoạn) trước khi xe B trả lời: lần nhờ tự huỷ, không ai phải làm gì.
  > 7. Xe A hỏng giữa đường, 5 khách đã lên xe, 3 khách còn chờ ở điểm sau. Tài xế A chọn xe cứu hộ C đang chạy và ghi nơi gặp; tài xế C bấm Nhận: 5 khách lên xe C ở nơi gặp, 3 khách được xe C đón ở điểm cũ; sau đó tài xế A bấm Kết thúc gián đoạn. Nếu xe A có người đi kèm, ví dụ hướng dẫn viên, họ cũng sang xe C cùng khách và được tính vào số chỗ của xe C.
  > 8. Như tình huống 7 nhưng tài xế A gọi văn phòng, nhân viên văn phòng gửi thay lần nhờ cứu hộ. Tài xế C vẫn phải tự bấm Nhận; văn phòng không bấm Nhận thay được.
  > 9. Việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe B mà đoàn trên xe B đã đặt xe riêng): việc chuyển chờ Quản trị duyệt kèm lý do, không tự đồng ý.
  > 10. Ví dụ của bạn: xe A không kịp Mường Thanh còn xe B ở gần; đồng thời xe B không kịp Alibu còn xe A ở gần. Hai tài xế nhờ chéo nhau; mỗi lần nhờ được xét riêng theo số chỗ lúc tài xế bấm Nhận: như tình huống 1, hoặc như tình huống 3 nếu lúc đó thiếu chỗ. Nếu tài xế A bấm Nhận lúc xe A còn thiếu chỗ thì lần nhờ đó chỉ bác được, kể cả khi sau đó xe A bớt khách; tài xế B gửi lại lần nhờ mới.
  >
  > Kết quả Nền tảng đưa ra ở mỗi tình huống có đúng ý bạn không?

  - Chủ chọn: **"Đúng hết (Recommended)"** — "Được: phần bạn xác nhận không còn chặn việc nghiệm thu. Mất: không có gì thêm."
  - Không chọn: "Có tình huống cần sửa" — "Bạn ghi số tình huống và chỗ chưa đúng. Được: sát thực tế hơn. Mất: chưa nghiệm thu được cho tới khi sửa xong."

  Sổ thi công `:93`: xác nhận ghi vào tệp tình huống, trừ bước `TH02-4-DAT-GAP` (phụ thuộc hộp 7). Bước `TH07-5-NEU-C-CHUA-CHAY` (cứu hộ sang xe chưa chạy) không có trong chữ tình huống 7 chủ đọc; đáp án của nó theo hộp 5.

### Lượt 8d-2 (2026-10-08; sổ thi công `:96-102`)

- **Hộp 5**, tiêu đề `Cứu hộ` (Đ4). Câu hỏi (`00-trang-trinh.md:59`):

  > Khi xe hỏng giữa đường, tài xế (hoặc văn phòng bấm thay) nhờ một xe cứu hộ nhận cả khách đang ngồi trên xe. Văn bản mới chặt hơn văn bản ngày 30/9 ở một chỗ: xe cứu hộ phải là xe đang chạy. Nếu xe cứu hộ chưa xuất bến thì đi đường cũ: tài xế hoặc văn phòng bấm Kết thúc gián đoạn, rồi văn phòng xếp khách lên xe khác. Bạn duyệt không?

  - Chủ chọn: **"Duyệt (Recommended)"** — "Được: không có cảnh khách đã ngồi trên xe mà lại nằm trong một chuyến chưa xuất bến; làm nhanh hơn. Mất: cứu hộ bằng xe chưa chạy vẫn phải qua văn phòng như hôm nay."
  - Không chọn: "Chưa duyệt" — "Được: giữ đúng văn bản cũ, xe chưa chạy cũng nhận cứu hộ được. Mất: phải làm thêm nhiều phần cho khách đã lên xe nằm trên chuyến chưa xuất bến (chưa kiểm hết là những phần nào), xong chậm hơn."

- **Hộp 6**, tiêu đề `Thu hồi` (Đ5). Câu hỏi (`00-trang-trinh.md:65`):

  > Thu hồi xuất bến là lệnh dùng khi bấm xuất bến nhầm, đưa chuyến về như chưa chạy; hôm nay lệnh này chỉ dùng được khi chuyến chưa có việc gì xảy ra sau lúc xuất bến. Khi có chuyển khách, văn bản mới đổi luật này ở hai chỗ, một chỗ chặt hơn và một chỗ nới ra. Chặt hơn: xe đã giao khách cho xe khác thì không thu hồi xuất bến được nữa, vì xe đó rõ ràng đã chạy thật. Nới ra: lần nhờ chưa thành (đang chờ, bị từ chối, hết giờ, bị bác) không còn chặn xe nhận thu hồi xuất bến; chỉ lần nhờ đã nhận khách mới chặn. Kèm theo, khi một xe bị thu hồi xuất bến, mọi lần nhờ đang chờ hoặc đang chờ Quản trị có liên quan tới xe đó tự huỷ, vì điều kiện lúc gửi không còn đúng. Bạn duyệt không?

  - Chủ chọn: **"Duyệt (Recommended)"** — "Được: không xoá được dấu xuất bến của xe đã thật sự giao khách; xe nhận không bị khoá thu hồi chỉ vì một lần nhờ đã bị từ chối; không còn lần nhờ treo trên xe vừa thu hồi. Mất: xe đã giao khách cho xe khác mà trước đó bấm xuất bến nhầm thì không thu hồi được nữa."
  - Không chọn: "Chưa duyệt" — "Được: giữ luật hôm nay. Mất: xe nhờ vẫn thu hồi xuất bến được dù đã giao khách cho xe khác; xe nhận bị khoá thu hồi chỉ vì có một lần nhờ, kể cả lần đã bị từ chối."

- **Hộp 7**, tiêu đề `Đặt gấp` (Đ6; tệp 00 ghi "câu hỏi thật"). Câu hỏi (`00-trang-trinh.md:71`):

  > Khách đã được đánh dấu đặt gấp mà bị nhờ chuyển sang một xe chưa chạy, còn dưới 6 giờ tới giờ xuất bến. Quyết định ngày 8/10 ghi rằng chuyển sang xe chưa chạy trong 6 giờ thì chờ Quản trị duyệt, nhưng không nói gì về khách đặt gấp; còn khi xếp xe thường thì khách đặt gấp được đi qua, không cần duyệt lại. Từ 8/10 Bán hàng cũng tự đánh dấu đặt gấp được. Chưa ai hỏi bạn chỗ này. Bạn muốn thế nào?

  - Chủ chọn: **"Vẫn chờ Quản trị (Recommended)"** — "Được: đúng chữ quyết định mới nhất, giữ mốc 6 giờ, việc chuyển sát giờ luôn do Quản trị hoặc Toàn quyền xem và duyệt. Mất: khách đặt gấp phải chờ tới khi có người duyệt; lần nhờ chờ duyệt không tự hết hạn, nên nếu lúc đó không ai mở máy thì khách vẫn ở xe cũ."
  - Không chọn: "Cho qua như xếp thường" — "Được: nhanh hơn, giống cách xếp xe thường. Mất: chỉ áp khi mọi khách bị chuyển đều thuộc chặng đặt gấp; và vì Bán hàng tự đánh dấu đặt gấp được, việc chuyển sát giờ của những khách này không Quản trị nào xem lại."

---

## Tóm tắt cho chủ (lời thường)

1. Danh sách điều kiện Nền tảng tự kiểm khi tài xế nhờ xe khác đón khách để ở dạng danh mục (mỗi điều kiện một dòng), đúng điều bạn đồng ý ngày 2/10, thay cho 9 điều kiện khoá cứng trong văn bản 30/9 (Đ1).
2. Thêm hai điều kiện mà các quyết định đã duyệt buộc phải có: việc chuyển làm sai cam kết xe riêng hoặc số chỗ tối thiểu thì chờ Quản trị duyệt; khách của đơn đã huỷ hoặc của chặng không còn hiệu lực thì không chuyển được (Đ2).
3. Cách ghi dấu vết và báo tin: khách chuyển vào / chuyển ra theo lần nhờ nào; chỉ tài xế xe nhận bấm Nhận được; thời gian chờ tính theo cài đặt lúc gửi, công tắc tự đồng ý tính lúc bấm Nhận; tài xế nhờ được báo khi bị "Không nhận"; nhật ký không ghi tên, năm sinh, số điện thoại khách (Đ3).
4. Nới hai bài kiểm tự động cho khớp việc đã duyệt, mỗi chỗ có một rủi ro mới nói rõ ở hộp hỏi (N2, N3); bạn đồng ý nới.
5. Cứu hộ khách đang ngồi trên xe hỏng chỉ sang xe đang chạy; người đi kèm đoàn (ví dụ hướng dẫn viên) cũng sang xe cứu hộ cùng khách (Đ4, đọc theo chữ đã duyệt `ADR-0052:129` "mọi suất mở").
6. Thu hồi xuất bến: một chỗ chặt hơn (xe đã giao khách cho xe khác thì không thu hồi được), một chỗ nới ra (lần nhờ chưa thành không chặn xe nhận thu hồi); thu hồi thì các lần nhờ đang chờ liên quan tự huỷ (Đ5).
7. Khách đặt gấp mà bị nhờ chuyển sang xe chưa chạy, dưới 6 giờ: vẫn chờ Quản trị duyệt — bạn chọn ngày 8/10 (Đ6).

---

## Bối cảnh

ADR-0052 (accepted 30/9) đã duyệt việc tài xế nhờ xe khác đón khách (D4) và cứu hộ có nơi gặp (D5c), nhưng chủ hoãn D4 ngày 2/10 (lộ trình `:169-170`) và việc này được mở lại ngày 8/10 (`BACKLOG:200`). Khi lập kế hoạch thi công A5 và phản biện (phiếu 34 mục), có ba loại chỗ phải ghi thành văn bản trước khi viết migration:
- **Lời chủ chưa vào chữ ADR:** danh mục điều kiện (2/10) đối nghịch `rule_code CHECK IN (9 mã)` của `ADR-0052:64` và câu "định trọn ngay" `:210`.
- **Chữ ADR-0052 tự mâu thuẫn hoặc không chạy được:** thứ tự lô `:70`; một cột `policy_id` mang hai nghĩa (`:62`, `:66`, `:78`); "hôm nay chỉ `KHOANG_NGHI_DICH`" ở `:80` trong khi `:77` đã đặt `MOC_TOI_THIEU` ở tầng `CAU_HINH`; "cột quyết định đặt một lần" (`:63`) trong khi đề nghị leo thang có hai lần quyết (`:73`, `:80`).
- **Hệ quả bắt buộc của luật đã duyệt sau 30/9:** ADR-0056 A2 (cam kết kích hoạt khi "xếp / dời đến", `:59`, `:68`; xoá khoá khi hết vi phạm, `:70`) và trigger `lc09_leg` (`migrations/0042_chuyen_xe.sql:465-469`, chặn mở suất khách của chặng không còn mở hoặc đơn đã huỷ).

Hiện trạng mã @ `046fb6b5`: chưa có bảng `vc_transfer_*`, chưa có ô `trip.transfer` trong `src/shared/permissions.ts` (hàng `trip.*` ở `:187-205`, gồm `trip.urgent_adjust` `:193` của ADR-0104 Đ1); `close_reason` đã có `TRANSFERRED` (`0042:133`), điểm đã có `MOVED` (`0042:97`, cạnh `PENDING → MOVED` `0042:448`); nhóm lý do `TU_CHOI_NHAN` có trong `NHOM_LY_DO` (`src/shared/dieu-phoi-kieu.ts:14`) nhưng chưa gieo dòng nào (`0041:107`); `GET /api/van-chuyen/chuyen/:id/cuu-ho` (`src/modules/van-chuyen/index.ts:1268`) hỏi `trip.dispatch`, chỉ cho chuyến đã Kết thúc gián đoạn. Bảng suất có hai loại: khách (`PASSENGER`, có chặng, có điểm lên) và người đi kèm (`CREW`, `0042:124`; không chặng — `0042:141`). CSDL không đòi điểm lên cho người đi kèm (`0042:140` chỉ đòi cho khách) nhưng cũng không cấm; hôm nay lệnh xếp tạo suất người đi kèm không có điểm lên / xuống (`boardStopId: null`, `src/modules/van-chuyen/dieu-phoi-lenh.ts:249`).

---

## Quyết định

### Đ1. Danh mục điều kiện chuyển `vc_transfer_rule` thay tập đóng `rule_code` (lượt 8d-1)

- **Bảng mới `vc_transfer_rule`** (module `van-chuyen`, chủ bảng duy nhất): `code` (khoá chính), `label` (nhãn tiếng Việt), `tier` `CHECK IN ('LOI','CAU_HINH')`, `sort_order`, `active` `CHECK IN (0,1)`, `created_at`.
  - Không xoá (trigger chặn); `code`, `tier` không đổi sau khi tạo; tắt bằng `active = 0`.
  - **Chỉ migration ghi bảng này.** Không route nào ghi danh mục. Lý do: mỗi điều kiện cần phần kiểm trong hàm thuần `kiemChuyen` (một nguồn cho màn hình và máy chủ, `ADR-0052:73`); thêm dòng mà không thêm phần kiểm thì không có tác dụng. Lời chủ "thêm luật = thêm dòng" được hiểu là: thêm điều kiện **không phải dựng lại bảng dữ liệu** (khác `CHECK` của `:64`), vẫn là việc của người làm phần mềm.
  - Tắt một dòng tầng `LOI` **không** nới các luật lõi được trigger CSDL bảo vệ (LC-02 sức chứa `0042:319-323`, LC-09 `0042:465-469`, LC-03, LC-12, LC-13…): lô vẫn vỡ ở trigger. Nó bỏ bước kiểm trước và dòng bằng chứng của điều kiện đó; với điều kiện **không** có trigger tương ứng (ví dụ `SUC_CHUA_NGUON`, `DIEM_CHUA_TOI` — xem "Điểm cho người kiểm" (5)) thì tắt dòng là bỏ hẳn lớp kiểm của nó.
- **`vc_transfer_check.rule_code REFERENCES vc_transfer_rule(code)`**; trigger: `rule_tier` của dòng kiểm phải bằng `tier` của dòng danh mục; dòng kiểm chỉ được trỏ luật `active = 1` lúc ghi.
- **Gieo 11 dòng** (9 của `ADR-0052:64` + 2 của Đ2):
  - `CAU_HINH`: `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, `CAM_KET_DICH`;
  - `LOI`: `SUC_CHUA_DICH`, `SUC_CHUA_NGUON`, `TRUNG_GIO_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`, `CHANG_KHACH_HIEU_LUC`.
- **Ghi rõ để người duyệt thấy** (kế hoạch §6 "Điểm còn bất định"): `KHOANG_NGHI_DICH` thực tế chỉ ra `CANH_BAO` (máy không biết đường đi, `ADR-0052:75`); `TRUNG_GIO_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH` gần như luôn `DAT` vì xe, tài xế của chuyến đích không đổi. `SUC_CHUA_DICH` đếm mọi suất mở `WAITING` + `BOARDED`, **gồm suất người đi kèm** — cùng cách đếm của LC-02 (`0042:317-323`).
- **Cửa:** **một chiều** — bảng, khoá ngoại, bất biến `code`/`tier` (đổi = dựng lại bảng, mà dòng kiểm đã trỏ tới); mỗi dòng danh mục đã có dòng kiểm trỏ tới không gỡ được. **Hai chiều** — `active`, `label`, `sort_order`; thêm dòng mới bằng migration.
- **Câu ADR bị thay:** `ADR-0052:64` (tập đóng `rule_code`), `:210` (`rule_code` trong danh sách "tập đóng … định trọn ngay").

### Đ2. Hai điều kiện thêm, đều bắt buộc theo luật đã duyệt (lượt 8d-1)

- **`CAM_KET_DICH`** (tầng `CAU_HINH`): chạy `kiemCamKet` (ADR-0056 A2, `src/shared/cam-ket-xe.ts`) trên chuyến đích **sau** khi chuyển. Không đạt khi chuyến đích sẽ vi phạm R-XR (đoàn đặt xe riêng đi chung khách đơn khác — cả hai chiều: đưa khách thường vào xe đang chở đoàn xe riêng, hoặc đưa đoàn xe riêng vào xe đang chở khách khác, `ADR-0056:57`) hoặc R-CX (xe nhỏ hơn số chỗ tối thiểu của chặng, `:58`). Suất người đi kèm không có chặng nên R-XR không tính họ (`src/shared/cam-ket-xe.ts:5`).
  - Căn cứ bắt buộc: ADR-0056 A2 kích hoạt khi "xếp / dời đến" (`:59`), và "mọi lệnh xếp / dời đến / đổi xe … chạy lại `kiemCamKet`" (`:68`). Mở suất ở chuyến đích là "dời đến".
  - Không đạt ⇒ đề nghị leo thang; Quản trị / Toàn quyền duyệt (`trip.override`, ADR-0104 `:230` — điều chỉnh khẩn cấp **không** áp cho chuyển khách) kèm lý do nhóm `PHA_LE`; **cùng lô duyệt ghi khoá cam kết của chuyến đích** (`vc_trip.commitment_override_key`, `commitment_override_reason_code` — `migrations/0077_cam_ket_chang.sql:10-13`; cách tính khoá theo ADR-0056 A3 `:65-70`).
  - **Chạy lại cam kết trên cả hai chuyến sau lô chuyển** (`ADR-0056:70`): lô xác nhận / duyệt chạy lại `kiemCamKet` trên chuyến đích và chuyến nguồn sau khi đổi suất; chuyến nào hết vi phạm mà đang có khoá thì **xoá** `commitment_override_key`, `commitment_override_reason_code` về trống trong cùng lô, có đuôi nhật ký. Khuôn sẵn có: lệnh dời `src/modules/van-chuyen/dieu-phoi-lenh.ts:533-534` @ `046fb6b5` — `camKetSauLenh` (`:52-59`) cho chuyến đích, `camKetSauGiam` (`:552`) cho chuyến nguồn (chuyến chỉ bớt khách: không bao giờ ghi khoá mới, chỉ xoá).
- **`CHANG_KHACH_HIEU_LUC`** (tầng `LOI`): mọi suất **khách** bị chuyển thuộc chặng còn mở, đơn đã xác nhận, đơn chưa huỷ. Suất người đi kèm không có chặng (`0042:141`) nên **không xét** điều kiện này, nhưng vẫn tính vào số chỗ (`SUC_CHUA_DICH`) — khớp trigger `lc09_leg`, vốn chỉ chặn suất `kind = 'PASSENGER'` (`0042:466`).
  - Căn cứ bắt buộc kỹ thuật: thiếu luật này thì lô mở suất ở chuyến đích vỡ bằng lỗi CSDL `lc09_leg` (`0042:465-469`), trả 409 chung chung, không phải đề nghị leo thang có mã (kế hoạch NT-A5-29).
  - Hệ quả, nói thẳng (kế hoạch §6 "Rủi ro"): một suất của đơn đã huỷ (đơn huỷ khi xe đang chạy, suất còn giữ — ADR-0104 `:220`) hoặc của chặng không còn mở (đơn đã sửa) làm **cả** đề nghị chỉ Bác được, kể cả đề nghị cứu hộ `ONBOARD`. Văn phòng xử lý bằng đường lượt 1 (Kết thúc gián đoạn → xếp lại; `ADR-0052:133`).
- **Cửa:** **hai chiều** ở danh mục (tắt được bằng migration); dòng kiểm đã ghi là chứng cứ một chiều. `CHANG_KHACH_HIEU_LUC` không tắt được trên thực tế: tắt thì lô vỡ ở `lc09_leg` như trên.
- **Câu ADR bị thay:** `ADR-0052:64` (danh sách 9 mã → 11), `:80` (danh sách luật tầng `CAU_HINH`, xem cả mục "Sửa chữ").

### Đ3. Dấu vết và tin của việc chuyển khách (lượt 8d-1)

- **(a) Tách cột suất.** `vc_trip_allocation` thêm **hai** cột thay cho một cột `transfer_id` của `ADR-0052:65`:
  - `transfer_id` — đề nghị đã **mở** suất này; đặt lúc chèn, bất biến (thêm vào trigger `vc_trip_allocation_identity`, bản mới nhất `migrations/0085_dieu_chinh_chuyen.sql:35-41`);
  - `closed_transfer_id` — đề nghị đã **đóng** suất này; đặt một lần trong câu đóng; `close_reason = 'TRANSFERRED'` ⇔ có `closed_transfer_id`; suất mới chèn thì trống.
  - Lý do: một suất có thể được mở bởi đề nghị r1 rồi đóng bởi đề nghị r2 (khách chuyển vào rồi lại chuyển ra); một cột không giữ được cả hai. Bất biến `ADR-0052:221` đếm theo hai cột.
  - Áp cho cả hai loại suất: suất người đi kèm chuyển theo đề nghị `ONBOARD` cũng mang hai cột này (Đ4).
- **(b) Cột thêm và cách đặt cột quyết định.** `vc_transfer_request` thêm (ngoài các cột ở `ADR-0052:56-63`) `request_id` (mã lệnh của lần gửi — lệnh dùng lại, kế hoạch NT-A5-21), `decided_cmd_id`, `closed_cmd_id`, `decided_by_party_id`; `vc_transfer_check` thêm `cmd_id` (dấu lệnh của lần kiểm; kế hoạch T2). Bảng đặt cột theo cạnh trạng thái:

  | Cột | Rời `PENDING` → `CONFIRMED` (`MAY`) / `ESCALATED` / `DECLINED` (tài xế đích bấm Nhận / Không nhận) | `ESCALATED` → `CONFIRMED` (`NGUOI`) / `REJECTED` (lần quyết thứ hai, người có `trip.override`) | → `WITHDRAWN` / `EXPIRED` / `VOID` |
  |---|---|---|---|
  | `decided_by_party_id` | đặt = hồ sơ tài xế đích | **giữ nguyên** | không đặt (từ `PENDING`) / giữ (`VOID` từ `ESCALATED`) |
  | `decided_by` (tài khoản), `decided_at`, `decided_cmd_id` | đặt = tài khoản, giờ, dấu lệnh của lần bấm | **ghi lại đúng một lần** = người duyệt / bác, giờ, dấu lệnh của lần đó | như cột trên |
  | `decided_mode` | `MAY` khi `CONFIRMED`; NULL khi `ESCALATED`, `DECLINED` | `NGUOI` khi `CONFIRMED`; NULL khi `REJECTED` | NULL / giữ |
  | `closed_cmd_id` | đặt khi `CONFIRMED`, `DECLINED` = dấu lệnh của lần bấm; `ESCALATED`: NULL | đặt = dấu lệnh duyệt / bác | đặt = dấu lệnh của lô làm đóng (lệnh rút; lệnh kế tiếp chạm đề nghị hết giờ; lệnh gây tự huỷ) |

  - **Ghi lại ở lần quyết thứ hai** là đúng chữ `ADR-0052:80` ("`decided_by` = người duyệt") và `:73` ("`decided_by` = B" khi máy xác nhận). Giá trị của lần thứ nhất không mất: dòng kiểm lần đó mang `cmd_id`, sự kiện `TRANSFER_ESCALATED` (id = dấu lệnh) và dòng nhật ký `trip_transfer_escalated` (tài khoản, giờ). Trigger: ba cột `decided_by`, `decided_at`, `decided_cmd_id` chỉ được đặt ở cạnh rời `PENDING` và ghi lại chỉ ở cạnh `ESCALATED → CONFIRMED | REJECTED`; `decided_by_party_id`, `closed_cmd_id` đặt một lần; `closed_cmd_id` có giá trị ⇔ trạng thái cuối. (Trigger `_decided_once` của kế hoạch T2 đổi theo bảng này.)
  - **Trigger `ESCALATED → CONFIRMED` đọc MỌI dòng `vc_transfer_check` của đề nghị** (mọi `cmd_id`, kể cả dòng của lần tài xế bấm Nhận), không chỉ dòng của `decided_cmd_id`: có bất kỳ dòng `KHONG_DAT` + `LOI` ⇒ `RAISE`. Đúng chữ `ADR-0052:80` ("không có dòng … `KHONG_DAT` + `LOI` của đề nghị đó") và bất biến `:221`. Hệ quả: đề nghị đã leo thang vì một luật lõi thì chỉ Bác được, kể cả khi sau đó dữ liệu đổi (tình huống 10, nhánh 10B); tài xế gửi lại đề nghị mới. Kế hoạch T2 viết `_confirm_core` theo `decided_cmd_id` — hẹp hơn chữ ADR; điều phối ghi sổ để người thi công làm theo câu này.
  - **Nhánh mở suất ở chuyến đích** (LC-15 `vc_trip_running_locked_alloc_ins` dựng lại, và nhánh tương ứng khi đích chưa chạy) khoá theo `closed_cmd_id`: `NEW.transfer_id` trỏ đề nghị `CONFIRMED` có `to_trip_id = NEW.trip_id` và `closed_cmd_id = NEW.opened_cmd_id = last_cmd_id` của chuyến đích — cùng một nghĩa cho `MAY` và `NGUOI`, nên suất chỉ mở được trong chính lô xác nhận. Nhánh `TRANSFER_CONFIRMED` cho cả `kind = 'CREW'` (bản hôm nay chỉ cho `PASSENGER`, `0085:76`).
  - **`decided_by_party_id`** — trigger: rời `PENDING` sang `CONFIRMED | ESCALATED | DECLINED` đòi `decided_by_party_id` là tài xế có dòng lái mở (`vc_trip_driver`, `0042:64`) của chuyến đích. Lớp CSDL **chỉ bảo đảm người được ghi là người nhận là tài xế đang lái xe nhận**; việc tài khoản bấm đúng là người đó (văn phòng không bấm Nhận thay — `ADR-0052:130`, `:248`) **chỉ máy chủ kiểm**, vì module `van-chuyen` không có cạnh tới `staff` (`src/architecture.test.ts:63`). Ghi "dựa vào máy chủ" ở `docs/SO-HANG-RAO.md`; cùng cách cho "tài khoản gửi `STOP` đúng là tài xế nguồn".
- **(c) Hai nghĩa của chính sách — tách rõ** (`ADR-0052:62`, `:66`, `:78`; mục "Sửa chữ" (2)):
  - `vc_transfer_request.policy_id` = dòng chính sách **hiện hành lúc gửi**; chỉ dùng để tính hạn chờ (`proposed_at` + `accept_wait_minutes` của dòng đó — `:78` giữ nguyên);
  - công tắc tự đồng ý `auto_confirm_transfer` đọc theo dòng **hiện hành lúc quyết** (lúc tài xế đích bấm Nhận), kể cả với đề nghị gửi trước khi công tắc bị tắt — đúng nghĩa "tắt thì mọi đề nghị B đã nhận thành `ESCALATED`" (`:66`). Trigger `PENDING → CONFIRMED` (`MAY`) đọc dòng hiện hành theo `decided_at` (khuôn `migrations/0084_cua_so_xuat_ben_va_thu_tu_diem.sql:36-38`), **không** đọc `policy_id`;
  - `vc_transfer_check.policy_row_id` = dòng hiện hành lúc kiểm — đây là "dòng đã dùng" (Hiến chương 5.6) của bằng chứng.
- **(d) Nhật ký và tin.**
  - **Bảy tên việc nhật ký:** `trip_transfer_sent`, `trip_transfer_withdrawn`, `trip_transfer_declined`, `trip_transfer_expired`, `trip_transfer_escalated`, `trip_transfer_confirmed`, `trip_transfer_rejected`; nhãn tiếng Việt ở `src/shared/audit-actions.ts` (khuôn `:147-148`). `VOID` không có dòng nhật ký riêng (xảy ra trong lô của lệnh khác, lệnh đó có nhật ký của nó).
  - **Dòng nhật ký** ghi `target_type = 'trip'`, `target_id` = **chuyến đích** (để view `v_aud_trip_event` — `migrations/0070_tin_chuyen.sql:4-6` — thấy). **Trường `detail`** chỉ gồm: mã chuyến nguồn, mã chuyến đích, phạm vi (`STOP`/`ONBOARD`), số khách, mã luật không đạt. Không tên, năm sinh, SĐT, số giấy tờ; không chữ nơi gặp (G-A5-9); không `place_key`.
  - **Sáu việc sinh tin** (D6.2 `ADR-0052:158-160`, người bấm không tự nhận tin):
    - `sent` → tài xế đích;
    - `confirmed`, `rejected`, `expired` → tài xế nguồn, tài xế đích;
    - `escalated` → người có `trip.override` (Quản trị, Toàn quyền);
    - **`declined` → tài xế nguồn — mới.** Đây là mở danh sách hành động sinh tin, là cửa một chiều (`ADR-0052:148`, `:210`), nên phải có văn bản duyệt (tiền lệ ADR-0104 `:232`). Lý do: tài xế nguồn cần biết sớm để nhờ xe khác hoặc gọi văn phòng; nếu không có tin, tài xế chỉ biết khi mở lại màn hình.
  - `withdrawn` và `VOID` không sinh tin.
  - **Đường tin: dùng đường có sẵn, không dựng đường song song.** Sáu việc sinh tin vào `HANH_DONG_TIN_CHUYEN` (`src/shared/tin-chuyen.ts:13-23`), thuộc **nhóm thường** `HANH_DONG_TIN_THUONG` (`:25`; hộp thông báo đọc nhóm này với trần 3000 dòng — `src/modules/thongbao/repository.ts:227-232`), **không** vào nhóm ba lệnh khách `HANH_DONG_TIN_KHACH` (`:12`). Tài xế nguồn không có mặt trên dòng nhật ký (dòng ghi theo chuyến đích), nên `canHoiTheoSuKien` (`:40`) mở cho các việc `trip_transfer_*` để hỏi dữ kiện theo sự kiện và lấy chuyến nguồn qua `related_trip_id` (khuôn `khanCapNguon`, `:53-57`, đường tin chuyến nguồn `tinNguonCho` `:113`); `loaiCho` (`:85`) thêm nhánh cho tài xế đích, tài xế nguồn và người có `trip.override`. Cách này là thi hành, không phải quyết định mới.
- **(e) Sự kiện.** Bảy loại `TRANSFER_SENT`, `_WITHDRAWN`, `_DECLINED`, `_EXPIRED`, `_ESCALATED`, `_CONFIRMED`, `_REJECTED` (danh sách ở mã, `LOAI_SU_KIEN_CHUYEN` — `vc_trip_event.kind` không có `CHECK` liệt kê, `ADR-0052:44`). Mọi sự kiện đặt ở **chuyến đích** (`trip_id` = đích, `related_trip_id` = nguồn, giống lệnh dời). Đ5 dựa vào cách đặt này.
- **Cửa:** **một chiều** — hai cột suất, bốn cột đề nghị, cột `cmd_id` của dòng kiểm, cách đặt cột quyết định ở bảng (b), bảy tên việc nhật ký và trường `detail` (chốt trước dòng đầu, `ADR-0052:210`), việc `declined` vào danh sách sinh tin, tên loại sự kiện đã ghi. **Hai chiều** — người nhận tin (hàm thuần tính lúc đọc), chữ tin, giá trị chính sách.
- **Câu ADR bị thay:** `ADR-0052:63` (cột quyết định "đặt một lần"), `:62`, `:65`, `:110`, `:188`, `:238` (đóng suất trỏ `transfer_id` → `closed_transfer_id`), `:148`, `:159` (bảng người nhận thêm dòng "không nhận"), `:221`.

### Đ4. Cứu hộ `ONBOARD` chỉ sang xe đích đang chạy; người đi kèm sang cùng khách (lượt 8d-2)

- LC-14 thêm vế: đề nghị `scope = 'ONBOARD'` đòi chuyến đích `RUNNING`. Đề nghị `STOP` giữ nguyên (`PLANNED` hoặc `RUNNING`, cùng ngày).
- Lớp CSDL: trigger LC-14 trên `vc_transfer_request` (vế mới) + máy chủ; danh sách xe nhận của phạm vi `ONBOARD` (route tài xế và route văn phòng `GET …/chuyen/:id/cuu-ho/xe-nhan`) chỉ liệt kê chuyến `RUNNING`.
- Xe cứu hộ chưa xuất bến: đi đường lượt 1 (tài xế / văn phòng bấm Kết thúc gián đoạn → chặng về "chưa xếp" → văn phòng xếp hoặc thêm điểm, `ADR-0052:133`).
- **Người đi kèm (không phải quyết định mới — áp chữ đã duyệt):** đề nghị `ONBOARD` chuyển "mọi suất mở `WAITING` + `BOARDED` của A" (`ADR-0052:129`), **gồm suất người đi kèm** (`CREW`, ví dụ hướng dẫn viên). Suất người đi kèm mở ở xe cứu hộ giữ trạng thái và giữ điểm lên / xuống trống như ở xe A; tính vào `SUC_CHUA_DICH` (Đ1); không xét `CHANG_KHACH_HIEU_LUC` (Đ2); không tính R-XR (Đ2); mang `transfer_id` / `closed_transfer_id` (Đ3 (a)); nhánh LC-15 cho `CREW` (Đ3 (b)). Đề nghị `STOP` **hôm nay** không gồm người đi kèm, vì lệnh xếp tạo suất người đi kèm không có điểm lên (`src/modules/van-chuyen/dieu-phoi-lenh.ts:249`); CSDL không cấm suất người đi kèm có điểm lên (`0042:140` chỉ đòi điểm lên cho khách), nên nếu sau này có đường gắn điểm lên cho người đi kèm thì phải xét lại câu này. Ca thử: tình huống 7 có một người đi kèm.
- **Vì sao siết:** để `ONBOARD` sang xe `PLANNED` chạy được, suất `BOARDED` phải nằm trên chuyến chưa xuất bến — trái các luật đang có của chuyến kế hoạch (bản chụp danh sách lúc xuất bến, LC-15 nhánh "ngoài xe đang chạy không được `added_after_departure`" `0085:96`, `vc_trip_event_after_departure` `0042:405-407`). Phải làm thêm nhiều phần; **chưa kiểm hết là những phần nào**.
- **Cửa:** **hai chiều** — nới lại sau bằng migration mới (bỏ vế trigger), không dữ liệu nào phải sửa; nới lại thì phải làm phần "khách đã lên xe trên chuyến chưa xuất bến" nói trên.
- **Câu ADR bị thay:** `ADR-0052:69` (LC-14, "chuyến đích `PLANNED` hoặc `RUNNING`"), `:89` (danh sách xe đích "các chuyến `PLANNED`/`RUNNING` cùng ngày" — với `ONBOARD` chỉ `RUNNING`), `:129` (D5c, "sang xe cứu hộ C"), và phần "kể cả cứu hộ `ONBOARD`" của `:192` chỉ còn áp cho đích đang chạy.

### Đ5. Thu hồi xuất bến khi có chuyển khách: một chỗ chặt hơn, một chỗ nới ra (lượt 8d-2)

- **Chặt hơn — chuyến nguồn:** có sự kiện `TRANSFER_CONFIRMED` mang `related_trip_id` = chuyến này, chèn sau sự kiện `DEPARTED` cuối của nó ⇒ **không thu hồi xuất bến được** (CSDL và máy chủ `lenhThuHoiXuatBen`). Lý do: xe đã thật sự chạy và đã giao khách cho xe khác. Hôm nay trigger `vc_trip_revoke_no_progress` (`0085:63-67`) chỉ xét sự kiện có `trip_id` = chính chuyến, mà sự kiện chuyển khách đặt ở chuyến đích (Đ3 (e)) — nên không có Đ5 thì chuyến nguồn vẫn thu hồi được.
- **Nới ra — chuyến đích:** các sự kiện `TRANSFER_SENT`, `_WITHDRAWN`, `_DECLINED`, `_EXPIRED`, `_ESCALATED`, `_REJECTED` **không** tính là tiến độ (đề nghị chưa đổi khách nào). Trigger hôm nay tính mọi sự kiện của chính chuyến trừ `DEPARTED`, `DEPARTURE_REVOKED` (`0085:65`), nên không có Đ5 thì một đề nghị bị từ chối cũng chặn xe nhận thu hồi. `TRANSFER_CONFIRMED` trên chuyến đích vẫn tính (xe nhận đã nhận khách).
- **Tự huỷ kèm theo:** lô thu hồi xuất bến của một chuyến làm **mọi đề nghị `PENDING` / `ESCALATED` có chuyến đó là nguồn hoặc đích** thành `VOID` trong cùng lô, không sinh tin (MQ-09 "nguồn / đích đổi", `ADR-0052:79`; kế hoạch G-A5-13 `:243`). Lý do: chuyến nguồn về `PLANNED` thì trái LC-14 (nguồn phải `RUNNING`); chuyến đích về `PLANNED` thì đề nghị `ONBOARD` trái Đ4 và đề nghị `STOP` phải xét lại mốc 6 giờ — kết quả kiểm lúc gửi / lúc nhận không còn đúng.
- Dựng lại `vc_trip_revoke_no_progress` (điều kiện chặn: có sự kiện của chính chuyến ngoài danh sách loại trừ mới, **hoặc** có `TRANSFER_CONFIRMED` có `related_trip_id` = chuyến; cả hai vế so `rowid` lớn hơn `DEPARTED` cuối) và hàm máy chủ cùng luật.
- **Trigger `vc_trip_departed_after_plan` (VK1-A, `0042:400-403`) — chọn: chấp nhận, không loại trừ.** Trigger này đòi giờ xuất bến không sớm hơn giờ ghi nhận của mọi sự kiện có `trip_id` hoặc `related_trip_id` là chuyến (khác dấu lệnh xuất bến). Sự kiện `TRANSFER_*` trên chuyến đích `PLANNED` vì vậy tính như "lần sửa kế hoạch cuối": văn phòng khai giờ xuất bến **lùi** của xe nhận sớm hơn một sự kiện đề nghị thì bị chặn (phiếu kiểm góc B đã tái hiện). Vì sao chấp nhận:
  - chỉ vướng khi **văn phòng khai giờ lùi**; tài xế tự bấm Xuất bến thì giờ xảy ra = giờ máy chủ, luôn sau mọi sự kiện đã ghi;
  - máy chủ báo bằng mã rõ trước khi chạm CSDL: `kiemGioXayRa` dùng **cùng định nghĩa** với trigger (`TRUOC_SUA_KE_HOACH`, `src/shared/gio-xay-ra.ts:10-11`, câu "Giờ xuất bến sớm hơn lần sửa kế hoạch cuối của chuyến" `:30`), nên người bấm thấy câu tiếng Việt, không thấy lỗi thô. **Đã kiểm bằng đọc mã @ `046fb6b5`** (chưa chạy thử): lệnh Xuất bến `lenhXuatBen` gọi `kiemGioLenh(n, vaoGio(n, "DEPARTED"), …)` với `n.events = nen.events` (`src/modules/van-chuyen/dieu-phoi-tien-do.ts:68-72`); `nen` đọc bằng `docNen` → `eventsByTrips` (`src/modules/van-chuyen/dieu-phoi-doc.ts:124-134`), câu SQL lấy mọi sự kiện có `trip_id` **hoặc** `related_trip_id` là chuyến, không lọc loại (`src/modules/van-chuyen/chuyen-repo.ts:206-215`); `suKienDaCo` không lọc (`src/modules/van-chuyen/dieu-phoi-gio.ts:11-13`). Vậy sự kiện `TRANSFER_*` mới vào tập này mà không cần sửa gì;
  - loại trừ = **nới** một trigger hàng rào đã có (ADR-0050 VK1-A) cho một ca hiếm; nới hàng rào cần dòng duyệt riêng (Điều 9.4), không cân với lợi ích.
  - Không trái Đ5: Đ5 nói về "tiến độ sau xuất bến" (thu hồi); VK1-A nói về "sửa kế hoạch trước xuất bến" — hai khái niệm khác, cùng sự kiện được tính khác nhau là có chủ ý.
- **Vì sao là quyết định:** đổi nghĩa "sự kiện tiến độ" của ADR-0097 Đ3.2 (`:52` "không 'Đã tới', không lệnh suất, không đổi thứ tự"; `:59` cạnh `RUNNING → PLANNED`).
- **Cửa:** **hai chiều** — trigger và hàm máy chủ, dựng lại được.
- **Câu ADR bị thay:** ADR-0097 `:52`, `:59` (bổ sung định nghĩa).

### Đ6. Chặng đặt gấp chuyển sang xe chưa chạy dưới mốc 6 giờ: vẫn chờ Quản trị (lượt 8d-2 — chủ chọn phương án (1))

- **Xung đột chữ:**
  - Chữ mới nhất cho việc chuyển: đích chưa chạy trong mốc ⇒ "leo thang, Quản trị / Toàn quyền duyệt" — `ADR-0052:77` (sửa bởi ADR-0104 `:230`) và `ADR-0052:192` (sửa bởi ADR-0104 `:233`; ADR-0104 `:221` nhắc lại ở cột "Ai phá lệ" của dòng Xếp). Không câu nào nhắc chặng đặt gấp.
  - Cột "Luật" của dòng **Xếp** ADR-0049 `:162`, mà `ADR-0052:192` là câu ngoại lệ chen vào: *"Xếp **chính chặng đã đặt gấp** thì qua, không ghi lý do lần nữa"*. Câu `:192` bản 30/9 còn dẫn về dòng này ("như dòng này"); bản sửa 8/10 bỏ chữ đó.
  - Thêm khách vào xe đang chạy (D5.1) thì chặng đặt gấp qua (`ADR-0052:98`).
  - **Ai đóng được dấu đặt gấp:** từ ADR-0107 (accepted 8/10) **Bán hàng** tự đóng dấu (`ADR-0107:54`, ô `order.leg.short_notice` SALES `none` → `any`), và dấu chỉ ghi lên chặng thật sự đang dưới mốc (ý (ii)). Vì vậy phương án (2) dưới đây nghĩa là: việc chuyển sát giờ của khách đặt gấp **không Quản trị nào xem**, vì cả dấu lẫn lần chuyển đều không cần Quản trị.
  - ADR-0104 `:336` ghi chủ chưa được hỏi riêng câu về `ADR-0052:77`.
  - Mốc 6 giờ không tắt được: `min_lead_minutes CHECK BETWEEN 1 AND 2880` (`migrations/0041_chinh_sach_dieu_phoi.sql:16`).
- **Chủ chọn phương án (1)** (hộp 7 `Đặt gấp`, **"Vẫn chờ Quản trị (Recommended)"**): vẫn chờ Quản trị / Toàn quyền duyệt kèm lý do. Đúng chữ mới nhất; giữ mốc 6 giờ; việc chuyển sát giờ luôn do Quản trị hoặc Toàn quyền xem và duyệt. Cái giá: đề nghị leo thang **không tự hết hạn** (`ADR-0052:61` không có `ESCALATED → EXPIRED`; kế hoạch G-A5-19), nên nếu không ai duyệt thì khách vẫn ở xe cũ tới khi Quản trị / Toàn quyền mở máy, hoặc đề nghị tự huỷ theo MQ-09.
- **Phương án (2), không chọn** (xem "Phương án bị loại"): chặng đặt gấp qua luôn như dòng Xếp: `MOC_TOI_THIEU = DAT` cho đề nghị mà **mọi** suất khách bị chuyển thuộc chặng mang dấu đặt gấp; đề nghị có dù một suất khách không đặt gấp vẫn leo thang.
- **Thi hành:** `kiemChuyen` nhận cờ "đặt gấp có miễn không" làm tham số (G-A5-2), không mã cứng; giá trị theo (1): không miễn. Ca thử: tình huống 2, bước `TH02-4-DAT-GAP` (đáp án theo (1)).
- **Cửa:** **hai chiều** (cờ trong hàm thuần).
- **Câu ADR bị thay:** bổ sung câu cho ADR-0049 `:162` (cột "Luật", dòng Xếp): "Xếp chính chặng đã đặt gấp thì qua — **không** áp cho việc chuyển khách qua đề nghị sang chuyến chưa chạy (ADR-0111 Đ6)". `ADR-0052:77`, `:192` (bản đã sửa bởi ADR-0104 `:230`, `:233`) giữ nguyên chữ.

---

## Không tính là quyết định (ghi để chủ thấy)

- **Thứ tự câu trong lô xác nhận** (mục "Sửa chữ" (1)): lô là một khối, đổi thứ tự không đổi kết quả.
- **Tự huỷ khi một đề nghị được nhận** (P4, chủ "Đồng ý" 1/10): xác nhận `STOP` ⇒ mọi đề nghị `PENDING`/`ESCALATED` khác cùng `from_stop_id` và mọi đề nghị `ONBOARD` đang chờ của chuyến nguồn thành `VOID` cùng lô; xác nhận `ONBOARD` ⇒ mọi đề nghị đang chờ khác của chuyến nguồn (cả `STOP`) thành `VOID`. `VOID` không sinh tin; người nhận thấy "Đã huỷ" khi mở màn hình. **Không** có chỉ mục duy nhất trên đề nghị đang chờ (một điểm gửi được cho nhiều xe cùng lúc). Tự huỷ chéo phạm vi theo MQ-09 (`ADR-0052:61`, `:79`: nguồn đổi). Ca thử: tình huống 5 (cùng phạm vi) và nhánh 5B (chéo phạm vi).
- **Người đi kèm trong cứu hộ** — Đ4, áp chữ `ADR-0052:129`.
- **Lý do "Không nhận" và "Bác"** dùng nhóm `TU_CHOI_NHAN` (gieo 4 dòng theo bản vẽ: "Xe đã đầy chỗ", "Không kịp giờ", "Đang xử lý sự cố", "Lý do khác"). **Khác khuyến nghị Q5** của đánh giá Đợt 5 (`docs/design/van-chuyen-dot-3-7/danh-gia/dot-5.md:120-123`, dùng chung `PHA_LE`); đảo lại là một hằng trong mã (G-A5-4). Lý do Duyệt dùng `PHA_LE` (`ADR-0052:80`).
- **Mỗi suất một câu `INSERT`** khi mở suất ở chuyến đích (`CLAUDE.md` §10; `0042:317`); không có nới N6.
- **Không thêm route trả tên khách:** `TRA_TEN` giữ 2 — hẹp hơn `ADR-0052:228` (G-A5-10).
- **Hàng rào nới N1, N2, N3** — mục "Hàng rào nới"; N2, N3 có hộp hỏi riêng ở lượt 8d-1.

---

## Sửa chữ (chữ ADR-0052 sai sự thật hoặc tự mâu thuẫn; không đổi kết quả)

1. **`ADR-0052:70` — thứ tự lô xác nhận không chạy được theo đúng chữ.** Chữ: "… → đổi trạng thái đề nghị → dòng `vc_transfer_check` → đóng suất ở A (`TRANSFERRED`, `transfer_id`) → mở suất ở B (`added_after_departure` nếu B đang chạy, `transfer_id`) → thêm điểm đón (và điểm trả nếu B chưa có nơi đó) ở B (MQ-06, `added_while_running` nếu B đang chạy) → điểm A → `MOVED` (khi `STOP`) → dòng manifest mới ở B nếu B đã xuất bến → sự kiện". Ba chỗ vướng trigger:
   - **Sự kiện phải đứng trước mọi câu chèn điểm / suất ở B:** khi B đang chạy, trigger chèn điểm (`vc_trip_running_locked_stop_ins`, `migrations/0076_*.sql:82-87`) và chèn suất (`vc_trip_running_locked_alloc_ins`, `0085:74-97`) đọc loại sự kiện của `last_cmd_id`.
   - **Dòng kiểm phải đứng trước câu đổi trạng thái đề nghị:** trigger `PENDING → CONFIRMED` / `→ ESCALATED` / `ESCALATED → CONFIRMED` đọc dòng kiểm (Đ3 (b)).
   - **Điểm ở B phải có trước khi mở suất:** `vc_trip_allocation_stop_scope` (`0042:311-314`) đòi điểm lên / xuống thuộc chính chuyến của suất (`lc04_stop_scope`).
   - **Thứ tự đúng** (theo lô dời `loDoi`, `src/modules/van-chuyen/dieu-phoi.ts:294-318`): cổng A → cổng B → nhật ký `changes() > 0` → sự kiện `TRANSFER_CONFIRMED` → các dòng kiểm → đề nghị `CONFIRMED` (đặt `closed_cmd_id`) → thêm điểm ở B → sắp lại điểm chưa tới ở B (đón đứng trước trả) → từng suất: đóng ở A rồi mở ở B (UNIQUE LC-01, `ADR-0052:243`) → điểm A `MOVED` (chỉ `STOP`) → manifest ở B (khi B đã xuất bến) → tự huỷ P4 → cam kết: ghi khoá B (khi duyệt có `CAM_KET_DICH` không đạt), xoá khoá A / B khi hết vi phạm (Đ2) → câu trạng thái cuối, nếu có (kế hoạch T6).
2. **`ADR-0052:62` với `:66` và `:78` — một cột `policy_id` mang hai nghĩa.** `:78`: hạn chờ tính theo `policy_id` chụp lúc gửi; `:62`: `policy_id` là "dòng đã dùng"; `:66`: tắt công tắc thì mọi đề nghị B đã nhận thành `ESCALATED`. Nếu chính sách đổi giữa lúc gửi và lúc nhận, một cột không mang được cả "dòng lúc gửi" lẫn "dòng dùng để quyết". Đọc theo nghĩa: tách như Đ3 (c). (Phần "công tắc đọc lúc quyết" là quyết định — Đ3; phần ghi nhận hai câu lệch nhau là sửa chữ.)
3. **`ADR-0052:80` — "(hôm nay chỉ `KHOANG_NGHI_DICH`)"** lệch `:77` cùng ADR, nơi `MOC_TOI_THIEU` đã ghi `rule_tier = 'CAU_HINH'`. Danh sách luật tầng `CAU_HINH` đúng là `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, cộng `CAM_KET_DICH` của Đ2. (Kế hoạch không nêu chỗ này; người soạn thêm.)

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa thân; câu trỏ ở dòng Trạng thái của ADR-0052, ADR-0097, ADR-0049 và ★ ADR-0104: `docs/superpowers/specs/2026-10-08-luot-duyet-8d/chep-vao-adr/dong-tro-adr-cu-8d.md`. Dòng có dấu ★ là thêm so với văn bản trình duyệt, vì thiếu thì ADR đã duyệt tự mâu thuẫn với ADR này. Nguyên văn đo trên `docs/adr/` @ `9434c9b2`.

| ADR | Nguyên văn | Mới | Đ |
|---|---|---|---|
| ADR-0052 `:64` | "`rule_code` tập đóng `CHECK IN ('SUC_CHUA_DICH','SUC_CHUA_NGUON','TRUNG_GIO_DICH','KHOANG_NGHI_DICH','MOC_TOI_THIEU','HANG_BANG_DICH','GIAY_TO_DICH','KHONG_CHEO','DIEM_CHUA_TOI')`" | "`rule_code REFERENCES vc_transfer_rule(code)` — danh mục 11 dòng (thêm `CAM_KET_DICH`, `CHANG_KHACH_HIEU_LUC`); `rule_tier` phải bằng `tier` của dòng danh mục; chỉ trỏ luật `active = 1`; thêm `cmd_id`" | Đ1, Đ2, Đ3 |
| ADR-0052 `:210` | "tập đóng `scope`, `status`, `rule_code`, `ket_qua`, `rule_tier` (đổi `CHECK` = dựng lại bảng → **định trọn ngay**)" | "tập đóng `scope`, `status`, `ket_qua`, `rule_tier` (…); bảng `vc_transfer_rule` (cột, `code`, `tier` bất biến)" — `rule_code` rời danh sách tập đóng | Đ1 |
| ADR-0052 `:80` | "**mọi** dòng `KHONG_DAT` có `rule_tier = 'CAU_HINH'` (hôm nay chỉ `KHOANG_NGHI_DICH`)" | "… (`KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, `CAM_KET_DICH`)"; duyệt có `CAM_KET_DICH` không đạt thì cùng lô ghi khoá cam kết chuyến đích (ADR-0056 A3); trigger đọc mọi dòng kiểm của đề nghị (giữ chữ, ghi rõ ở Đ3 (b)) | Đ2 + sửa chữ (3) |
| ADR-0052 `:63` | "Không xoá; không sửa nội dung (chỉ đổi trạng thái đi tiến + cột quyết định đặt một lần)" | "… cột quyết định đặt ở cạnh rời `PENDING`; `decided_by`, `decided_at`, `decided_cmd_id` ghi lại đúng một lần ở cạnh `ESCALATED → CONFIRMED \| REJECTED`; `decided_by_party_id`, `closed_cmd_id` đặt một lần (ADR-0111 Đ3 (b))" | Đ3 |
| ADR-0052 `:62` | "`policy_id` (dòng `vc_dispatch_policy` đã dùng — 5.6)" | "`policy_id` (dòng hiện hành **lúc gửi**, dùng cho hạn chờ); thêm `request_id`, `decided_cmd_id`, `closed_cmd_id`, `decided_by_party_id`. Dòng dùng cho công tắc và bằng chứng = `vc_transfer_check.policy_row_id` (hiện hành **lúc kiểm**)" | Đ3 |
| ADR-0052 `:65` | "**`vc_trip_allocation.transfer_id`** (chỉ thêm cột): suất đóng `TRANSFERRED` hoặc suất mở bởi một lần chuyển trỏ tới đề nghị." | "`vc_trip_allocation.transfer_id` (đề nghị đã mở suất; bất biến) và `closed_transfer_id` (đề nghị đã đóng suất; đặt một lần; `TRANSFERRED` ⇔ có giá trị)" | Đ3 |
| ADR-0052 `:66` | "công tắc an toàn: tắt thì mọi đề nghị B đã nhận thành `ESCALATED`" | giữ, thêm: "đọc theo dòng chính sách hiện hành lúc B bấm Nhận, kể cả đề nghị gửi trước khi tắt" | Đ3 |
| ADR-0052 `:110` | "(`TRANSFERRED` + `transfer_id` trỏ đề nghị `CONFIRMED`)" | "(`TRANSFERRED` + `closed_transfer_id` trỏ đề nghị `CONFIRMED`)" | Đ3 |
| ADR-0052 `:188` (bảng câu thay của chính ADR-0052, dòng LC-15) | "(ii) đóng/mở suất qua đề nghị chuyển `CONFIRMED` (`TRANSFERRED` + `transfer_id`)" | "(ii) đóng/mở suất qua đề nghị chuyển `CONFIRMED` (suất đóng `TRANSFERRED` + `closed_transfer_id`; suất mở `transfer_id`; cả suất người đi kèm khi `ONBOARD`)" | Đ3, Đ4 |
| ADR-0052 `:238` (tiêu chí nghiệm thu 1) | "suất đóng ở A (`TRANSFERRED`, `transfer_id`) và mở ở B" | "suất đóng ở A (`TRANSFERRED`, `closed_transfer_id`) và mở ở B (`transfer_id`)" | Đ3 |
| ADR-0052 `:148` | "đề nghị gửi / xác nhận / leo thang / bác / hết hạn" | "đề nghị gửi / xác nhận / leo thang / bác / hết hạn / **không nhận** — bảy việc nhật ký `trip_transfer_*`, sáu việc sinh tin (không `withdrawn`); `detail` theo ADR-0111 Đ3 (d)" | Đ3 |
| ADR-0052 `:159` | "đề nghị xác nhận / bác / hết hạn \| tài xế nguồn, tài xế đích" | giữ; thêm dòng "đề nghị **không nhận** \| tài xế nguồn" | Đ3 |
| ADR-0052 `:221` | "đề nghị `CONFIRMED` mà số suất `TRANSFERRED` ≠ số suất mở ở đích với cùng `transfer_id`; suất `TRANSFERRED` không có `transfer_id` / trỏ đề nghị không `CONFIRMED`" | "… số suất có `closed_transfer_id = r` ≠ số suất có `transfer_id = r`; suất `TRANSFERRED` không có `closed_transfer_id` / trỏ đề nghị không `CONFIRMED`" | Đ3 |
| ADR-0052 `:70` | (thứ tự lô, xem "Sửa chữ" (1)) | thứ tự ở "Sửa chữ" (1) | sửa chữ |
| ADR-0052 `:69` | "chuyến đích `PLANNED` hoặc `RUNNING`, **cùng ngày chạy**" | "… `STOP`: chuyến đích `PLANNED` hoặc `RUNNING`; `ONBOARD`: chuyến đích `RUNNING`; cùng ngày chạy" | Đ4 |
| ADR-0052 `:89` | "của các chuyến `PLANNED`/`RUNNING` **cùng ngày** có tài xế đang mở" | "… ; với phạm vi `ONBOARD` chỉ chuyến `RUNNING`" | Đ4 |
| ADR-0052 `:129` | "Đề nghị `scope = 'ONBOARD'` từ xe hỏng A sang xe cứu hộ C" | "… sang xe cứu hộ C **đang chạy**; C chưa xuất bến: đường lượt 1 (`:133`). "Mọi suất mở" gồm suất người đi kèm" | Đ4 |
| ADR-0097 `:52` | "**chưa có sự kiện tiến độ nào** sau lô xuất bến (không "Đã tới", không lệnh suất, không đổi thứ tự)" | "… ; với chuyến nguồn của một lần chuyển khách: `TRANSFER_CONFIRMED` liên quan tới nó (sau `DEPARTED` cuối) tính là tiến độ; đề nghị chuyển chưa xác nhận (`TRANSFER_SENT`, `_WITHDRAWN`, `_DECLINED`, `_EXPIRED`, `_ESCALATED`, `_REJECTED`) không tính; lô thu hồi làm đề nghị đang chờ liên quan thành `VOID`" | Đ5 |
| ADR-0097 `:59` | "không tồn tại sự kiện tiến độ nào của chuyến sau sự kiện `DEPARTED` cuối" | "… theo định nghĩa `:52` đã bổ sung (ADR-0111 Đ5)" | Đ5 |
| ADR-0049 `:162` (cột "Luật", dòng Xếp) | "Xếp **chính chặng đã đặt gấp** thì qua, không ghi lý do lần nữa" | "… — không áp cho việc chuyển khách qua đề nghị sang chuyến chưa chạy (ADR-0111 Đ6)" | Đ6 |
| ★ ADR-0104 `:277` (bài kiểm 3, "Một chỗ xếp lớp") | "mọi chỗ hỏi ô cho ba luật (mốc, khoảng nghỉ, cam kết) đều đi qua `lopVuotMoc` / `lopVuotNghiCamKet`; ở bảy chỗ hỏi ô, cả `trip.urgent_adjust` lẫn `trip.override` có lời gọi `can(` viết tường minh." | "… ; ngoại lệ có tên (ADR-0111 N2): đúng hai dòng `can(staff, "trip.override")` của hai route duyệt / bác đề nghị chuyển khách leo thang (ô giữ `trip.override` ở ADR-0104 `:101`, `:244`), không dòng nào mang `"trip.urgent_adjust"` — thêm hay mất một dòng là bài đỏ." | N2 |

**Không đổi** (đã đối chiếu, không cần câu mới):
- `ADR-0052:77`, `:192` (bản đã sửa bởi ADR-0104 `:230`, `:233`) và ADR-0104 `:221`: đích chưa chạy trong mốc vẫn leo thang, Quản trị / Toàn quyền duyệt — đúng phương án (1) của Đ6. Vế "kể cả cứu hộ `ONBOARD`" của `:192` nằm trong vế "khi chuyến đích đang chạy", nên với Đ4 (cứu hộ chỉ sang xe đang chạy) chữ vẫn đúng; câu "Đích chưa chạy trong mốc: leo thang" từ nay chỉ gặp với phạm vi `STOP`. Câu "Câu ADR bị thay" của Đ4 nhắc `:192` theo nghĩa này, không có chữ mới.
- ADR-0050 VK1-A (trigger `vc_trip_departed_after_plan`): chấp nhận như đang có (Đ5).
- ADR-0056 A2 (kích hoạt khi "xếp / dời đến" — `:59`, `:68`) và cách tính, xoá khoá của A3 (`:65-70`) áp cho lô chuyển khách, không đổi chữ. Hậu quả "lệnh trả 409" của A3 (`:62`, `:68`) không áp cho đề nghị chuyển khách: không đạt `CAM_KET_DICH` thì đề nghị leo thang, Quản trị / Toàn quyền duyệt (Đ2; ĐP4 `ADR-0052:80`, bản sửa ở bảng trên).
- ADR-0051 `:149`, ADR-0053 `:46`, `:50`, ADR-0096 Đ1 (LC-19), ADR-0107 `:54`: dẫn, không đổi.

---

## Cửa một chiều / hai chiều

- **Một chiều** (đặt trước dòng dữ liệu đầu tiên):
  - bảng `vc_transfer_rule`: cấu trúc, khoá ngoại từ `vc_transfer_check`, bất biến `code` / `tier`; dòng danh mục đã có dòng kiểm trỏ tới (Đ1);
  - hai cột suất `transfer_id`, `closed_transfer_id`; bốn cột đề nghị `request_id`, `decided_cmd_id`, `closed_cmd_id`, `decided_by_party_id`; cột `cmd_id` của dòng kiểm; cách đặt và ghi lại cột quyết định (Đ3 (b));
  - bảy tên việc nhật ký `trip_transfer_*` và trường `detail`; việc `trip_transfer_declined` vào danh sách sinh tin (Đ3; `ADR-0052:210`);
  - mỗi đề nghị, dòng kiểm, sự kiện, dòng nhật ký đã ghi (chứng cứ chỉ-thêm, như `ADR-0052:210`).
- **Hai chiều:** `active` / `label` / `sort_order` của danh mục, thêm dòng danh mục bằng migration (Đ1, Đ2); giá trị chính sách, công tắc (Đ3 — nghĩa đọc lúc quyết thì chốt ở đây); người nhận tin và chữ tin; vế `ONBOARD` của LC-14 (Đ4); định nghĩa tiến độ của thu hồi xuất bến (Đ5); cờ đặt gấp (Đ6); giao diện.

---

## Hàng rào nới (Hiến pháp Điều 9.4)

N2, N3: **chủ đồng ý nới** ở hộp 3 lượt 8d-1 (`Nới bài kiểm`, **"Đồng ý nới (Recommended)"**, 2026-10-08), sau khi đọc trong câu hỏi hai rủi ro mới ghi ở cột "Rủi ro mới" dưới đây (khuôn duyệt nới bằng lời chủ: `ADR-0052:190`). Đây là nới có tên: mỗi dòng có dòng tương ứng ở `docs/SO-HANG-RAO.md` khi thi công; bài bù "Bán hàng bấm Duyệt thì bị chặn" của N2 phải viết; N3 chưa có bài bù (sổ thi công `:92`).

| Mã | Chỗ nới | Phạm vi | Rủi ro mới | Bài bù | Căn cứ |
|---|---|---|---|---|---|
| N1 | Bài ghim hàng `DRIVER` (`src/shared/permissions.test.ts`) thêm `trip.transfer: assigned` | Một ô | — | — | **Đã duyệt** 30/9: `ADR-0052:190` ("… `trip.transfer`, `trip.passenger.add` là `assigned` … chủ duyệt ADR này là duyệt việc nới"), `:3` "Duyệt A-1". Ghi lại, không phải lời duyệt mới. |
| N2 | Bài quét `src/modules/van-chuyen/lop-vuot.test.ts:45-60` NT-3(b) (vào nhánh làm việc khi gộp Đ1 `4d076bed`; chưa có trên `main`): ngoại lệ **đúng hai** dòng `can(staff, "trip.override")` thuộc route duyệt / bác đề nghị leo thang; không dòng nào mang `"trip.urgent_adjust"` | Hai dòng, hai route | Hai route này không còn được bài NT-3(b) soi như mọi chỗ khác hỏi ô vượt luật; ai sửa nhầm để người ít quyền hơn (ví dụ Bán hàng) bấm được Duyệt thì bài này **không chắc** đỏ (đổi hẳn ô thì số dòng ngoại lệ lệch → đỏ; thêm một ô rộng hơn bên cạnh thì không) | (i) ngoại lệ đếm **đúng 2** dòng — thêm dòng thứ ba hay mất một dòng là đỏ (kế hoạch `:578`, `:697`); (ii) e2e "Bán hàng gọi duyệt / bác → 403" (kế hoạch NT-A5-12 `:396`; tiêu chí 3 `ADR-0052:240`; tình huống 2 bước 3A). **Cả hai mới có trong kế hoạch, chưa viết — chưa kiểm.** | ADR-0104 `:101` ("duyệt / bác đề nghị leo thang của ADR-0052 (`:80-85`) vẫn hỏi `trip.override`") và `:244`: bài NT-3(b) do ADR-0104 dựng chưa tính tới hai route này, mà chính ADR-0104 đã giữ ô của chúng. Tiền lệ cách đọc: G12 (sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:29`). |
| N3 | Câu kiểm định kỳ R-VC-16 (`scripts/audit-checks.mjs:670`, mức **cảnh báo**) bỏ qua suất `BOARDED` có `transfer_id` trỏ đề nghị `ONBOARD` đã `CONFIRMED` | Một loại suất | Khách lên xe cứu hộ ở nơi gặp mà bị xếp nhầm điểm thì câu này không báo | **Chưa có.** R-VC-26..30 (kế hoạch `:615-619`) không xét điểm lên của suất cứu hộ. Chưa kiểm có câu nào khác bắt được. | Suất mở ở B giữ `BOARDED` (`ADR-0052:72`); suất đó lên ở nơi gặp, không phải nơi đón của chặng (`ADR-0052:129`, D5c). Không nới thì R-VC-16 báo giả mỗi lần cứu hộ có nơi gặp là địa điểm danh mục. |
| N4 (có điều kiện; **không** thuộc ADR này) | Bài ghim hàng `DRIVER_PARTNER`: `trip.transfer = assigned` khi A4 đã gộp | Một ô | — | — | `ADR-0053:46` (đã duyệt 30/9). Nhánh gộp sau làm. |
| N5 (dự kiến không cần) | R-VC-17 (suất mở mà chặng không có mốc giờ hẹn) | — | — | — | Chuyển điểm không chụp lại mốc vì chặng đã có (`ADR-0051:149`); R-VC-17 xét theo chặng nên không báo giả. Chỉ mở lại nếu đo thấy báo giả. |

**Siết, không cần duyệt:** regex của `src/hanh-khach-khong-lo-ten.test.ts` (thêm nhóm route đề nghị), phạm vi quét của `src/modules/van-chuyen/thu-tu-lo.test.ts` (thêm tệp lô mới), bài đếm "mỗi suất một câu `INSERT`". Danh sách đủ ở kế hoạch A5 §4.

---

## Hệ quả

- **Migration:** chỉ-thêm, **số tạm 0092** (kế hoạch §0.6; chốt khi gộp bằng `git for-each-ref` + `git ls-tree --name-only <ref> migrations/`). Viết sau 8d-1; vế Đ4, Đ5 bổ sung vào cùng tệp sau 8d-2 (tệp chưa lên `main`). Nội dung: hai bảng `vc_transfer_request`, `vc_transfer_check` (`ADR-0052:56-64` + Đ1–Đ3), bảng `vc_transfer_rule`, hai cột suất, hai cột chính sách (`ADR-0052:66`), dựng lại LC-15 (`alloc_ins` có nhánh `CREW`, `alloc_close`, `stop_ins`), `identity`, `revoke_no_progress` (Đ5), gieo `TU_CHOI_NHAN`; khối hoàn tác ở đầu tệp. Chi tiết: kế hoạch T2.
- **Ô quyền:** ô mới `trip.transfer` đúng như `ADR-0052:84` (`DRIVER = assigned`, `SUPER_ADMIN = any`, còn lại `none`; `DRIVER_PARTNER = none` tới khi A4 gộp — N4). **Không** thêm mã quyền ⇒ `EXTERNAL_PERMISSIONS` (`src/shared/permissions.ts:30`) và trigger LC-1 không đổi (`ADR-0053:50`).
- **Route:** như `ADR-0052:218-220`, cộng một route văn phòng:
  - `GET /api/van-chuyen/chuyen/:id/cuu-ho/xe-nhan` — cổng `office`, ô `trip.progress` (cùng ô với `POST …/chuyen/:id/cuu-ho`, `ADR-0052:130`); chuyến `:id` phải `RUNNING` (không thì 409 — mã do T8 chốt); trả các chuyến `RUNNING` cùng ngày, có tài xế đang mở, khác chuyến `:id`, mỗi dòng **đúng** các trường D4.4 (`ADR-0052:89`: mã chuyến, tên tài xế, số chỗ còn trống, điểm sắp tới) — không khách, không số người từng điểm, không mã đơn, không biển số, không SĐT. Bảng cổng ở `02-trang-ghep.md` §4.
- **Bất biến định kỳ:** R-VC-26..30 (mã do điều phối cấp; kế hoạch T11).
- **Tiêu chí nghiệm thu:** kế hoạch A5 §2 (NT-A5-1…29) và mười tình huống ở `golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json` (chủ đã xác nhận 2026-10-08 — hộp 4 lượt 8d-1, "Đúng hết (Recommended)"; bước `TH02-4-DAT-GAP` theo Đ6, bước `TH07-5-NEU-C-CHUA-CHAY` theo Đ4; `ADR-0052:233`).
- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ người kiểm độc lập chỉ đọc cuối việc (kế hoạch T19).

## Phương án bị loại

- **Giữ `rule_code CHECK` 9 mã:** trái lời chủ 2/10.
- **Cho Quản trị thêm / tắt điều kiện trên Nền tảng:** mỗi điều kiện cần phần kiểm trong mã; thêm dòng trên màn hình không có tác dụng, tắt dòng `CHANG_KHACH_HIEU_LUC` làm lô vỡ.
- **Chỉ mục duy nhất trên đề nghị đang chờ của một điểm:** trái P4 (chủ "Đồng ý" 1/10: một điểm có nhiều đề nghị chờ).
- **Đọc công tắc theo `policy_id` lúc gửi:** tắt công tắc không có tác dụng với đề nghị đang chờ, trái `ADR-0052:66`.
- **`_confirm_core` chỉ đọc dòng kiểm của lần duyệt:** hẹp hơn `ADR-0052:80`; đề nghị leo thang vì luật lõi có thể được duyệt sau khi dữ liệu đổi mà không ai gửi lại.
- **Dựng đường tin song song cho chuyển khách:** hai nguồn người nhận cho cùng một hộp thông báo; dùng đường `HANH_DONG_TIN_CHUYEN` sẵn có (Đ3 (d)).
- **Mở suất ở chuyến đích bằng một câu `INSERT … SELECT` nhiều dòng:** trái luật "mỗi suất một câu `INSERT`" (`0042:317`; trigger theo dòng thấy suất vừa chèn).
- **Cứu hộ sang xe chưa chạy:** chủ duyệt Đ4 (hộp 5); xem Đ4.
- **Cứu hộ chỉ chuyển khách, để người đi kèm ở lại xe hỏng:** trái chữ "mọi suất mở" (`ADR-0052:129`); xe A kết thúc gián đoạn với suất người đi kèm còn mở.
- **Loại trừ `TRANSFER_*` khỏi trigger VK1-A:** nới một hàng rào đã có cho một ca hiếm (Đ5).
- **Cron đóng đề nghị hết hạn:** Cron không ghi dữ liệu Vận chuyển (Hiến chương 5.11); và sẽ xây trên lỗ đang hở HC-5.11.
- **Đ6 (2) — chặng đặt gấp cho qua như xếp thường:** chủ chọn (1). Với (2), việc chuyển sát giờ của khách đặt gấp không Quản trị nào xem, vì Bán hàng tự đóng dấu đặt gấp (ADR-0107 `:54`).

## Không thuộc ADR này

- **C51 phần 1** (suất `NO_SHOW` vẫn tính chỗ) — việc B7, ADR riêng.
- **V4** "Dòng dữ liệu / Nhật ký quyết định" — kế hoạch riêng, kèm câu quyền Q6b (đánh giá Đợt 5 `:127`).
- **Tạo chuyến cứu hộ mới, giá xe cứu hộ của nhà xe** (`ADR-0052:134`, ADR-0057 T2) — đường lượt 1 giữ nguyên.
- **Tài xế đối tác dùng `trip.transfer`** — `ADR-0053:46` đã duyệt; thi hành khi A4 gộp (N4).
- **Chia người lớn / trẻ em trên đề nghị, số thứ tự đề nghị, khoảng cách km, số lần nhờ xe mỗi ngày** — đánh giá Đợt 5 Q3, Q4, Q6a khuyến nghị không làm; giữ.
- **Route trả tên khách cho tài xế đích sau khi xác nhận** (`ADR-0052:90`, `:228`) — không làm ở lượt thi công này (G-A5-10); tài xế đích thấy tên qua màn chuyến của mình như mọi khách trên xe.
- **Các việc mặt ngoài đảo được** (G-A5-x của kế hoạch A5 §1a): tự áp, ghi ở sổ thi công.

## Điểm cho người kiểm soi kỹ

1. ~~Kế hoạch T2 hẹp hơn `ADR-0052:80`~~ — **đã chốt** theo phiếu kiểm 8/10: chữ ADR thắng, Đ3 (b) ghi rõ trigger đọc mọi dòng kiểm; điều phối ghi sổ cho người thi công T2.
2. **Tài khoản nhiều quyền.** Một tài khoản có cả `DRIVER` và `ADMIN` có thể gửi đề nghị (là tài xế nguồn) rồi tự duyệt đề nghị leo thang của chính mình. ADR-0052 không cấm. Không phải quyết định của lượt này; điều phối ghi sổ làm câu chờ lượt sau (phiếu kiểm góc A, THẤP-8).
3. ~~Văn phòng gửi `STOP` qua route cứu hộ: 400 hay 403~~ — **đã chốt** 403 theo `ADR-0052:248`.
4. ~~Đ6: chữ "chờ Quản trị duyệt" của ADR-0104 `:230`, `:233` có đủ coi là đã trả lời câu đặt gấp không~~ — **đã chốt**: chủ được hỏi riêng (hộp 7) và chọn (1).
5. Tắt một dòng tầng `LOI` có mở đường vòng nào không (Đ1: trigger CSDL vẫn chặn các luật có trigger; `SUC_CHUA_NGUON`, `DIEM_CHUA_TOI` không có trigger riêng tương ứng — chưa kiểm từng luật).

## Chưa kiểm

- Những phần cụ thể phải làm thêm nếu cho cứu hộ `ONBOARD` sang xe chưa chạy (Đ4 "Chưa duyệt").
- Chạy thử ca "văn phòng khai giờ xuất bến lùi sớm hơn một sự kiện đề nghị" trả 409 `gio_xay_ra_ngoai_khoang` mã `TRUOC_SUA_KE_HOACH` (Đ5 đã kiểm bằng đọc mã, chưa chạy).
- Trigger `vc_trip_event_after_departure` (`0042:405-407`) gặp sự kiện `TRANSFER_*` trên chuyến đích `PLANNED` (kế hoạch T0).
- Trần số câu một lần gọi D1 (`db.batch`) trên production với lô 16 và 45 suất; T0 đo trên D1 local.
- Bỏ qua điểm nơi gặp khi điểm mang suất `BOARDED`.
- Suất người đi kèm có làm vướng câu kiểm nào ở xe cứu hộ không (danh sách hành khách, cổng kết thúc — `src/shared/xac-nhan-tien-do.ts:32`): chưa đọc kỹ.
- Nội dung THẤP-15 của phiếu kiểm Đ1 (nằm ở nhánh `adr-0104-d1`).
- Số đề nghị mỗi ngày trên thực tế; bao nhiêu đề nghị sẽ leo thang (rủi ro kế hoạch §6: xe đích thường chưa chạy và dưới 6 giờ).
- Bản sửa theo phiếu chưa được kiểm lại (điều phối đọc diff trước khi trình — phiếu tổng hợp, mục "Phán quyết").

---

## Cách chốt số ADR (kiểm 2026-10-08, cập nhật sau phiếu kiểm)

**Số chốt: 0111.**
- Nhánh làm việc `claude/van-chuyen-goi-a-c` @ `6820b86b`: `docs/adr/` đã có ADR-0109, ADR-0110 (chép ở `49a589e5`); `docs/adr/README.md:118` ghi "số ADR mới kế tiếp là **0111**" (0108 = QR VietQR ở nhánh `claude/ticket-sales-qr-payment-cf8e18`, chưa gộp `main`).
- Quét lúc soạn (trước `49a589e5`): 39 ref ở `refs/heads` + `refs/remotes` (`git for-each-ref`), 21 nhánh chưa gộp `main` (`git branch -a --no-merged main`, kể cả nhánh người soạn và `adr-0104-d2`); `git log --all --name-only --format= -- docs/adr/ docs/superpowers/specs/` → tên tệp ADR số ≥ 0100 từng có trên mọi ref: 0100–0110. `git log --all -S"ADR-0111"` chỉ gặp các commit của lượt 8c, nơi 0111 là **số tạm của phương án "tự trả ghế"** (tệp 03 lượt 8c) — phương án này **không được hỏi** (sổ thi công `:71`: "Câu 3 (Sửa chuyến) không hỏi — G8 đóng"). `git log --all -S"ADR-0112"`: rỗng.
- Quét thêm trên đĩa (kể cả tệp chưa commit) ở mọi worktree `.claude/worktrees/*` sau khi bàn giao lần đầu: không có tệp ADR nào số 0111 hay 0112 ngoài tệp này; các chỗ khác nhắc 0111 đều là trang ghép / bản chép README của lượt 8c.
- **Đo lại lúc chép (2026-10-08, nhánh làm việc @ `9434c9b2`):** `docs/adr/README.md:118` vẫn ghi "kế tiếp là **0111**"; `git log --all --oneline -- 'docs/adr/ADR-0111*' 'docs/adr/ADR-0112*'` rỗng; `git log --all -S "ADR-0112"` (đo trước commit bản chép) chỉ gặp `42c2448d` (bản thảo tệp 01, câu nói về chính phép đo). Số 0111 không trùng.
- **Rủi ro còn lại:** trang ghép 8c để ngỏ khả năng hỏi lại câu 3. Nếu câu đó được hỏi và chủ chọn "tự trả ghế", ADR đó phải lấy số khác (sau 0111). Khi ADR này chép vào `docs/adr/`, dòng "kế tiếp" của README thành **0112**.

---

## Khác văn bản trình duyệt

Văn bản trình duyệt là tệp 01 (hồ sơ có ngày, đóng băng). Bản chép giữ nguyên chữ thân quyết định Đ1–Đ5, mục "Không tính là quyết định", "Sửa chữ" (trừ mục 10 dưới đây), "Cửa", "Không thuộc ADR này", "Chưa kiểm". Những chỗ khác, mỗi chỗ kèm lý do:

**Theo lời chủ (không đổi nghĩa quyết định nào):**

1. Dòng Trạng thái: "đề xuất — chưa duyệt" thành **accepted**, kèm nhãn chủ chọn của bảy hộp. Bỏ khối trích dẫn "Hồ sơ có ngày, vai soạn" ở đầu tệp. Dòng "Mốc đo" thành dòng "Mốc đo mã" và thêm mốc chép `9434c9b2`. Câu "Đừng nhầm mã" thành dòng "Mã quyết định". Phần chia lượt của dòng Trạng thái cũ chuyển sang dòng "Thuộc lượt". Thêm dòng "Văn bản trình duyệt".
2. Thêm mục "Lời chủ dự án": hộp hỏi lấy nguyên văn từ tệp 00, kèm cách hỏi theo sổ thi công.
3. "Tóm tắt cho chủ", ý 4 và ý 7: ghi điều chủ đã chọn, thay cho "câu hỏi thật".
4. Đ6: tiêu đề và hai dòng phương án ghi phương án chủ chọn. Bỏ câu "trước khi có câu trả lời, mã chạy theo (1)". "Câu ADR bị thay" của Đ6 chỉ còn câu cho ADR-0049 `:162`, và ghi rõ `ADR-0052:77`, `:192` giữ nguyên.
5. Bảng "Câu ADR bị thay": bỏ dòng "chỉ khi Đ6 = (2)" (`ADR-0052:77`, `:192`). Dòng ADR-0049 `:162` bỏ điều kiện "chỉ khi Đ6 = (1)". Thêm khối "Không đổi" sau bảng.
6. "Hàng rào nới": ghi chủ đồng ý N2, N3, cùng việc phải làm kèm (bài bù của N2 phải viết; N3 chưa có bài bù). Bỏ đoạn "Chủ chọn 'Chưa nới'", vì phương án đó không được chọn.
7. Các chỗ nhỏ còn lại:
   - "Hệ quả", dòng tiêu chí nghiệm thu: ghi chủ đã xác nhận mười tình huống.
   - "Phương án bị loại": thêm Đ6 (2); dòng "Cứu hộ sang xe chưa chạy (khi Đ4 duyệt)" bỏ vế điều kiện, ghi "chủ duyệt Đ4 (hộp 5)".
   - "Điểm cho người kiểm soi kỹ" (4): đánh dấu đã chốt.
   - "Cách chốt số ADR": thêm dòng đo lại lúc chép.
   - Chỗ dẫn tới tệp câu trỏ ghi đủ đường dẫn (`docs/superpowers/specs/2026-10-08-luot-duyet-8d/chep-vao-adr/…`) thay cho "cùng thư mục", vì sau khi chép vào `docs/adr/` thì tệp đó không còn cùng thư mục.
   - "Chưa kiểm", dòng đầu (phần phải làm thêm nếu cứu hộ sang xe chưa chạy) giữ nguyên dù chủ đã duyệt Đ4: điều đó vẫn chưa ai kiểm, và cần khi có người muốn nới lại Đ4.
   - Dòng "Thuộc lượt", gạch lượt 8d-2: "gửi ngay" thành "hỏi ngay" (lượt 8d-2 là một lần hỏi).
   - Dòng "Sửa:": bỏ "tuỳ câu trả lời Đ6", thêm dòng Xếp của ADR-0049 theo Đ6 (1) và ADR-0104 bài kiểm 3 (★, mục 11).
   - Đ6, dòng "Thi hành": một nhánh ca thử thay cho hai nhánh, thêm "giá trị theo (1): không miễn".
   - Khối "Không đổi" sau bảng "Câu ADR bị thay": tổng hợp từ các dòng đã dẫn trong tệp 01, không có điều mới; gạch ADR-0056 ghi rõ hậu quả "lệnh trả 409" của A3 không áp cho đề nghị chuyển khách, theo Đ2.

**Sửa sự thật (đối chiếu `docs/adr/` @ `9434c9b2`):**

8. Câu "cột quyết định đặt một lần" nằm ở `ADR-0052:63`, không phải `:61` như tệp 01 ghi. Dòng `:61` là dòng `status`, còn `:62` là dòng `decided_mode`, `policy_id`. Đã sửa ở ba chỗ: "Bối cảnh", Đ3 (dòng "Câu ADR bị thay") và dòng bảng tương ứng. Những chỗ tệp 01 dẫn `ADR-0052:61` cho ý "không có `ESCALATED → EXPIRED`" (Đ6) và cho MQ-09 (mục "Không tính là quyết định") là đúng, nên giữ.
9. Dòng bảng `ADR-0052:80`: nguyên văn in đậm chữ "**mọi**", tệp 01 chép thiếu dấu in đậm.
10. "Sửa chữ" (1): tệp 01 chép `ADR-0052:70` dạng rút gọn mà không đánh dấu chỗ lược, ví dụ bỏ "(`TRANSFERRED`, `transfer_id`)" và đổi "dòng manifest mới ở B nếu B đã xuất bến" thành "manifest". Bản chép ghi đúng nguyên văn đoạn đó. Nghĩa của mục không đổi.

**Thêm (★):**

11. Dòng ADR-0104 `:277` (bài kiểm 3).
    - Chữ đã duyệt ở đó nói mọi chỗ hỏi ô cho ba luật (mốc, khoảng nghỉ, cam kết) đều đi qua hai hàm lớp. Hai route duyệt / bác đề nghị leo thang lại hỏi thẳng `trip.override`, và đúng cho ba luật đó (`MOC_TOI_THIEU`, `KHOANG_NGHI_DICH`, `CAM_KET_DICH`). Vì vậy N2, mà chủ đã đồng ý ở hộp 3, làm câu `:277` sai nếu không ghi ngoại lệ.
    - Bài `src/modules/van-chuyen/lop-vuot.test.ts` tự ghi ở dòng 1 rằng nó thi hành "ADR-0104 Đ1 mục 2, bài kiểm 3".
    - ADR-0104 `:101`, `:244` đã giữ ô `trip.override` cho hai route này. Do đó dòng ★ chỉ là ghi cho khớp, không phải quyết định mới.

**Không đổi, dù người đọc có thể tưởng là đổi:**

12. Đ4 nhắc `ADR-0052:192` ở dòng "Câu ADR bị thay", nhưng bảng của tệp 01 không có dòng `:192` cho Đ4. Lý do là chữ `:192` đã đặt "kể cả cứu hộ `ONBOARD`" bên trong vế "khi chuyến đích đang chạy", nên không cần chữ mới. Bản chép ghi điều này ở khối "Không đổi", không thêm dòng bảng, và câu trỏ của ADR-0052 chỉ nhắc `:192` là giữ chữ (vế chặng đặt gấp), không ghi là dòng bị sửa.
