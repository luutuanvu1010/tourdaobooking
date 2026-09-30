# ADR-0050 — Vận chuyển, thừa kế Transportation Kernel, lượt duyệt 1: giờ xảy ra thật khi văn phòng bấm thay; giữ chuyến khi nơi hẹn đổi sau khi xếp; gieo điều kiện giấy tờ xe

- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29: Q-L1-1 **"Sửa được giờ thật"**, Q-L1-2 **"Giữ chuyến tới khi cập nhật"**, Q-L1-3 **"Kiểm định + Bảo hiểm"** (cả ba là phương án (a) khuyến nghị); câu duyệt "Duyệt ghi lượt 1 này thành quyết định chính thức ADR-0050 theo 3 câu trả lời trên? (Tôi chỉ ghi sau khi người kiểm độc lập xem bản cuối và báo đạt.)" → **"Duyệt, ghi theo 3 câu"** (nguyên văn: [HĐ] "Trả lời lần 10"). Điều kiện đã nêu với chủ: người kiểm độc lập xem bản cuối → **ĐẠT** (bản đề xuất đỉnh `73d3c2d`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): VK1-B — đường sửa trên xe đang chạy (thêm điểm, báo huỷ điểm, cập nhật điểm theo đơn) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052.
- **Ngày:** 2026-09-29.
- **Nguồn:**
  - bản đề xuất `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-1.md` — chép nguyên văn từ "Gấp" trở đi, không đổi nghĩa; chỉ thay "ADR-00xx" bằng số này, ghi câu trả lời của chủ, và cập nhật "Chưa kiểm";
  - bản soi lỗ `docs/superpowers/specs/2026-09-29-transportation-kernel-va-lo-he-thong.md` (gọi **[SOI]**): LH-01, LH-02, LH-03, B1, B2;
  - lời chủ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (**[HĐ]**), mục "Trả lời lần 9", "Trả lời lần 10";
  - [REF] `docs/Ref/transportation-kernel-travel-erp.md`;
  - ADR-0049 (**[0049]**); bản thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` (**[TK]**);
  - kế hoạch `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` @`fd78247` (**[KH]**);
  - **[TRA]**: tra cứu quy định vận tải khách 27/9 (bộ nhớ dự án `reference-quy-dinh-van-tai-khach`), **chưa có người chuyên môn kiểm**.
- **Kiểm độc lập:** bộ đề xuất đỉnh `9cf9431` — ĐẠT CÓ ĐIỀU KIỆN (8 lỗ LH-01…08 có thật; thêm 3 lỗ trong VK1: mã đóng suất, so nơi bằng chữ đã che, kẹp giờ xuất bến; trình tự K-01 trước VK1-C; khuôn câu hỏi); bản sửa `73d3c2d` — **ĐẠT** (29/9). Ruling điều phối R-K1: mã đóng suất riêng `STOP_CHANGED`, không dùng lại `MOVED`.
- **Gấp:**
  - **VK1-A và VK1-B** phải chốt **trước khi viết migration `0042`** (bảng `vc_trip*` của ADR-0049). Cả hai thêm thứ vào `0042`:
    - VK1-A: cột giờ xảy ra;
    - VK1-B: cột khoá so sánh nơi trên điểm dừng + một giá trị đóng suất trong `CHECK`.
  - **VK1-C** phải chốt **trước khi ADR-0049 lượt 1 phát hành**.
- **Loại:**
  - **một chiều:**
    - cột "giờ xảy ra" và tập nguồn giờ trên `vc_trip_event`; mỗi giờ xảy ra đã ghi (chứng cứ, chỉ-thêm);
    - giá trị đóng suất `STOP_CHANGED` trong `CHECK`;
    - cột `place_key` trên `vc_trip_stop` và khuôn của nó;
  - **hai chiều:** độ dài kẹp (giá trị chính sách); lý do giữ mới; lệnh "cập nhật điểm theo đơn"; dòng điều kiện xuất bến gieo sẵn (đóng hiệu lực được).
- **Hiến chương áp** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): 1.2, 1.4, 2.2, 5.1, 5.2, 5.5, 5.6, 5.7, 5.11, 5.12, 5.14 (tinh thần hai trục thời gian, áp sang sự kiện vận hành — xem VK1-A).
- **Liên quan:**
  - ADR-0049 D1, D2, D3 — xem "Câu ADR bị thay";
  - ADR-0047 A1 (không đổi);
  - lời chủ lần 9 về "khoá dính" (không đổi: khoá dính tính theo giờ dự kiến).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 29/9).
- **Xây trên nền chưa có (Hiến chương 5.13):** ADR-0049 đã duyệt, **đang thi công** (lát 1.1, 1.3 xong trên nhánh; `0042` chưa viết). Đề xuất này sửa **thiết kế** của các lát chưa làm; không đụng mã đã có ngoài luật thuần `kiemXuatBen`, `dungLichChung` (lát 1.3, chưa gộp).
- **Migration:**
  - VK1-A: cột đi **trong `0042`** (chưa viết); một cột chính sách thêm vào `0041` (chưa áp remote) hoặc migration mới;
  - VK1-B: cột `place_key` và giá trị `STOP_CHANGED` đi **trong `0042`**; không đổi bảng của `orders`;
  - VK1-C: dòng gieo vào `0041` hoặc migration mới.
  - Số, tệp: điều phối chốt, kiểm mọi nhánh trước.

---

## Tóm tắt (lời thường)

1. **Văn phòng bấm thay được ghi giờ thật.**
   - Tài xế gọi "đón xong lúc 7:31", văn phòng bấm lúc 7:45 → máy ghi **cả hai**: xảy ra 7:31, ghi lúc 7:45 (ai bấm).
   - Mọi luật về thời gian đã chạy (nghỉ giữa hai chuyến, giờ lái sau này) dùng **giờ thật**.
   - Tài xế tự bấm thì vẫn là giờ máy chủ, như bạn đã chọn.
   - Giờ thật không được ở tương lai, không lùi quá 3 giờ, không đảo thứ tự các bước của chuyến, và giờ xuất bến không sớm hơn lần sửa lịch xe cuối cùng.
2. **Khách đổi khách sạn sau khi đã xếp xe:**
   - máy **giữ chuyến** (không cho xuất bến) và báo "nơi đón đã đổi — cập nhật điểm";
   - người xếp xe bấm **một nút** "Cập nhật điểm theo đơn"; không cần Quản trị phá lệ, kể cả trong 6 giờ, vì không đổi ai đi xe nào;
   - xe **đang chạy** thì chỉ báo đỏ trên bảng để văn phòng gọi tài xế.
3. **Lúc xuất bến, máy kiểm luôn giấy tờ xe:**
   - gieo sẵn "mọi xe phải có **Kiểm định** + **Bảo hiểm trách nhiệm dân sự** còn hạn tới hết chuyến";
   - giấy khác (phù hiệu, giám sát hành trình, camera, khám sức khoẻ, tập huấn) bạn tự thêm khi có người chuyên môn xác nhận;
   - xe nhà xe chưa nhập hai giấy này sẽ bị giữ;
   - trước khi bật, dọn các xe đang có hai bản giấy cùng loại (việc kiểm đã giao làm ngay).

---

## Bối cảnh

Chủ chọn 29/9 soạn đề xuất cho bốn ý của [REF] và dặn "bịt ngay những lỗ hổng" ([HĐ] lần 9). Bản soi mã thật [SOI] tìm ra hai lỗ **CAO** nằm ngay trong bản chuyến xe đang thi công (ADR-0049), cùng một lỗ **VỪA** trùng với ý (1) của chủ:
- **LH-03:** giờ nghiệp vụ = lúc bấm, kể cả khi văn phòng bấm thay muộn;
- **LH-01:** nơi đón / trả của chặng đổi sau khi xếp → xe vẫn đi nơi cũ, cổng xuất bến vẫn đạt;
- **LH-02:** bảng điều kiện xuất bến gieo rỗng → không kiểm giấy tờ xe nào.

Ba việc này gom thành lượt 1 vì phải chốt trước khi bản chuyến xe được viết xong (VK1-A, VK1-B trước `0042`) hoặc phát hành. Đây là **ba quyết định chạm dữ liệu** — trần của một lượt (`CLAUDE.md` §9).

**Chủ đã quyết, áp dụng không hỏi lại:**
- [HĐ] Q2 (28/9): tài xế tự bấm tiến độ, **giờ theo máy chủ**, văn phòng bấm thay được, ghi ai bấm. VK1-A **giữ nguyên** vế tài xế; chỉ thêm cho vế văn phòng. Đây là **thay câu** — xem "Câu ADR bị thay".
- ĐP2(iii) (29/9): trong 6 giờ chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế. Lệnh "cập nhật điểm theo đơn" không đổi ai đi xe nào nên **không** khoá theo mốc.
- ĐP2(iv) (29/9): sửa nơi đón / trả dưới mốc cần Quản trị (phía **đơn**). VK1-B không hỏi lại điều này; nó lo phía **chuyến**.
- Nguyên tắc 27/9 "chuyến sai điều kiện thì không cho xuất bến" (`docs/superpowers/specs/2026-09-27-van-chuyen-design.md:56`). CH-04 không ai phá lệ ([TK]:410).
- Lời chủ lần 9: "khoá dính" mốc 6 giờ (cột giờ xuất bến sớm nhất từng có trên `vc_trip`); mốc tối thiểu > 0. **Đầu vào**, không đổi ở đây.

---

## Quyết định

### VK1-A. Giờ xảy ra thật khi văn phòng bấm thay (ý 1 của chủ; bịt LH-03)

**Hai trục thời gian cho sự kiện tiến độ** (thừa kế [REF]:97, :334; tinh thần Hiến chương 5.14):
- **giờ ghi nhận** = lúc máy chủ ghi — `created_at` của sự kiện, `at` của nhật ký, như hôm nay;
- **giờ xảy ra** = lúc việc diễn ra ngoài đời.
  - Tài xế tự bấm: giờ xảy ra = giờ ghi nhận.
  - Văn phòng bấm thay: người bấm **khai được** giờ xảy ra (mặc định = lúc bấm), trong khoảng kẹp dưới đây.

**Dữ liệu** (trong `0042`, bảng `vc_trip_event` — [0049]:86):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `occurred_at` | TEXT NOT NULL, ISO UTC cùng khuôn `created_at` | giờ xảy ra (người đọc) |
| `occurred_ms` | INTEGER NOT NULL | giờ xảy ra (máy so sánh — Phần II "Luật dữ liệu") |
| `occurred_source` | TEXT NOT NULL `CHECK IN ('MAY_CHU','VAN_PHONG_KHAI')`, tập đóng | ai quyết giờ xảy ra |

- `CHECK (occurred_at <= created_at)`: không bao giờ ở tương lai so với lúc ghi.
- `CHECK (occurred_source <> 'MAY_CHU' OR occurred_at = created_at)`.
- Sự kiện **kế hoạch** (tạo, xếp, rút, dời, đổi xe / tài xế, huỷ, phá lệ) luôn `MAY_CHU`: việc đó xảy ra chính trong hệ thống. Chỉ sự kiện **tiến độ** được `VAN_PHONG_KHAI`:
  - xuất bến, đã tới, đã đón, vắng, khách đã huỷ, đã trả;
  - kết thúc (thường / gián đoạn).
  - Danh sách loại sự kiện kiểm ở **mã** (khuôn I7 của [KH]), có bài kiểm.
- `client_at` (giờ máy tài xế, [0049]:86) **giữ**, vẫn chỉ tham khảo, không vào luật nào.

**Cột giờ nghiệp vụ trên chuyến và điểm dừng = giờ xảy ra:**
- `vc_trip.departed_at/_ms`, `ended_at/_ms` ([0049]:82);
- `vc_trip_stop.arrived_at`, `done_at` ([0049]:84).
- Mỗi cột lấy **đúng** giá trị `occurred_*` của sự kiện ghi cùng lô. Câu kiểm định kỳ so hai chỗ — xem "Hệ quả".

**Ai được khai:**
- **chỉ** route văn phòng bấm thay (cổng `office`, `can(trip.progress)` — [KH] R-P1) nhận khoá `xayRaLuc` trong thân;
- route tài xế (`/cuoc-cua-toi/*`, cổng `staff`) **từ chối** khoá này (400), không lặng lẽ bỏ qua.
- Không ô quyền mới.

**Khoảng kẹp** (một hàm thuần `kiemGioXayRa` ở `src/shared/`, dùng chung màn hình + máy chủ):
1. không sau giờ ghi nhận;
2. không sớm hơn giờ ghi nhận − `proxy_backdate_max_minutes`:
   - cột chính sách mới trên `vc_dispatch_policy`, gieo **180** (giả định G-A1 — Toàn quyền đổi, `settings.ops`), `CHECK BETWEEN 1 AND 1440`;
   - sự kiện khai lùi ghi `policy_id` đã dùng (khuôn phá lệ, Hiến chương 5.6);
3. **thứ tự trong chuyến:**
   - xuất bến ≤ mọi sự kiện tiến độ sau của chuyến;
   - đã tới điểm ≤ đã đón / vắng / khách huỷ ở điểm đó;
   - đã đón ≤ đã trả của cùng suất;
   - kết thúc ≥ mọi sự kiện tiến độ đã có;
4. **xuất bến** ≥ giờ xảy ra kết thúc của chuyến liền trước của **cùng xe** và của **cùng tài xế**. Dòng thời gian thật không được chồng, khớp LC-03.
5. **Không sớm hơn lần sửa kế hoạch cuối cùng chạm đúng đối tượng** (người kiểm độc lập điểm 3). Lý do: không được có khoảng mà theo giờ thật xe đã chạy, nhưng sổ vẫn nhận sửa kế hoạch như khi chuyến còn `PLANNED` — trái LC-11 và LC-15.
   - **xuất bến** ≥ giờ **ghi nhận** của mọi sự kiện trước đó của chính chuyến. Khi chuyến còn `PLANNED`, mọi sự kiện đều là sự kiện kế hoạch: tạo, xếp, rút, dời, đổi xe / tài xế, phá lệ, cập nhật điểm, gắn tên. Ví dụ: 7:10 Bán hàng đổi tài xế (ghi nhận); 7:45 văn phòng khai "xuất bến 7:00" → **chặn**, giờ xuất bến sớm nhất khai được là 7:10;
   - **đã tới điểm** ≥ giờ ghi nhận của lần **đổi thứ tự điểm** cuối cùng của chuyến. Đổi thứ tự chỉ chạm điểm chưa tới; một điểm "tới lúc 7:10" không thể còn là "chưa tới" trong lần đổi thứ tự ghi lúc 7:20;
   - **đã đón / vắng / khách đã huỷ / đã trả** của một suất ≥ giờ ghi nhận **mở suất đó** (`valid_from_at`). Từ lượt 2 của [TK] có suất thêm khi xe đang chạy; người không thể lên xe trước khi có tên trên sổ của xe.
   - Sự kiện kế hoạch luôn có giờ xảy ra = giờ ghi nhận, nên chính chúng không cần kẹp.

**Lớp CSDL** (bất biến — Hiến chương 5.1):
- hai `CHECK` ở trên;
- `vc_trip`: `CHECK (ended_ms IS NULL OR departed_ms IS NULL OR ended_ms >= departed_ms)`;
- trigger trên `vc_trip_event`: sự kiện tiến độ sau xuất bến có `occurred_ms` ≥ `vc_trip.departed_ms` của chính chuyến (bảng cùng module);
- **trigger ở câu đổi chuyến sang `RUNNING`** (vế 5, ý xuất bến):
  - điều kiện: `NEW.departed_at >= (SELECT max(e.created_at) FROM vc_trip_event e WHERE e.trip_id = NEW.id AND e.id <> NEW.last_cmd_id)`, tức mọi sự kiện trước lô xuất bến; sự kiện `DEPARTED` của chính lô mang `id = last_cmd_id` nên bị loại;
  - chỉ đọc bảng cùng module;
  - so chuỗi ISO cùng khuôn — xem "Chưa kiểm".
  - **Không** so với `vc_trip.updated_at`: câu cổng của chính lô xuất bến đã đặt `updated_at` = lúc bấm.

Chỗ giữ của các vế còn lại:
- vế 2 và 4 là **khoảng cho phép** (theo giờ hiện tại, theo chuyến khác) → máy chủ (Phần II "Luật dữ liệu");
- phần "đã tới điểm" và "suất" của vế 5 → máy chủ + câu kiểm định kỳ (xem "Hệ quả"), vì loại sự kiện là danh sách ở **mã** (I7), trigger không liệt kê được.
- Máy chủ và trigger dùng cùng một định nghĩa cho phần xuất bến.

**Nơi dùng giờ nào** (một bảng để người thi công khỏi đoán):

| Nơi dùng | Giờ dùng | Đổi so với ADR-0049? |
|---|---|---|
| Khoảng chồng giờ LC-03 `[planned_start, COALESCE(ended_ms, planned_end))` ([KH] I22) | `ended_ms` = giờ **xảy ra** kết thúc | nghĩa `ended_ms` |
| "Một chuyến đang chạy mỗi xe, mỗi tài xế" | trạng thái, không theo giờ | không |
| Khoảng nghỉ lúc xuất bến (CH-02; [0049]:171 "từ giờ kết thúc thật") | giờ **xảy ra** xuất bến − giờ **xảy ra** kết thúc chuyến trước | **có**: hàm hôm nay đo từ lúc bấm (`dieu-phoi-kiem.ts:276-277@fd78247`) |
| Mốc tối thiểu 6 giờ, **khoá dính** (lời chủ lần 9) | giờ **dự kiến** + "bây giờ" | không |
| Hạn giấy tờ "tới hết chuyến" | giờ kết thúc **dự kiến** | không |
| "Trong ngày chạy" (DTO tài xế) | ngày chạy + trạng thái | không |
| Lịch chung, màn chuyến, màn tài xế | hiện giờ xảy ra; khác giờ ghi nhận thì hiện "07:31 · ghi lúc 07:45 — Lan" | thêm hiển thị |
| Giờ lái (lượt 2, VK2-B) | giờ xảy ra khi đã có | — |
| Suất, dòng lái: `valid_from_at` / `valid_to_at` | **giờ ghi nhận** (sổ kế hoạch: ai được xếp xe nào, từ lúc nào trên sổ) | không |
| "Ai thật sự trên xe lúc t" (chứng cứ) | từ sự kiện Đã đón tới Đã trả của suất, **giờ xảy ra** | làm rõ |
| Nhật ký `audit_log` | `at` = giờ ghi nhận; `detail` thêm "xảy ra lúc HH:MM" khi văn phòng khai | thêm một mục vào danh sách trắng `detail` ([KH] mục 1.1) |
| Bản chụp xuất bến `checked_at` | giờ ghi nhận (lúc máy kiểm) | không |

**Rủi ro nói thẳng — khai lùi để lách khoảng nghỉ:**
- Ví dụ: chuyến trước thật sự kết thúc 7:50, chuyến sau cần xuất bến 8:00 (nghỉ 10 < 30 phút). Văn phòng khai "kết thúc 7:20" → đủ nghỉ trên giấy.
- **Lớp bù:**
  - (a) cả hai giờ và người khai nằm trong nhật ký;
  - (b) câu kiểm định kỳ mới, mức `warn`: "kết thúc khai lùi > 15 phút mà chuyến kế của cùng xe hoặc cùng tài xế xuất bến trong vòng khoảng nghỉ **tính theo giờ ghi nhận**";
  - (c) màn chuyến hiện rõ "giờ do văn phòng khai".
- Phương án (b) của câu hỏi Q-L1-1 bỏ hẳn rủi ro này, đổi lại luật nghỉ chạy trên giờ sai.

### VK1-B. Giữ chuyến khi nơi hẹn đổi sau khi xếp (bịt LH-01)

**Luật** (một lý do "giữ" mới, Hiến chương 5.7; tính **lúc đọc**, không lưu cột "giữ"):
- với chuyến **chưa chạy** (`PLANNED`), mỗi suất khách đang mở:
  - nơi của **điểm lên** phải trùng **nơi đón hiện hành** của chặng;
  - nơi của **điểm xuống** phải trùng **nơi trả hiện hành** của chặng, khi chặng đã có nơi trả. Chưa có nơi trả thì cổng đã giữ `CHUA_CO_NOI_TRA`.
- Lệch → lý do giữ `NOI_HEN_DOI` ("Nơi đón / trả của ĐH-… đã đổi sau khi xếp — cập nhật điểm"). Ai xử lý: **văn phòng**.
- Nằm trong **cùng** hàm `kiemXuatBen` → hiện trên lịch chung và chặn ở cổng xuất bến (một luật, hai chỗ hiện — K9).
- **Trùng nơi = trùng "khoá so sánh nơi"** (người kiểm độc lập điểm 2):
  - **Vì sao không so chữ hiển thị:** `lichChungChang` trả nơi **đã che dãy số** ([0049]:72).
    - Hàm che chỉ thay dãy từ 8 chữ số trở lên bằng "•" (`src/shared/text-guards.ts:9`, `src/modules/orders/pool.ts:42-45`). Số nhà ngắn ("12" → "88") vẫn khác nhau.
    - Nhưng hai nơi **chỉ khác ở một dãy dài** (vd cùng "Căn hộ X" mà đổi số điện thoại hay mã căn hộ dài 8+ chữ số) sẽ che ra **cùng một chữ** → so bằng nhau → máy không thấy đổi.
    - Vậy không được so chữ đã che.
  - **Khoá so sánh nơi** — chuỗi chỉ dùng để so, **không bao giờ hiển thị**:
    - nơi là điểm danh mục → `L:<id điểm>`;
    - nơi là chữ tự do → `T:<SHA-256 của chữ CHƯA che, sau một hàm chuẩn hoá dùng chung>`. Chuẩn hoá: NFC, bỏ khoảng trắng thừa, chữ thường;
    - không có nơi (nơi trả chưa chốt) → không có khoá.
  - **Ai tính:** `orders` — chủ của chữ gốc — tính trong hàm hẹp `lichChungChang`, trả thêm hai khoá `khoaNoiDon`, `khoaNoiTra`.
    - Web Crypto `crypto.subtle.digest` có sẵn trong Worker và Node 22, không thêm thư viện.
    - Hàm chuẩn hoá ở `src/shared/` (một nguồn).
    - Nếu kế hoạch dùng `hanhKhachChoChuyen` để dựng điểm dừng, hàm đó trả cùng hai khoá, cùng hàm tính.
  - **Điểm dừng lưu khoá:** cột mới `vc_trip_stop.place_key` (TEXT NOT NULL, trong `0042`), đặt lúc dựng điểm từ chặng.
    - `CHECK (location_id IS NULL OR place_key = 'L:' || location_id)`;
    - `CHECK (location_id IS NOT NULL OR place_key GLOB 'T:*')`;
    - không đổi sau khi tạo — trigger danh tính điểm dừng có sẵn trong [KH] (`vc_trip_stop_identity`) phải liệt kê thêm cột này.
  - **So:** khoá nơi đón hiện hành của chặng = `place_key` của điểm lên; khoá nơi trả hiện hành = `place_key` của điểm xuống.
- **Khoá không lộ dữ liệu cá nhân:**
  - khoá **không** vào DTO nào (lịch chung, chi tiết chuyến, tài xế), **không** vào `detail` nhật ký, **không** vào bản chụp hay bản chốt;
  - chỉ sống trong `vc_trip_stop.place_key` và trong bộ nhớ lúc so.
  - Băm **không khoá bí mật** là đủ: chữ gốc đã nằm trong cùng cơ sở dữ liệu (`ord_transfer_leg`), nên người đọc được CSDL không được thêm gì từ khoá. Rủi ro chỉ có khi khoá **ra ngoài** (dò ngược địa chỉ bằng từ điển) → canh bằng bài liệt kê khoá DTO và bài quét nhật ký (xem "Hệ quả").
  - Không dùng băm có khoá bí mật: đổi bí mật thì mọi khoá cũ lệch → giữ nhầm mọi chuyến.
- **Không số phiên bản trên chặng:** đây là bản gọn của "nhu cầu có phiên bản" [REF]:78 — so lúc đọc thay vì lưu phiên bản. Bảng của `orders` **không** đổi.

**Lệnh mới "Cập nhật điểm theo đơn"** (ô `trip.dispatch` có sẵn; chuyến `PLANNED`):
- **Một lô:**
  - câu cổng `version` như mọi lệnh kế hoạch;
  - với mỗi suất lệch: **đóng** suất cũ với mã **mới `STOP_CHANGED`** ("Đổi điểm đón / trả theo đơn"), rồi **mở** suất mới cùng chuyến, cùng chặng, cùng `passenger_key`, ở điểm có nơi mới;
    - **không** dùng lại `MOVED`: `MOVED` nghĩa là "dời khách sang chuyến **khác**" ([0049]:85; nhãn sự kiện `ALLOCATION_MOVED` "Dời khách sang chuyến khác" ở `src/shared/dieu-phoi-kieu.ts:41@fd78247`) — ruling R-K1 của điều phối;
    - `STOP_CHANGED` thêm vào tập đóng `close_reason` trong `CHECK` của `0042` và vào `LY_DO_DONG_SUAT` (`src/shared/dieu-phoi-kieu.ts:76@fd78247`);
    - loại sự kiện mới `ALLOCATION_STOP_CHANGED` (nhãn "Đổi điểm đón / trả theo đơn") thêm ở danh sách **mã** `LOAI_SU_KIEN_CHUYEN` (danh sách mở — I7);
  - thêm điểm nếu chuyến chưa có nơi đó (điểm mới mang `place_key` của chặng);
  - điểm cũ không còn suất → `SKIPPED` mã hệ thống `BO_QUA_KHONG_CON_KHACH` (khuôn I20 của [KH]);
  - sự kiện + nhật ký ("ĐH-…: điểm đón <tên nơi danh mục> → <tên nơi danh mục>"; chữ tự do ghi "nơi tự do", không chép chữ — LC-18, I18).
- **Đóng rồi mở, không sửa đè:** giữ LC-04 ([0049]:126 "không sửa nội dung; chỉ đóng dòng…"). Lịch sử "khách từng được xếp đón ở đâu" còn nguyên.
- **Không khoá theo mốc 6 giờ:**
  - không đổi "ai đi xe nào" (ĐP2(iii)); thêm mã lệnh `DOI_DIEM_THEO_CHANG` vào `LENH_XEP`, **không** vào `LENH_KHOA_THEO_MOC` (`moc-toi-thieu.ts:54-57@fd78247`);
  - LC-02 không đổi: đóng một, mở một, cùng lô.
- **Chuyến đang chạy** (`RUNNING`): LC-15 khoá mở / đóng suất và thêm điểm → lệnh này **không** chạy. Máy chỉ **cảnh báo** trên bảng điều phối (K-02 của [SOI]) để văn phòng gọi tài xế. Đường sửa trên xe đang chạy chờ lượt 2 của [TK] (D5 "văn phòng thêm điểm").

**Vì sao không để máy tự dời khi đơn đổi:**
- `orders` không ghi được bảng `vc_` (không cạnh `orders → van-chuyen`);
- một việc chạy nền tự sửa chuyến là **tác nhân tự động** (Hiến chương 5.11, K1): cần tài khoản riêng + ADR riêng;
- chủ đã xếp "người quyết cuối" cho tầng máy tự quyết ([HĐ] "Ba tầng điều phối").

### VK1-C. Gieo sẵn điều kiện giấy tờ xe lúc xuất bến (bịt LH-02)

- **Không đổi cơ chế ADR-0049:** vẫn là bảng `vc_departure_rule` (Toàn quyền, có hiệu lực, không ai phá lệ — [0049]:175). Đây là **giá trị chính sách** gieo sẵn, không phải ADR mới. Tính vào trần 3 vì là dữ liệu quyết định ai được chạy.
- **Theo phương án khuyến nghị (a) của Q-L1-3:** hai dòng gieo, `subject = 'VEHICLE'`, `min_capacity = 1` (mọi xe):
  - `INSPECTION` (Kiểm định);
  - `TPL_INSURANCE` (Bảo hiểm trách nhiệm dân sự).
  - Mã có sẵn ở `migrations/0033_van_chuyen_xe.sql:18-24`. `valid_from_at` = mốc gieo.
- **Căn cứ pháp lý (theo [TRA], chưa có người chuyên môn kiểm):** hai loại này bắt buộc với mọi xe kinh doanh. Phù hiệu "xe hợp đồng", giám sát hành trình, camera (xe từ 8 chỗ), khám sức khoẻ và tập huấn của tài xế cũng được tra là bắt buộc, nhưng có ngoại lệ theo cỡ xe và mốc ngày → để Toàn quyền thêm khi có người chuyên môn xác nhận.
- **Hệ quả vận hành:**
  - xe (công ty hoặc nhà xe) chưa nhập hai giấy này hoặc giấy đã hết hạn → chuyến bị **giữ** với lý do "thiếu giấy tờ xe: <biển số>" (`DIEU_KIEN_GIAY_TO_XE`, đã có ở `dieu-phoi-kiem.ts:224@fd78247`);
  - Quản trị nhập giấy ở màn Xe (bản 1.37 đã có).
- **Trình tự bắt buộc với K-01 của [SOI]** (người kiểm độc lập điểm 4):
  - cổng xuất bến lấy **bất kỳ** dòng giấy tờ còn hạn cùng loại (LH-04, `dieu-phoi-kiem.ts:221@fd78247`);
  - xe có hai dòng Kiểm định song song (một nhập nhầm hạn xa) sẽ **qua cổng sai** ngay khi VK1-C bật.
  - Vì vậy:
    1. chạy câu kiểm **K-01** (đếm dòng giấy tờ xe song song — điều phối đã giao thi công ngay trên `main`);
    2. chủ chạy lệnh chỉ đọc trên production để lấy số;
    3. Quản trị **dọn tay** từng xe bằng "Sửa sai → Huỷ dòng" (có sẵn);
    4. **rồi mới** phát hành VK1-C.
  - **Không** chờ VK3-B (lượt 3 — chặn thêm dòng song song mới). Giữa lúc dọn xong và lúc VK3-B lên, K-01 là lưới báo lại nếu có dòng song song mới.
- **Nơi gieo:** migration `0041` (chưa áp remote — được sửa) hoặc migration mới; điều phối chốt. Không gieo bằng tay sau phát hành: dễ quên.

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| Lời chủ [HĐ]:11 (Q2), được ADR-0049 D3 dẫn ở [0049]:204 | "**Có** (giờ theo máy chủ; văn phòng bấm thay được, ghi ai bấm)"; "Văn phòng bấm thay tiến độ, có ghi người bấm ([HĐ] Q2)." | "Tài xế tự bấm: giờ xảy ra = giờ máy chủ. Văn phòng bấm thay: ghi người bấm, **và khai được giờ xảy ra thật** trong khoảng kẹp (ADR-0050 VK1-A); giờ ghi nhận vẫn do máy chủ ghi." — **thay lời chủ; chủ duyệt 29/9** (Q-L1-1 = "Sửa được giờ thật", [HĐ] "Trả lời lần 10") |
| ADR-0049 D1, LC-11 ([0049]:131) | "Giờ sự kiện do máy chủ ghi; lệnh lặp không ghi hai lần" | "Giờ **ghi nhận** do máy chủ ghi; giờ **xảy ra** = giờ ghi nhận, trừ khi văn phòng bấm thay khai giờ khác trong khoảng kẹp (ADR-0050 VK1-A); lệnh lặp không ghi hai lần." Lớp CSDL: `UNIQUE(request_id)` + hai `CHECK` giờ xảy ra |
| ADR-0049 D1, bảng `vc_trip_event` ([0049]:86) | "`trip_id`, `kind`, …, `request_id` UNIQUE, `client_at`, `decided_mode`" | thêm `occurred_at`, `occurred_ms`, `occurred_source` (`MAY_CHU` / `VAN_PHONG_KHAI`) |
| ADR-0049 D1, bảng `vc_trip` ([0049]:82) và `vc_trip_stop` ([0049]:84) | "`departed_at/ms`, `ended_at/ms`"; "`arrived_at`, `done_at`" | cùng cột; **nghĩa** = giờ xảy ra của sự kiện tương ứng. Thêm `CHECK` `ended_ms ≥ departed_ms`; trigger "xuất bến ≥ giờ ghi nhận mọi sự kiện trước của chuyến" (VK1-A vế 5) |
| ADR-0049 D1, bảng `vc_trip_stop` ([0049]:84) | "`seq`, `kind` (`PICKUP`/`DROPOFF`), `location_id` hoặc `place_text` (đúng một), `planned_time` …" | thêm `place_key` (TEXT NOT NULL — khoá so sánh nơi, **không hiển thị**; `L:<id>` hoặc `T:<SHA-256 chữ chưa che>`; không đổi sau khi tạo) (ADR-0050 VK1-B) |
| ADR-0049 D1, bảng `vc_trip_allocation` ([0049]:85) | "`close_reason` (tập đóng: `MOVED`, `REMOVED`, `TRIP_CANCELLED`, `TRIP_INTERRUPTED`, `TRANSFERRED` để sẵn)" | "… (tập đóng: `MOVED`, `REMOVED`, `TRIP_CANCELLED`, `TRIP_INTERRUPTED`, `TRANSFERRED` để sẵn, **`STOP_CHANGED`** — đổi điểm đón / trả trên **cùng** chuyến theo đơn, ADR-0050 VK1-B)". `MOVED` giữ nghĩa "dời sang chuyến khác" (ruling R-K1) |
| ADR-0049 D1, hàm hẹp `lichChungChang` ([0049]:72) | "Chỉ gồm: khoá, mã đơn, tên dịch vụ, chiều, ngày giờ hẹn, nơi đón/trả (chữ tự do đã che dãy số), số người, số người đã có tên, cờ đặt gấp. **Không** có tiền, ghi chú, người lập, SĐT, họ tên." | "… cờ đặt gấp, **khoá so sánh nơi đón / nơi trả** (chỉ để so, không hiển thị, không vào DTO hay nhật ký — ADR-0050 VK1-B). **Không** có tiền, …" (giữ nguyên phần còn lại). Cùng áp cho `hanhKhachChoChuyen` nếu kế hoạch dùng nó để dựng điểm dừng |
| ADR-0049 D2, khoảng nghỉ ([0049]:171) | "Xuất bến thì kiểm lại từ giờ **kết thúc thật** của chuyến trước." | "… khoảng = giờ **xảy ra** xuất bến − giờ **xảy ra** kết thúc của chuyến trước (ADR-0050 VK1-A)." |
| ADR-0049 D2, bảng `vc_dispatch_policy` ([0049]:142-150) | năm cột | thêm `proxy_backdate_max_minutes` (gieo 180, 1–1440) |
| ADR-0049 D2, cổng xuất bến ([0049]:173-179) | danh sách kiểm: sàn cứng; mọi dòng `vc_departure_rule`; đủ tên; không đơn huỷ; sức chứa; nghỉ đủ | thêm: "**nơi đón / nơi trả của mọi suất khách khớp nơi hiện hành của chặng** (ADR-0050 VK1-B)" |
| ADR-0049 D3, route ([0049]:214-229) | danh sách route văn phòng | thêm route lệnh "cập nhật điểm theo đơn" (tên đề xuất `POST /api/van-chuyen/chuyen/:id/cap-nhat-diem`; kế hoạch chốt), ô `trip.dispatch`. Route văn phòng bấm thay nhận thêm `xayRaLuc`; route tài xế từ chối khoá đó |
| Kế hoạch [KH] giả định G3 ([KH]:266) | "Gieo: không dòng nào. Toàn quyền tự thêm." | theo câu trả lời Q-L1-3 = "Kiểm định + Bảo hiểm" (gieo `INSPECTION`, `TPL_INSURANCE`) — không phải câu ADR, ghi để điều phối sửa kế hoạch |

Tài liệu thiết kế / kế hoạch phải sửa theo, không phải câu ADR:
- [TK]:161 ("máy chủ ghi"), :207 (`client_at`), :335 (LC-11);
- [KH]:292, :294, :295, :296, :311 (`vc_trip_stop_identity` thêm `place_key`), :317, mục 1.1 (danh sách trắng `detail`; hằng `LY_DO_DONG_SUAT`, `LOAI_SU_KIEN_CHUYEN`), mục 1.7 (route), TC-10, TC-38.

---

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa loại thực thể nào (sau lượt này)**

| Bảng | Loại | Đổi gì ở lượt này |
|---|---|---|
| `vc_trip_event` (`0042`, chưa có) | sự kiện chuyến, nối 1-1 `audit_log` | + 3 cột giờ xảy ra. Không thêm loại dòng; thêm **một loại thông tin**: giờ do văn phòng khai (`VAN_PHONG_KHAI`) |
| `vc_trip` | chuyến (một loại) | nghĩa cột giờ nghiệp vụ = giờ xảy ra; + `CHECK` kết thúc ≥ xuất bến |
| `vc_trip_stop` | điểm dừng | nghĩa `arrived_at`, `done_at` = giờ xảy ra; + cột `place_key` (khoá so sánh nơi — **một loại thông tin mới**: băm chữ nơi tự do, có thể là địa chỉ nhà riêng; không hiển thị). Lệnh VK1-B có thể **thêm** điểm (loại có sẵn) |
| `vc_trip_allocation` | suất khách / suất người đi kèm | không cột mới; tập `close_reason` + `STOP_CHANGED`. Lệnh VK1-B **đóng** (`STOP_CHANGED`) rồi **mở** suất cùng chuyến |
| `vc_dispatch_policy` (`0041`) | chính sách có ngày hiệu lực | + cột `proxy_backdate_max_minutes` |
| `vc_departure_rule` (`0041`) | điều kiện xuất bến | + 2 dòng gieo (nếu Q-L1-3 = (a)) |
| `audit_log` | nhật ký | + hành động lệnh "cập nhật điểm theo đơn" (tên đề xuất `trip_stops_synced`); `detail` thêm "xảy ra lúc HH:MM"; không tên, năm sinh, SĐT, số giấy tờ, chữ nơi tự do |
| `ord_transfer_leg` | chặng | **không đổi** (chỉ được đọc qua `lichChungChang`) |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào** — **không ô mới, không đổi ô**:

| Ô (có sẵn) | Chạm | Áp cho |
|---|---|---|
| `trip.progress` | `vc_trip_event` (+ giờ xảy ra), `vc_trip`, `vc_trip_stop`, `vc_trip_allocation` (trạng thái) | **Khai giờ xảy ra:** chỉ qua route văn phòng — Bán hàng, Quản trị, Toàn quyền (ô `any`). **Tài xế** (`assigned`): không khai được; giờ = máy chủ |
| `trip.dispatch` | `vc_trip_allocation` (đóng / mở cùng chuyến), `vc_trip_stop` (thêm, `SKIPPED`), `vc_trip_event` | chuyến `PLANNED`; không khoá theo mốc 6 giờ |
| `settings.ops` | `vc_dispatch_policy` (cột mới), `vc_departure_rule` | Toàn quyền |
| `trip.view` | đọc giờ xảy ra + giờ ghi nhận; lý do giữ `NOI_HEN_DOI` | như ADR-0049 D3. **Không ai** đọc được `place_key` qua bất kỳ route nào (không có trong DTO) |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân route | Lớp CSDL |
|---|---|---|---|
| Văn phòng bấm thay (có `xayRaLuc`) | `office` | `trip.progress` | 2 `CHECK` giờ xảy ra; trigger "sau xuất bến ≥ `departed_ms`"; `CHECK` kết thúc ≥ xuất bến; trigger "xuất bến ≥ giờ ghi nhận mọi sự kiện trước của chuyến" |
| Tài xế bấm | `staff` | `trip.progress` + `assigned` | như trên; thân có `xayRaLuc` → 400 ở máy chủ |
| Cập nhật điểm theo đơn | `office` | `trip.dispatch` | LC-01, LC-02, LC-04, LC-06, LC-15 (có sẵn); `CHECK` `close_reason` có `STOP_CHANGED`; `CHECK` khuôn `place_key` |
| Hợp đồng giữa các phần | — | `lichChungChang` trả thêm hai khoá so sánh nơi, do `orders` tính từ chữ chưa che; vẫn không tự kiểm quyền (bài `CONG_BO` có sẵn); khoá không được chép vào DTO / nhật ký (bài liệt kê khoá + bài quét) | — |
| Chính sách, điều kiện xuất bến | `admin` / `office` | `settings.ops` | trigger chỉ-thêm của chính sách (có sẵn) |
| Cổng xuất bến | — | `kiemXuatBen` (một hàm, máy chủ + màn hình) + lý do `NOI_HEN_DOI` | LC-05 (có sẵn) |

---

## Cửa một chiều / hai chiều

- **Một chiều:**
  - ba cột giờ xảy ra và tập `occurred_source`: trong `CHECK` của SQLite, đổi phải dựng lại bảng → định trọn trong `0042`;
  - mỗi giờ xảy ra đã ghi (sự kiện chỉ-thêm, chứng cứ ≥ 3 năm);
  - giá trị **`STOP_CHANGED`** trong tập đóng `close_reason` của `vc_trip_allocation` — cùng lý do, định trọn trong `0042`;
  - cột `vc_trip_stop.place_key` và **khuôn khoá** (`L:` / `T:` + SHA-256 trên chữ đã chuẩn hoá): đổi thuật toán băm hay hàm chuẩn hoá sau này thì mọi khoá cũ lệch. Nếu phải đổi: một migration tính lại khoá cho điểm dừng của chuyến **chưa kết thúc**; chuyến đã kết thúc không cần so nữa.
- **Hai chiều:**
  - độ dài kẹp (chèn dòng chính sách mới);
  - danh sách loại sự kiện được khai (mã, có test);
  - lý do giữ `NOI_HEN_DOI` và hàm so nơi (luật thuần);
  - lệnh cập nhật điểm;
  - dòng điều kiện gieo (đóng hiệu lực được).
- **Tránh một chiều không cần:** không thêm số phiên bản chặng (VK1-B so lúc đọc); không thêm bảng.

## Hệ quả

- **Việc lớn** (dữ liệu + chứng cứ) ⇒ **người kiểm độc lập** khi thi công xong, cùng vòng kiểm ADR-0049 (K2 của [KH]).
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật:
  - hai `CHECK` giờ xảy ra; `CHECK` kết thúc ≥ xuất bến; trigger "sau xuất bến";
  - bài route tài xế gửi `xayRaLuc` → 400;
  - bài `kiemGioXayRa` (tương lai, lùi quá kẹp, đảo thứ tự, chồng chuyến trước cùng xe / tài xế, **xuất bến sớm hơn lần sửa kế hoạch cuối**, đã tới sớm hơn lần đổi thứ tự cuối, sự kiện suất sớm hơn lúc mở suất — mỗi ca một P16);
  - trigger "xuất bến ≥ giờ ghi nhận mọi sự kiện trước": P16 bỏ trigger → ca "đổi tài xế 7:10, khai xuất bến 7:00" đỏ;
  - bài `kiemXuatBen` ca `NOI_HEN_DOI`: đổi nơi đón sau khi xếp → giữ; bỏ vế so nơi → đỏ. Thêm ca **hai nơi chỉ khác ở một dãy từ 8 chữ số** → vẫn giữ (khoá so chữ chưa che); P16 đổi sang so chữ đã che → ca đó đỏ;
  - bài liệt kê khoá DTO (lịch chung, chi tiết chuyến, tài xế) **không** có khoá so sánh nơi; bài quét nhật ký (mở rộng `src/hanh-khach-khong-lo-ten.test.ts` của ADR-0049) không chứa chuỗi `T:` / chữ băm;
  - bài lệnh cập nhật điểm: đóng suất với `STOP_CHANGED` + mở, không `UPDATE` điểm lên; P16 đổi thành `UPDATE` → trigger LC-04 đỏ; P16 dùng `MOVED` → bài khoá mã đỏ;
  - bài mốc: lệnh cập nhật điểm trong 6 giờ không cần phá lệ;
  - câu kiểm định kỳ mới (mã do điều phối cấp), mức `warn`:
    - "cột giờ nghiệp vụ khác `occurred_*` của sự kiện tương ứng";
    - "kết thúc khai lùi > 15 phút mà chuyến kế cùng xe / tài xế xuất bến trong khoảng nghỉ tính theo giờ ghi nhận";
    - "xe chưa ngừng thiếu dòng hiện hành của một loại giấy đang là điều kiện xuất bến" (để Quản trị nhập trước ngày mở chuyến);
    - "sự kiện suất / đã tới có giờ xảy ra sớm hơn lúc mở suất / lần đổi thứ tự cuối" (lưới thứ hai cho vế 5).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md` (công thức điều phối).
- **Thứ tự:**
  1. chủ duyệt;
  2. điều phối sửa [KH] (mục 1.1, 1.3, 1.4, 1.7, 3) và `0041` (cột chính sách, dòng gieo);
  3. người thi công ADR-0049 làm `0042` có sẵn cột giờ xảy ra, `place_key`, `STOP_CHANGED`; rồi luật thuần, route;
  4. **song song, trên `main`:** K-01 → chủ đếm trên production → Quản trị dọn tay dòng giấy tờ xe song song — **phải xong trước bước 6** (VK1-C);
  5. người kiểm độc lập;
  6. phát hành cùng ADR-0049 lượt 1.

## Phương án bị loại

- **Giờ xảy ra do máy tài xế gửi** (`client_at` thành giờ thật): máy tài xế có thể lệch giờ hoặc bị chỉnh; chủ đã chọn "giờ theo máy chủ" cho tài xế (Q2).
- **Cho văn phòng sửa giờ đã ghi** (`UPDATE departed_at`): trái chỉ-thêm (Hiến chương 5.5), mất giờ gốc.
- **Số phiên bản trên chặng + suất nhớ phiên bản đã xếp** (VK1-B): bắt được cả đổi giờ, nhưng thêm cột ở `ord_transfer_leg` và `vc_trip_allocation`, và báo cả khi đổi thứ không ảnh hưởng xe. So nơi lúc đọc đủ cho lỗ đã thấy; giờ đã có `GIO_HEN_NGOAI_CHUYEN` + cảnh báo giờ xe tới (K-02).
- **Sửa đè điểm lên của suất** (`UPDATE board_stop_id`): trái LC-04 đã duyệt; mất lịch sử.
- **Dùng lại mã đóng `MOVED`:** `MOVED` nghĩa "dời sang chuyến khác"; lẫn hai nghĩa thì màn "dòng dữ liệu" và câu kiểm đọc sai (ruling R-K1).
- **So chữ nơi đã che:** hai nơi chỉ khác ở dãy từ 8 chữ số thành một (xem VK1-B).
- **Băm có khoá bí mật** (HMAC): không thêm an toàn (chữ gốc cùng CSDL), mà đổi bí mật làm lệch mọi khoá.
- **Để `van-chuyen` nhận chữ chưa che để tự so:** mở chữ gốc (có thể là địa chỉ nhà, có số điện thoại) cho module khác trong bộ nhớ, dễ lọt vào DTO. Khoá băm đủ để so mà không cần chữ.
- **Máy tự dời suất khi đơn đổi:** xem VK1-B.
- **Không gieo điều kiện, để Toàn quyền tự thêm:** là phương án (c) của Q-L1-3. Rủi ro phát hành rồi quên.

## Câu hỏi đã trả lời (chủ, chat 2026-09-29 — [HĐ] "Trả lời lần 10")

Câu hỏi giữ nguyên văn như đã trình; chủ chọn phương án (a) ở cả ba câu.

**Q-L1-1 — Tài xế gọi báo "đón xong lúc 7:31", văn phòng bấm "Đã đón" giúp lúc 7:45. Máy ghi giờ đón là mấy giờ?** → **Chủ chọn (a) "Sửa được giờ thật".**
- **(a) Khuyến nghị — văn phòng sửa được thành giờ thật (7:31), lùi tối đa 3 giờ, không sớm hơn lần sửa lịch xe cuối cùng** — Được: giờ đón, giờ chạy, giờ nghỉ của tài xế đều đúng; máy vẫn nhớ ai bấm và bấm lúc nào. Mất: người bấm có thể khai lùi giờ cho tài xế "đủ nghỉ" trên giấy — máy có bài kiểm báo lại.
- **(b) Ghi thêm giờ thật để xem, nhưng mọi luật vẫn tính theo lúc bấm (7:45)** — Được: không ai lách được luật nghỉ. Mất: giờ nghỉ, giờ lái máy tính ra bị lệch.
- **(c) Giữ như bạn đã chọn trước: chỉ lấy giờ lúc bấm** — Được: đơn giản nhất. Mất: bấm muộn là giờ sai; tài xế quên bấm "Kết thúc" thì xe bị coi là còn chạy thêm vài giờ.

**Q-L1-2 — Xe đã được xếp đón khách ở Sheraton. Sau đó khách đổi sang Amiana và người bán sửa trên đơn. Máy làm gì với chuyến xe?** → **Chủ chọn (a) "Giữ chuyến tới khi cập nhật".**
- **(a) Khuyến nghị — giữ chuyến, không cho xuất bến tới khi người xếp xe bấm "Cập nhật điểm theo đơn"** — Được: xe không đi nhầm khách sạn; một nút là xong, không cần Quản trị duyệt kể cả sát giờ. Mất: thêm một bước bấm; xe đã chạy rồi thì máy chỉ báo đỏ để văn phòng gọi tài xế.
- **(b) Chỉ báo đỏ trên bảng điều phối, vẫn cho xuất bến** — Được: không chặn ai. Mất: người xếp xe sót thì xe vẫn đi nhầm.
- **(c) Máy tự đổi điểm đón của xe ngay khi đơn đổi** — Được: không ai phải bấm. Mất: cần một "tài khoản máy" và một quyết định riêng; người xếp xe không còn là người quyết lộ trình.

**Q-L1-3 — Lúc xe xuất bến, máy có kiểm giấy tờ của xe không? (Hiện máy chỉ kiểm bằng lái của tài xế.)** → **Chủ chọn (a) "Kiểm định + Bảo hiểm".**
- **(a) Khuyến nghị — máy kiểm sẵn Kiểm định và Bảo hiểm trách nhiệm dân sự của mọi xe; giấy khác bạn tự bật khi có người chuyên môn xác nhận** — Được: xe hết hạn kiểm định hay bảo hiểm không chạy được. Mất: xe (kể cả xe nhà xe) chưa nhập hai giấy này bị giữ tới khi Quản trị nhập; phải dọn xe có hai bản giấy cùng loại trước khi bật.
- **(b) Máy kiểm đủ mọi giấy theo bảng tra 27/9** (thêm phù hiệu, giám sát hành trình, camera, khám sức khoẻ, tập huấn) — Được: chặt nhất. Mất: lúc đầu nhiều chuyến bị giữ vì thiếu giấy; vài điều chưa có người chuyên môn kiểm.
- **(c) Không kiểm sẵn; bạn tự bật trong app trước khi cho nhân viên dùng** — Được: ngày đầu không vướng gì. Mất: dễ quên, xe hết hạn vẫn chạy được.

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- **G-A1:** kẹp lùi gieo 180 phút; là giá trị chính sách, Toàn quyền đổi.
- **G-A2:** các tên sau là đề xuất, kế hoạch chốt:
  - khoá `xayRaLuc`, route `cap-nhat-diem`;
  - mã lý do `NOI_HEN_DOI`, mã lệnh `DOI_DIEM_THEO_CHANG`;
  - hành động `trip_stops_synced`, loại sự kiện `ALLOCATION_STOP_CHANGED`;
  - khoá hàm hẹp `khoaNoiDon` / `khoaNoiTra`.
  - Riêng **`STOP_CHANGED`** và **`place_key`** vào `CHECK` / cột của `0042` → chốt tên **trước** khi viết `0042`.
- **G-A3:** ngưỡng 15 phút của câu kiểm "khai lùi" — hằng trong script kiểm, đổi bằng mã.

## Chưa kiểm

- Pháp lý: toàn bộ theo [TRA], **chưa có người chuyên môn kiểm** (giấy tờ bắt buộc; "chỉ đón / trả tại điểm trong hợp đồng").
- Số xe hiện đã nhập Kiểm định / Bảo hiểm trên production: chưa đếm. Câu kiểm ở "Hệ quả" sẽ đếm.
- ~~Mã đóng suất cho lệnh "cập nhật điểm theo đơn"~~ — **đã có đáp** (ruling R-K1 của điều phối): không dùng lại `MOVED`, thêm `STOP_CHANGED` (VK1-B).
- So chuỗi ISO — `CHECK (occurred_at <= created_at)` và trigger "xuất bến ≥ `max(created_at)` sự kiện trước":
  - đúng khi mọi giá trị cùng khuôn `toISOString()` (có mili-giây, đuôi `Z`);
  - người thi công thử trên `node:sqlite` và D1 local (bài học R-P4).
- `crypto.subtle.digest('SHA-256', …)` trong hàm hẹp của `orders`: Web Crypto có trong Worker và Node 22, nhưng **chưa thử** trong mã dự án. Người thi công chạy bài trên cả `node --test` và `wrangler dev`.
- Hàm chuẩn hoá chữ nơi phải **một nguồn** cho cả lúc dựng điểm dừng và lúc so. Sai lệch một ký tự là giữ nhầm (an toàn nhưng phiền) → bài so khớp dựng điểm từ chặng rồi so ngay phải "khớp".
- Người kiểm độc lập: bộ đề xuất đỉnh `9cf9431` ĐẠT CÓ ĐIỀU KIỆN; bản sửa `73d3c2d` kiểm lại **ĐẠT** (29/9). Chưa thi công: chưa có mã, test hay quan sát chạy thật cho điều nào ở đây.
