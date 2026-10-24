# ADR-0032 (bản nháp) — Bộ đếm và hạn mức số lần «Từ chối» đơn của hướng dẫn viên; cài đặt và đặt lại do Toàn quyền

- **Trạng thái:** **ĐÃ DUYỆT 2026-10-23** (chủ, «1, duyệt hết») — bản chính thức: `docs/adr/ADR-0032-han-muc-tu-choi.md` (có thêm điều 10 theo Q3). Bản nháp giữ làm nơi chứa trang ghép. AI soạn 2026-10-20 (vai điều phối / lập kế hoạch). AI không tự duyệt (Hiến pháp N3, Điều 7.2). Duyệt xong mới chép sang `docs/adr/ADR-0032-han-muc-tu-choi.md` và thêm dòng mục lục.
- **Số 0032:** đã được ADR-0030 (accepted) giữ đích danh cho việc này (ADR-0030 điều 5, dòng 165–168); chưa nhánh nào dùng số này (đã kiểm `origin/*` 2026-10-20). Không lấy số kế tiếp 0136 (đang dành cho nhánh Xác nhận đơn).
- **Loại:** việc lớn (quyền, dữ liệu). **Phần dữ liệu một chiều** (thêm ba bảng, chỉ-thêm); **hành vi hai chiều** (tắt hạn mức bằng một dòng cài đặt, không cần mã).
- **Phụ thuộc:** nút «Từ chối» của ADR-0030 lượt 2 (điều 1) — **chưa thi công**, làm trước, kế hoạch `docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong.md`. Hai việc có thể chung một lần phát hành.
- **Xây trên lỗ đang hở:** không có — đã đối chiếu `docs/quyen-hoan.json` 2026-10-20 (mục `dispatch.guides.view` là ô xem danh sách hướng dẫn viên chưa có route, không chạm luồng Từ chối / đếm).
- **Nguồn quyết định của chủ** (đều đã chốt 2026-09-26, đặc tả `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` §1, §3, §9A): Q-P, Q-P2, Q-Q, Q-R, Q-V, Q-Z, Q-Z2; lời chủ 2026-10-20 trong chat: chọn «làm nút Từ chối trước, rồi làm luôn việc đếm lượt Từ chối».

## Tóm tắt cho chủ (lời thường)
Hướng dẫn viên được khước từ tối đa **2 đơn liên tiếp**; đơn thứ 3 thì không bấm Từ chối được nữa, màn hình báo **«Hãy gọi văn phòng»**. Ngoài ra tối đa **15 lần mỗi tuần** (thứ Hai – Chủ nhật). Chuỗi «liên tiếp» về 0 khi hướng dẫn viên **giữ** một đơn khác (tự nhận hoặc được giao). Huỷ đơn **không** tính vào hạn mức, nhưng văn phòng xem được số lần Huỷ. Toàn quyền đổi được các con số, bật «chỉ đo» hay «chặn», và đặt lại cho từng người hoặc cho tất cả. Văn phòng vẫn Giao đơn cho người đã hết lượt như thường.

## Bối cảnh
- Chủ (26/9, nguyên văn): *«hệ thống chuẩn bị sẵn cơ chế đếm số lần huỷ để có những quy tắc và đưa vào hệ thống. Tạm thời không cho phép huỷ quá 2 lần liên tiếp và không quá 15 lần/tuần. (…) Tất cả những quy tắc này đều đưa vào bảng điều khiển của Super Admin (…) để có thể thay đổi, reset dễ dàng.»* — rồi làm rõ: *«huỷ ở trên nghĩa là 'Từ chối' nhận đơn. Huỷ của văn phòng, bán hàng không tính. 2 lần liên tiếp nghĩa là khước từ 2 đơn liên tiếp là hợp lệ, nhưng đơn thứ 3 thì không được khước từ (…). Chạm giới hạn thì hiện 'Hãy gọi văn phòng' khi bấm Huỷ.»* và *«Tự nhận đơn rồi từ chối thì vẫn bị tính 1 lần, đếm số lần từ chối, bất kể đơn đó đến từ đâu.»*
- Hôm nay không có chỗ nào đếm: `dsp_assignment` không có cột loại đóng hay lý do; lý do chỉ nằm ở `audit_log.detail` mà `dispatch` không đọc thẳng được (Hiến chương 5.3).
- Rủi ro đã nêu ở ADR-0030 (dòng 235–238): nhận nhiều đơn để xem số điện thoại khách rồi trả lại — tới khi có hạn mức thì chỉ phát hiện sau khi xảy ra.

## Quyết định

**1. Bộ đếm sự kiện phân công (D7a).** Module `dispatch` có bảng chỉ-thêm `dsp_release_event`: mỗi dòng = một người (`party_id`), một đơn, một **loại**, lúc xảy ra (giờ máy chủ, ISO UTC), người ghi (`created_by`). Loại là bảng tra cứu khoá mã `dsp_release_kind` (ADR-0003 điều 1, không `CHECK` liệt kê):
   - `CLAIM` — tự bấm Nhận;
   - `ASSIGN` — được Giao, hoặc được chọn làm người phụ trách ở mọi đường khác mở dòng phụ trách cho người đó;
   - `REFUSE` — Từ chối (kèm mã lý do của ADR-0030 điều 2, không chữ tự do);
   - `ABORT` — người phụ trách tự Huỷ đơn qua `handler-cancel` (chỉ thống kê, không tính hạn mức — Q-P2);
   - `RESET` — Toàn quyền đặt lại.
   - Dòng ghi **cùng lô** với lệnh sinh ra nó (Hiến chương 1.2). Lệnh nằm ở module khác (vd huỷ đi qua `orders`) thì `dispatch` cấp **câu lệnh chưa chạy** để module kia đặt vào lô (Hiến chương 5.3). Trigger cấm sửa / xoá (Hiến chương 5.5). Nhật ký và bảng không chứa SĐT / email (5.12).
   - **Không chép dữ liệu cũ:** bộ đếm bắt đầu từ 0 ở ngày phát hành (nhật ký trước đó không có đủ loại sự kiện để dựng lại chuỗi).

**2. Ai bị giới hạn.** Chỉ tài khoản **có quyền Hướng dẫn viên (`FIELD`) và không có quyền văn phòng nào** (`SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN`) — theo Q-P (*«Huỷ của văn phòng, bán hàng không tính»*). Sự kiện vẫn được **ghi** cho mọi người (để xem), nhưng chỉ nhóm này bị **chặn**. Quyền xét theo bộ quyền đang hiệu lực lúc bấm.

**3. Luật «liên tiếp» (Q-Q, Q-Z, Q-Z2).** Khi người P Từ chối đơn X: **chuỗi** = số dòng `REFUSE` của P kể từ **mốc cắt chuỗi** gần nhất. Mốc là:
   - dòng `RESET` của P; hoặc
   - dòng `CLAIM` hay `ASSIGN` của P cho một đơn **Y ≠ X** mà **sau** dòng đó P không có `REFUSE` hay `ABORT` cho Y (tức P đang hoặc đã **giữ** Y).
   - `CLAIM`/`ASSIGN` của chính đơn đang Từ chối không bao giờ là mốc. Đơn đệm mà sau đó bị Huỷ thì mất tư cách mốc.
   - **Chặn khi** chuỗi ≥ «số lần liên tiếp tối đa» (mặc định **2** → lần thứ 3 bị chặn).
   - Ví dụ (đặc tả §9A mục 2): nhận A–từ chối A, nhận B–từ chối B, nhận C → từ chối C **bị chặn**. Có đơn K nhận và giữ nằm giữa → được. Đã từ chối 2 rồi được Giao Y và giữ → chuỗi về 0. Đã từ chối 2, được Giao Y rồi từ chối chính Y → vẫn chặn.

**4. Luật «mỗi tuần».** Đếm dòng `REFUSE` của P trong tuần dân sự VN hiện tại (thứ Hai 00:00 → Chủ nhật 24:00 giờ VN, hàm `vnWeekRange` sẵn có), kể từ `RESET` gần nhất nếu `RESET` nằm trong tuần. Chặn khi đã đủ «tối đa mỗi tuần» (mặc định **15**).

**5. Thi hành trong một lô, không có lần từ chối «ma».** Câu chèn `REFUSE` là **câu đầu lô** của lệnh Từ chối (đúng cam kết của ADR-0030 điều 5), mang hai điều kiện: (a) chuỗi và đếm tuần còn dưới mức (khi chế độ là «chặn» và người gọi thuộc nhóm ở điều 2), (b) người gọi **đang có** dòng phụ trách mở của đơn đó. Câu đóng dòng phụ trách và câu nhật ký chạy sau, có `changes() > 0` (khuôn `src/modules/dispatch/repository.ts`). Câu chèn không chạy thì cả lô không đổi gì.
   - Bị chặn vì hạn mức → **409** `refuse_limit`, câu cho người dùng: **«Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.»** (giao diện hiện kèm nút gọi số văn phòng nếu màn đó đã có). Ghi một dòng nhật ký `refuse_limit_hit` (chỉ tên, số chuỗi / tuần, không SĐT) — ghi ở lô riêng sau khi xác định lý do 409.
   - Thua đua (vừa bị đổi người) → 409 `stale` như ADR-0030.
   - **Lệch có chủ ý Hiến chương 5.1:** luật đếm nằm ở **điều kiện của câu ghi** (cùng lô, nguyên tử), không ở trigger, vì «ai bị giới hạn» phụ thuộc bộ quyền (bảng của module `staff`) mà trigger của `dispatch` không được đọc thẳng (5.3). Cùng loại lệch đã ghi ở ADR-0029 / ADR-0030 điều 4. Gỡ khi có view công bố bộ quyền đọc được từ trigger.

**6. Hai chế độ: «chỉ đo» và «chặn» (Q-V).** Chế độ là một cột của cài đặt (điều 7):
   - **Tắt** — không đếm vào quyết định, vẫn ghi sự kiện.
   - **Chỉ đo** — không chặn; lần nào lẽ ra bị chặn thì ghi nhật ký `refuse_limit_hit` (có cờ «chỉ đo») để văn phòng thấy.
   - **Chặn** — như điều 5.
   - **Lần phát hành đầu gieo chế độ «Chỉ đo»** (đúng Q-V «chỉ đo trước, chặn sau») — Toàn quyền chuyển sang «Chặn» bằng một lần bấm khi thấy số liệu hợp lý, không cần phát hành mã mới.

**7. Cài đặt có hiệu lực, chỉ-thêm (D9; Hiến chương 5.2).** Bảng `dsp_refuse_policy` của `dispatch`, khuôn `vc_dispatch_policy` / `ord_pickup_slot_policy`: `mode` (`OFF` / `MEASURE` / `BLOCK`), `max_consecutive` (`CHECK` 1–10), `max_per_week` (`CHECK` 1–100), `valid_from_at`, `created_at`, `created_by`. Đổi = chèn dòng mới; dòng mới nhất đã tới hiệu lực là dòng đang dùng; trigger cấm sửa / xoá. Nhật ký `refuse_policy_changed` ghi trước → sau.
   - **Ai đổi:** chỉ ô `settings.ops` (Toàn quyền) — đúng lời chủ «bảng điều khiển của Super Admin».
   - **Đặt lại:** Toàn quyền bấm «Đặt lại» cho một hướng dẫn viên, hoặc «Đặt lại tất cả» (mỗi người một dòng `RESET`, một lô). Không xoá dòng nào (CLAUDE.md §7). `RESET` cắt cả chuỗi lẫn đếm tuần. Nhật ký `refuse_counter_reset` (tên người được đặt lại, không SĐT).

**8. Ai xem số lần.** Route của `dispatch` sau cổng `admin` + `can(admin.manage)` (Quản trị, Toàn quyền): mỗi hướng dẫn viên một dòng — tên, số Từ chối tuần này, số Huỷ tuần này, chuỗi hiện tại, lần Từ chối gần nhất (lúc, lý do). Không SĐT, không tên khách.
   - **Chỗ hiện (giả định bề mặt, đảo được):** một thẻ «Hạn mức Từ chối của hướng dẫn viên» trên trang **Chính sách điều phối** đang có (`/chinh-sach-dieu-phoi`): bảng số lần (Quản trị, Toàn quyền xem) + ô cài đặt và nút đặt lại (chỉ Toàn quyền thấy và bấm được). Khi trang **Bảng điều khiển Toàn quyền** (nhánh Xác nhận đơn, chưa duyệt) ra đời thì thêm lối vào, không chuyển dữ liệu.

**9. Giao diện hướng dẫn viên.** Hộp Từ chối hiện sẵn dòng nhỏ «Bạn còn được từ chối N đơn liên tiếp, M lần trong tuần này» khi chế độ là «Chặn» (giả định bề mặt). Hết lượt thì nút Từ chối vẫn hiện nhưng bấm ra câu «Hãy gọi văn phòng» (chủ: hiện câu này **khi bấm**).

## Điều không đổi
- Văn phòng (Quản trị, Toàn quyền, Bán hàng có quyền giao) **vẫn Giao** đơn cho người đã hết lượt; đơn thuộc về người đó ngay (Q-Q: *«Hệ thống tự gán ngay khi có người chủ động lựa chọn HDV đó»*).
- Huỷ đơn (`handler-cancel`, `/status`) không bị hạn mức chặn (Q-P2). ADR-0030, ADR-0037 giữ nguyên.
- Không thêm thông báo đẩy mới (chạm hạn mức chỉ ghi nhật ký). Muốn báo văn phòng khi có người chạm hạn mức = ADR sau.

## Hệ quả và rủi ro (nói một lần — P18)
- **Né hạn mức bằng Huỷ:** vì Huỷ không tính (Q-P2), hướng dẫn viên hết lượt Từ chối có thể Huỷ hẳn đơn của khách — nặng hơn (khách mất tour). Đỡ phần nào bằng bảng xem số lần Huỷ (điều 8). Chủ đã nghe điều này ngày 26/9 và giữ Q-P2.
- **Mức 15/tuần ít khi chạm** khi giới hạn liên tiếp là 2: phải có ít nhất 7 lần nhận-và-giữ xen giữa mới tới 15.
- **Đổi hợp đồng giữa module:** đường Nhận, Giao, Huỷ của người phụ trách phải ghi thêm câu sự kiện vào lô của mình; đường nào mở dòng phụ trách mà quên ghi `ASSIGN` thì chuỗi không về 0 được cho người đó (an toàn về phía chặt hơn). Kế hoạch thi công phải liệt kê **đủ** các đường mở dòng `HANDLE` (grep `dsp_assignment` INSERT) và có bài kiểm khoá danh sách đó.
- **Hai lần Từ chối song song ở ngưỡng:** chỉ một lần thắng vì D1 chạy từng lô tuần tự — **chưa kiểm** bằng e2e; kế hoạch có bài kiểm.
- Thêm ba bảng `dsp_*` → `docs/data-dictionary.json` + `npm run dict`; `audit-invariants` thêm luật «`REFUSE` chỉ có khi trước đó có `CLAIM`/`ASSIGN` cùng người cùng đơn».

## Tiêu chí nghiệm thu (viết trước)
1. HDV (chỉ `FIELD`), chế độ «Chặn», mặc định 2/15: nhận-từ chối 2 đơn liên tiếp → được; đơn thứ 3 → 409 `refuse_limit`, dòng phụ trách **vẫn mở**, không có dòng `REFUSE` mới, có 1 dòng nhật ký `refuse_limit_hit`.
2. Giữa hai lần Từ chối có một đơn khác được nhận (hoặc được Giao) và giữ → lần Từ chối thứ 3 được.
3. Được Giao chính đơn rồi Từ chối chính đơn đó sau 2 lần → vẫn chặn. Đơn đệm bị Huỷ → mất tư cách mốc.
4. Lần Từ chối thứ 16 trong tuần (đã xen kẽ đủ đơn giữ) → 409; sang thứ Hai tuần sau (giờ VN) → được.
5. Chế độ «Chỉ đo» → lần thứ 3 vẫn Từ chối được (200), và có `refuse_limit_hit` cờ «chỉ đo». Chế độ «Tắt» → được, không nhật ký hạn mức.
6. Người có `SALES`/`ADMIN`/`SUPER_ADMIN`/`ACCOUNTING` (kể cả kèm `FIELD`) không bao giờ bị chặn; sự kiện vẫn ghi.
7. Toàn quyền «Đặt lại» một người → người đó Từ chối được ngay; người khác không đổi. Người không có `settings.ops` gọi đổi cài đặt / đặt lại → 403. Người không có `admin.manage` gọi xem số lần → 403.
8. HDV Huỷ đơn (`handler-cancel`) → có dòng `ABORT`, không tính vào chuỗi / tuần.
9. Văn phòng Giao đơn cho người đã hết lượt → 200, đơn thuộc người đó.
10. Không dòng nào của `dsp_release_event` / `dsp_refuse_policy` sửa hay xoá được (trigger, bài kiểm migration đỏ-xanh). `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants` xanh; người kiểm độc lập báo đạt.

---

# Trang ghép (CLAUDE.md §9 — lượt duyệt này có 2 quyết định chạm quyền / dữ liệu: D7 bộ đếm + hạn mức, D9 cài đặt)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng (mới, module `dispatch`) | Chứa | Không chứa |
|---|---|---|
| `dsp_release_event` | sự kiện phân công của **một người** trên **một đơn**: Nhận, được Giao, Từ chối, tự Huỷ, đặt lại | SĐT, email, tên khách, chữ tự do |
| `dsp_release_kind` | 5 mã loại sự kiện (gieo sẵn) | — |
| `dsp_refuse_policy` | cài đặt hạn mức theo thời gian (chế độ, hai con số) | — |
| `dsp_assignment` (có sẵn) | **không đổi cấu trúc**; Từ chối chỉ đóng dòng `HANDLE` của người gọi (ADR-0030) | — |

**(2) Dòng bản đồ quyền chạm các bảng này**

| Ô | Ai | Áp cho |
|---|---|---|
| `dispatch.refuse` (ADR-0030, thêm ở lượt Từ chối) | Bán hàng, Quản trị, HDV = đơn mình phụ trách; Toàn quyền = `any` + chốt «đang phụ trách» | ghi `REFUSE` (qua lệnh Từ chối) |
| `dispatch.claim`, `dispatch.assign` (có sẵn) | không đổi ô | ghi thêm `CLAIM` / `ASSIGN` cùng lô |
| `order.cancel` qua `handler-cancel` (có sẵn) | không đổi ô | ghi thêm `ABORT` cùng lô |
| `admin.manage` (có sẵn) | Quản trị, Toàn quyền | **đọc** bảng số lần (điều 8) |
| `settings.ops` (có sẵn) | chỉ Toàn quyền | ghi `dsp_refuse_policy`, ghi `RESET` |
| Không thêm ô quyền mới ở ADR này. | | |

**(3) Cổng nào canh cửa nào (máy chủ và giao diện)**

| Cửa | Máy chủ | Giao diện ẩn / hiện |
|---|---|---|
| Từ chối | cổng `orders` + `can(dispatch.refuse, {assigned})` + đang phụ trách + **điều kiện hạn mức ở câu đầu lô** | nút Từ chối chỉ hiện cho người đang phụ trách; dòng «còn N lần» chỉ hiện khi chế độ «Chặn» và người đó thuộc nhóm bị giới hạn |
| Xem số lần | cổng `admin` + `can(admin.manage)` | thẻ trên trang Chính sách điều phối hiện bảng số khi có `admin.manage` |
| Đổi cài đặt, đặt lại | cổng `admin` + `can(settings.ops)` | ô cài đặt và nút «Đặt lại» chỉ hiện khi có `settings.ops`; Quản trị thấy bảng nhưng không thấy nút |
| Giao (văn phòng) | không đổi | không đổi — **không** ẩn người đã hết lượt khỏi bảng chọn người (chỉ hiện chữ phụ «đã từ chối lúc …» của ADR-0030) |

**Chỗ đổi nghĩa ở giao diện:** trang Chính sách điều phối hôm nay chỉ nói về xe; thêm một thẻ về hướng dẫn viên — người có quyền vào trang mà không có `admin.manage` **không** thấy thẻ (bài «mục hiện ⇔ trang mở được» phải xét lại).
