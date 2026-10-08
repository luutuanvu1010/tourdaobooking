# Trang trình — lượt duyệt 8d: tài xế nhờ xe khác đón khách, cứu hộ có nơi gặp (2026-10-08)

> **Hồ sơ có ngày 2026-10-08, vai soạn.** Trang này chứa các hộp hỏi chép thẳng cho chủ dự án, chia hai lượt theo trần 3 quyết định mỗi lượt (`CLAUDE.md` §9). Văn bản quyết định: `01-de-xuat-adr-0111-chuyen-khach-giua-xe.md` (ADR-0111, đề xuất). Trang ghép: `02-trang-ghep.md`. Mười tình huống mẫu: `golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json`. Nguồn: kế hoạch `docs/superpowers/plans/2026-10-08-giai-doan-3-a5-ke-hoach.md` §1b (đã qua phản biện), đối chiếu lại với ADR và mã ngày 8/10.

## Cho chủ dự án

Phần "tài xế nhờ xe khác đón khách" bạn đã duyệt ngày 30/9, rồi hoãn ngày 2/10 và mở lại hôm nay. Trước khi làm phần lưu dữ liệu, cần một văn bản quyết định mới để sửa đúng mấy chỗ văn bản 30/9 viết cứng hoặc tự nói khác nhau. Tôi chia thành hai lượt hỏi, mỗi lượt tối đa ba quyết định: lượt đầu có ba hộp (điều kiện chuyển, cách ghi dấu vết, mười tình huống mẫu), lượt sau có hai hộp (hai chỗ siết, khách đặt gấp). Bạn chỉ cần chọn trong các hộp dưới đây; phương án khuyến nghị luôn đứng đầu.

Có ba điều bạn nên biết mà không cần chọn. Thứ nhất, khi một xe đã nhận đón một điểm thì các lần nhờ khác cho cùng điểm đó tự huỷ, đúng như bạn đồng ý ngày 1/10. Thứ hai, văn bản mới nới hai bài kiểm tự động cho khớp việc bạn đã duyệt: bài canh "ai được bấm duyệt vượt luật" sẽ cho thêm đúng hai nút Duyệt và Bác lần nhờ, còn câu kiểm định kỳ "điểm đón khác nơi hẹn" sẽ bỏ qua khách lên xe cứu hộ ở nơi gặp; duyệt văn bản là duyệt hai chỗ nới này. Thứ ba, văn bản 30/9 ghi thứ tự các bước lưu theo một cách máy không chạy được, nên văn bản mới viết lại thứ tự cho đúng; kết quả không đổi.

---

## Lượt 8d-1 — ba hộp, hỏi chung một lần

Phải có câu trả lời của lượt này thì mới viết được phần lưu dữ liệu. Phần tính toán thuần, ô quyền đã duyệt và danh sách xe nhận vẫn làm trước được.

**Hộp 1**
- Tiêu đề: `Điều kiện`
- Câu hỏi: Khi một tài xế nhờ xe khác đón khách giúp, Nền tảng tự kiểm một danh sách điều kiện trước khi chuyển: xe nhận còn đủ chỗ không, tài xế có đang bận chuyến khác không, có đủ giờ nghỉ giữa hai chuyến không, có vướng mốc 6 giờ không, giấy tờ xe còn hạn không, bằng lái có đủ hạng không. Ngày 2/10 bạn đồng ý để danh sách này ở dạng danh mục, tức mỗi điều kiện là một dòng trong một bảng, chứ không khoá cứng; nhưng văn bản ngày 30/9 lại khoá cứng 9 điều kiện, nên cần văn bản mới thay đúng chỗ đó. Văn bản mới cũng thêm hai điều kiện mà các quyết định bạn đã duyệt buộc phải có. Một là nếu việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe đang chở một đoàn đặt xe riêng), việc chuyển phải chờ Quản trị duyệt kèm lý do. Hai là khách thuộc đơn đã huỷ thì không chuyển được, vì Nền tảng vốn không cho đưa khách của đơn đã huỷ lên xe nào. Duyệt hộp này cũng là cho phép nới hai bài kiểm tự động cho khớp việc bạn đã duyệt: bài canh "ai được bấm duyệt vượt luật" cho thêm đúng hai nút Duyệt và Bác lần nhờ, và câu kiểm định kỳ "điểm đón khác nơi hẹn" không báo nhầm khi khách lên xe cứu hộ ở nơi gặp. Bạn duyệt văn bản này không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: đúng điều bạn đồng ý ngày 2/10; sau này thêm điều kiện không phải dựng lại bảng dữ liệu, chỉ thêm một dòng cùng phần kiểm tương ứng (vẫn do người làm phần mềm làm); khách xe riêng không bị ghép chung mà không ai xem. Mất: một số lần nhờ xe phải chờ Quản trị duyệt; và nếu trong nhóm khách được nhờ có dù chỉ một khách của đơn đã huỷ, cả lần nhờ đó chỉ bác được, văn phòng phải xếp xe theo cách cũ.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: bạn có thêm thời gian xem lại. Mất: chưa làm được phần nhờ xe khác đón; tài xế vẫn gọi văn phòng như hôm nay.

**Hộp 2**
- Tiêu đề: `Dấu vết`
- Câu hỏi: Mỗi lần chuyển khách, Nền tảng ghi lại để sau này tra được và để báo đúng người. Văn bản mới quy định cách ghi như sau. Mỗi khách ghi rõ được chuyển vào xe theo lần nhờ nào và chuyển ra theo lần nhờ nào, vì một khách có thể được chuyển vào rồi lại chuyển ra. Nền tảng ghi người bấm Nhận và chỉ chấp nhận khi đó đúng là tài xế xe nhận, nên văn phòng không bấm Nhận thay được. Thời gian chờ trả lời (10 phút) tính theo cài đặt lúc gửi; còn công tắc "tự đồng ý" (bạn tắt thì mọi lần nhờ đều phải qua Quản trị) tính theo cài đặt lúc tài xế bấm Nhận, để khi bạn tắt công tắc thì cả các lần nhờ đang chờ cũng phải qua Quản trị; văn bản ngày 30/9 có hai câu nói khác nhau ở chỗ này. Khi tài xế xe nhận bấm "Không nhận", tài xế nhờ được báo ngay; văn bản cũ chưa có tin này. Những gì đã ghi thì không xoá được, nên cách ghi phải duyệt trước khi làm. Bạn duyệt không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: tra lại được mọi lần chuyển; tắt công tắc có hiệu lực ngay; tài xế nhờ biết sớm khi bị từ chối. Mất: cách ghi cố định từ lần ghi đầu, muốn đổi sau phải làm thêm.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: bạn xem lại cách ghi trước. Mất: chưa bắt đầu được phần dữ liệu của việc nhờ xe.

**Hộp 3** (xác nhận theo yêu cầu của văn bản ngày 30/9; chặn việc nghiệm thu, không chặn việc làm)
- Tiêu đề: `Tình huống`
- Câu hỏi: Trước khi nghiệm thu phần chuyển khách, văn bản ngày 30/9 yêu cầu bạn xác nhận các tình huống mẫu. Dưới đây là 10 tình huống, dùng ví dụ xe A, xe B của bạn:
  1. Kẹt xe, xe A không kịp đón 3 khách ở Mường Thanh. Xe B đang chạy gần đó, nhận thêm thì chở 25 trên 29 chỗ, không vướng giờ. Tài xế A nhờ, tài xế B bấm Nhận: Nền tảng tự đồng ý, 3 khách sang xe B, tài xế A được báo.
  2. Như tình huống 1 nhưng xe B chưa xuất bến và còn dưới 6 giờ tới giờ chạy (khách không đặt gấp): tài xế B bấm Nhận xong, việc chuyển chờ Quản trị duyệt kèm lý do. Duyệt thì khách sang xe B; bác thì khách ở lại xe A.
  3. Xe A chỉ còn 1 chỗ mà điểm Alibu của xe B có 2 khách. Tài xế B nhờ, tài xế A bấm Nhận: Nền tảng không cho vì xe A sẽ chở 16 trên 15 chỗ, báo Quản trị; Quản trị chỉ được bác, không được duyệt cho qua.
  4. Tài xế B bấm "Không nhận" và chọn lý do (ví dụ "Không kịp giờ"): lần nhờ đóng lại, tài xế A được báo ngay. Nếu tài xế B để quá 10 phút không trả lời: màn hình tài xế A hiện "hết giờ chờ" để A nhờ xe khác hoặc gọi văn phòng; Nền tảng không tự gửi tin đúng lúc phút thứ 10, mà báo "đã hết hạn" khi có người bấm tiếp vào lần nhờ đó (ví dụ tài xế B bấm Nhận muộn).
  5. Tài xế A nhờ cùng lúc xe B và xe C đón Mường Thanh. Tài xế B bấm Nhận trước: lần nhờ gửi xe C tự huỷ; tài xế C không nhận tin, thấy "đã huỷ" khi mở màn hình.
  6. Xe A tới Mường Thanh (hoặc tài xế A bấm bỏ qua điểm, hay kết thúc gián đoạn) trước khi xe B trả lời: lần nhờ tự huỷ, không ai phải làm gì.
  7. Xe A hỏng giữa đường, 5 khách đã lên xe, 3 khách còn chờ ở điểm sau. Tài xế A chọn xe cứu hộ C đang chạy và ghi nơi gặp; tài xế C bấm Nhận: 5 khách lên xe C ở nơi gặp, 3 khách được xe C đón ở điểm cũ; sau đó tài xế A bấm Kết thúc gián đoạn.
  8. Như tình huống 7 nhưng tài xế A gọi văn phòng, nhân viên văn phòng gửi thay lần nhờ cứu hộ. Tài xế C vẫn phải tự bấm Nhận; văn phòng không bấm Nhận thay được.
  9. Việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe B mà đoàn trên xe B đã đặt xe riêng): việc chuyển chờ Quản trị duyệt kèm lý do, không tự đồng ý.
  10. Ví dụ của bạn: xe A không kịp Mường Thanh còn xe B ở gần; đồng thời xe B không kịp Alibu còn xe A ở gần. Hai tài xế nhờ chéo nhau; mỗi lần nhờ được xét riêng theo số chỗ lúc tài xế bấm Nhận: như tình huống 1, hoặc như tình huống 3 nếu lúc đó thiếu chỗ.

  Kết quả Nền tảng đưa ra ở mỗi tình huống có đúng ý bạn không?
- Phương án 1, nhãn `Đúng hết (Recommended)`. Mô tả: Được: làm xong là nghiệm thu được ngay. Mất: không có gì thêm.
- Phương án 2, nhãn `Có tình huống cần sửa`. Mô tả: Bạn ghi số tình huống và chỗ chưa đúng. Được: sát thực tế hơn. Mất: chưa nghiệm thu được cho tới khi sửa xong.

---

## Lượt 8d-2 — hai hộp, gửi ngay sau khi bạn trả lời lượt 8d-1

**Hộp 4**
- Tiêu đề: `Chỗ siết`
- Câu hỏi: Văn bản mới có hai chỗ chặt hơn văn bản ngày 30/9. Một là xe cứu hộ nhận khách đang ngồi trên xe hỏng phải là xe đang chạy; nếu xe cứu hộ chưa xuất bến thì đi đường cũ: tài xế hoặc văn phòng bấm Kết thúc gián đoạn, rồi văn phòng xếp khách lên xe khác. Hai là xe nào đã chuyển khách đi thì không còn dùng "thu hồi xuất bến" được (lệnh dùng khi bấm xuất bến nhầm), vì xe đó rõ ràng đã chạy thật; xe nhận khách vốn đã bị chặn như vậy, còn lần nhờ bị từ chối hay hết hạn thì không tính. Bạn duyệt hai chỗ này không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: không có cảnh khách đã ngồi trên xe mà lại nằm trong một chuyến chưa xuất bến; không xoá được dấu xuất bến của chuyến đã thật sự chở khách. Mất: cứu hộ bằng xe chưa chạy vẫn phải qua văn phòng như hôm nay.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: giữ đúng văn bản cũ, xe chưa chạy cũng nhận cứu hộ được. Mất: phải làm thêm nhiều phần cho khách đã lên xe nằm trên chuyến chưa xuất bến (chưa kiểm hết là những phần nào), xong chậm hơn; xe đã chuyển khách vẫn thu hồi xuất bến được.

**Hộp 5** (câu hỏi thật)
- Tiêu đề: `Đặt gấp`
- Câu hỏi: Khách đã được đánh dấu đặt gấp mà bị nhờ chuyển sang một xe chưa chạy, còn dưới 6 giờ tới giờ xuất bến. Quyết định ngày 8/10 ghi rằng chuyển sang xe chưa chạy trong 6 giờ thì chờ Quản trị duyệt, nhưng không nói gì về khách đặt gấp; còn khi xếp xe thường thì khách đặt gấp được đi qua, không cần duyệt lại. Chưa ai hỏi bạn chỗ này. Bạn muốn thế nào?
- Phương án 1, nhãn `Vẫn chờ Quản trị (Recommended)`. Mô tả: Được: đúng chữ quyết định mới nhất, giữ mốc 6 giờ, luôn có người xem lại việc chuyển sát giờ. Mất: khách đặt gấp có thể phải chờ thêm vài phút.
- Phương án 2, nhãn `Cho qua như xếp thường`. Mô tả: Được: nhanh hơn, giống cách xếp xe thường. Mất: không ai xem lại việc chuyển sát giờ của khách đặt gấp.

---

## Ghi chú cho điều phối (không dán vào hộp hỏi)

- **Đoạn "Cho chủ dự án" phải hiện cho chủ trước khi gửi hộp** (dán vào tin nhắn ngay trước lần hỏi), vì ba điều không cần chọn chỉ nằm ở đó. Riêng việc nới hai bài kiểm (N2, N3 ở tệp 01, mục "Hàng rào nới") đã chép thêm vào câu hỏi hộp 1, để chủ thấy dù chỉ đọc hộp (Hiến pháp Điều 9.4: nới hàng rào phải được chủ duyệt rõ).
- **Cách gửi:** lượt 8d-1 = hộp 1, 2, 3 trong một lần hỏi (AskUserQuestion tối đa 4 câu); lượt 8d-2 = hộp 4, 5, gửi ngay sau khi chủ trả lời 8d-1 (khuôn A-1 rồi A-1b ngày 30/9). Tiêu đề hộp ≤ 12 ký tự. Ghi nguyên văn nhãn chủ chọn vào sổ thi công.
- **Chủ chọn "Chưa duyệt" ở hộp 1:** dừng mọi phần sau T4/T7a của kế hoạch A5. Hộp 2 "Chưa duyệt": dừng T2 (migration). Hộp 3 chỉ chặn nghiệm thu (T18, T19).
- **Bộ 24 bước lượt 1** (`golden/dieu-phoi/xe-a-b-luot-1.json`) vẫn `cho_xac_nhan`. Nếu muốn hỏi gộp, thêm một câu xác nhận riêng vào lượt 8d-1 (không chạm dữ liệu, không tính trần) — kế hoạch A5 mục "Ghi chú về phán quyết điều phối (7)" (`:69`).
- **Số ADR:** chốt **0111** — cách kiểm ở cuối tệp 01. Khi chép vào `docs/adr/`, dòng "kế tiếp" của README thành 0112. Nếu câu 3 của lượt 8c ("tự trả ghế", từng dùng số tạm 0111) được hỏi lại và chủ chọn làm, ADR đó phải lấy số khác.
- **Trước khi trình:** kiểm độc lập một vòng (sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:172` ở `046fb6b5`, `:164` ở `d4a4bdee`: "Về thì kiểm độc lập một vòng rồi mới trình"). Năm điểm cho người kiểm ở tệp 01, mục "Điểm cho người kiểm soi kỹ"; quan trọng nhất là điểm (1): kế hoạch T2 viết trigger duyệt hẹp hơn chữ `ADR-0052:80`.
- **Một chỗ chưa có chữ** (trang ghép mục 2): cứu hộ có chuyển cả người đi kèm (`CREW`) không. Đọc theo chữ `ADR-0052:129` ("mọi suất mở") là có; kế hoạch chưa tính. Không đưa vào hộp hỏi; điều phối quyết có cần hỏi không.
- **Sổ thi công** (dòng giao việc 8d, `:172` ở `046fb6b5`) còn ghi đường cũ `golden/dieu-phoi/xe-a-b-luot-2-chuyen-khach.json`; điều phối sửa thành `golden/dieu-phoi-luot-2/…` (khác kế hoạch, mục 1).
- **Nền đo:** nhánh của người soạn dựng từ `d4a4bdee`; trong lúc soạn, nhánh làm việc đã gộp ADR-0104 Đ1 (`4d076bed`) và lên `046fb6b5`. Tệp 01, 02 đo số dòng mã ở `046fb6b5`. Commit của người soạn chỉ thêm tệp mới (và một dòng `golden/README.md`), không chạm tệp đổi ở `046fb6b5`.

---

## Khác kế hoạch (đối chiếu ADR và mã ngày 8/10; mỗi mục kèm lý do)

1. **Tệp mười tình huống đặt ở `golden/dieu-phoi-luot-2/`, không ở `golden/dieu-phoi/`** như kế hoạch T1 và lệnh giao. Lý do: `src/dieu-phoi-ca-mau.test.ts:15-16` đọc mọi tệp `.json` ở `golden/dieu-phoi/` và chạy từng bước qua tập hàm lượt 1 (`:17`, `:147-151`). Đã thử: đặt tệp vào đó thì `node --test src/dieu-phoi-ca-mau.test.ts` ra 3 bài đỏ (`TypeError: tep.cac_buoc is not iterable`); chuyển ra `golden/dieu-phoi-luot-2/` thì 28/28 xanh. Không được sửa bài (vai soạn chỉ làm tài liệu). Người thi công T3 chuyển tệp vào cùng commit thêm `kiemChuyen` vào bài. Đã thêm một dòng vào bảng tệp của `golden/README.md`.
2. **Hộp "Điều kiện", ý cam kết:** kế hoạch viết "khách đã đặt xe riêng hoặc số chỗ tối thiểu thì việc chuyển phải qua Quản trị duyệt … như khi xếp xe thường". Sửa thành "nếu việc chuyển làm **sai** cam kết", vì `CAM_KET_DICH` chỉ không đạt khi xe nhận sẽ vi phạm (ADR-0056 `:57-58`, cả hai chiều), không phải mọi lần chuyển khách xe riêng. Bỏ "như khi xếp xe thường": từ ADR-0104 (lời chủ 8/10 "Cho bỏ qua cả hai"), khi sát giờ Bán hàng bỏ qua cam kết được ở việc xếp thường, còn chuyển khách vẫn chỉ Quản trị (ADR-0104 `:230`).
3. **Hộp "Điều kiện", dòng "Được":** "sau này thêm điều kiện chỉ cần thêm một dòng" nói quá: mỗi điều kiện vẫn cần phần kiểm trong mã và một tệp cập nhật dữ liệu. Sửa thành "không phải dựng lại bảng dữ liệu, chỉ thêm một dòng cùng phần kiểm tương ứng (vẫn do người làm phần mềm làm)", để chủ không hiểu là tự thêm được.
4. **Hộp "Điều kiện", dòng "Mất":** thêm cái mất của điều kiện "đơn đã huỷ": một khách của đơn đã huỷ làm cả lần nhờ (kể cả cứu hộ) chỉ bác được (kế hoạch §6 "Rủi ro" có ghi, hộp chưa nói).
5. **Hộp "Điều kiện", "Ngày 2/10 bạn dặn"** → "bạn đồng ý": lộ trình `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:169` là một mục kế hoạch chủ trả lời *"ok"*, không phải câu chủ tự viết.
6. **Tình huống 4 (quá 10 phút):** kế hoạch viết "đề nghị đóng lại, tài xế A được báo". Hết giờ tính lúc đọc, không có Cron (`ADR-0052:78`, MQ-08): lúc phút thứ 10 không có gì được ghi hay gửi; màn hình tài xế A hiện "hết giờ chờ" (thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:790`, MQ-08 `:399`), tin "đã hết hạn" chỉ đi khi lệnh kế tiếp chạm tới lần nhờ đó. Đây cũng là lý do ADR không xây trên lỗ đang hở HC-5.11.
7. **Tình huống 6:** "hoặc kết thúc chuyến" → "hoặc bấm bỏ qua điểm, hay kết thúc gián đoạn": tài xế A không kết thúc thường được khi Mường Thanh còn chờ (LC-16, `migrations/0042_chuyen_xe.sql:557-563`).
8. **Tình huống 9:** kế hoạch viết "Khách đã đặt xe riêng (hoặc đặt số chỗ tối thiểu) bị nhờ chuyển sang xe khác"; sửa theo mục 2 (chỉ khi việc chuyển làm sai cam kết).
9. **Tình huống 1:** "nhận xong còn 25/29 chỗ" → "nhận thêm thì chở 25 trên 29 chỗ" (25 là số chỗ đã dùng — thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:776` ghi "sau khi nhận: 25/29 chỗ"; chữ "còn" dễ đọc thành 25 chỗ trống).
10. **Hộp "Đặt gấp":** kế hoạch viết "một chỗ dẫn về luật xếp xe thường". Chữ đó đúng với bản 30/9 của `ADR-0052:192` ("như dòng này"), nhưng ADR-0104 `:233` (8/10) đã viết lại câu đó, bỏ chữ "như dòng này", và ADR-0104 `:221` nhắc lại "đích chưa chạy trong mốc: leo thang". Câu hỏi vẫn thật vì không câu nào nói về chặng đặt gấp trong khi dòng Xếp (ADR-0049 `:162`) cho chặng đặt gấp qua; hộp viết lại cho đúng hiện trạng chữ. Nhãn phương án rút cho vừa khung: `Vẫn chờ Quản trị (Recommended)`, `Cho qua như xếp thường`.
11. **Nguồn P4:** kế hoạch T1 ghi "lời chủ 2/10" cho cả danh mục và P4; P4 là chat **1/10** (cùng tệp lộ trình `:151`, dưới tiêu đề `:142`).
12. **Thêm một chỗ "Sửa chữ"** ngoài hai chỗ kế hoạch nêu: `ADR-0052:80` ghi "hôm nay chỉ `KHOANG_NGHI_DICH`" thuộc tầng cấu hình, lệch `:77` cùng ADR (đã đặt `MOC_TOI_THIEU` ở tầng cấu hình).
13. **Trigger duyệt của kế hoạch T2 hẹp hơn ADR:** `_confirm_core` xét dòng kiểm của lần duyệt (`decided_cmd_id`), còn `ADR-0052:80` xét mọi dòng kiểm "của đề nghị đó". Văn bản ADR-0111 giữ chữ `:80` (không thêm quyết định); tình huống 10 thứ tự (b) viết theo `:80`. Người thi công sửa T2, hoặc điều phối trình riêng nếu muốn nới.
14. **Văn phòng gửi `STOP` qua route cứu hộ:** kế hoạch NT-A5-15 ghi 400, `ADR-0052:248` ghi 403. Văn bản và tệp tình huống theo ADR (403).
15. **Mốc đo:** kế hoạch đo nền ở `9f8f1656` và Đ1 ở `45731dea` / `@adr-0104-d1`; nay Đ1 (đầu nhánh `b3915140`) đã gộp vào nhánh làm việc (`4d076bed`), nhánh làm việc ở `046fb6b5`. Số dòng mã trong tệp 01, 02 đo lại ở `046fb6b5` (ví dụ `GET …/cuu-ho` nay ở `index.ts:1268`, kế hoạch ghi `:1264`; hàng `trip.*` ở `permissions.ts:187-205`; `lop-vuot.test.ts` đã có trên nhánh).
16. **Chỗ chưa có chữ mới phát hiện:** cứu hộ có chuyển người đi kèm (`CREW`) không — trang ghép mục 2; kế hoạch chưa nêu.
17. **Hộp "Dấu vết", hộp "Chỗ siết":** thêm vài chữ giải nghĩa cho người không rành máy (công tắc "tự đồng ý" là gì; "văn bản cũ chưa có tin này"; "chưa kiểm hết là những phần nào") — không đổi nghĩa phương án.
