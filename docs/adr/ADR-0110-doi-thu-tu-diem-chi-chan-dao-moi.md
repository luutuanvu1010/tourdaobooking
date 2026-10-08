# ADR-0110 — Đổi thứ tự điểm dừng: chỉ từ chối lệnh tạo chỗ đảo mới; nút ↑ ↓ của chuyến kế hoạch đi qua lệnh Sửa chuyến

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời câu 2 (tiêu đề `Thứ tự điểm`) của hộp hỏi lượt duyệt 8c, chọn **"Giữ cách đang làm (Recommended)"**: giữ mã ở cả hai chỗ đang làm khác chữ ADR-0096. Nguyên văn câu hỏi và phương án ở mục "Lời chủ dự án". Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8c" (`:73`; nhánh `claude/van-chuyen-goi-a-c` @ `6b0b826e`). "Cách đang làm" là mã @ `6b0b826e`, mô tả ở mục "Bối cảnh mã". Dòng ★ ở mục "Câu ADR bị thay" (ADR-0096 `:84`) do người soạn bản chép thêm vì thiếu thì ADR-0096 tự mâu thuẫn với ADR này. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-8c/02-hai-cho-ma-lech-adr-0096.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-8c/00-trang-ghep.md`; phiếu kiểm độc lập tổng hợp `docs/superpowers/specs/2026-10-08-luot-duyet-8c/phieu-kiem-tong-hop.md` (ba hồ sơ có ngày, đóng băng).
- **Nguồn việc:** phiếu kiểm độc lập gói A1, mục V2 và T2 (sổ thi công `:87`); hai dòng "LỆCH CÓ CHỦ Ý, chờ chủ quyết" ở `docs/SYSTEM-DESIGN.md:1282-1283` (§16).
- **Thuộc lượt:** lượt duyệt 8c — hai quyết định trình chủ (ADR-0109 và ADR này), dưới trần 3 (`CLAUDE.md` §9).
- **Sửa:** ADR-0096 Đ1.3b (`:36`, thay đổi thật: không có route mới); Đ1.3c (`:37`, sửa chữ theo cách đọc hẹp: "làm vi phạm" = "gây ra vi phạm mới"); `:84` (cửa) theo đó. Từng câu ở mục "Câu ADR bị thay".
- **Mốc đo mã:** mọi `tệp:dòng` đo trên `claude/van-chuyen-goi-a-c` @ `6b0b826e`. Văn bản trình duyệt đo @ `b8927c27`; `git diff --stat b8927c27 6b0b826e -- src web migrations scripts golden tests` rỗng, nên số dòng mã không dời.
- **Xây trên lỗ đang hở:** không.
- **Cửa:** hai chiều; không đổi mã, không migration, không đổi ô quyền.

## Lời chủ dự án

- 2026-10-03, lời chủ mà ADR-0096 dựa vào (chép nguyên dòng `ADR-0096:11`; chỗ lược "…" có sẵn trong ADR-0096):

  > "… 3a: … Rõ ràng là sai thì phải chặn, đồng thời cho cách khắc phục. 3b- ok vậy thì không phải là cho phá lệ mà ta đặt thêm nguyên tắc logic lọc. Không chấp nhận phá lệ, tất cả đều được luật hoá"
- Lượt duyệt 8c, câu 2 (2026-10-08), tiêu đề hộp `Thứ tự điểm`. Nguyên văn câu hỏi (phiếu kiểm tổng hợp `:184`):

  > Quyết định ngày 3/10 về thứ tự điểm đón, điểm trả có hai chỗ Nền tảng đang làm khác chữ. Chỗ thứ nhất: chữ ghi lần đổi thứ tự nào làm sai luật cũng bị từ chối, còn Nền tảng chỉ từ chối lần đổi tạo ra chỗ sai mới, nên chuyến đã sai từ trước vẫn sửa dần được bằng nút lên/xuống. Chỗ thứ hai: chữ ghi nút lên/xuống của chuyến chưa chạy là một lệnh riêng, còn Nền tảng dùng lại lệnh "Sửa chuyến" có sẵn. Hai cách đầu đều phải ghi một quyết định mới sửa chữ ngày 3/10; bạn chọn cách nào?

  - Chủ chọn: **"Giữ cách đang làm (Recommended)"** — "Được: không chuyến nào kẹt vì thứ tự, không phải làm thêm gì, và chuyến chưa chạy vẫn không xuất bến được khi còn chỗ sai; mất: chuyến đang chạy mà sai từ trước chỉ bị phát hiện qua lượt kiểm tra định kỳ chứ không bị chặn, và hai điều mới đọc mã chưa chạy thử là tài xế đã được xếp sẽ nhận một tin "chuyến vừa sửa" sau mỗi lần bấm, còn một lần bấm có thể bị từ chối vì lỗi khác của chuyến như trùng giờ hay giấy tờ tài xế."
  - Không chọn: "Lệnh riêng cho nút" — "Được: vẫn sửa dần được, nhật ký ghi đúng "đổi thứ tự" và nút không vướng lỗi khác của chuyến; mất: phải làm thêm một lệnh mới cùng các bài kiểm, và chỗ thứ nhất vẫn cần quyết định mới sửa chữ."
  - Không chọn: "Sửa theo đúng chữ" — "Được: Nền tảng khớp từng chữ quyết định 3/10 và không cần quyết định mới; mất: chuyến nào mà một lần bấm không sửa hết chỗ sai sẽ kẹt, kể cả chuyến chỉ có một chỗ sai khi điểm đón và điểm trả của khách đó không đứng cạnh nhau, nên phải làm thêm nút "Sắp lại tự động" hoặc kéo-thả trên màn hình và một lệnh riêng cho nút lên/xuống."
- Câu duyệt gợi ý của tệp 02 (hồ sơ, không phải câu chủ trả lời): *"Duyệt giữ mã: lệnh đổi thứ tự chỉ bị từ chối khi tạo chỗ sai mới; nút ↑ ↓ của chuyến chưa chạy đi qua lệnh Sửa chuyến. Ghi thành ADR-0110."*

## Bối cảnh

- ADR-0096 Đ1 (LC-19) đòi điểm đón đứng trước điểm trả của mọi suất chờ lên, chặn xuất bến khi vi phạm, và cho cách khắc phục bằng nút đổi thứ tự. Người thi công gói A1 làm hai chỗ khác chữ; người kiểm độc lập A1 ghi lại (V2, T2) và điều phối đưa vào `docs/SYSTEM-DESIGN.md` §16 chờ chủ.
- **Đọc đúng chữ Đ1.3c thì chuyến kẹt.** Nút ↑ ↓ chỉ đổi chỗ hai điểm chờ liền kề (`thanDoiThuTu`, `src/shared/tien-do-man.ts:100-106`). Chuyến mà một bước không gỡ hết đảo — hai suất đảo trở lên, hoặc một suất đảo có điểm khác chen giữa (ví dụ A(1), X(2), B(3), suất đón ở B trả ở A) — sau mỗi bước vẫn còn suất đảo, nên mọi bước sửa đều bị 409 (phiếu kiểm tổng hợp mục 1.2). Với cách đang làm, ví dụ trên gỡ được trong hai bước: đổi X với B (A, B, X — đảo cũ, không mới), rồi đổi A với B.

## Bối cảnh mã (đo @ `6b0b826e`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Luật "đảo mới" | `daoMoiSauDoi` chỉ trả suất **bị đảo mới** (sau lệnh vi phạm, trước lệnh không) | `src/shared/thu-tu-diem.ts:67-81` |
| Cổng 409 | `chanDaoMoi` trả 409 `thu_tu_dao` khi tập đó khác rỗng | `src/modules/van-chuyen/dieu-phoi-route.ts:113-121` |
| Dùng ở | đổi thứ tự khi chạy (`src/modules/van-chuyen/dieu-phoi-tien-do.ts:240`; route `POST …/chuyen/:id/thu-tu` `src/modules/van-chuyen/index.ts:1897-1898`, `POST …/cuoc-cua-toi/:id/thu-tu` `:1672-1676`) và sửa chuyến kế hoạch (`src/modules/van-chuyen/dieu-phoi-lenh.ts:105-108`) | — |
| Giao diện | khoá nút ↑ ↓ theo cùng luật (`doiThuTuDuoc`) | `src/shared/tien-do-man.ts:108-125`; `web/chuyen.ts:351`, `:382` |
| Nút ↑ ↓ chuyến `PLANNED` | gửi `PUT /api/van-chuyen/chuyen/:id` thân `diem` | `web/chuyen.ts:375-405` (gửi ở `:390`) |
| Route sửa chuyến | `can(trip.dispatch)` `:1198`; lớp vé `traLenhLap` loại `UPDATED` `:1207`; rồi `lenhSuaChuyen` → `chanDaoMoi` (`dieu-phoi-lenh.ts:107`) | `src/modules/van-chuyen/index.ts:1197-1215` |
| Ghi | sự kiện `UPDATED` và nhật ký `trip_edited`, không phải `STOPS_REORDERED` (`:710`) | `src/modules/van-chuyen/dieu-phoi.ts:198-205` |
| Xét lại luật khác | `lenhSuaChuyen` luôn gọi `kiemTaoSuaChuyen` (`dieu-phoi-lenh.ts:135-144`): trùng giờ xe và tài xế, khoảng nghỉ, giấy tờ tài xế, chéo xe – tài xế, số chỗ, kể cả khi lệnh chỉ đổi thứ tự (`src/shared/dieu-phoi-kiem.ts:110-144`); mốc 6 giờ chỉ xét khi đổi xe hoặc tài xế (`:148-153`) | — |
| Tin tới tài xế | `trip_edited` nằm trong `HANH_DONG_TIN_CHUYEN` | `src/shared/tin-chuyen.ts:8-9` |
| Lưới xuất bến (LC-19) | trigger `vc_trip_departure_stop_order` (`migrations/0084_cua_so_xuat_ben_va_thu_tu_diem.sql:24-30`) + lý do giữ `TRA_TRUOC_DON` trong `kiemXuatBen` | sổ hàng rào `docs/SO-HANG-RAO.md:440` |
| Lưới khi đang chạy | `chanToiDiemTra` trả 409 `con_khach_chua_don` khi "Đã tới" điểm trả mà khách xuống ở đó chưa đón (Đ1.4) | `src/modules/van-chuyen/dieu-phoi-route.ts:140-151` |
| Kiểm định kỳ | `R-VC-THU-TU`: chuyến đang chạy còn suất đảo — phát hiện, không chặn (Đ1.5, Đ1.6) | `scripts/audit-checks.mjs:880-884`; `docs/SO-HANG-RAO.md:448` |
| Thêm khách khi xe chạy | `lenhThemDiemDangChay` gọi `sapLaiDiem` (tự sắp đón trước trả) | `src/modules/van-chuyen/dieu-phoi-lenh.ts:286`, `:302` |
| Bài hiện có | `thu-tu-diem.test.ts:61` ("chỉ trả suất BỊ ĐẢO MỚI…"); `thu-tu-cua-so-route.test.ts:73` (PUT điểm của chuyến kế hoạch gỡ đảo cũ, rồi xuất bến 200), `:96` (đổi thứ tự khi đang chạy tạo đảo mới → 409 `thu_tu_dao`) | `src/shared/`, `src/modules/van-chuyen/` |

## Quyết định

1. **Đ1.3c (sửa chữ, đọc hẹp):** lệnh đổi thứ tự điểm làm một suất chờ lên bị đảo **mới** thì bị từ chối 409 (`thu_tu_dao`), kèm câu chỉ rõ suất bị đảo, ở cả chuyến kế hoạch lẫn chuyến đang chạy (tài xế và văn phòng bấm thay). Suất đã đảo **từ trước** lệnh không làm lệnh bị từ chối, để văn phòng sửa dần bằng ↑ ↓. Không có đường "vẫn đổi" (giữ nguyên chữ Đ1.3c). Chữ "làm vi phạm luật" của Đ1.3c đọc là "gây ra vi phạm mới"; đọc theo nghĩa rộng của chữ ngày 3/10 thì đây là chỗ thu hẹp điều bị cấm (lệnh để lại đảo cũ nay được qua); hộp hỏi 8c đã nói đây là chỗ mã khác chữ và chủ chọn giữ mã.
2. **Đ1.3b (thay đổi thật):** nút ↑ ↓ của chuyến `PLANNED` đi qua **lệnh sửa chuyến sẵn có** `PUT /api/van-chuyen/chuyen/:id` (thân `diem`), ô `trip.dispatch`, lớp vé ADR-0094 (loại `UPDATED`); ghi sự kiện `UPDATED` và nhật ký `trip_edited`. Không có route riêng cho đổi thứ tự chuyến kế hoạch.
3. **Lưới giữ nguyên:** chuyến kế hoạch còn suất đảo không xuất bến được (LC-19 Đ1.2: trigger + `TRA_TRUOC_DON`); khi đang chạy, Đ1.4 chặn "Đã tới" điểm trả sai và `R-VC-THU-TU` phát hiện chuyến còn đảo.
4. **Không đổi:** mã, migration, ô quyền, câu báo lỗi, giao diện.

## Hệ quả và rủi ro

Ba điều đầu đã nói trong mô tả phương án chủ chọn.

- **Chuyến đang chạy mà sai từ trước chỉ bị phát hiện qua lượt kiểm tra định kỳ** (`R-VC-THU-TU`), không bị chặn. Rủi ro nhỏ: chuyến kế hoạch chỉ xuất bến được khi hết chỗ sai, nên chuyến đang chạy còn đảo chủ yếu là chuyến xuất bến trước khi `0084` áp; đường thêm khách khi xe chạy tự sắp lại điểm (`dieu-phoi-lenh.ts:302`; đọc mã, chưa chạy đầu-cuối).
- **Tài xế đã được xếp nhận tin "chuyến vừa sửa" sau mỗi lần bấm ↑ ↓** trên chuyến kế hoạch, vì lệnh ghi `trip_edited` và hành động này nằm trong `HANH_DONG_TIN_CHUYEN` (`tin-chuyen.ts:8-9`). Đọc mã, chưa chạy thử.
- **Một lần bấm có thể bị từ chối vì lỗi khác của chuyến** (trùng giờ, khoảng nghỉ, giấy tờ tài xế…), vì lệnh sửa chuyến luôn xét lại các luật đó (`kiemTaoSuaChuyen`). Khi đó phải gỡ lỗi kia trước. Đọc mã, chưa chạy thử.
- Nhật ký chuyến kế hoạch ghi "sửa chuyến" chứ không ghi "đổi thứ tự".
- Mục "Bấm nhầm thì sao" của ADR-0096 (`:62-65`, câu "mỗi lần đổi là một sự kiện `STOPS_REORDERED`") tự ghi "chưa thành luật" (`:64`), nên không tính là lệch; với chuyến kế hoạch mỗi lần bấm là sự kiện `UPDATED`.
- **Tài liệu mô tả:** sau khi chép, điều phối đóng hai dòng §16 (`docs/SYSTEM-DESIGN.md:1282-1283`): thay bằng một dòng "đã đóng" trỏ ADR-0110, hoặc xoá kèm dấu trỏ ở `:609` — câu đề xuất ở `README-dong-moi-8c.md` mục 3. Bản chép này không sửa `SYSTEM-DESIGN.md`. Mô tả hành vi ở `docs/SYSTEM-DESIGN.md:609` đã đúng mã.

## Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

Dòng trỏ ở dòng Trạng thái của ADR-0096: `dong-tro-adr-cu-8c.md` cùng thư mục. Dòng ★ thêm so với văn bản trình duyệt (tệp 02 §4), vì thiếu thì ADR-0096 tự mâu thuẫn với ADR này.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0096 Đ1.3b (`docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md:36`) | "… route mới trên chuyến kế hoạch (dưới), đi qua lớp vé chống ghi trùng (ADR-0094)." | "… đi qua lệnh sửa chuyến sẵn có `PUT /api/van-chuyen/chuyen/:id` (thân `diem`), lớp vé chống ghi trùng (ADR-0094, loại `UPDATED`); ghi sự kiện `UPDATED`, nhật ký `trip_edited`; không có route riêng (ADR-0110)." |
| ADR-0096 Đ1.3c (`:37`) | "**(c) Lệnh đổi thứ tự nào làm vi phạm luật bị từ chối 409** kèm câu chỉ rõ suất bị đảo, ở cả chuyến kế hoạch lẫn chuyến đang chạy (tài xế và văn phòng bấm thay, `POST …/thu-tu`). Đổi thứ tự là sửa sai của chính nó nên không có đường "vẫn đổi"." | "**(c) Lệnh đổi thứ tự làm một suất chờ lên bị đảo mới thì bị từ chối 409** kèm câu chỉ rõ suất bị đảo, ở cả chuyến kế hoạch lẫn chuyến đang chạy (tài xế và văn phòng bấm thay, `POST …/thu-tu`); suất đã đảo từ trước lệnh không làm lệnh bị từ chối, để sửa dần bằng ↑ ↓. Cổng xuất bến (Đ1.2) vẫn chặn mọi suất còn đảo; khi đang chạy, Đ1.4 và `R-VC-THU-TU` là lưới. Đổi thứ tự là sửa sai của chính nó nên không có đường "vẫn đổi" (ADR-0110)." |
| ★ ADR-0096 `:84` (Cửa một chiều / hai chiều) | "Thêm route đổi thứ tự cho chuyến kế hoạch: hai chiều." | "Đổi thứ tự cho chuyến kế hoạch đi qua lệnh sửa chuyến sẵn có, không thêm route (ADR-0110): hai chiều." |

**Không đổi:** Đ1.1, Đ1.2, Đ1.3a (máy tự sắp lại khi xếp), Đ1.4, Đ1.5, Đ1.6 (`:30-39`; Đ1.6 đã ghi "lớp máy chủ (Đ1.3c) + bất biến `R-VC-THU-TU`" — đúng với Đ1.3c mới); dòng README của ADR-0096 ("nút đổi thứ tự cho chuyến kế hoạch") vẫn đúng.

## Bài kiểm / hàng rào

- Bài hiện có chỉ rào một phần: chỉ luật thuần `src/shared/thu-tu-diem.test.ts:61`. Hai bài route `src/modules/van-chuyen/thu-tu-cua-so-route.test.ts:73`, `:96` không phân biệt hai cách đọc (gạch cuối).
- `docs/SO-HANG-RAO.md` **chưa có dòng** cho luật "chỉ chặn đảo mới" (Đ1.3c) và cho "↑ ↓ chuyến kế hoạch đi qua `PUT /chuyen/:id`" (Đ1.3b) — tìm "Đ1.3", `thu-tu-diem.test`, `thu-tu-cua-so-route` không gặp. Tới lúc có dòng, rào này coi là lời khuyên (`CLAUDE.md` §3, sổ hàng rào).
- Chỗ hở của bài: đổi `daoMoiSauDoi` thành "còn bất kỳ suất đảo nào" thì bài thuần `thu-tu-diem.test.ts:61` phải đỏ; nhưng hai bài route hiện có không phân biệt hai cách đọc — `:73` gỡ hết đảo trong **một** bước (PUT đưa điểm đón lên số 1), `:96` tạo đảo mới. Cách phá thứ hai: cổng `chanDaoMoi` bỏ gọi `daoMoiSauDoi` — người kiểm bản chép thử đột biến này (M2) và thấy 341 bài van-chuyen vẫn xanh, tức không bài nào bắt. Người làm sau thêm một bài route: chuyến kế hoạch có suất đảo mà một bước không gỡ hết (ví dụ A(1), X(2), B(3), suất đón B trả A), bấm một bước ↑ ↓ không tạo đảo mới → 200; rồi quan sát chặn thật (đổi luật như trên → bài mới đỏ → hoàn nguyên → xanh) và ghi dòng sổ hàng rào.

## Phương án bị loại

- **"Lệnh riêng cho nút":** vẫn sửa dần được, nhật ký ghi "đổi thứ tự", nút không vướng lỗi khác của chuyến; nhưng phải làm thêm một lệnh mới cùng các bài kiểm, và chỗ thứ nhất vẫn cần quyết định mới. Chủ chọn giữ cách đang làm.
- **"Sửa theo đúng chữ":** chuyến mà một lần bấm không sửa hết chỗ sai sẽ kẹt (kể cả chỉ một chỗ sai khi điểm đón và trả không đứng cạnh nhau), phải làm thêm nút "Sắp lại tự động" hoặc kéo-thả và một lệnh riêng. Chủ chọn giữ cách đang làm.

## Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)

Không mục HIGH nào thuộc vùng chuyến xe hay thứ tự điểm (mục mở: TNV-G1, TNV-G3, TNV-G4 — sổ tiền; HC-5.19 — khôi phục dữ liệu; HC-5.11 — tác vụ tự động; HC-4.2 — bút toán điều chỉnh). Không xây trên lỗ đang hở.

## Chỗ văn bản trình duyệt lệch mã HEAD (đo @ `6b0b826e`)

- Mã không đổi giữa `b8927c27` và `6b0b826e`, nên mọi `tệp:dòng` mã của tệp 02 còn đúng.
- Tệp 02 bản đầu viết "chuyến có từ hai chỗ sai mới kẹt"; phiếu kiểm tổng hợp mục 1.2 sửa: một chỗ sai có điểm khác chen giữa cũng kẹt (đã sửa trong tệp 02 và trong mục "Bối cảnh" ở đây).
- Tệp 02 §2 từng ghi "chưa kiểm" đường thêm khách khi xe chạy; nay đọc mã thấy gọi `sapLaiDiem` (`dieu-phoi-lenh.ts:302`), chưa chạy đầu-cuối.

## Chưa kiểm

- Ca bấm ↑ ↓ trên chuyến kế hoạch đang vướng lỗi khác (trùng giờ, giấy tờ tài xế…): mới đọc mã.
- Tin "chuyến vừa sửa" gửi tài xế sau mỗi lần ↑ ↓: mới đọc mã.
- Đường thêm khách khi xe chạy: chỉ thấy chỗ gọi `sapLaiDiem`, chưa chạy đầu-cuối.
- Production có chuyến đang chạy nào còn đảo không: chủ chạy `node scripts/audit-invariants.mjs --db remote` (kiểm `R-VC-THU-TU`) sau khi áp `0084`.
