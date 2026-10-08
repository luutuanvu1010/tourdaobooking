# Trang trình — lượt duyệt 8d: tài xế nhờ xe khác đón khách, cứu hộ có nơi gặp (2026-10-08)

> **Hồ sơ có ngày 2026-10-08, vai soạn.** Trang này chứa các hộp hỏi chép thẳng cho chủ dự án, chia hai lượt theo trần 3 quyết định mỗi lượt (`CLAUDE.md` §9). Văn bản quyết định: `01-de-xuat-adr-0111-chuyen-khach-giua-xe.md` (ADR-0111, đề xuất). Trang ghép: `02-trang-ghep.md`. Mười tình huống mẫu: `golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json`. Nguồn: kế hoạch `docs/superpowers/plans/2026-10-08-giai-doan-3-a5-ke-hoach.md` §1b (đã qua phản biện), đối chiếu lại với ADR và mã ngày 8/10. Đã sửa một lần theo phiếu kiểm độc lập 8/10 (`phieu-kiem-tong-hop.md` cùng thư mục, trên nhánh làm việc @ `6820b86b`) — bảng mã phiếu → chỗ sửa ở mục "Sửa theo phiếu kiểm 8/10" cuối tệp.

## Cho chủ dự án

Phần "tài xế nhờ xe khác đón khách" bạn đã duyệt ngày 30/9, rồi hoãn ngày 2/10, và nay được đưa vào làm trong nhiệm vụ Vận chuyển và Bán hàng bạn giao. Trước khi làm phần lưu dữ liệu, cần một văn bản quyết định mới để sửa đúng mấy chỗ văn bản 30/9 viết cứng hoặc tự nói khác nhau. Tôi chia thành hai lượt hỏi, mỗi lượt tối đa ba quyết định: lượt đầu có bốn hộp (điều kiện chuyển, cách ghi dấu vết, nới hai bài kiểm tự động, mười tình huống mẫu), lượt sau có ba hộp (cứu hộ, thu hồi xuất bến, khách đặt gấp). Bạn chỉ cần chọn trong các hộp dưới đây; phương án khuyến nghị luôn đứng đầu.

Có hai điều bạn nên biết mà không cần chọn. Thứ nhất, khi một xe đã nhận đón một điểm thì các lần nhờ khác cho cùng điểm đó tự huỷ, đúng như bạn đồng ý ngày 1/10; tài xế có lần nhờ bị huỷ không nhận tin, chỉ thấy "Đã huỷ" khi mở màn hình. Thứ hai, khi cứu hộ xe hỏng, người đi kèm đoàn (ví dụ hướng dẫn viên) sang xe cứu hộ cùng khách và được tính vào số chỗ, đúng chữ văn bản 30/9. Ngoài ra, văn bản 30/9 ghi thứ tự các bước lưu theo một cách máy không chạy được, nên văn bản mới viết lại thứ tự cho đúng; kết quả không đổi.

---

## Lượt 8d-1 — bốn hộp, hỏi chung một lần

Phải có câu trả lời của lượt này thì mới viết được phần lưu dữ liệu. Phần tính toán thuần, ô quyền đã duyệt và danh sách xe nhận vẫn làm trước được.

**Hộp 1**
- Tiêu đề: `Điều kiện`
- Câu hỏi: Khi một tài xế nhờ xe khác đón khách giúp, Nền tảng tự kiểm một danh sách điều kiện trước khi chuyển, ví dụ xe nhận còn đủ chỗ không, có vướng mốc 6 giờ không, có đủ giờ nghỉ giữa hai chuyến không. Văn bản ngày 30/9 khoá cứng 9 điều kiện; vài điều kiện trong đó (giấy tờ xe, bằng lái, trùng giờ) thực tế gần như luôn đạt, vì xe và tài xế của xe nhận không đổi. Ngày 2/10 bạn đồng ý để danh sách này ở dạng danh mục, tức mỗi điều kiện là một dòng trong một bảng, chứ không khoá cứng, nên cần văn bản mới thay đúng chỗ đó. Văn bản mới cũng thêm hai điều kiện mà các quyết định bạn đã duyệt buộc phải có. Một là nếu việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe đang chở một đoàn đặt xe riêng), việc chuyển phải chờ Quản trị duyệt kèm lý do. Hai là khách thuộc đơn đã huỷ, hoặc thuộc chặng đã bị sửa không còn hiệu lực, thì không chuyển được, vì Nền tảng vốn không cho đưa những khách đó lên xe nào. Bạn duyệt văn bản này không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: đúng điều bạn đồng ý ngày 2/10; sau này thêm điều kiện không phải dựng lại bảng dữ liệu, chỉ thêm một dòng cùng phần kiểm tương ứng (vẫn do người làm phần mềm làm); khách xe riêng không bị ghép chung mà không ai xem. Mất: một số lần nhờ xe phải chờ Quản trị duyệt; và nếu trong nhóm khách được nhờ có dù chỉ một khách của đơn đã huỷ hoặc của chặng không còn hiệu lực, cả lần nhờ đó chỉ bác được, văn phòng phải xếp xe theo cách cũ.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: bạn có thêm thời gian xem lại. Mất: chưa làm được phần nhờ xe khác đón; tài xế vẫn gọi văn phòng như hôm nay.

**Hộp 2**
- Tiêu đề: `Dấu vết`
- Câu hỏi: Mỗi lần chuyển khách, Nền tảng ghi lại để sau này tra được và để báo đúng người. Văn bản mới quy định cách ghi như sau. Mỗi khách ghi rõ được chuyển vào xe theo lần nhờ nào và chuyển ra theo lần nhờ nào, vì một khách có thể được chuyển vào rồi lại chuyển ra. Nền tảng ghi tài xế bấm Nhận và chỉ chấp nhận khi người bấm đúng là tài xế xe nhận, nên văn phòng không bấm Nhận thay được. Khi lần nhờ phải chờ Quản trị, Nền tảng ghi thêm ai duyệt hoặc bác và lúc nào, vẫn giữ tên tài xế đã bấm Nhận. Thời gian chờ trả lời (10 phút) tính theo cài đặt lúc gửi; còn công tắc "tự đồng ý" (bạn tắt thì mọi lần nhờ đều phải qua Quản trị) tính theo cài đặt lúc tài xế bấm Nhận, để khi bạn tắt công tắc thì cả các lần nhờ đang chờ cũng phải qua Quản trị; văn bản ngày 30/9 có hai câu nói khác nhau ở chỗ này. Khi tài xế xe nhận bấm "Không nhận", tài xế nhờ được báo ngay; văn bản cũ chưa có tin này. Nhật ký chỉ ghi mã chuyến, số khách và tên điều kiện không đạt; không ghi tên, năm sinh hay số điện thoại khách. Những gì đã ghi thì không xoá được, nên cách ghi phải duyệt trước khi làm. Bạn duyệt không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: tra lại được mọi lần chuyển; tắt công tắc có hiệu lực ngay; tài xế nhờ biết sớm khi bị từ chối. Mất: cách ghi cố định từ lần ghi đầu, muốn đổi sau phải làm thêm.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: bạn xem lại cách ghi trước. Mất: chưa bắt đầu được phần dữ liệu của việc nhờ xe.

**Hộp 3**
- Tiêu đề: `Nới bài kiểm`
- Câu hỏi: Để khớp điều bạn đã duyệt, văn bản mới nới hai bài kiểm tự động. Một: bài canh "chỗ nào được hỏi quyền vượt luật" cho thêm đúng hai nút Duyệt và Bác lần nhờ. Rủi ro mới: bài này không còn soi kỹ hai nút đó, nên nếu ai sửa nhầm để người ít quyền hơn (ví dụ Bán hàng) bấm được Duyệt thì bài này không chắc báo đỏ; phần bù là một bài thử riêng "Bán hàng bấm Duyệt thì bị chặn", đã có trong kế hoạch nhưng chưa viết. Hai: câu kiểm định kỳ "điểm đón khác nơi hẹn" bỏ qua khách lên xe cứu hộ ở nơi gặp. Rủi ro mới: khách ở nơi gặp bị xếp nhầm điểm thì câu này không báo; chỗ này chưa có bài bù. Bạn đồng ý nới không?
- Phương án 1, nhãn `Đồng ý nới (Recommended)`. Mô tả: Được: làm được phần Quản trị duyệt hoặc bác lần nhờ và phần cứu hộ có nơi gặp; câu kiểm định kỳ không báo nhầm mỗi lần cứu hộ. Mất: hai rủi ro mới nói trên.
- Phương án 2, nhãn `Chưa nới`. Mô tả: Được: hai bài kiểm giữ nguyên độ chặt. Mất: chưa làm được phần duyệt, bác và cứu hộ có nơi gặp; lần nhờ phải chờ Quản trị khi đó không ai xử lý được, chỉ tự huỷ khi xe tới điểm hoặc kết thúc chuyến.

**Hộp 4** (xác nhận theo yêu cầu của văn bản ngày 30/9; chặn việc nghiệm thu, không chặn việc làm)
- Tiêu đề: `Tình huống`
- Câu hỏi: Trước khi nghiệm thu phần chuyển khách, văn bản ngày 30/9 yêu cầu bạn xác nhận các tình huống mẫu. Dưới đây là 10 tình huống, dùng ví dụ xe A, xe B của bạn:
  1. Kẹt xe, xe A không kịp đón 3 khách ở Mường Thanh. Xe B đang chạy gần đó, nhận thêm thì chở 25 trên 29 chỗ, không vướng giờ. Tài xế A nhờ, tài xế B bấm Nhận: Nền tảng tự đồng ý, 3 khách sang xe B, tài xế A được báo.
  2. Như tình huống 1 nhưng xe B chưa xuất bến và còn dưới 6 giờ tới giờ chạy (khách không đặt gấp): tài xế B bấm Nhận xong, việc chuyển chờ Quản trị duyệt kèm lý do. Duyệt thì khách sang xe B; bác thì khách ở lại xe A.
  3. Xe A chỉ còn 1 chỗ mà điểm Alibu của xe B có 2 khách. Tài xế B nhờ, tài xế A bấm Nhận: Nền tảng không cho vì xe A sẽ chở 16 trên 15 chỗ, báo Quản trị; Quản trị chỉ được bác, không được duyệt cho qua.
  4. Tài xế B bấm "Không nhận" và chọn lý do (ví dụ "Không kịp giờ"): lần nhờ đóng lại, tài xế A được báo ngay. Nếu tài xế B để quá 10 phút không trả lời: màn hình tài xế A hiện "hết giờ chờ" để A nhờ xe khác hoặc gọi văn phòng; Nền tảng không tự gửi tin đúng lúc phút thứ 10, mà báo "đã hết hạn" khi có người bấm tiếp vào lần nhờ đó (ví dụ tài xế B bấm Nhận muộn).
  5. Tài xế A nhờ cùng lúc xe B và xe C đón Mường Thanh. Tài xế B bấm Nhận trước: lần nhờ gửi xe C tự huỷ; tài xế C không nhận tin, thấy "đã huỷ" khi mở màn hình. Tương tự, nếu tài xế A đã nhờ xe B đón Mường Thanh rồi xe A hỏng và tài xế C nhận cứu hộ cả xe, lần nhờ gửi xe B cũng tự huỷ, tài xế B không nhận tin.
  6. Xe A tới Mường Thanh (hoặc tài xế A bấm bỏ qua điểm, hay kết thúc gián đoạn) trước khi xe B trả lời: lần nhờ tự huỷ, không ai phải làm gì.
  7. Xe A hỏng giữa đường, 5 khách đã lên xe, 3 khách còn chờ ở điểm sau. Tài xế A chọn xe cứu hộ C đang chạy và ghi nơi gặp; tài xế C bấm Nhận: 5 khách lên xe C ở nơi gặp, 3 khách được xe C đón ở điểm cũ; sau đó tài xế A bấm Kết thúc gián đoạn. Nếu xe A có người đi kèm, ví dụ hướng dẫn viên, họ cũng sang xe C cùng khách và được tính vào số chỗ của xe C.
  8. Như tình huống 7 nhưng tài xế A gọi văn phòng, nhân viên văn phòng gửi thay lần nhờ cứu hộ. Tài xế C vẫn phải tự bấm Nhận; văn phòng không bấm Nhận thay được.
  9. Việc chuyển làm sai cam kết với khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu (ví dụ đưa thêm khách vào xe B mà đoàn trên xe B đã đặt xe riêng): việc chuyển chờ Quản trị duyệt kèm lý do, không tự đồng ý.
  10. Ví dụ của bạn: xe A không kịp Mường Thanh còn xe B ở gần; đồng thời xe B không kịp Alibu còn xe A ở gần. Hai tài xế nhờ chéo nhau; mỗi lần nhờ được xét riêng theo số chỗ lúc tài xế bấm Nhận: như tình huống 1, hoặc như tình huống 3 nếu lúc đó thiếu chỗ. Nếu tài xế A bấm Nhận lúc xe A còn thiếu chỗ thì lần nhờ đó chỉ bác được, kể cả khi sau đó xe A bớt khách; tài xế B gửi lại lần nhờ mới.

  Kết quả Nền tảng đưa ra ở mỗi tình huống có đúng ý bạn không?
- Phương án 1, nhãn `Đúng hết (Recommended)`. Mô tả: Được: phần bạn xác nhận không còn chặn việc nghiệm thu. Mất: không có gì thêm.
- Phương án 2, nhãn `Có tình huống cần sửa`. Mô tả: Bạn ghi số tình huống và chỗ chưa đúng. Được: sát thực tế hơn. Mất: chưa nghiệm thu được cho tới khi sửa xong.

---

## Lượt 8d-2 — ba hộp, gửi ngay sau khi bạn trả lời lượt 8d-1

**Hộp 5**
- Tiêu đề: `Cứu hộ`
- Câu hỏi: Khi xe hỏng giữa đường, tài xế (hoặc văn phòng bấm thay) nhờ một xe cứu hộ nhận cả khách đang ngồi trên xe. Văn bản mới chặt hơn văn bản ngày 30/9 ở một chỗ: xe cứu hộ phải là xe đang chạy. Nếu xe cứu hộ chưa xuất bến thì đi đường cũ: tài xế hoặc văn phòng bấm Kết thúc gián đoạn, rồi văn phòng xếp khách lên xe khác. Bạn duyệt không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: không có cảnh khách đã ngồi trên xe mà lại nằm trong một chuyến chưa xuất bến; làm nhanh hơn. Mất: cứu hộ bằng xe chưa chạy vẫn phải qua văn phòng như hôm nay.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: giữ đúng văn bản cũ, xe chưa chạy cũng nhận cứu hộ được. Mất: phải làm thêm nhiều phần cho khách đã lên xe nằm trên chuyến chưa xuất bến (chưa kiểm hết là những phần nào), xong chậm hơn.

**Hộp 6**
- Tiêu đề: `Thu hồi`
- Câu hỏi: Thu hồi xuất bến là lệnh dùng khi bấm xuất bến nhầm, đưa chuyến về như chưa chạy; hôm nay lệnh này chỉ dùng được khi chuyến chưa có việc gì xảy ra sau lúc xuất bến. Khi có chuyển khách, văn bản mới đổi luật này ở hai chỗ, một chỗ chặt hơn và một chỗ nới ra. Chặt hơn: xe đã giao khách cho xe khác thì không thu hồi xuất bến được nữa, vì xe đó rõ ràng đã chạy thật. Nới ra: lần nhờ chưa thành (đang chờ, bị từ chối, hết giờ, bị bác) không còn chặn xe nhận thu hồi xuất bến; chỉ lần nhờ đã nhận khách mới chặn. Kèm theo, khi một xe bị thu hồi xuất bến, mọi lần nhờ đang chờ hoặc đang chờ Quản trị có liên quan tới xe đó tự huỷ, vì điều kiện lúc gửi không còn đúng. Bạn duyệt không?
- Phương án 1, nhãn `Duyệt (Recommended)`. Mô tả: Được: không xoá được dấu xuất bến của xe đã thật sự giao khách; xe nhận không bị khoá thu hồi chỉ vì một lần nhờ đã bị từ chối; không còn lần nhờ treo trên xe vừa thu hồi. Mất: xe đã giao khách cho xe khác mà trước đó bấm xuất bến nhầm thì không thu hồi được nữa.
- Phương án 2, nhãn `Chưa duyệt`. Mô tả: Được: giữ luật hôm nay. Mất: xe nhờ vẫn thu hồi xuất bến được dù đã giao khách cho xe khác; xe nhận bị khoá thu hồi chỉ vì có một lần nhờ, kể cả lần đã bị từ chối.

**Hộp 7** (câu hỏi thật)
- Tiêu đề: `Đặt gấp`
- Câu hỏi: Khách đã được đánh dấu đặt gấp mà bị nhờ chuyển sang một xe chưa chạy, còn dưới 6 giờ tới giờ xuất bến. Quyết định ngày 8/10 ghi rằng chuyển sang xe chưa chạy trong 6 giờ thì chờ Quản trị duyệt, nhưng không nói gì về khách đặt gấp; còn khi xếp xe thường thì khách đặt gấp được đi qua, không cần duyệt lại. Từ 8/10 Bán hàng cũng tự đánh dấu đặt gấp được. Chưa ai hỏi bạn chỗ này. Bạn muốn thế nào?
- Phương án 1, nhãn `Vẫn chờ Quản trị (Recommended)`. Mô tả: Được: đúng chữ quyết định mới nhất, giữ mốc 6 giờ, việc chuyển sát giờ luôn do Quản trị hoặc Toàn quyền xem và duyệt. Mất: khách đặt gấp phải chờ tới khi có người duyệt; lần nhờ chờ duyệt không tự hết hạn, nên nếu lúc đó không ai mở máy thì khách vẫn ở xe cũ.
- Phương án 2, nhãn `Cho qua như xếp thường`. Mô tả: Được: nhanh hơn, giống cách xếp xe thường. Mất: chỉ áp khi mọi khách bị chuyển đều thuộc chặng đặt gấp; và vì Bán hàng tự đánh dấu đặt gấp được, việc chuyển sát giờ của những khách này không Quản trị nào xem lại.

---

## Ghi chú cho điều phối (không dán vào hộp hỏi)

- **Đoạn "Cho chủ dự án" phải hiện cho chủ trước khi gửi hộp** (dán vào tin nhắn ngay trước lần hỏi), vì hai điều không cần chọn chỉ nằm ở đó. Việc nới hai bài kiểm nay có hộp riêng (hộp 3), chủ bác riêng được (Hiến pháp Điều 9.4).
- **Cách gửi:** lượt 8d-1 = hộp 1, 2, 3, 4 trong một lần hỏi (AskUserQuestion tối đa 4 câu); lượt 8d-2 = hộp 5, 6, 7, gửi ngay sau khi chủ trả lời 8d-1 (khuôn A-1 rồi A-1b ngày 30/9). Tiêu đề hộp ≤ 12 ký tự. Ghi nguyên văn nhãn chủ chọn vào sổ thi công.
- **Đếm trần:** 8d-1 có 3 quyết định chạm dữ liệu (Đ1, Đ2 ở hộp 1; Đ3 ở hộp 2); hộp 3 (nới hàng rào, không thêm quyền hay dữ liệu, N2 không đổi giá trị ô nào) và hộp 4 (xác nhận) không tính trần theo phán quyết điều phối. 8d-2 có 3 quyết định (Đ4, Đ5, Đ6).
- **Chủ chọn "Chưa duyệt" / "Chưa nới":**
  - hộp 1 `Điều kiện`: dừng mọi phần sau T4/T7a của kế hoạch A5;
  - hộp 2 `Dấu vết`: dừng T2 (migration) và mọi việc sau nó; T3a, T4 + T7a, T10a vẫn làm;
  - hộp 3 `Nới bài kiểm`: không viết route duyệt / bác (T8 phần đó — NT-3(b) sẽ đỏ) và không đổi R-VC-16 (T11); phần leo thang và cứu hộ có nơi gặp chưa làm được; nhờ xe đang chạy tự đồng ý vẫn làm;
  - hộp 4 `Tình huống`: chỉ chặn nghiệm thu (T18, T19);
  - hộp 5 `Cứu hộ`: không viết vế Đ4; phần cứu hộ sang xe chưa chạy phải thiết kế thêm trước khi làm phần cứu hộ của T8; nhờ đón một điểm (`STOP`) không ảnh hưởng;
  - hộp 6 `Thu hồi`: giữ trigger `revoke_no_progress` như hôm nay (`migrations/0085_dieu_chinh_chuyen.sql:63-67`), bỏ phần dựng lại của T2; tự huỷ lần nhờ khi thu hồi vẫn theo MQ-09 (G-A5-13);
  - hộp 7 `Đặt gấp`: không dừng gì; cờ của `kiemChuyen` theo câu trả lời.
- **Bước `TH02-4-DAT-GAP`** trong tệp tình huống phụ thuộc câu trả lời hộp 7, **không** thuộc phần chủ xác nhận ở hộp 4.
- **Bộ 24 bước lượt 1** (`golden/dieu-phoi/xe-a-b-luot-1.json`) vẫn `cho_xac_nhan`. Lượt 8d-1 đã đủ 4 hộp; nếu muốn hỏi gộp thì thêm một câu xác nhận riêng vào lượt 8d-2 (thành 4 hộp, không chạm dữ liệu, không tính trần) — kế hoạch A5 mục "Ghi chú về phán quyết điều phối (7)" (`:69`).
- **Số ADR:** chốt **0111** — cách kiểm ở cuối tệp 01 (README trên nhánh làm việc @ `6820b86b`, `docs/adr/README.md:118`, ghi "kế tiếp là 0111"). Khi chép vào `docs/adr/`, dòng "kế tiếp" thành 0112.
- **Kiểm:** văn bản đã kiểm độc lập một vòng (hai góc, phiếu tổng hợp). Bản sửa này chưa được kiểm lại; theo phán quyết, điều phối đọc diff trước khi trình.
- **Hai câu chờ lượt sau** (phiếu góc A, THẤP-8, THẤP-9 — người soạn không làm, điều phối ghi sổ): tài khoản nhiều quyền tự duyệt đề nghị của mình; văn phòng gửi thay cứu hộ không nhận tin bác / hết hạn.
- **Ghi sổ cho người thi công** (văn bản đã chốt, kế hoạch chưa sửa): `_confirm_core` đọc mọi dòng kiểm (Đ3 (b)); `_decided_once` đổi theo bảng cột của Đ3 (b); nhánh `alloc_ins` khoá theo `closed_cmd_id` và cho cả `CREW` (kế hoạch `:493` viết `decided_cmd_id` và không nhắc `CREW`; trigger hôm nay chỉ cho `PASSENGER` — `0085:76`); đường tin dùng `HANH_DONG_TIN_CHUYEN` sẵn có (Đ3 (d)) thay cho "câu SQL đường tin nguồn" của T10a; STOP văn phòng gửi = 403 (NT-A5-15 `:399` ghi 400).
- **Sổ thi công** (dòng giao việc 8d, `:172` ở `046fb6b5`) còn ghi đường cũ `golden/dieu-phoi/xe-a-b-luot-2-chuyen-khach.json`; điều phối sửa thành `golden/dieu-phoi-luot-2/…` (khác kế hoạch, mục 1).
- **Nền đo:** nhánh của người soạn dựng từ `d4a4bdee`; nhánh làm việc đã gộp ADR-0104 Đ1 (`4d076bed`), lên `046fb6b5` rồi `6820b86b`. Tệp 01, 02 đo số dòng mã ở `046fb6b5`. Commit của người soạn chỉ chạm bốn tệp 8d và một dòng `golden/README.md` — không chạm tệp nào điều phối đổi trên nhánh làm việc.

---

## Khác kế hoạch (đối chiếu ADR và mã ngày 8/10; mỗi mục kèm lý do)

1. **Tệp mười tình huống đặt ở `golden/dieu-phoi-luot-2/`, không ở `golden/dieu-phoi/`** như kế hoạch T1 và lệnh giao. Lý do: `src/dieu-phoi-ca-mau.test.ts:15-16` đọc mọi tệp `.json` ở `golden/dieu-phoi/` và chạy từng bước qua tập hàm lượt 1 (`:17`, `:147-151`). Đã thử: đặt tệp vào đó thì `node --test src/dieu-phoi-ca-mau.test.ts` ra 3 bài đỏ (`TypeError: tep.cac_buoc is not iterable`); chuyển ra `golden/dieu-phoi-luot-2/` thì 28/28 xanh. Không được sửa bài (vai soạn chỉ làm tài liệu). Người thi công T3 chuyển tệp vào cùng commit thêm `kiemChuyen` vào bài. Đã thêm một dòng vào bảng tệp của `golden/README.md`.
2. **Hộp "Điều kiện", ý cam kết:** kế hoạch viết "khách đã đặt xe riêng hoặc số chỗ tối thiểu thì việc chuyển phải qua Quản trị duyệt … như khi xếp xe thường". Sửa thành "nếu việc chuyển làm **sai** cam kết", vì `CAM_KET_DICH` chỉ không đạt khi xe nhận sẽ vi phạm (ADR-0056 `:57-58`, cả hai chiều), không phải mọi lần chuyển khách xe riêng. Bỏ "như khi xếp xe thường": từ ADR-0104 (lời chủ 8/10 "Cho bỏ qua cả hai"), khi sát giờ Bán hàng bỏ qua cam kết được ở việc xếp thường, còn chuyển khách vẫn chỉ Quản trị (ADR-0104 `:230`).
3. **Hộp "Điều kiện", dòng "Được":** "sau này thêm điều kiện chỉ cần thêm một dòng" nói quá: mỗi điều kiện vẫn cần phần kiểm trong mã và một tệp cập nhật dữ liệu. Sửa thành "không phải dựng lại bảng dữ liệu, chỉ thêm một dòng cùng phần kiểm tương ứng (vẫn do người làm phần mềm làm)", để chủ không hiểu là tự thêm được.
4. **Hộp "Điều kiện", dòng "Mất":** thêm cái mất của điều kiện "đơn đã huỷ / chặng không còn hiệu lực": một khách như vậy làm cả lần nhờ (kể cả cứu hộ) chỉ bác được (kế hoạch §6 "Rủi ro" `:806` có ghi, hộp chưa nói).
5. **Hộp "Điều kiện", "Ngày 2/10 bạn dặn"** → "bạn đồng ý": lộ trình `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:169` là một mục kế hoạch chủ trả lời *"ok"*, không phải câu chủ tự viết.
6. **Tình huống 4 (quá 10 phút):** kế hoạch viết "đề nghị đóng lại, tài xế A được báo". Hết giờ tính lúc đọc, không có Cron (`ADR-0052:78`, MQ-08): lúc phút thứ 10 không có gì được ghi hay gửi; màn hình tài xế A hiện "hết giờ chờ" (thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:790`, MQ-08 `:399`), tin "đã hết hạn" chỉ đi khi lệnh kế tiếp chạm tới lần nhờ đó. Đây cũng là lý do ADR không xây trên lỗ đang hở HC-5.11.
7. **Tình huống 6:** "hoặc kết thúc chuyến" → "hoặc bấm bỏ qua điểm, hay kết thúc gián đoạn": tài xế A không kết thúc thường được khi Mường Thanh còn chờ (LC-16, `migrations/0042_chuyen_xe.sql:557-563`).
8. **Tình huống 9:** kế hoạch viết "Khách đã đặt xe riêng (hoặc đặt số chỗ tối thiểu) bị nhờ chuyển sang xe khác"; sửa theo mục 2 (chỉ khi việc chuyển làm sai cam kết).
9. **Tình huống 1:** "nhận xong còn 25/29 chỗ" → "nhận thêm thì chở 25 trên 29 chỗ" (25 là số chỗ đã dùng — thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:776` ghi "sau khi nhận: 25/29 chỗ"; chữ "còn" dễ đọc thành 25 chỗ trống).
10. **Hộp "Đặt gấp":** kế hoạch viết "một chỗ dẫn về luật xếp xe thường". Chữ đó đúng với bản 30/9 của `ADR-0052:192` ("như dòng này"), nhưng ADR-0104 `:233` (8/10) đã viết lại câu đó, bỏ chữ "như dòng này", và ADR-0104 `:221` nhắc lại "đích chưa chạy trong mốc: leo thang". Câu hỏi vẫn thật vì không câu nào nói về chặng đặt gấp trong khi dòng Xếp (ADR-0049 `:162`) cho chặng đặt gấp qua; hộp viết lại cho đúng hiện trạng chữ, thêm ADR-0107 (Bán hàng tự đóng dấu) theo phiếu kiểm. Nhãn phương án rút cho vừa khung: `Vẫn chờ Quản trị (Recommended)`, `Cho qua như xếp thường`.
11. **Nguồn P4:** kế hoạch T1 ghi "lời chủ 2/10" cho cả danh mục và P4; P4 là chat **1/10** (cùng tệp lộ trình `:151`, dưới tiêu đề `:142`).
12. **Thêm một chỗ "Sửa chữ"** ngoài hai chỗ kế hoạch nêu: `ADR-0052:80` ghi "hôm nay chỉ `KHOANG_NGHI_DICH`" thuộc tầng cấu hình, lệch `:77` cùng ADR (đã đặt `MOC_TOI_THIEU` ở tầng cấu hình).
13. **Trigger duyệt của kế hoạch T2 hẹp hơn ADR:** `_confirm_core` (kế hoạch `:477`) xét dòng kiểm của `decided_cmd_id`, còn `ADR-0052:80` xét mọi dòng kiểm "của đề nghị đó". Theo phán quyết điều phối sau phiếu kiểm: chữ ADR thắng, không hỏi chủ; ADR-0111 Đ3 (b) ghi rõ trigger đọc mọi dòng kiểm; điều phối ghi sổ cho người thi công (không sửa kế hoạch).
14. **Văn phòng gửi `STOP` qua route cứu hộ:** kế hoạch NT-A5-15 ghi 400, `ADR-0052:248` ghi 403. Văn bản và tệp tình huống theo ADR (403); phiếu kiểm và phán quyết xác nhận.
15. **Mốc đo:** kế hoạch đo nền ở `9f8f1656` và Đ1 ở `45731dea` / `@adr-0104-d1`; nay Đ1 (đầu nhánh `b3915140`) đã gộp vào nhánh làm việc (`4d076bed`), nhánh làm việc ở `046fb6b5` lúc đo. Số dòng mã trong tệp 01, 02 đo lại ở `046fb6b5` (ví dụ `GET …/cuu-ho` nay ở `index.ts:1268`, kế hoạch ghi `:1264`; hàng `trip.*` ở `permissions.ts:187-205`; `lop-vuot.test.ts` đã có trên nhánh).
16. **Người đi kèm (`CREW`) trong cứu hộ:** kế hoạch chưa nêu. Theo phán quyết điều phối: áp chữ `ADR-0052:129` (chuyển mọi suất mở, gồm người đi kèm), không hỏi chủ; ghi vào Đ1, Đ2, Đ3, Đ4 của tệp 01, tình huống 7 và tệp tình huống. Kéo theo: nhánh `alloc_ins` của LC-15 phải cho `CREW` (kế hoạch `:493` không nhắc `CREW`; trigger hôm nay chỉ cho `PASSENGER` — `0085:76`).
17. **Hộp "Dấu vết", hộp "Cứu hộ":** thêm vài chữ giải nghĩa cho người không rành máy (công tắc "tự đồng ý" là gì; "văn bản cũ chưa có tin này"; "chưa kiểm hết là những phần nào") — không đổi nghĩa phương án.
18. **Số hộp và cách chia:** kế hoạch §1b có 3 hộp ở 8d-1 (Điều kiện, Dấu vết, Tình huống) và 2 hộp ở 8d-2 (Chỗ siết = Đ4 + Đ5, Đặt gấp). Theo phiếu kiểm và phán quyết: 8d-1 thêm hộp `Nới bài kiểm` (N2, N3 — trước chỉ "đi cùng văn bản"); 8d-2 tách Đ4, Đ5 thành `Cứu hộ` và `Thu hồi`, vì Đ5 có cả chỗ nới (xe nhận), không chỉ chỗ siết.
19. **Đường tin:** kế hoạch G-A5-11, T10a viết "câu SQL đường tin nguồn (đọc `vc_trip_event`)". Theo phiếu kiểm góc B: dùng đường `HANH_DONG_TIN_CHUYEN` sẵn có (nhóm thường, mở `canHoiTheoSuKien`), không dựng đường song song (tệp 01, Đ3 (d)).
20. **Thu hồi xuất bến:** kế hoạch T2 chỉ dựng lại `revoke_no_progress`. Văn bản thêm (i) tự huỷ lần nhờ khi thu hồi (kế hoạch đã có ở G-A5-13 `:243`, nay ghi vào Đ5) và (ii) chọn **chấp nhận** cách trigger VK1-A (`vc_trip_departed_after_plan`) tính sự kiện đề nghị — lý do ở Đ5.

---

## Sửa theo phiếu kiểm 8/10

Phiếu: `docs/superpowers/specs/2026-10-08-luot-duyet-8d/phieu-kiem-tong-hop.md` (nhánh làm việc @ `6820b86b`). Số dòng phiếu trích (`00:9`, `01:91`…) là của bản trước khi sửa (`027b383a`).

| Mã phiếu | Nội dung | Chỗ sửa |
|---|---|---|
| A CAO-1 | Hộp Đặt gấp hứa quá ("chờ thêm vài phút", "luôn có người xem lại") | Hộp 7: chữ hai phương án theo phiếu (lần nhờ chờ duyệt không tự hết hạn; PA2 chỉ áp khi mọi khách thuộc chặng đặt gấp); tệp 01 Đ6 phương án (1) ghi cái giá |
| A CAO-2 | Người đi kèm trong cứu hộ | Tình huống 7 thêm câu; tệp 01 Đ2 (không xét `CHANG_KHACH_HIEU_LUC`, vẫn tính chỗ), Đ4; JSON TH07 (thêm suất người đi kèm, 15/16), TH08 (`paxCount` 9); tệp 02 "Cho chủ dự án" điểm 3, §2 |
| A CAO-3 | Nới N2, N3 gói trong hộp 1, thiếu rủi ro mới | Hộp 3 `Nới bài kiểm` riêng, chữ theo phiếu (rủi ro N2 chỉnh — xem "Không theo phiếu" 2); tệp 01 "Hàng rào nới" thêm cột rủi ro, bài bù, câu "Chưa nới"; tệp 02 §1, §5 |
| A THẤP-1 | Hộp 4 cũ gói Đ4 + Đ5 | Tách hộp 5 `Cứu hộ`, hộp 6 `Thu hồi` |
| A THẤP-2 | Hộp 1 nói "9" mà liệt kê 6 | Hộp 1: "ví dụ …"; thêm "vài điều kiện (giấy tờ xe, bằng lái, trùng giờ) gần như luôn đạt" |
| A THẤP-3 | "Mất" hộp 1 thiếu chặng không còn mở | Hộp 1 câu hỏi và "Mất" thêm "chặng không còn hiệu lực"; tệp 01 Đ2. Phần "gỡ bằng Báo huỷ rồi gửi lại": không theo — "Không theo phiếu" 1 |
| A THẤP-4 | Hộp 2 thiếu câu nhật ký | Hộp 2 thêm câu nhật ký không ghi tên, năm sinh, SĐT |
| A THẤP-5 | Hộp 3 cũ (Tình huống) dòng "Được" | Hộp 4: "phần bạn xác nhận không còn chặn việc nghiệm thu" |
| A THẤP-6 | Tình huống 10 thiếu nhánh nhận lúc thiếu chỗ | Tình huống 10 thêm câu; JSON TH10 thêm bước 10B-6 (bác), 10B-7 (gửi lại), 10B-8 (nhận, 13/15) |
| A THẤP-7 | Tự huỷ chéo phạm vi `STOP` → `ONBOARD` | Tình huống 5 thêm câu; JSON TH05 nhánh 5B (4 bước); tệp 01 "Không tính là quyết định" |
| A THẤP-8, 9 | Tài khoản nhiều quyền tự duyệt; văn phòng gửi thay không nhận tin bác / hết hạn | **Không làm** theo phán quyết (điều phối ghi sổ); "Ghi chú cho điều phối" nhắc lại |
| A THẤP-10 | Trang ghép thiếu `trip.passenger.add`, loại "suất còn giữ của đơn đã huỷ", ô giao diện trang Chính sách điều phối | Tệp 02 §3 thêm dòng `trip.passenger.add` (`:201`); §2 dòng suất thêm loại đó (ADR-0104 `:220`); §4.2 thêm dòng trang Chính sách điều phối (`web/account.ts:100`, `web/chinh-sach-dieu-phoi.ts:239`) |
| A THẤP-11 | Route `GET …/cuu-ho/xe-nhan` thiếu hợp đồng API | Tệp 01 "Hệ quả — Route"; tệp 02 §4.1 |
| A THẤP-12 | Chữ nhỏ: "Mở lại 8/10" không phải lời chủ; TH01 "chở 25/29" | Tệp 01 tách "Mở lại 8/10" khỏi mục lời chủ; đoạn mở đầu tệp 00 bỏ "mở lại hôm nay"; JSON TH01 "nhận thêm thì chở 25 trên 29 chỗ". Các chữ nhỏ khác của mục này phiếu tổng hợp không liệt kê ("…") — chưa sửa |
| B (a)–(e) | Năm điểm người soạn nêu | (a) tệp 01 Đ3 (b) ghi rõ, "Điểm cho người kiểm" (1) chốt; (b) (3) chốt 403; (c) Đ4 người đi kèm; (d) giữ "Sửa chữ" (3); (e) không cần sửa |
| B CAO-1 | Cột quyết định đặt ở chuyển nào, ghi lại thế nào; trigger đọc mọi dòng kiểm | Tệp 01 Đ3 (b): bảng cột theo cạnh trạng thái, câu trigger `ESCALATED → CONFIRMED`, nhánh mở suất khoá theo `closed_cmd_id`; "Câu ADR bị thay" thêm `ADR-0052:61`; JSON TH10-10B-6 ghi cột |
| B CAO-2 | "CSDL chặn văn phòng bấm Nhận thay" nói quá | Tệp 01 Đ3 (b) `decided_by_party_id` ("dựa vào máy chủ"); tệp 02 "Cho chủ dự án" điểm 2, §3, §4.1. Hộp 2 giữ "chỉ chấp nhận khi người bấm đúng là tài xế xe nhận" (đúng: máy chủ chặn) |
| B CAO-3 | Thiếu chạy lại cam kết hai chuyến, xoá khoá khi hết vi phạm | Tệp 01 Đ2 mục "Chạy lại cam kết", "Sửa chữ" (1) thứ tự lô; tệp 02 §2 dòng khoá cam kết |
| B CAO-4 | Người đi kèm chưa nhắc ở Đ3, Đ4 | Tệp 01 Đ1 (`SUC_CHUA_DICH` đếm người đi kèm), Đ2, Đ3 (a) (b) (LC-15 cho `CREW`), Đ4; JSON TH07 |
| B CAO-5 | Đ5 thiếu tự huỷ khi xe nhận bị thu hồi; trigger VK1-A | Tệp 01 Đ5: (i) tự huỷ mọi lần nhờ đang chờ / leo thang có chuyến là nguồn hoặc đích; (ii) VK1-A: **chấp nhận**, ghi lý do; (iii) hộp 6 viết lại (thay chữ `00:53` cũ) |
| B CAO-6 | Đ5 gọi là "chặt hơn" mà có chỗ nới | Hộp 6 "một chỗ chặt hơn và một chỗ nới ra"; tiêu đề Đ5 tệp 01 |
| B CAO-7 | Thiếu ADR-0107 ở Đ6 | Tệp 01 Đ6, "ADR liên quan"; hộp 7 câu hỏi và "Mất" PA2; JSON TH02-4 (`phu_thuoc: "Đ6"`, hai nhánh) |
| B CAO-8 | Đường tin viết sai | Tệp 01 Đ3 (d) (nhóm thường `HANH_DONG_TIN_THUONG`, `canHoiTheoSuKien`, nhãn `audit-actions.ts`, `target_id` chuyến đích), "Phương án bị loại"; tệp 02 §2 dòng `audit_log`, §4.1 đoạn "Đường tin" |
| B CAO-9 | Bảng câu thay thiếu `:188`, `:238`, `:89` | Tệp 01 "Câu ADR bị thay" thêm ba dòng |
| B THẤP-1 | "năm tệp" sai | Tệp 01, 02 phần "Mốc đo" liệt kê đủ tệp được trích có đổi |
| B THẤP-2 | ADR-0109, 0110 đã chép | Tệp 01 "ADR liên quan" |
| B THẤP-3 | Cách chốt số lỗi thời | Tệp 01 "Cách chốt số ADR" (README `:118` @ `6820b86b`) |
| B THẤP-4 | Câu "tắt dòng LOI không nới luật lõi" nới chữ | Tệp 01 Đ1 viết lại theo phiếu |
| B THẤP-5 | "app" | Tệp 01 "Phương án bị loại": "trên Nền tảng" |
| B THẤP-6 | `02:11` cùng gốc CAO-2 | Như B CAO-2 |
| B THẤP-7 | Kế hoạch NT-A5-15, T2 | Không sửa kế hoạch (phán quyết); "Ghi chú cho điều phối" liệt kê việc ghi sổ |
| B THẤP-8 | JSON chưa có ca Đ6 | JSON TH02-4 |

### Không theo phiếu

1. **A THẤP-3, phần "gỡ bằng Báo huỷ rồi gửi lại":** không đưa vào hộp 1. Cách đó không đúng mọi ca: khách đã lên xe không ghi được "Khách đã huỷ" (trigger `lc07_forward` chỉ cho `WAITING → CANCELLED_AT_STOP` và `BOARDED → DROPPED` — `migrations/0042_chuyen_xe.sql:455-458`), nên cứu hộ có khách đơn huỷ đang ngồi trên xe không gỡ được bằng cách này; và chưa kiểm suất đã báo huỷ (vẫn `WAITING`, `ADR-0052:247` "suất vẫn chiếm chỗ") có bị loại khỏi lần nhờ gửi lại không. Hộp giữ "văn phòng phải xếp xe theo cách cũ" (kế hoạch §6 `:806`).
2. **A CAO-3, chữ rủi ro N2:** phiếu viết "sửa nhầm quyền ở đó thì bài không đỏ"; hộp 3 viết "không chắc báo đỏ". Lý do: ngoại lệ dự kiến đếm **đúng 2** dòng (kế hoạch `:578`, `:697`), nên đổi hẳn ô ở hai nút đó thì bài vẫn đỏ; chỉ khi thêm một ô rộng hơn bên cạnh thì bài không đỏ. Chữ "không chắc" đúng sự thật hơn. Thêm câu bài bù (chưa viết) theo yêu cầu phán quyết.
3. **Tiêu đề hộp Đ5:** phán quyết ghi `Thu hồi xuất bến` (16 ký tự) và đồng thời đòi tiêu đề ≤ 12 ký tự; dùng `Thu hồi` (7 ký tự), câu hỏi mở đầu bằng "Thu hồi xuất bến là …" để chủ không lẫn.
