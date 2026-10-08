# Hai chỗ mã lệch chữ ADR-0096 (thứ tự điểm dừng) — giữ mã hay sửa mã

> **Hồ sơ có ngày 2026-10-08, vai soạn.** **Lượt 8c, tệp 02.** Không chạm tiền. Nguồn: hai dòng ADR-0096 ở `docs/SYSTEM-DESIGN.md:1282-1283` (§16, lệch có chủ ý chờ chủ) và phiếu kiểm A1 mục V2, T2 (sổ `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:70`). Mọi `tệp:dòng` đo trên `luot-duyet-8c` @ `b8927c27`. Nếu chủ duyệt: ghi bằng một ADR ngắn **số tạm 0110** (chốt khi gộp; `git log --all -S "ADR-0110"` không gặp gì) cùng một dòng trỏ ở dòng Trạng thái của ADR-0096.

## Cho chủ dự án

Quyết định ngày 3/10 về thứ tự điểm dừng (ADR-0096) có hai câu mà mã đang làm hơi khác chữ. Người kiểm độc lập đã ghi lại, và tôi khuyến nghị giữ mã ở cả hai chỗ.

**Chỗ thứ nhất: từ chối lệnh đổi thứ tự.** Chữ ADR ghi "lệnh đổi thứ tự nào làm vi phạm luật bị từ chối". Đọc đúng chữ, một chuyến đã có sẵn chỗ sai thứ tự (điểm trả đứng trước điểm đón) sẽ bị từ chối ở mọi lần bấm ↑ ↓, kể cả lần bấm đang sửa dần. Lý do là nút chỉ đổi chỗ hai điểm cạnh nhau, nên lần bấm nào không sửa hết chỗ sai sẽ bị chặn: chuyến có hai chỗ sai, hoặc chỉ một chỗ sai mà điểm đón và điểm trả của khách đó không đứng cạnh nhau, đều kẹt. Kết quả là chuyến kẹt. Mã đang làm khác: chỉ từ chối khi lần bấm tạo ra chỗ sai mới, còn chỗ sai có sẵn thì được sửa dần từng bước.

**Chỗ thứ hai: nút ↑ ↓ cho chuyến chưa chạy.** Chữ ADR ghi đây là "một lệnh mới". Mã dùng lại lệnh "Sửa chuyến" có sẵn, với cùng quyền (Bán hàng, Quản trị, Toàn quyền) và cùng lớp chống bấm trùng. Người kiểm đã thử trong 6 giờ trước giờ chạy: chuyến bị chặn xuất bến vì sai thứ tự, văn phòng bấm ↑ ↓ được, rồi xuất bến được.

**Ai bị ảnh hưởng.** Văn phòng khi sửa thứ tự điểm của chuyến chưa chạy, và tài xế khi đổi thứ tự lúc xe đang chạy. Có hai lưới vẫn giữ nguyên dù chọn cách nào. Thứ nhất, chuyến chưa chạy không xuất bến được tới khi hết chỗ sai. Thứ hai, khi xe đang chạy, tài xế không bấm "Đã tới" điểm trả được nếu khách xuống ở đó chưa được đón.

**Giữ mã thì được và mất gì.** Được: không chuyến nào kẹt, và không phải làm thêm nút nào. Mất: một chuyến đang chạy mà có chỗ sai từ trước có thể chạy tiếp với chỗ sai đó; máy chỉ phát hiện qua lượt kiểm định kỳ, không chặn. Rủi ro này nhỏ, vì chuyến chỉ xuất bến được khi hết chỗ sai, nên chuyến đang chạy có chỗ sai chủ yếu là chuyến đã chạy từ trước khi luật này áp. Riêng chỗ thứ hai còn một hệ quả nhỏ: vì đi qua lệnh "Sửa chuyến", một lần bấm ↑ ↓ cũng bị máy xét lại các luật khác của chuyến (trùng giờ, khoảng nghỉ, giấy tờ tài xế). Nếu chuyến đang vướng một lỗi khác thì phải gỡ lỗi đó trước. Tôi mới đọc mã, chưa chạy thử ca này.

**Sửa mã thì được và mất gì.** Được: mã khớp đúng chữ. Mất: chuyến mà một lần bấm không sửa hết chỗ sai sẽ kẹt, kể cả chỉ một chỗ sai khi hai điểm không đứng cạnh nhau; muốn gỡ phải làm thêm phần màn hình như nút 'Sắp lại tự động' hoặc kéo-thả (máy chủ đã nhận được cả danh sách thứ tự và đã có hàm sắp lại). Với chỗ thứ hai, làm lệnh riêng thì nhật ký chuyến ghi "đổi thứ tự" thay vì "sửa chuyến" và không vướng lỗi khác của chuyến, nhưng phải thêm một lệnh cùng mọi bài kiểm đi kèm.

**Vì sao cần một quyết định mới chứ không chỉ một dòng ghi chú.** ADR đã duyệt chỉ được sửa dòng trạng thái; muốn đổi nội dung phải có quyết định mới trỏ về nó. Vì vậy nếu bạn duyệt, tôi ghi thành một quyết định ngắn (số tạm 0110) và bỏ hai dòng "chờ chủ" khỏi tài liệu hệ thống.

**Câu duyệt gợi ý:** "Duyệt giữ mã: lệnh đổi thứ tự chỉ bị từ chối khi tạo chỗ sai mới; nút ↑ ↓ của chuyến chưa chạy đi qua lệnh Sửa chuyến. Ghi thành ADR-0110."

---

## Phần kỹ thuật

### 1. Chữ ADR và mã

| | Chữ ADR-0096 | Mã @ `b8927c27` |
|---|---|---|
| Đ1.3c | "Lệnh đổi thứ tự nào làm vi phạm luật bị từ chối 409 … ở cả chuyến kế hoạch lẫn chuyến đang chạy … Đổi thứ tự là sửa sai của chính nó nên không có đường 'vẫn đổi'." (`docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md:37`) | `daoMoiSauDoi` chỉ trả suất **đảo mới** (sau lệnh vi phạm, trước lệnh không) (`src/shared/thu-tu-diem.ts:67-81`); `chanDaoMoi` trả 409 `thu_tu_dao` khi tập đó khác rỗng (`src/modules/van-chuyen/dieu-phoi-route.ts:113-121`). Dùng ở đổi thứ tự khi chạy (`dieu-phoi-tien-do.ts:240`) và sửa chuyến kế hoạch (`dieu-phoi-lenh.ts:105-108`). Giao diện khoá nút theo cùng luật (`src/shared/tien-do-man.ts:108-125`, `web/chuyen.ts:351`, `:382`) |
| Đ1.3b | "Văn phòng có ô `trip.dispatch` đổi thứ tự … route mới trên chuyến kế hoạch …, đi qua lớp vé chống ghi trùng (ADR-0094)." (`:36`) | Nút ↑ ↓ của chuyến `PLANNED` gửi `PUT /api/van-chuyen/chuyen/:id` thân `diem` (`web/chuyen.ts:375-405`, gửi ở `:390`). Route hỏi `can(trip.dispatch)` (`src/modules/van-chuyen/index.ts:1198`), qua lớp vé `traLenhLap` loại `UPDATED` (`:1207`), rồi `lenhSuaChuyen` → `chanDaoMoi` (`dieu-phoi-lenh.ts:107`). Lô ghi sự kiện `UPDATED` và nhật ký `trip_edited` (`src/modules/van-chuyen/dieu-phoi.ts:198-205`), không phải `STOPS_REORDERED` (`:710`) |

### 2. Lưới còn lại khi giữ mã
- LC-19 lúc xuất bến: trigger `vc_trip_departure_stop_order` (`migrations/0084_cua_so_xuat_ben_va_thu_tu_diem.sql:24-30`) và lý do giữ `TRA_TRUOC_DON` trong `kiemXuatBen`. Chuyến kế hoạch còn chỗ sai thì không xuất bến được.
- Đ1.4 khi đang chạy: `chanToiDiemTra` trả 409 `con_khach_chua_don` khi "Đã tới" điểm trả mà khách xuống ở đó chưa đón (`dieu-phoi-route.ts:140-151`).
- Kiểm định kỳ `R-VC-THU-TU` cho chuyến đang chạy (`scripts/audit-checks.mjs:880-884`) — phát hiện, không chặn; đúng ADR-0096 Đ1.6 (`:40`).
- Chuyến đang chạy có chỗ sai chỉ sinh ra từ: chuyến xuất bến trước khi `0084` áp; hoặc đường thêm khách khi xe chạy (ADR-0052 D5.1). Đọc mã: `lenhThemDiemDangChay` có gọi `sapLaiDiem` (`src/modules/van-chuyen/dieu-phoi-lenh.ts:302`), nên đường này tự sắp lại điểm và rủi ro ở mục "Giữ mã" là nhỏ; chưa chạy đầu-cuối. Lệnh đổi thứ tự không tạo được chỗ sai mới.

### 3. Hệ quả phụ của Đ1.3b (đọc mã, chưa chạy)
- `lenhSuaChuyen` luôn gọi `kiemTaoSuaChuyen` (`dieu-phoi-lenh.ts:135-144`). Hàm này xét trùng giờ xe và tài xế, khoảng nghỉ, giấy tờ tài xế, chéo xe – tài xế và số chỗ ngay cả khi lệnh chỉ đổi thứ tự (`src/shared/dieu-phoi-kiem.ts:110-144`). Mốc 6 giờ chỉ xét khi đổi xe hoặc tài xế (`:148-153`).
- Hệ quả: lần bấm ↑ ↓ trên chuyến đang vướng một lỗi khác có thể trả 409 vì lỗi đó. Chưa thử.
- Chỗ này khác chữ "Bấm nhầm thì sao" của ADR-0096 (`:65`, "mỗi lần đổi là một sự kiện `STOPS_REORDERED`"). Tuy vậy mục đó tự ghi "chưa thành luật" (`:64`), nên không tính là lệch.

### 4. Nếu chủ duyệt giữ mã
- **ADR-0110 (số tạm)** gồm hai câu thay:
  - Đ1.3c (`:37`) → "Lệnh đổi thứ tự làm một suất chờ lên bị đảo **mới** thì bị từ chối 409; suất đã đảo từ trước lệnh không làm lệnh bị từ chối, để sửa dần bằng ↑ ↓. Cổng xuất bến (Đ1.2) vẫn chặn mọi suất còn đảo; khi đang chạy, Đ1.4 và `R-VC-THU-TU` là lưới."
  - Đ1.3b (`:36`) → "… đi qua lệnh sửa chuyến sẵn có `PUT /api/van-chuyen/chuyen/:id` (thân `diem`), lớp vé ADR-0094, ô `trip.dispatch`; nhật ký `trip_edited`, sự kiện `UPDATED`."
- Với Đ1.3c, ADR-0110 thực chất là chú giải (chữ "làm vi phạm" đọc được thành "gây ra vi phạm", tức đúng điều mã đang làm); Đ1.3b mới là thay đổi thật.
- Dòng trỏ ở Trạng thái ADR-0096: "Sửa Đ1.3b, Đ1.3c bởi ADR-0110."
- Xoá hai dòng `docs/SYSTEM-DESIGN.md:1282-1283` (§16).
- Không đổi mã, không migration, không đổi ô quyền. Cửa: hai chiều.

### 5. Nếu chủ chọn sửa mã
- Đ1.3c theo chữ: đổi `chanDaoMoi` sang "sau lệnh còn bất kỳ suất đảo nào → 409". Phải kèm một đường gỡ cho chuyến mà một bước ↑ ↓ không gỡ hết đảo (≥ 2 suất đảo, hoặc 1 suất đảo có điểm chen giữa — ví dụ A(1), X(2), B(3), suất đón B trả A), vì ↑ ↓ chỉ đổi chỗ hai điểm cạnh nhau. Ví dụ: lệnh "sắp lại tự động" dùng `sapDonTruocTra` (`src/shared/thu-tu-diem.ts`), hoặc lệnh nhận cả danh sách thứ tự. Chủ yếu là giao diện: `lenhSuaChuyen` (`dieu-phoi-lenh.ts:96-100`) và `lenhDoiThuTu` (`dieu-phoi-tien-do.ts:225-232`) đã nhận trọn danh sách; `sapDonTruocTra` đã có.
- Đ1.3b theo chữ: thêm route `POST …/chuyen/:id/thu-tu-ke-hoach` (tên tạm), ô `trip.dispatch`, lớp vé loại `STOPS_REORDERED`, chỉ xét luật thứ tự; thêm dòng vào bài quét 29 route của C38 và bài đếm route.

### 6. Chưa kiểm
- Ca ↑ ↓ trên chuyến đang vướng lỗi khác (mục 3).
- Đường thêm khách khi xe chạy: đọc mã thấy có gọi `sapLaiDiem` (`dieu-phoi-lenh.ts:302`, mục 2); chưa chạy đầu-cuối.
- Có chuyến đang chạy nào trên production còn chỗ đảo không (cần chủ chạy `R-VC-THU-TU` bằng `node scripts/audit-invariants.mjs --db remote` sau khi áp `0084`).
