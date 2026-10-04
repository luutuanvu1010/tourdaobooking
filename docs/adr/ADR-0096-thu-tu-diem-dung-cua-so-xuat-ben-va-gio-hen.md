# ADR-0096: Luật thứ tự điểm dừng, cửa sổ xuất bến và giờ hẹn không sớm hơn giờ khởi hành

- **Trạng thái:** **accepted** — chủ dự án duyệt trong chat 2026-10-03: *"Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ)."* và *"HT-06: chặn, gộp vào ADR-0096."* AI soạn (đợt V0 của lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2.3) và ghi lại; Đ3 (HT-06) do AI viết thành chữ **sau** lời chủ, theo đúng khuôn Đ1–Đ2 — chủ chưa đọc chữ Đ3, sửa được bằng một dòng "Sửa: …". Trang ghép: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-A-TRANG-GHEP.md` (Đ1, Đ2) và `LUOT-C-TRANG-GHEP.md` (Đ3). Người kiểm độc lập chỉ-đọc 3/10: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo phiếu (bản sửa chưa được kiểm lại). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. Bản nháp: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/A3-ADR-0096-thu-tu-diem-dung-va-cua-so-xuat-ben.md`.
- **Số:** 0096 = số lớn nhất trong `docs/adr/` trên mọi nhánh remote (0095) + 1, đo lại 2026-10-03.
- **Ngày:** 2026-10-03
- **Phạm vi:** module `van-chuyen` — bảng `vc_dispatch_policy` (thêm cột), `vc_trip` (hai trigger mới trên cạnh `PLANNED → RUNNING`), luật thuần `src/shared/dieu-phoi-kiem.ts` (`kiemXuatBen`), `src/shared/ly-do-giu.ts` (`MA_GIU`), lệnh xếp / đổi thứ tự điểm, màn chính sách điều phối của Toàn quyền, màn tài xế và màn chuyến của văn phòng.
- **Gỡ lỗi:** HT-01 (điểm trả đứng trước điểm đón mà chuyến vẫn "Đạt hết"), phần "chặn" của HT-03 (xuất bến nhầm chuyến ngày khác), HT-02, HT-16 (bấm "Đã tới"/"Đã trả" ở điểm trả khi chưa đón ai), HT-06 phần giữ chuyến (giờ hẹn đón sớm hơn giờ khởi hành mà chuyến vẫn "Đạt hết") — `docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md` mục 2–4, 14, 16, 48.

## Lời chủ dự án (nguyên văn, chat 2026-10-03)

> "… 3a: … Rõ ràng là sai thì phải chặn, đồng thời cho cách khắc phục. 3b- ok vậy thì không phải là cho phá lệ mà ta đặt thêm nguyên tắc logic lọc. Không chấp nhận phá lệ, tất cả đều được luật hoá"

> "3a - theo khuyến nghị, 3b-ok cho 12 giờ, con số này có thể thay đổi trong bảng điều khiển của Super Admin (toàn quyền), …"

Chat 2026-10-03 (duyệt): *"Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ)."*; *"HT-06: chặn, gộp vào ADR-0096."*

Câu đã hỏi (NGUYEN-NHAN-GOC.md §6 câu 3): *"'trả trước đón' có thành lý do **giữ** xuất bến không; chuyến chưa tới ngày có **chặn** xuất bến không hay chỉ Quản trị phá lệ."*

## Bối cảnh

- **HT-01 — thứ tự điểm sai do gộp điểm.** `diemChoKhoa` (`src/modules/van-chuyen/dieu-phoi-route.ts:108-117`) dùng lại điểm `PENDING` cùng loại + cùng khoá nơi; điểm mới luôn `seq = max + 1`. Xếp đoàn 1 → ĐÓN A(1), TRẢ Bến tàu(2); xếp đoàn 2 → ĐÓN B(3), TRẢ Bến tàu **dùng lại (2)** ⇒ khách đoàn 2 "xuống" trước khi "lên". `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts:324-427`) không duyệt `seq`, nên chip vẫn "Đạt hết" (`web/cuoc-chuyen.ts:268`). Khi chuyến còn `PLANNED`, **không có** nút đổi thứ tự: lệnh `lenhDoiThuTu` (`src/modules/van-chuyen/dieu-phoi-tien-do.ts:210-232`) chỉ chạy khi chuyến `RUNNING` (`dangChay`, `:40-44`).
- **HT-03 — không có mốc "xuất bến sớm nhất".** `lenhXuatBen` (`dieu-phoi-tien-do.ts:59-114`) chỉ đòi `PLANNED` + `kiemXuatBen`; `kiemGioXayRa` (`src/shared/gio-xay-ra.ts:68-113`) không có vế "sớm hơn giờ khởi hành bao lâu". ADR-0053 `:59` đã ghi nhận: *"mã hôm nay **không** có mốc 'xuất bến sớm nhất'"*. Tài xế bấm Xuất bến chuyến của 3 ngày sau được ngay; xe và tài xế bị khoá cho mọi chuyến khác (`0042:61`, `0042:383-389`).
- **HT-02 — "Đã tới" điểm trả trước điểm đón.** Lệnh "Đã tới" không xét còn khách chờ lên có điểm xuống ở đó; nhật ký ghi "tới điểm trả" trước "tới điểm đón".
- Luật lõi chuyến (ADR-0049 `:119`) là *"đổi bằng ADR; **không ai phá lệ**, kể cả Toàn quyền"*; hai luật dưới đây theo đúng khuôn đó (lời chủ: "Không chấp nhận phá lệ").

## Quyết định

### Đ1 — LC-19: Điểm đón của một suất đứng trước điểm trả của suất đó (3a)

1. **Luật:** với mọi suất **còn mở** (`valid_to_at IS NULL`) ở trạng thái **chờ lên** (`WAITING`) có cả điểm lên lẫn điểm xuống: `seq(điểm lên) < seq(điểm xuống)` (nghiêm ngặt — bằng nhau cũng là vi phạm). Chỉ xét suất `WAITING` là **lựa chọn của người soạn**: suất đã lên xe, đã xuống, vắng, huỷ tại điểm thì việc "lên" đã xảy ra hoặc không còn, thứ tự không còn ý nghĩa.
2. **Chặn xuất bến — hai lớp:**
   - *Máy chủ:* mã giữ mới `TRA_TRUOC_DON` trong `MA_GIU` (`src/shared/ly-do-giu.ts`), "Ai xử lý: Văn phòng", câu: **"Điểm trả {nơi trả} đứng trước điểm đón của {đoàn/đơn} — đổi thứ tự điểm rồi xuất bến."** `kiemXuatBen` thêm kiểm này; chip "Đạt hết" không còn hiện khi vi phạm.
   - *CSDL:* trigger `vc_trip_departure_stop_order` — `BEFORE UPDATE OF status ON vc_trip` khi `PLANNED → RUNNING`: tồn tại suất mở `WAITING` của chuyến có `seq(alight_stop) <= seq(board_stop)` ⇒ `RAISE(ABORT, 'lc19_tra_truoc_don: …')`. Cùng chỗ đặt với `vc_trip_running_requires_check` (LC-05, `0042:396-399`).
3. **Cách khắc phục (lời chủ "đồng thời cho cách khắc phục"):**
   - **(a) Máy tự sắp lại khi xếp.** Sau khi dựng điểm trong lô xếp (`lenhXepLo`, `dieu-phoi-lenh.ts:112-169`), các điểm `PENDING` được đổi `seq` tối thiểu sao cho mọi suất thoả luật, giữ nguyên thứ tự tương đối của phần còn lại (V1.2 của lộ trình làm trước phần này dưới dạng **cảnh báo**; ADR này nâng thành **giữ**). Cùng luật áp cho mọi lệnh dựng/dời điểm của văn phòng (dời suất, cập nhật điểm theo đơn).
   - **(b) Nút đổi thứ tự khi chuyến còn kế hoạch.** Văn phòng có ô `trip.dispatch` đổi thứ tự điểm `PENDING` của chuyến `PLANNED` (nút ↑/↓ cùng khuôn nút bấm thay đang có ở `web/chuyen.ts:281-300`), route mới trên chuyến kế hoạch (dưới), đi qua lớp vé chống ghi trùng (ADR-0094). Hôm nay nút này chỉ có khi chuyến đang chạy.
   - **(c) Lệnh đổi thứ tự nào làm vi phạm luật bị từ chối 409** kèm câu chỉ rõ suất bị đảo, ở cả chuyến kế hoạch lẫn chuyến đang chạy (tài xế và văn phòng bấm thay, `POST …/thu-tu`). Đổi thứ tự là sửa sai của chính nó nên không có đường "vẫn đổi".
4. **Khi chuyến đang chạy — "Đã tới" điểm trả (HT-02):** lệnh "Đã tới" ở một điểm **trả** bị từ chối 409 khi còn suất **chờ lên** có điểm xuống ở đó mà điểm lên của suất đó chưa tới; câu: "Còn khách chưa đón ở {nơi đón} sẽ xuống ở đây — tới điểm đón trước." Điểm trả không còn ai phải trả (mọi suất đã vắng/huỷ) vẫn bấm được như hôm nay.
5. **Bất biến định kỳ:** `R-VC-THU-TU` (mức lỗi) trong `scripts/audit-checks.mjs`: không chuyến `RUNNING` nào có suất mở `WAITING` vi phạm luật. Chuyến `PLANNED` vi phạm là trạng thái "đang bị giữ" hợp lệ nên không đếm.
6. Lớp CSDL cho lệnh đổi thứ tự **khi đang chạy** không làm bằng trigger trên từng dòng điểm, vì một lô đổi nhiều điểm đi qua trạng thái trung gian (hai điểm đổi chỗ); lớp máy chủ (Đ1.3c) + bất biến `R-VC-THU-TU` thay thế. Ghi ở `docs/SO-HANG-RAO.md` đúng như vậy ("phát hiện, không chặn" cho đường này).

### Đ2 — LC-20: Cửa sổ xuất bến (3b)

1. **Luật:** chuyến chỉ được xuất bến khi **giờ xuất bến** (giờ xảy ra ghi trên chuyến — tài xế: giờ máy chủ; văn phòng bấm thay: giờ khai trong khoảng kẹp) **≥ giờ khởi hành dự kiến − cửa sổ**, và chuyến đang `PLANNED`.
2. **Cửa sổ là chính sách có ngày hiệu lực**, không phải hằng trong mã: cột mới `departure_window_minutes INTEGER NOT NULL DEFAULT 720 CHECK (departure_window_minutes BETWEEN 60 AND 2880)` trên `vc_dispatch_policy` (khuôn chính sách chỉ-thêm của ADR-0049 D2, `0041:14-36`; thêm cột có `DEFAULT` theo tiền lệ `0071:88-91`). **Giá trị khởi đầu 720 phút = 12 giờ** (lời chủ "ok cho 12 giờ") — là **giá trị mặc định trong bảng chính sách**, **không viết cứng** trong mã (lời chủ khi duyệt): máy chủ, giao diện và trigger luôn đọc cửa sổ từ dòng chính sách hiệu lực; mã không có hằng 720 hay 12 giờ nào ngoài migration gieo mặc định. Bài kiểm quét: không hằng số cửa sổ trong `src/`, `web/`. Dòng chính sách áp cho một lần xuất bến = dòng có `valid_from_at` mới nhất **≤ giờ xuất bến**.
3. **Toàn quyền đổi được ở bảng điều khiển:** màn "Chính sách điều phối" (`web/chinh-sach-dieu-phoi.ts`, route sẵn có `POST /api/van-chuyen/chinh-sach-dieu-phoi`, ô `settings.ops` = chỉ Toàn quyền — `src/shared/permissions.ts:141`) thêm ô **"Cửa sổ xuất bến (giờ)"**, nhập 1–48 giờ, lưu phút. Như mọi ô chính sách: mỗi lần lưu là một dòng mới, hiệu lực từ lúc lưu, không lùi ngày, nhật ký `dispatch_policy_changed` ghi trước → sau. **Không thêm ô quyền.**
4. **Không có đường phá lệ** cho bất kỳ ai, kể cả Toàn quyền (lời chủ: "Không chấp nhận phá lệ, tất cả đều được luật hoá"). Mã giữ mới **không** vào `MA_LUAT_PHA_LE` (`src/shared/dieu-phoi-kieu.ts:76`). Chuyến thật sự phải chạy sớm hơn ⇒ văn phòng **sửa giờ khởi hành dự kiến** của chuyến (lệnh sửa chuyến sẵn có, `trip.dispatch`: Bán hàng, Quản trị, Toàn quyền; chạy mọi kiểm hiện hành, nhật ký trước → sau) — đó là đường khắc phục, không phải phá lệ. Nhắc một lần (P18): đường này về thực chất là cửa thoát của cửa sổ — khi duyệt, chủ nhắc lại "không có phá lệ" mà không nói thêm về lý do riêng khi sửa giờ **sớm hơn** ⇒ **áp theo khuyến nghị**: không thêm lý do riêng (lệnh sửa chuyến đã có nhật ký trước → sau và chạy mọi kiểm), theo lời chủ 2/10 *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa"*. Chủ muốn bắt lý do thì sửa một dòng. Người thi công kiểm sửa giờ sớm hơn có vướng `earliest_start_ms` (`0042:46`) và mốc 6 giờ không.
5. **Hai lớp:**
   - *Máy chủ:* mã giữ mới `NGOAI_CUA_SO_XUAT_BEN`, "Ai xử lý: Văn phòng", câu: **"Chuyến khởi hành lúc {HH:MM} ngày {D}, chưa tới giờ được xuất bến (được xuất bến từ {HH:MM} ngày {D′}). Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến."** — ngày luôn có, ngày khác năm hiện tại thì có năm. `kiemXuatBen` nhận cửa sổ từ chính sách đang dùng (đã có `chinhSach` trong đầu vào). Màn tài xế và màn văn phòng hiện lý do này ngay khi đọc (chip "Đạt hết" không hiện trước giờ mở cửa sổ).
   - *CSDL:* trigger `vc_trip_departure_window` — `BEFORE UPDATE OF status ON vc_trip` khi `PLANNED → RUNNING`: `NEW.departed_ms < NEW.planned_start_ms − 60000 × (cửa sổ của dòng chính sách hiệu lực tại NEW.departed_at)` ⇒ `RAISE(ABORT, 'lc20_ngoai_cua_so: …')`; **không tìm được dòng chính sách ⇒ chặn** — viết tường minh (`NOT EXISTS` dòng chính sách, hoặc `COALESCE` sang giá trị chặn), vì một `WHEN` ra `NULL` thì trigger **không** chạy; nhánh này có bài quan sát chặn thật riêng (P16). Trigger chỉ đọc bảng `vc_*` của chính module (Hiến chương 5.3); không dùng giờ hệ thống của CSDL — so trên giờ máy chủ đã ghi vào dòng (CLAUDE.md §10: một mốc giờ mỗi request).
   - Chọn đặt trigger trên `vc_trip` (cạnh `PLANNED → RUNNING`) thay vì `vc_trip_event` như lộ trình §2.3 ghi: cạnh trạng thái mang sẵn `departed_ms` và `planned_start_ms`, cùng chỗ với LC-05 và `vc_trip_departed_after_plan`; trigger trên sự kiện phải tra ngược chuyến. Hai cách chặn cùng một việc.
6. **Quan hệ với ADR-0053 D7.2 ("trong ngày chạy"):** `trongNgayChay` (`dieu-phoi-kiem.ts:442-444`) **giữ nguyên nghĩa** — tên/SĐT khách trên màn tài xế vẫn chỉ mở từ 00:00 ngày chạy. Với cửa sổ 12 giờ, "xuất bến tối hôm trước cho chuyến sáng sớm" vẫn có thể xảy ra (chuyến 06:00 xuất bến được từ 18:00 hôm trước) và vẫn không mở tên sớm; ca kiểm ADR-0053 `:220` (18:30 ngày D−1 cho chuyến 06:00 = 11 giờ 30 trước) vẫn hợp lệ. Chuyến 3 ngày sau thì **không** xuất bến được nữa (HT-03).

### Đ3 — LC-21: Giờ hẹn đón không sớm hơn giờ khởi hành của chuyến (HT-06)

1. **Luật:** với mọi suất **còn mở** ở trạng thái **chờ lên** (`WAITING`) trên chuyến `PLANNED`: **giờ hẹn đón** của chặng (ADR-0047, `ord_transfer_leg`; mốc giờ hẹn ADR-0051) **≥ giờ khởi hành dự kiến** của chuyến (`planned_start_ms`). Xe chưa khởi hành thì không đón được khách (lời chủ 3/10: "HT-06: chặn").
2. **Chặn xuất bến — máy chủ:** mã giữ **mới** `GIO_HEN_TRUOC_KHOI_HANH` trong `MA_GIU`, "Ai xử lý: Văn phòng", câu: **"Giờ hẹn đón {HH:MM} của {mã đơn} sớm hơn giờ khởi hành {HH:MM} — sửa giờ chuyến hoặc dời khách sang chuyến khác."** **Không** đổi nghĩa mã cũ `GIO_HEN_NGOAI_CHUYEN` (hôm nay là "ngày đón dời ra ngoài ngày chạy", `src/shared/ly-do-giu.ts:37`) và **không** đổi cảnh báo lịch chung cùng tên (`src/shared/dieu-phoi-lich-chung.ts:114-123`). `kiemXuatBen` thêm kiểm này; chip "Đạt hết" không hiện khi vi phạm. Không vào `MA_LUAT_PHA_LE` — không phá lệ.
3. **Lớp CSDL:** giờ hẹn nằm ở bảng của module `orders`; trigger của `van-chuyen` chỉ được đọc qua **view công bố** (Hiến chương 5.3, khuôn LC-09/LC-10). Trigger trên cạnh `PLANNED → RUNNING` đọc giờ hẹn qua view đó nếu view đã mang giờ hẹn; nếu chưa, kế hoạch V3-A thêm cột vào view (migration mới — đổi hợp đồng đọc giữa module, có người kiểm độc lập). Không làm được thì lớp này ghi "dựa vào bất biến định kỳ" ở `docs/SO-HANG-RAO.md` với bất biến `R-VC-GIO-HEN` (lỗi: chuyến đã xuất bến có suất mở mang giờ hẹn < giờ khởi hành lúc xuất bến).
4. **Cách khắc phục:** văn phòng sửa giờ khởi hành của chuyến (lệnh sửa chuyến sẵn có) hoặc dời khách sang chuyến khác (lệnh dời sẵn có). Giờ hẹn đổi **sau** khi chuyến đã chạy: không thuộc luật này — tài xế được báo qua tin MQ-07 (đợt V5 của lộ trình, ADR-0052 D6.2).
5. Chỉ xét "sớm hơn giờ khởi hành" — đúng lỗi HT-06 chủ đã quyết. Giờ hẹn **muộn hơn** giờ kết thúc dự kiến vẫn chỉ là cảnh báo của lịch chung như hôm nay.

## Bấm nhầm thì sao

(Mục áp thử theo đề xuất 5.3 của NGUYEN-NHAN-GOC.md, chưa thành luật.)
- **Thứ tự sai:** sửa bằng nút đổi thứ tự (Đ1.3b; khi đang chạy: nút sẵn có). Đổi nhầm thì đổi lại — mỗi lần đổi là một sự kiện `STOPS_REORDERED` chỉ-thêm, nhật ký đủ.
- **Xuất bến nhầm trong cửa sổ** (đúng giờ nhưng nhầm chuyến): ADR này **không** gỡ; đường gỡ là lệnh "Thu hồi xuất bến" của ADR-0097 (lượt duyệt V0-B). Hộp xác nhận trước khi bấm Xuất bến là việc V1.3 (không cần ADR).
- **Toàn quyền đặt nhầm cửa sổ:** lưu lại dòng chính sách mới với số đúng (hiệu lực ngay); dòng sai còn trong lịch sử chính sách.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ khi duyệt, không sửa thân)

| Văn bản | Câu cũ | Thay / bổ sung |
|---|---|---|
| ADR-0049 bảng luật lõi `:119-135` | LC-01 … LC-18 | + **LC-19** (đón trước trả, Đ1), **LC-20** (cửa sổ xuất bến, Đ2), **LC-21** (giờ hẹn không sớm hơn giờ khởi hành, Đ3) — cùng khuôn "đổi bằng ADR, không ai phá lệ" |
| ADR-0049 D2 `:141-152` (`vc_dispatch_policy`) | danh sách cột chính sách | + `departure_window_minutes` (Đ2.2) |
| ADR-0049 cổng xuất bến `:173-187` | điều kiện xuất bến + "giữ" | + ba lý do giữ `TRA_TRUOC_DON`, `NGOAI_CUA_SO_XUAT_BEN`, `GIO_HEN_TRUOC_KHOI_HANH` |
| Đặc tả bảng điều phối MQ-04 (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:395, :545`) | "giờ hẹn đổi sau khi xếp" là **cảnh báo** | giờ hẹn **sớm hơn giờ khởi hành** thành lý do **giữ** (Đ3); các ca khác giữ cảnh báo |
| ADR-0053 `:59` | "mã hôm nay **không** có mốc 'xuất bến sớm nhất'" | có mốc: cửa sổ xuất bến (Đ2); vế ngày của D7.2 giữ nguyên vì cửa sổ 12 giờ vẫn cho xuất bến tối hôm trước |
| ADR-0053 `:31`, `:220` ("xuất bến sớm tối hôm trước") | xuất bến sớm tối hôm trước | "xuất bến **trong cửa sổ**"; ca kiểm `:220` vẫn đúng với cửa sổ 720 phút |

## Cửa một chiều / hai chiều

- Cột mới + hai trigger: migration thêm (dự kiến `0077_cua_so_xuat_ben.sql` — số chốt theo luật 1.46 lúc gộp). Gỡ được bằng migration sau ⇒ **hai chiều** về luật; dòng chính sách đã ghi là chỉ-thêm.
- Con số cửa sổ: **hai chiều** (Toàn quyền đổi bất kỳ lúc nào).
- Thêm route đổi thứ tự cho chuyến kế hoạch: hai chiều.

## Hệ quả

- `MA_GIU` +3 mã; bài kiểm danh mục câu chữ của `ly-do-giu.ts` cập nhật.
- `kiemXuatBen` +3 kiểm; bài `dieu-phoi-kiem.test.ts`: suất `seq(xuống) <= seq(lên)` → giữ; xuất bến 13 giờ trước giờ dự kiến → giữ, 11 giờ → không giữ; chính sách đổi cửa sổ 24 giờ → 13 giờ không giữ; giờ hẹn 06:30 trên chuyến 07:00 → giữ `GIO_HEN_TRUOC_KHOI_HANH` (ca HT-06), 07:30 → không giữ.
- `migrations-van-chuyen.test.ts`: chèn thẳng cạnh `RUNNING` ngoài cửa sổ → RAISE; trả trước đón → RAISE; gỡ trigger thì qua (quan sát chặn thật một lần, dòng `docs/SO-HANG-RAO.md` cho mỗi trigger) — Hiến pháp P16.
- Màn chính sách điều phối thêm một ô; route test: Quản trị → 403, Toàn quyền → 201 dòng mới.
- Khung thử đi tới xuất bến (e2e, bài tích hợp) phải đặt giờ khởi hành trong cửa sổ, như đã phải gieo Kiểm định + Bảo hiểm (CLAUDE.md §10 bẫy Điều phối xe) — ghi vào `docs/CHANGE-GUIDE.md` công thức z3 và bẫy 53.
- `docs/SYSTEM-DESIGN.md` §6 (cổng xuất bến), `docs/DATA-DICTIONARY.md` (cột mới) cập nhật cùng lần thi công (đợt V3-A).
- Xây trên lỗ đang hở: không (không chạm `billing`, quyền).
