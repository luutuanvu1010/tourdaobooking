# Transportation Kernel soi vào hệ thống thật: lỗ hổng cần bịt, lõi nên thừa kế, và các lượt duyệt đề xuất (2026-09-29)

- **Trạng thái:** tài liệu **MÔ TẢ + ĐỀ XUẤT**, chưa có gì được duyệt.
  - AI soạn ở vai **người thiết kế / lập đề xuất** (Hiến pháp P15), không thi công, không tự duyệt (N3, Điều 7.2).
  - Phần A liệt kê lỗ **có bằng chứng**; mọi quyết định chạm dữ liệu/quyền nằm ở ba tệp đề xuất (Phần C), chờ chủ duyệt.
- **Việc do chủ giao** (29/9, [HĐ] "Trả lời lần 9"):
  - chọn soạn đề xuất cho **cả bốn ý** của [REF];
  - dặn nguyên văn: *"chúng ta cần chạy 1 subagent để đối chiếu transportation-kernel-travel-erp.md với hệ thống, với phương châm bịt ngay những lỗ hổng và thừa kế lõi có thể áp dụng"*.
- **Không làm lại** bản đối chiếu khái niệm ↔ ADR: xem [ĐC]. Tệp này chỉ soi **mã và migration thật** dưới lăng kính [REF].
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 29/9 trên nhánh này).

**Nguồn (viết tắt dùng trong tệp):**

| Tắt | Tệp |
|---|---|
| [REF] | `docs/Ref/transportation-kernel-travel-erp.md` (tài liệu chủ đặt) |
| [ĐC] | `docs/superpowers/specs/2026-09-29-doi-chieu-transportation-kernel.md` (bản đối chiếu khái niệm) |
| [HĐ] | `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (lời chủ nguyên văn) |
| [TK] | `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` (thiết kế Bảng điều phối) |
| [KH] | `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` **trên nhánh** `thi-cong-adr-0049-song-song` @`fd78247` (số dòng lấy bằng `git show fd78247:<tệp>`) |
| [0040], [0047], [0048], [0049] | `docs/adr/ADR-00xx-…md` (đã duyệt) |
| [L2] | `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` (chưa duyệt) |
| [TRA] | tra cứu quy định 27/9 (bộ nhớ dự án `reference-quy-dinh-van-tai-khach`), **chưa có người chuyên môn kiểm** |

**"Hệ thống" soi ở đây là cái có thật:**
- **production** = `main` @`4c2913c` (bản 1.37): `src/modules/van-chuyen/`, `src/modules/parties/`, `migrations/0031`–`0039`. Trích không ghi `@`.
- **chưa gộp:**
  - ADR-0047 Phần A, nhánh `worktree-agent-aa4ba1b121f98db87` @`7b0e2ae` (`0034`, `0035`) — trích ghi `@7b0e2ae`;
  - ADR-0049 lát 1.1/1.3, nhánh `thi-cong-adr-0049-song-song` @`fd78247` (`0041`, `src/shared/dieu-phoi-*.ts`, `moc-toi-thieu.ts`, `ly-do-giu.ts`) — trích ghi `@fd78247`;
  - `0042` (bảng `vc_trip*`) **chưa viết**: chỉ có mô tả trong [KH].

---

## Tóm tắt cho chủ (lời thường)

1. **Phần lớn khung của tài liệu Kernel đã có trong thiết kế đã duyệt.** Soi mã thật, tìm ra **7 chỗ hở**: 2 mức cao, 3 mức vừa, 2 mức thấp.
2. **Hai chỗ cao, đều ở bản chuyến xe đang làm** (chưa lên mạng thật):
   - khách đổi khách sạn **sau khi đã xếp xe** thì xe vẫn đi đón ở khách sạn cũ, máy không giữ, không báo;
   - lúc xuất bến máy **chưa kiểm giấy tờ xe nào** (kiểm định, bảo hiểm), vì bảng điều kiện đang để trống — chỉ kiểm bằng lái.
3. **Bốn việc siết nhỏ giao thi công ngay được, không cần bạn duyệt:** thêm câu kiểm định kỳ, cảnh báo trên bảng, và một ca kiểm thử. Chúng chỉ báo lỗi, không đổi cách app chạy.
4. **Ba lượt duyệt đề xuất,** mỗi lượt tối đa 3 quyết định:
   - **Lượt 1 (gấp — trước khi viết bảng chuyến xe):** giờ xảy ra thật khi văn phòng bấm thay; giữ chuyến khi nơi đón đổi sau khi xếp; gieo sẵn điều kiện giấy tờ xe;
   - **Lượt 2:** lịch bận của xe; giờ lái tối đa (bản nhẹ, chỉ cảnh báo); số hiệu chuyến bay;
   - **Lượt 3:** xe riêng / cỡ xe hứa với khách; mỗi xe mỗi loại giấy tờ chỉ một dòng đang dùng.
5. **Không nên theo:** PostgreSQL, "cổng lệnh" trung tâm, sổ giữ chỗ riêng, tự xếp xe, tính tiền khách từ chuyến ([ĐC] mục "Không nên theo" — giữ nguyên).

---

## Phần A — Lỗ hổng của hệ thống đang có / đang làm

### A.0 Cách soi

Đi qua từng nguyên tắc và anti-pattern của [REF]:
- ba sổ ([REF]:35);
- không cờ BUSY ([REF]:36, :331);
- cổng lệnh + khoá lặp ([REF]:37, :335);
- sự kiện chỉ-thêm, hai mốc thời gian ([REF]:97, :334);
- không ghi đè phân công ([REF]:96, :332);
- điều kiện lái tại giờ chạy ([REF]:86);
- giữ chỗ, đệm, bảo dưỡng ([REF]:88);
- sự cố ([REF]:98);
- hộp thư đi ([REF]:103);
- bản ghi đóng băng khi xong chuyến ([REF]:106);
- nhu cầu có phiên bản ([REF]:78).

Mỗi nguyên tắc: tìm chỗ **mã / migration / kế hoạch** thật có thể để dữ liệu sai, lách luật, mất lịch sử, trùng lịch không bị chặn, thiếu chứng cứ. Chỗ nào không chắc ghi "chưa chắc".

**Xếp loại cách bịt:**
- **(i)** bịt ngay được không cần chủ: chỉ **siết** (thêm test, hàng rào, câu kiểm định kỳ, cảnh báo hiển thị; sửa lỗi hiển nhiên không đổi hợp đồng) — Hiến pháp Điều 9.4 cho siết;
- **(ii)** cần chủ duyệt: chạm dữ liệu, quyền, hợp đồng giữa các phần, bất biến → đề xuất ADR (Phần C).

### A.1 Bảng lỗ hổng

| Mã | Mức | Loại | Lỗ (một câu) | Ở đâu | Bằng chứng chính | Cách bịt |
|---|---|---|---|---|---|---|
| **LH-01** | **CAO** | (i) + (ii) | Nơi đón / nơi trả của chặng **đổi sau khi đã xếp** → điểm lên / điểm xuống của suất vẫn ở nơi cũ; máy không giữ, không cảnh báo | kế hoạch ADR-0049 (chưa lên mạng) | `src/shared/dieu-phoi-kieu.ts:134-153@fd78247`; `src/shared/dieu-phoi-kiem.ts:242-266@fd78247`; `src/shared/dieu-phoi-lich-chung.ts:87-95@fd78247`; `src/shared/moc-toi-thieu.ts:54@fd78247`; [0047]:85 | (i) K-02; (ii) **VK1-B** |
| **LH-02** | **CAO** nếu phát hành như kế hoạch | (ii) | Cổng xuất bến **không kiểm giấy tờ xe nào** (kiểm định, bảo hiểm): bảng điều kiện gieo rỗng, sàn cứng chỉ có bằng lái | kế hoạch ADR-0049 | `migrations/0041_chinh_sach_dieu_phoi.sql:32-34@fd78247`; [KH]:266 (giả định G3); `src/shared/dieu-phoi-kiem.ts:218-235@fd78247` | (ii) **VK1-C** (giá trị chính sách, không cần ADR mới) |
| **LH-03** | VỪA | (ii) | Văn phòng bấm thay thì **giờ nghiệp vụ = lúc bấm**, không phải lúc xảy ra → sai giờ xuất bến / đón / kết thúc; kéo sai kiểm nghỉ, khoảng chồng giờ, chứng cứ | ADR-0049 đã duyệt + kế hoạch | [0049]:131 (LC-11), :82, :84, :86, :171; [KH]:317, :121 (I22); `src/shared/dieu-phoi-kiem.ts:276-277@fd78247`; [HĐ]:11 (Q2) | (ii) **VK1-A** (= ý 1 chủ đã chọn) |
| **LH-04** | VỪA | (i) + (ii) | Giấy tờ xe: **thêm được dòng mới cùng loại** khi đã có dòng đang dùng → hai chuỗi song song; cổng xuất bến sắp có sẽ lấy **bất kỳ** dòng nào còn hạn | **production 1.37** + kế hoạch | `src/modules/van-chuyen/index.ts:232-255`; `src/modules/van-chuyen/rules.ts:168-172`; `migrations/0033_van_chuyen_xe.sql:58-75`; `web/giay-to-ui.ts:72`; `src/shared/dieu-phoi-kiem.ts:221@fd78247` | (i) K-01; (ii) **VK3-B** |
| **LH-05** | VỪA, **chưa chắc** | (i) | Lớp CSDL của LC-03 (tài xế không chồng giờ) chỉ ghi trigger "khi chèn dòng lái" → **đổi giờ chuyến** có thể làm chồng giờ tài xế mà CSDL không bắt (máy chủ có bắt) | kế hoạch ADR-0049 (`0042` chưa viết) | [KH]:310; `src/shared/dieu-phoi-kiem.ts:95-105@fd78247` | (i) K-03 |
| **LH-06** | THẤP | (i); đổi hẳn thì (ii) | "Kết thúc" vai / quan hệ nhận **ngày bất kỳ** qua API, nhưng "đang mở" chỉ = ngày kết thúc trống → ngày tương lai = đóng ngay | **production 1.37** | `src/modules/parties/rules.ts:92-96`; `src/modules/parties/index.ts:752-784`, `:826-849`; `migrations/0038_nha_xe_doi_tac.sql:8-21`; `web/parties.ts:279`, `:298` (giao diện luôn gửi `{}` = hôm nay) | (i) K-05 (tuỳ chọn); không đề xuất ADR lúc này |
| **LH-07** | THẤP | để sau | Đổi xe / đổi nhà xe trước xuất bến **ghi đè cột** trên chuyến; lịch sử chỉ còn trong chữ nhật ký | kế hoạch ADR-0049 | [0049]:82; [KH]:292 | ghi cho lượt "chi phí nhà xe" ([L3$] của [ĐC]); không làm bây giờ |

Ngoài bảng — **đầu vào đã có lời chủ, không phải lỗ mới:** chủ chốt 29/9 "mốc tối thiểu phải > 0". Hệ quả lan ra:
- `0041:14@fd78247` còn `CHECK (min_lead_minutes BETWEEN 0 AND 2880)`;
- giả định G2 ([KH]:255) và GA-5 (`src/shared/moc-toi-thieu.ts:4@fd78247`, nhật ký thi công) coi 0 = tắt;
- Review Focus 13 ([KH]:758) cho khung thử dùng mốc 0.

Việc này là của điều phối, không thiết kế ở đây.

### A.2 Chi tiết từng lỗ

#### LH-01 (CAO) — nơi hẹn đổi sau khi xếp, xe vẫn đi nơi cũ

- **Kịch bản:**
  1. 21:00, Hùng (Bán hàng) xếp chặng đón Sheraton 07:00 của đơn ĐH-A lên chuyến CX-07.
  2. 22:00, Lan (người phụ trách ĐH-A) đổi nơi đón sang Amiana. Còn hơn 6 giờ nên ĐP2(iv) không chặn; ADR-0047 A1 cho sửa nơi sau xác nhận ([0047]:85).
  3. Sáng hôm sau, cổng xuất bến của CX-07 **đạt**. Tài xế tới Sheraton.
  - Đây đúng tình huống chủ nêu ở Q3 lần 6 ("khách đổi khách sạn").
- **Vì sao máy không thấy:**
  - `orders` không được đọc bảng `vc_` (không có cạnh `orders → van-chuyen`), nên lúc sửa chặng không biết chặng đã lên xe;
  - phía `van-chuyen`, kiểu đầu vào chặng `ChangVao` **không có khoá nơi** (`dieu-phoi-kieu.ts:134-153@fd78247`);
  - `kiemXuatBen` kiểm từng chặng (đơn huỷ, chặng đóng, nơi trả có hay không, giờ, thiếu / thừa suất, tên) nhưng **không so nơi** (`dieu-phoi-kiem.ts:242-266@fd78247`);
  - lịch chung chỉ báo khi **giờ** hẹn nằm ngoài khung giờ chuyến (`GIO_HEN_NGOAI_CHUYEN`, `dieu-phoi-lich-chung.ts:87-95@fd78247`);
  - danh sách lệnh xếp **không có** lệnh "đổi điểm lên / xuống của suất" (`moc-toi-thieu.ts:54@fd78247`), nên kể cả thấy lỗi, người xếp cũng không có lệnh gọn để sửa.
- **Đã có gì, không hỏi lại:**
  - ĐP2(iv) (sửa nơi dưới mốc cần Quản trị) canh **phía đơn**. Lỗ nằm **phía chuyến**, trong **cả hai** trường hợp: trên mốc và dưới mốc.
  - [TK]:1087 từng nêu phương án "máy chỉ nhắc người xếp xe và tài xế"; mã hiện tại chưa làm cả phần nhắc cho **nơi**.
- **Cùng họ, nhẹ hơn:** điểm dừng có **giờ xe tới ghi đè** mà giờ hẹn sau đó đổi **sớm hơn** giờ ghi đè → xe tới trễ hơn hẹn. Hiện chỉ bắt được khi giờ hẹn ra ngoài khung chuyến. MQ-07 (nhắc) thuộc lượt 2 của [TK].
- **Pháp lý (theo [TRA], chưa có người chuyên môn kiểm):** xe hợp đồng chỉ đón / trả tại điểm ghi trong hợp đồng.
- **Bịt:**
  - (i) **K-02** — cảnh báo trên bảng và câu kiểm định kỳ;
  - (ii) **VK1-B** — giữ chuyến + lệnh "cập nhật điểm theo chặng", không khoá theo mốc 6 giờ.
  - Không cần bảng hay cột mới: `lichChungChang` đã được phép trả nơi đón / trả ([0049] D1, danh sách trường), điểm dừng đã mang nơi. So lúc đọc.

#### LH-02 (CAO nếu phát hành như kế hoạch) — xuất bến không kiểm giấy tờ xe

- **Hiện trạng kế hoạch:**
  - `vc_departure_rule` **gieo không dòng nào** (`0041:32-34@fd78247`; [KH]:266 "Gieo: không dòng nào. Toàn quyền tự thêm … Giả định G3");
  - sàn cứng trong mã chỉ có xe đang dùng, một tài xế, bằng lái còn hạn và đủ hạng ([0049] D2);
  - `kiemXuatBen` chỉ duyệt giấy tờ xe qua danh sách điều kiện (`dieu-phoi-kiem.ts:218-235@fd78247`) → danh sách rỗng thì **không giấy tờ xe nào được kiểm**.
- **Hệ quả:** ngày đầu phát hành, xe **hết hạn kiểm định hoặc bảo hiểm** vẫn xuất bến được, trái nguyên tắc chủ nêu 27/9 "chuyến sai điều kiện thì không cho xuất bến" (`docs/superpowers/specs/2026-09-27-van-chuyen-design.md:56`).
- **Không phải lỗi mã:** cơ chế đúng ADR; chỗ hở là **giá trị gieo**. Chưa có lời chủ nào chốt giá trị này (đã tra 1b B2 và [TK] §2.2 CH-04).
- **Bịt (ii) — VK1-C:** giá trị chính sách dưới ADR-0049, không cần ADR mới; nhưng là dữ liệu nên tính vào trần 3 của lượt.
  - Xe nhà xe chưa nhập giấy tờ sẽ bị **giữ**. Đó là hệ quả đúng, nhưng chủ phải biết trước.

#### LH-03 (VỪA) — giờ nghiệp vụ khi văn phòng bấm thay

- **Kịch bản:** tài xế gọi "đón xong lúc 7:31", văn phòng bấm "Đã đón" lúc 7:45. Mọi giờ nghiệp vụ thành 7:45.
- **Những câu làm giờ = giờ máy chủ:**
  - [HĐ]:11 (Q2 "giờ theo máy chủ");
  - [0049]:131 (LC-11);
  - [0049]:82 (`departed_at/ms`, `ended_at/ms`), :84 (`arrived_at`, `done_at`), :86 (`client_at` chỉ tham khảo);
  - [TK]:161, :207, :335;
  - [KH]:317.
- **Nơi tiêu thụ bị kéo sai:**
  - kiểm nghỉ lúc xuất bến đo từ **lúc bấm** (`dieu-phoi-kiem.ts:276-277@fd78247`: `v.bayGioMs - k.ketThucThatMs`), trong khi [0049]:171 đòi đo từ "giờ kết thúc **thật**";
  - khoảng chồng giờ LC-03 dùng `ended_ms` ([KH]:121, I22);
  - danh sách "ai trên xe lúc nào" (chứng cứ);
  - giờ lái (ý 3) sau này.
  - Tài xế quên bấm "Kết thúc", văn phòng bấm muộn 2 giờ → xe bị coi là còn chạy thêm 2 giờ.
- **Bịt (ii) — VK1-A.** Phải chốt **trước khi viết `0042`**:
  - cột của `vc_trip_event` và nghĩa `departed_*` / `ended_*` / `arrived_at` / `done_at` định trong `0042`;
  - thêm sau thì dòng cũ không có giá trị, và `ADD COLUMN` kèm `CHECK` nhiều cột trên SQLite / D1 là chỗ đã vấp (R-P4, [KH]).

#### LH-04 (VỪA) — hai chuỗi giấy tờ xe cùng loại

- **Production:**
  - `POST /api/van-chuyen/xe/:id/giay-to` luôn chèn dòng mới `previous_id = NULL` (`van-chuyen/index.ts:232-255`), không hỏi loại đó đã có dòng đang dùng chưa (`rules.ts:168-172`);
  - chỉ mục ở CSDL chỉ canh "mỗi dòng tối đa một dòng gia hạn" (`0033:75`), không canh "mỗi xe mỗi loại một dòng hiện hành";
  - form "Thêm giấy tờ" liệt kê **mọi** loại đang dùng (`web/giay-to-ui.ts:72`).
  - Người dùng bấm "Thêm Kiểm định" thay vì "Gia hạn" → hai dòng Kiểm định cùng hiện hành.
- **Hệ quả:**
  - hôm nay: danh sách "sắp hết hạn" báo mãi dòng cũ (nhiễu);
  - khi cổng xuất bến chạy: `c.xe.giayTo.find(x => cùng loại && còn hạn)` (`dieu-phoi-kiem.ts:221@fd78247`) lấy **bất kỳ** dòng còn hạn → một dòng nhập nhầm hạn xa có thể che dòng thật đã hết hạn.
- **Không áp cho giấy tờ của người:** một người có nhiều bằng lái khác hạng là hợp lệ.
- **Bịt:**
  - (i) **K-01** — đếm trên dữ liệu thật trước;
  - (ii) **VK3-B** — chặn ở máy chủ + CSDL.

#### LH-05 (VỪA, chưa chắc) — chồng giờ tài xế khi đổi giờ chuyến

- [KH]:310 ghi LC-03: `vc_trip_overlap_ins/_upd` (xe); `vc_trip_driver_overlap_ins` (tài xế).
- Nếu trigger `_upd` trên `vc_trip` chỉ xét **xe**, thì đổi giờ chuyến (không đổi tài xế) làm chồng giờ tài xế sẽ lọt lớp CSDL. Lớp máy chủ có bắt (`kiemTaoSuaChuyen` xét `cungTaiXe` — `dieu-phoi-kiem.ts:95-105@fd78247`).
- TC-8 ([KH] mục 3) không nêu rõ ca "đổi giờ".
- **Chưa chắc:** `0042` chưa viết; người thi công có thể đã định làm.
- **Bịt (i) — K-03:** ghi rõ ca + trigger vào kế hoạch.

#### LH-06 (THẤP) — ngày kết thúc vai / quan hệ

- `validateEndDate` nhận mọi ngày hợp khuôn (`parties/rules.ts:92-96`), còn các view "đang mở" chỉ xét `valid_to_date IS NULL` (`0038:8-21`).
- Gọi API với ngày tương lai (vd nhà xe "thôi từ 31/12") → vai đóng **ngay**; màn hiện ngày 31/12.
- Giao diện luôn gửi thân rỗng (= hôm nay — `web/parties.ts:279`, `:298`), chỉ gọi API tay mới gặp.
- Lỗi lộ ra (LC-13 chặn gán), không âm thầm.
- **Chưa chắc** đây có phải chủ ý (ghi "đã thôi từ ngày X" lùi về quá khứ là hợp lý).
- **Bịt (i) tuỳ chọn:** K-05. Đổi luật nhận ngày là việc của `parties`, ngoài phạm vi, không đề xuất ADR lúc này.

#### LH-07 (THẤP, để sau) — lịch sử đổi xe / nhà xe trước xuất bến

- `vc_trip.vehicle_id`, `carrier_party_id` là cột cập nhật ([0049]:82). Tài xế thì có dòng hiệu lực (`vc_trip_driver`).
- Hiến chương 4.1 cho phép "trạng thái + nhật ký cùng lô"; bản chụp xuất bến giữ xe thật đã chạy.
- Chỉ đáng lo khi làm "chi phí nhà xe": nhà xe A bị đổi sang B sát giờ có thể đòi phí huỷ, cần biết "A được giao từ lúc nào tới lúc nào" bằng cột có kiểu thay vì chữ.
- Ghi vào đầu vào của lượt chi phí nhà xe; không đề xuất bây giờ.

### A.3 Đã soát, không thấy lỗ (để người kiểm biết phạm vi đã phủ)

| Nguyên tắc [REF] | Kết luận | Chỗ xem |
|---|---|---|
| Không cờ BUSY, rảnh / bận suy từ lịch | **Đạt.** Chuyến chiếm xe / tài xế theo khoảng giờ + trigger + chỉ mục "một chuyến đang chạy" | [KH]:310, :292 |
| | `vc_vehicle.status = 'maintenance'` là **tình trạng kỹ thuật** (như `technical_status` [REF]:153), không phải cờ bận. Thiếu **khung có giờ** → ý 3 | `migrations/0033_van_chuyen_xe.sql:39` |
| Cổng lệnh + khoá lặp | **Đạt ở kế hoạch:** câu cổng `version` + dấu lệnh, `request_id UNIQUE`, nhật ký nối 1-1 | [0049]:98-117 |
| | Route "thêm" ở production (xe, giấy tờ) không có khoá lặp — góp phần vào LH-04; bấm đúp chưa kiểm | `van-chuyen/index.ts:158-187`, `:232-255` |
| Sự kiện chỉ-thêm | **Đạt** (cấm `UPDATE` / `DELETE`) | [KH]:296 |
| | Thiếu mốc thứ hai → LH-03 | |
| Không ghi đè phân công | **Tài xế đạt** (dòng hiệu lực, `REASSIGNED`) | [0049]:83 |
| | Xe / nhà xe là cột → LH-07 | |
| Điều kiện lái tại giờ chạy | **Cơ chế đạt:** LC-12 + bản chụp + kiểm định kỳ 48 giờ | [0049]:189 |
| | Chỗ hở ở giá trị gieo (LH-02) và dữ liệu giấy tờ (LH-04) | |
| Giữ chỗ, đệm | Khoảng nghỉ **đạt** (CH-02). Khung bận có giờ **thiếu** → ý 3 | [0049]:171 |
| Nhu cầu có phiên bản | Chặng cập nhật tại chỗ + nhật ký trước→sau; kế hoạch không biết chặng đổi sau khi xếp → **LH-01** | [0047]:85 |
| Đối tượng "chuyến ôm mọi thứ" | **Đạt:** `vc_trip` không mang khách, tiền | [0049]:82 |
| Đơn = chuyến | **Đạt:** suất nối chặng ↔ chuyến nhiều–nhiều | [0049]:85 |
| Hộp thư đi | **Đạt nguyên tắc** (Hiến chương 5.16); lượt 1 của chuyến không gửi gì ra ngoài | [0049]:34 |
| Bản ghi đóng băng khi xong chuyến | Chuyến kết thúc bị khoá (LC-06) + bản chụp xuất bến. Thiếu dữ kiện cuối chuyến (km, phí) → lượt chi phí nhà xe | [0049]:127 |
| Ghi thẳng CSDL | SQL tay theo runbook vẫn có. Trigger LC vẫn chặn; luật chỉ-ở-máy-chủ (L-D1, L-B2, CH-01/02) dựa vào câu kiểm định kỳ. Chấp nhận | [0049] "Lệch có chủ ý" |

### A.4 Việc loại (i) — giao thi công ngay, không cần chủ

Mỗi việc là **siết**: chỉ báo hoặc chặn thêm, không đổi hợp đồng API, không đổi dữ liệu. Mã câu kiểm mới ghi **"R-VC-? (điều phối cấp)"** — R-VC-3…10 đã giữ cho ADR-0049 ([KH] TC-40).

**K-01 — đếm giấy tờ xe song song (LH-04)**
- **Ai làm:** một phiên thi công nhỏ trên `main` (production), độc lập nhánh ADR-0049.
- **Việc:** thêm vào `scripts/audit-checks.mjs` câu R-VC-? mức `warn`: "xe chưa ngừng có ≥ 2 dòng giấy tờ **hiện hành** cùng loại". Hiện hành = chưa huỷ và không có dòng gia hạn chưa huỷ; khuôn `HIEN_HANH` ở `src/modules/van-chuyen/repository.ts:90`.
  - Mức `warn` vì có thể đã có dữ liệu thật như vậy; không được chặn triển khai.
- **Kiểm (P16):** `src/audit-invariants.test.ts` gieo hai dòng hiện hành cùng loại cho một xe → câu đếm > 0; bỏ vế "cùng loại" khỏi câu → ca "khác loại" đỏ; hoàn nguyên.
- **Sổ hàng rào:** một dòng `docs/SO-HANG-RAO.md` ("đếm giấy tờ xe song song — kiểm định kỳ — ngày thấy bắt").
- **Sau đó:** chủ chạy lệnh chỉ đọc `node scripts/audit-invariants.mjs --db remote` (đã có trong quy trình triển khai) để biết production có bao nhiêu dòng. Kết quả đó là đầu vào của VK3-B.

**K-02 — cảnh báo nơi hẹn ≠ điểm của suất (LH-01, phần hiển thị)**
- **Ai làm:** người thi công ADR-0049, qua điều phối. Lát 1.3 (luật thuần) + lát 1.7 (kiểm định kỳ), trước lát 1.5 (route).
- **Việc:**
  1. `ChangVao` thêm khoá nơi đón / nơi trả: id điểm danh mục, hoặc chữ tự do đã chuẩn hoá bằng **cùng một hàm** ở cả hai phía. Nguồn: `lichChungChang` — trường đã có trong danh sách ADR D1.
  2. Suất / điểm dừng đưa vào hàm mang khoá nơi của điểm lên / xuống.
  3. `dungLichChung` thêm hai loại cảnh báo vào `LOAI_CANH_BAO_LICH` (`dieu-phoi-lich-chung.ts:40-42@fd78247`):
     - "nơi hẹn khác điểm của xe" — suất mở của chuyến chưa kết thúc, nơi của điểm ≠ nơi hiện hành của chặng;
     - "giờ xe tới ghi đè muộn hơn giờ hẹn" — điểm đón có `planned_time` ghi đè muộn hơn giờ hẹn sớm nhất của các chặng đón tại điểm.
  4. Câu kiểm định kỳ R-VC-? mức `warn` cho ý thứ nhất.
- **Ranh giới:** chỉ **cảnh báo**, không giữ chuyến, không thêm lệnh. Giữ chuyến và lệnh "cập nhật điểm theo chặng" chờ VK1-B.
- **Kiểm (P16):** ca luật thuần "sửa nơi đón của chặng đã xếp → có cảnh báo"; bỏ vế so nơi → đỏ; hoàn nguyên. Câu kiểm định kỳ có ca đỏ trên dữ liệu gieo.
- **Sổ hàng rào:** hai dòng (cảnh báo, kiểm định kỳ).

**K-03 — ca "đổi giờ chuyến chồng giờ tài xế" (LH-05)**
- **Ai làm:** người thi công ADR-0049, Task A12 (`0042`).
- **Việc:** trigger `vc_trip_overlap_upd` (hoặc trigger riêng) xét cả **tài xế đang mở** của chuyến khi `planned_start_ms` / `planned_end_ms` đổi. TC-8 thêm ca: "đổi giờ chuyến T2 làm chồng giờ với T1 cùng tài xế → `RAISE`".
- **Kiểm (P16):** bỏ vế tài xế trong trigger → ca mới đỏ; hoàn nguyên.
- **Sổ hàng rào:** gộp vào dòng LC-03 sẵn có của kế hoạch.

**K-04 — không phải việc thiết kế:** khung thử với mốc > 0 (lời chủ lần 9). Điều phối đổi G2 / GA-5 / Review Focus 13 ([KH]:255, :758), ví dụ khung thử đặt mốc 1 phút thay cho 0.

**K-05 (tuỳ chọn, THẤP) — ngày kết thúc vai / quan hệ ở tương lai (LH-06)**
- **Ai làm:** phiên nhỏ trên `main`.
- **Việc:** câu kiểm R-PTY-? mức `warn`: "vai / quan hệ có `valid_to_date` > hôm nay VN".
- **Kiểm (P16):** gieo một dòng ngày mai → đếm > 0.
- **Sổ hàng rào:** một dòng.

---

## Phần B — Lõi nên thừa kế từ [REF]

Chỉ ghi khái niệm **chưa có** và **hợp quy mô** (~30 nhân viên, vài xe công ty + xe nhà xe thuê theo chuyến, vài chục chặng / ngày, một Worker + D1, không dependency runtime) và Hiến chương. Mọi khuôn đã có tương đương (ba sổ, suất nhiều–nhiều, chính sách có hiệu lực + chụp, khoá lặp, chỉ-thêm) xem [ĐC].

| # | Lõi [REF] | Cách thừa kế gọn ở đây | Nguyên tắc Hiến chương đã có | Rơi vào |
|---|---|---|---|---|
| B1 | **Hai trục thời gian** cho sự kiện vận hành: `occurred_at` / `recorded_at` ([REF]:97, :334) | sự kiện chuyến có "giờ xảy ra" + "giờ ghi nhận"; chỉ văn phòng bấm thay mới được khai giờ xảy ra khác; có kẹp | 5.14 (hai trục thời gian — hôm nay chỉ nói cho dòng tiền; áp cho vận hành là quyết định mới) | **VK1-A** (lượt 1) |
| B2 | **Nhu cầu đổi thì kế hoạch phải được xem lại** — bản gọn của "nhu cầu có phiên bản" ([REF]:78) | **không** thêm số phiên bản: so **lúc đọc** nơi hẹn hiện hành của chặng với điểm dừng của suất (điểm dừng chính là kế hoạch); lệch → giữ | 5.7 (giữ), 1.4 (hình chiếu không tạo sự thật) | **VK1-B** (lượt 1) |
| B3 | **Khung bận có giờ cho tài nguyên** — `Reservation` mục đích bảo dưỡng ([REF]:88, :163) | **một** bảng khung bận cho **xe và tài xế** (khuôn `vc_unavailability` của [L2] D4 / [TK] D9); LC-03 xét thêm khung bận | 2.2 (thực thể có vòng đời), 5.1 | **VK2-A** (lượt 2) |
| B4 | **Ca / giờ làm của tài xế** — `Duty Period` ([REF]:87) | tính **lúc đọc** từ chuyến (thật khi có, dự kiến khi chưa); trần là cột chính sách; bản nhẹ = cảnh báo | 5.2 (chính sách có kiểu), 5.6 | **VK2-B** (lượt 2) |
| B5 | **Neo giờ vào sự kiện ngoài** ([REF]:81) | **chỉ** ô số hiệu chuyến bay trên chặng; không tra ngoài, không tự dời giờ | — | **VK2-C** (lượt 2) |
| B6 | **Cam kết dịch vụ** — hạng xe, xe riêng ([REF]:80, :129) | hai cột có kiểu trên chặng (không JSON — Hiến chương 5.2); luật ở kiểm xếp / đổi xe / xuất bến | 5.2, 2.2 | **VK3-A** (lượt 3) |
| B7 | **Một định danh hiện hành cho mỗi "tư cách"** — phần `Qualification` ([REF]:86) | mỗi xe mỗi loại giấy tờ tối đa một dòng hiện hành | 5.1 | **VK3-B** (lượt 3) |
| B8 | **Sự cố không dừng chuyến** — `Incident` ([REF]:98) | chưa đề xuất. Lượt 2 của [TK] (báo huỷ, chuyển điểm, cứu hộ) phủ phần lớn nhu cầu nêu tới nay; chủ chưa nêu nhu cầu "sổ sự cố" | — | để sau |
| B9 | **Bản ghi dữ kiện cuối chuyến** — SDR ([REF]:106) | chuyến đã khoá + bản chụp xuất bến là đủ cho lượt 1; km, phí cầu đường, giờ chờ thuộc lượt chi phí nhà xe | 5.6, 4.2 | để sau ([L3$] của [ĐC]) |
| B10 | **Gợi ý xếp hai bước** — lọc cứng rồi chấm mềm ([REF]:303) | MQ-01 của [TK] (lát 2.5) nên **lọc cứng bằng chính** `kiemXep` / `kiemTaoSuaChuyen`, không viết luật thứ hai (bài học "hai luật", Đợt E) | 5.4 (tinh thần một nguồn) | ghi chú cho kế hoạch lát 2.5; không cần duyệt |

---

## Phần C — Các đề xuất và thứ tự lượt duyệt

| Lượt | Tệp | Quyết định (tối đa 3 chạm quyền / dữ liệu) | Vì sao ở lượt này |
|---|---|---|---|
| **1** | `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-1.md` | **VK1-A** giờ xảy ra thật khi văn phòng bấm thay (ý 1) · **VK1-B** giữ chuyến khi nơi hẹn đổi sau khi xếp (LH-01) · **VK1-C** gieo điều kiện giấy tờ xe (LH-02, giá trị chính sách) | VK1-A phải chốt **trước khi viết `0042`**. VK1-B, VK1-C phải chốt **trước khi ADR-0049 lượt 1 phát hành** (lỗ CAO trong chính bản đang làm) |
| **2** | `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md` | **VK2-A** khung bận của xe (ý 3a) · **VK2-B** giờ lái tối đa, bản nhẹ (ý 3b) · **VK2-C** số hiệu chuyến bay (ý 4) | VK2-A cần `vc_trip` (`0042`) để mở rộng LC-03; thi công sau lát 1.2. VK2-C độc lập |
| **3** | `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-3.md` | **VK3-A** xe riêng / cỡ xe tối thiểu (ý 2) · **VK3-B** một dòng giấy tờ hiện hành mỗi loại mỗi xe (LH-04) | VK3-A có câu pháp lý còn treo (ghép khách xe hợp đồng, NĐ 158/2024 — **chưa có người chuyên môn kiểm**) nên để sau; VK3-B chờ số đếm của K-01 |

**Xếp với hàng đợi sẵn có:** các lượt 2–4 của [TK] (D4–D10) vẫn đi riêng, **không gộp** vào lượt "kernel" để giữ trần 3.
- **VK2-A ↔ [TK] D9 (báo bận tài xế):** cùng một bảng.
  - Lượt nào duyệt trước thì tạo bảng; lượt sau chỉ **thêm** phần của mình (migration chỉ-thêm), không dựng lại.
  - VK2-A chỉ mở phần **xe**. Phần "tài xế tự báo bận" (ô `unavailability.self`, câu Q3 / Q7 cũ của [L2]) vẫn thuộc [TK] D9.
- **VK1-A ↔ "khoá dính" (lời chủ lần 9):** cả hai thêm cột vào `vc_trip` / `vc_trip_event` trong `0042`.
  - Khoá dính dựa trên **giờ dự kiến** (giờ xuất bến sớm nhất từng có).
  - VK1-A **không** đổi luật mốc: mốc tối thiểu và khoá dính vẫn tính theo giờ dự kiến + "bây giờ", không theo giờ xảy ra.

**Kiểm "không lượt nào dựa vào lượt sau":**

| Lượt | Cần gì | Có ở lượt ≤ nó? |
|---|---|---|
| 1 | bảng chuyến, sự kiện, điểm dừng, suất, cổng xuất bến, `vc_departure_rule` | có — ADR-0049 đã duyệt |
| 2 | LC-03 (hàm + trigger chồng giờ) để thêm khung bận; giờ xảy ra thật để tính giờ lái "thật" | có — ADR-0049 + VK1-A. Nếu VK1-A bị bác, VK2-B dùng giờ ghi nhận (kém chính xác hơn, vẫn chạy) |
| 3 | kiểm xếp / đổi xe / xuất bến; `v_ord_leg_key` | có — ADR-0049, ADR-0047 |

---

## Chưa chắc / chưa kiểm

- **LH-05:** phụ thuộc chữ `0042` chưa viết.
- **LH-04:** production hiện có dòng song song hay không — chưa đếm (K-01 sẽ đếm). Giao diện có tắt nút khi đang gửi (chống bấm đúp) — chưa kiểm.
- **LH-06:** có phải chủ ý cho phép ngày kết thúc tuỳ ý qua API — chưa rõ.
- **Pháp lý** — toàn bộ theo [TRA], **chưa có người chuyên môn kiểm**:
  - giấy tờ xe bắt buộc;
  - giờ lái;
  - ghép khách xe hợp đồng (NĐ 158/2024);
  - "chỉ đón / trả tại điểm trong hợp đồng".
- **Nhu cầu thật:** tỉ lệ đưa đón sân bay (VK2-C); khách mua xe riêng (VK3-A); xe bảo dưỡng có lịch hẹn trước (VK2-A).
- **D1 production chạy lô lần lượt:** vẫn chưa kiểm, như ADR-0049 ghi.

## Tự rà (người thiết kế, 29/9)

- **Placeholder:** không còn "TODO" / "…" ngỏ. Mã kiểm mới cố ý ghi "R-VC-?", "R-PTY-?" (điều phối cấp); số ADR ghi "ADR-00xx (điều phối cấp số)" ở tệp đề xuất.
- **Mâu thuẫn:**
  - VK1-A giữ nguyên phần đã chốt của Q2: tài xế tự bấm = giờ máy chủ; chỉ thay vế "văn phòng bấm thay".
  - VK1-B không hỏi lại ĐP2(iv) (phía đơn); chỉ thêm phía chuyến.
  - VK1-C không đổi cơ chế ADR-0049, chỉ giá trị gieo.
- **Phạm vi:** không đề xuất gì thuộc [TK] lượt 2–4 ngoài chỗ nối (VK2-A ↔ D9). Không đụng mã, migration, luật, `docs/adr/`.
