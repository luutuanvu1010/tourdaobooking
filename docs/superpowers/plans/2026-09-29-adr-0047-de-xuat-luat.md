# ADR-0047 — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-29.
- **Người soạn:** phiên lập kế hoạch ADR-0047 (nhánh `worktree-agent-ad6521054d4dcefcf`).
- **Người thi công** đo lại số dòng thật và bổ sung ở Task A18 (Phần A), B7 (Phần B, mục 4c), C5 (phát hành 2, mục 6) của kế hoạch `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md`.
- **Vì sao có tệp này:**
  - Hiến pháp N9: AI không tự sửa luật chi phối chính mình.
  - Điều 9.4: hàng rào đã duyệt chỉ được SIẾT; muốn NỚI phải có chủ duyệt.
  - Tiền lệ T2b và Vận chuyển 1a (`docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md`): ADR đã có chữ tiền tố / cạnh, nhưng **sửa bài kiểm không tự thành được phép**.
- **Căn cứ:**
  - ADR-0047 (accepted 2026-09-28) A3: "Tiền tố bảng `ord_` cho module `orders` … kèm T3b"; "SQL chạm `ord_*` viết bằng `defineSql` trong tệp riêng và đưa tệp đó vào bài EXPLAIN. Nếu bài kiểm không nhận module 'nửa nghiêm' thì ghi **nợ có tên, có hạn** ở `src/architecture.test.ts`".
  - ADR-0047 A1 ("Lưu nháp… Chặng của đơn nháp bị xoá và chèn lại cùng lô") và A2 ("Đơn nháp: danh sách xoá–chèn lại cùng lô khi lưu nháp").
- **Trạng thái:** **CHỦ ĐÃ DUYỆT 2026-09-29 — "Duyệt cả 4"; CHƯA ÁP** (điều phối áp lúc gộp, Task K3).
  - Nguồn bền: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` mục "Trả lời lần 5" (nhánh `adr-van-chuyen-0047-0048` @ `14136ca`). Chủ trả lời trực tiếp phiên điều phối, sau khi người kiểm độc lập Phần A (đỉnh `6bb67c8`) báo ĐẠT CÓ ĐIỀU KIỆN với điều kiện duy nhất là duyệt tệp này.
  - **Phạm vi đã duyệt:** mục 1 (`ord_`), mục 2 (kể cả 2b, 2c sửa `docs/ARCHITECTURE.md`), mục 3 (hạn `2027-03-31`), mục 7 (`full_name` của `ord_passenger`), mục 4a, 4b.
  - **Chưa hỏi (hỏi khi tới):** mục 4c (`web/CLAUDE.md`, điền ở Phần B), 4d (dòng bẫy tuỳ chọn ở `CLAUDE.md` §10), mục 6 (phát hành 2).
  - **Cách áp:** điều phối áp các diff tệp luật lúc gộp (K3), mỗi tệp một commit, chủ bấm Đồng ý ở hộp hỏi quyền; đổi chú thích "CHỜ CHỦ DUYỆT" trong `src/architecture.test.ts` thành "đã duyệt 2026-09-29"; người kiểm so khớp phần áp. Người thi công KHÔNG tự áp ⇒ trên nhánh thi công các chú thích "CHỜ CHỦ DUYỆT" và tiêu đề tệp vẫn còn, cho tới K3.
  - Lượt duyệt: điều phối xếp trong trần 3 của `CLAUDE.md` §9 — ba mục chạm dữ liệu/quyền (0047 mục 2, 0047 mục 3, 0048 mục 1) + hai mục chỉ là quy tắc đặt tên (0047 mục 1, mục 7).
  - _Lịch sử trạng thái (trước khi duyệt):_
  - Mục 1 và mục 3: mã của nhánh thi công mang sẵn (tiền lệ 1a), kèm chú thích "CHỜ CHỦ DUYỆT" tại chỗ, để test chạy được.
  - Mục 2: chạm **Hiến chương 5.5** (đứng trên ADR) ⇒ chỉ đưa vào mã **sau khi chủ xác nhận Q0** (kế hoạch mục 13). **Cập nhật 2026-09-29 (người thi công):** chủ đã trả lời Q0 trực tiếp phiên điều phối — nguyên văn **"Cách 1: chỉ giữ bản cuối"** (điều phối chuyển lại) ⇒ mã nhánh thi công mang `XOA_CUNG_NHAP` + hai câu `*_delete_draft` + lô lưu nháp, kèm chú thích "CHỜ CHỦ DUYỆT" (tệp đề xuất luật này, và phần sửa `docs/ARCHITECTURE.md` ở 2b/2c, **vẫn chờ chủ duyệt chính thức**).
  - Mục 7 (**mới**, người thi công thêm 2026-09-29 ở Task A7): ngoại lệ có tên của bài R-N1-14 cho cột `ord_passenger.full_name` — kế hoạch chưa thấy va chạm này. Mã mang sẵn kèm "CHỜ CHỦ DUYỆT" như mục 1, 3.
  - ~~**Không gộp `main` khi chưa duyệt.**~~ (đã duyệt 2026-09-29; gộp sau khi điều phối áp ở K3)
  - **Lượt duyệt (`CLAUDE.md` §9 — tối đa 3 quyết định chạm quyền/dữ liệu):** nay có BỐN mục NỚI (1, 2, 3, 7). Mục 1 chủ đã chốt trong ADR-0047 (Q-AA); mục 2 chủ đã trả lời Q0. Điều phối xem có cần tách lượt không. (Đã xử lý: xem dòng "Lượt duyệt" ở trên.)
- **Duyệt xong:**
  - mỗi tệp luật một commit, sửa đúng diff dưới đây;
  - đổi chú thích "CHỜ CHỦ DUYỆT" ở `src/architecture.test.ts` thành "đã duyệt <ngày>" (tiền lệ Ruling D21 của T2b).
- Số dòng đo trên `9067d97` (= `main` `ce831f8` + tài liệu). Task A18 đo lại.
- **Đo lại ở Task A18 (2026-09-29, nhánh thi công `worktree-agent-aa4ba1b121f98db87`):**
  - `docs/ARCHITECTURE.md`: KHÔNG đổi trên nhánh ⇒ số dòng như bản gốc — bảng thi hành dòng 145 (4.2/5.5), 147 (5.1), 148 (5.3); Phần II dòng 192 (ranh giới SQL), 194 (bảng mới); dòng "Trạng thái" 15.
  - `src/CLAUDE.md`: KHÔNG đổi ⇒ dòng 14 (module nghiêm), 25 (tiền tố).
  - `src/architecture.test.ts` (mã nhánh thi công MANG SẴN, chú thích "CHỜ CHỦ DUYỆT"): `LEGACY_TABLES` dòng 84 (siết), `NUA_NGHIEM` 103 (siết), `XOA_CUNG_NHAP` 112 (mục 2), `DOC_AUDIT_LOG_WONGUARD` 122 (mục 3), `TABLE_PREFIX` có `ord_` 133 (mục 1), `violations` 348, `FULL_NAME_ORD_PASSENGER_FILES` 628 + bài R-N1-14 630 (mục 7); các bài kèm ở cuối tệp (khối "ADR-0047").
  - Duyệt xong: đổi bốn chú thích "CHỜ CHỦ DUYỆT" (dòng ~99–131, ~626) thành "đã duyệt <ngày>".

## Tóm tắt cho chủ (lời thường)

| Mục | Xin gì | Nếu không duyệt |
|---|---|---|
| 1 | Cho bảng mới của phần "Đơn" mang tên bắt đầu bằng `ord_` | Không làm được chặng đưa đón và danh sách khách theo đúng quy tắc đặt tên |
| 2 | Cho phép **xoá hẳn** chặng và tên khách **khi đơn còn nháp** (lưu nháp xoá rồi ghi lại, như dịch vụ hôm nay). Đơn đã xác nhận thì máy vẫn **cấm** xoá. Đây là một ngoại lệ hẹp của điều "không xoá cứng" trong Hiến chương | Phải đổi cách lưu đơn nháp (việc lớn hơn, cần quyết định mới) |
| 3 | Cho phép tạm (có hạn) câu lệnh mới đọc sổ nhật ký để biết "lần lưu này có thắng không" — cách phần Đơn đang làm từ trước | Cần thêm một "cửa sổ" mới của sổ nhật ký cho phần Đơn đọc (thay đổi giữa hai phần, cần quyết định mới) |
| 4 | Ghi ba điều trên vào tài liệu luật (`docs/ARCHITECTURE.md`, `src/CLAUDE.md`, có thể cả `CLAUDE.md`) cho khớp với máy | Tài liệu luật lệch với máy |
| 7 | (**Mới**) Cột "họ tên hành khách" tên là `full_name` — trùng chữ với một cột bỏ đi của bảng nhân viên mà một hàng rào đang cấm nhắc tới. Xin cho **một tệp** (tệp câu lệnh của chặng/hành khách) được nhắc chữ này; bù lại có bài kiểm riêng bảo đảm câu lệnh đó không bao giờ đụng bảng nhân viên | Phải đổi tên cột (trái ADR-0047 bạn đã duyệt) hoặc bỏ hàng rào cũ |
| 5 | (Chỉ để biết) các hàng rào **siết** thêm | — |
| 6 | (Phát hành 2, soạn sau) | — |

## Mục 1 — NỚI hàng rào kiến trúc: tiền tố `ord_` trong `src/architecture.test.ts`

`TABLE_PREFIX` ở dòng 79 (trên `9067d97`), chú thích tiền tố ở dòng 78.

```diff
-// vc_/vc: ADR-0040 D1 — NỚI hàng rào đã duyệt (Điều 9.4), đã duyệt 2026-09-28 (chủ trả lời 'Duyệt tất cả, có mục Hiến chương'), xem docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md.
-const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing", mnt_: "maintenance", aut_: "auth", ntf_: "thongbao", vc_: "van-chuyen" };
+// vc_/vc: ADR-0040 D1 — NỚI hàng rào đã duyệt (Điều 9.4), đã duyệt 2026-09-28 (chủ trả lời 'Duyệt tất cả, có mục Hiến chương'), xem docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md.
+// ord_: ADR-0047 A3 (bảng mới của orders; bảng cũ orders/order_item/order_service/order_money_adjustment giữ tên) — NỚI hàng rào đã duyệt (Điều 9.4),
+// CHỜ CHỦ DUYỆT ở docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 1.
+const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing", mnt_: "maintenance", aut_: "auth", ntf_: "thongbao", vc_: "van-chuyen", ord_: "orders" };
```

| Thay đổi | Nguồn | Dùng để làm gì | Nếu chủ KHÔNG duyệt |
|---|---|---|---|
| Tiền tố bảng `ord_` → module `orders` | ADR-0047 A3; câu mới của ADR-0002 điều 2 (mục "Câu ADR bị thay" của ADR-0047); Q-AA chủ chốt 2026-09-26 | Hai bảng `ord_transfer_leg` (`0034`), `ord_passenger` (`0035`) | Không có hai bảng này theo đúng luật tên; ADR-0047 không thi công được |

- **Đi kèm (siết, mục 5):** bài "danh sách bảng `legacy` khoá cứng" (T3b). Bảng mới của `orders` **không** trốn được tiền tố bằng cờ `legacy`.
- `VIEW_PREFIX` đã có `ord` (dòng 80): không đổi.
- `ALLOWED_EDGES`, `STRICT`, `LEGACY`, `KHONG_DB`: không đổi.

## Mục 2 — NỚI: ngoại lệ có tên "xoá cứng dòng của đơn nháp" (`XOA_CUNG_NHAP`) — kèm lệch có chủ ý hẹp của Hiến chương 5.5

**Xung đột cần chủ xác nhận (không tự hoà giải — `CLAUDE.md` §2):**
- Hiến chương điều 5.5 (**đã duyệt**, đứng trên ADR) ghi: "không xoá cứng — đóng hiệu lực hoặc `active = 0`".
- ADR-0047 (đã duyệt) ghi rõ: chặng và danh sách khách của **đơn nháp** "xoá và chèn lại cùng lô" khi lưu nháp. Nó dẫn 5.5 là "không xoá cứng **sau xác nhận**".
- ADR-0047 **không** gọi việc này là "lệch có chủ ý", mà cách dùng Hiến chương đòi điều đó ("muốn lệch khỏi một điều khoản phải có ADR ghi 'lệch có chủ ý' + chủ duyệt").
- ⇒ **Duyệt mục này = chủ xác nhận đây là lệch có chủ ý, hẹp, của 5.5.** Câu hỏi Q0 của kế hoạch (mục 13) hỏi đúng điều này bằng lời thường.
- **Câu trả lời Q0 (2026-09-29):** chủ trả lời trực tiếp phiên điều phối, nguyên văn **"Cách 1: chỉ giữ bản cuối"** — đơn NHÁP: chặng và danh sách khách xoá hẳn rồi chèn lại cùng lô khi lưu nháp; đơn đã xác nhận cấm xoá. Chủ đồng ý ghi rõ điều này trong Hiến chương; phần sửa `docs/ARCHITECTURE.md` (2b, 2c) vẫn đi qua tệp này, **chờ chủ duyệt tệp**. Điều phối chuyển lại câu trả lời cho người thi công (không phải lời duyệt tệp).

**Vì sao chỉ hẹp như vậy:**
- dòng của đơn nháp **chưa ai tham chiếu** (Vận chuyển chỉ xếp chặng của đơn đã xác nhận, ADR-0047 A1);
- trigger `*_no_delete` **cấm** xoá khi đơn không còn nháp — lớp CSDL, không chỉ mã;
- dịch vụ (`order_service`) hôm nay đã xoá–chèn lại y hệt (nợ có tên ở bảng thi hành 5.5).
- Không có ngoại lệ thì lưu nháp **không làm được**: chặng trỏ khoá ngoại tới `order_service`, mà lưu nháp xoá–chèn lại dịch vụ (`src/modules/orders/repository.ts:741-761`).

**2a. `src/architecture.test.ts`** — ngay sau khối hằng `KHONG_DB` (dòng 76), và trong `violations` (dòng 293–325):

```diff
+/**
+ * NGOẠI LỆ CÓ TÊN của R-N1-9 ("không xoá cứng bảng mới") — ADR-0047 A1, A2: chặng và hành khách của ĐƠN NHÁP xoá–chèn lại cùng lô khi lưu nháp
+ * (như order_service). Lệch có chủ ý hẹp của Hiến chương 5.5. NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở
+ * docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 2. Chỉ tên trong danh sách; mỗi câu phải có điều kiện đơn nháp TRONG câu,
+ * và bảng đích phải có trigger `<bảng>_no_delete` (cấm xoá khi đơn không còn nháp). Danh sách chỉ được co lại (bài "ngoại lệ thừa").
+ */
+const XOA_CUNG_NHAP: readonly string[] = ["orders.leg_delete_draft", "orders.passenger_delete_draft"];
```

```diff
-  if (isHardDelete(e.sql)) for (const w of writes) if (dict.tables.find((t) => t.name === w)?.legacy !== true) out.push(`xoá cứng bảng ${w} (R-N1-9: …)`);
+  if (isHardDelete(e.sql) && !(useExceptions && XOA_CUNG_NHAP.includes(key)))
+    for (const w of writes) if (dict.tables.find((t) => t.name === w)?.legacy !== true) out.push(`xoá cứng bảng ${w} (R-N1-9: …)`);
```

- `violations` nhận thêm `name` (tuỳ chọn) và `opts.exceptions` (mặc định bật; `false` dùng cho bài "ngoại lệ không thừa": câu trong danh sách PHẢI vi phạm khi tắt ngoại lệ). Mã thật ở nhánh thi công (Task A7) — diff trên là ý chính.
- Bài kèm (siết, cùng commit):
  - (i) mỗi tên trong `XOA_CUNG_NHAP` đang đăng ký, và câu của nó chứa `status = 'draft'`;
  - (ii) bảng đích có trigger `<bảng>_no_delete` trong schema;
  - (iii) bỏ tên khỏi danh sách thì câu đó phải đỏ (ngoại lệ không thừa).

**2b. `docs/ARCHITECTURE.md` Phần I, bảng thi hành, dòng "4.2 / 5.5 Chỉ-thêm, đảo"** (dòng 145 trên `9067d97`) — thêm vào cột "Lệch hiện có":

```diff
-| 4.2 / 5.5 Chỉ-thêm, đảo | … | `order_money_adjustment` có `ON DELETE CASCADE` (0021:7) — lệch 5.5; (…); sổ công nợ chưa có | ADR-0003, ADR-0007 |
+| 4.2 / 5.5 Chỉ-thêm, đảo | … | `order_money_adjustment` có `ON DELETE CASCADE` (0021:7) — lệch 5.5; (…); sổ công nợ chưa có; **lệch có chủ ý hẹp (ADR-0047, chủ duyệt <ngày>):** chặng đưa đón và danh sách hành khách của **đơn nháp** xoá–chèn lại khi lưu nháp — ngoại lệ có tên `XOA_CUNG_NHAP` (`src/architecture.test.ts`), trigger `ord_*_no_delete` cấm xoá khi đơn không còn nháp | ADR-0003, ADR-0007, ADR-0047 |
```

Dòng "Trạng thái" đầu `docs/ARCHITECTURE.md` thêm một vế: "bảng thi hành dòng 5.5 (lệch hẹp đơn nháp), 5.3 (tệp nửa nghiêm của `orders`), 5.1 (L-A1) — ADR-0047, chủ duyệt <ngày>, `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md` mục 2–4".

**2c. `docs/ARCHITECTURE.md` Phần II "Luật dữ liệu", dòng 194** — thêm vế cuối câu "không xoá cứng":

```diff
-… không xoá cứng — đóng hiệu lực hoặc `active = 0`; khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
+… không xoá cứng — đóng hiệu lực hoặc `active = 0` (ngoại lệ có tên duy nhất: dòng `ord_*` của **đơn nháp** xoá–chèn lại khi lưu nháp — ADR-0047, `XOA_CUNG_NHAP`); khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
```

| Nếu chủ KHÔNG duyệt mục 2 |
|---|
| Lưu nháp phải **đóng dòng** thay vì xoá. Khoá ngoại chặng → dịch vụ phải "hoãn kiểm tới cuối giao dịch" (`DEFERRABLE INITIALLY DEFERRED`). Dịch vụ bị bỏ khỏi đơn nháp thì lưu nháp phải thôi xoá–chèn lại dịch vụ, chuyển sang "so khớp theo id" (ADR-0006 điều 1). Đó là quyết định mới, cần ADR, việc lớn hơn nhiều. |

## Mục 3 — NỚI có hạn: câu mới đọc `audit_log` làm lính gác cùng lô (`DOC_AUDIT_LOG_WONGUARD`)

- **Bối cảnh:**
  - `orders` sửa đơn bằng một lô câu lệnh. Câu đầu là `UPDATE` có điều kiện, rồi nhật ký `changes() > 0`, rồi mọi câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` ("lính gác": chỉ chạy nếu chính request này thắng — `docs/ARCHITECTURE.md` Phần II dòng 215; `src/modules/orders/repository.ts:619`).
  - Đây là **nợ LEGACY có tên** của `orders` (`src/architecture.test.ts:65-68`: "`wonGuard` của orders (đọc audit_log) ở lại tới N2").
- **Vấn đề:**
  - câu mới chạm `ord_*` phải qua bài EXPLAIN (ADR-0047 A3);
  - bài EXPLAIN đỏ "đọc TRỰC TIẾP bảng audit_log của module audit";
  - view `v_aud_order_event` lọc bỏ hành động `updated`/`trip_updated` (`migrations/0025:53-56`) nên không thay được.
- **Đề xuất:** ngoại lệ có tên, **có hạn**, đúng các câu cùng lô với lưu nháp / sửa chuyến / xác nhận.

```diff
+/**
+ * NỢ CÓ TÊN, CÓ HẠN (ADR-0047 A3 "ghi nợ có tên, có hạn"): câu của tệp nửa nghiêm được đọc thẳng `audit_log` CHỈ trong lính gác `wonGuard`
+ * (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`) cùng lô với updateDraftOrder / updateTrip / confirmOrder / route chặng / route hành khách.
+ * NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 3. Quá hạn → đỏ.
+ * Gỡ khi: `orders` lên STRICT với lính gác qua view công bố của `audit`, hoặc ADR khác chọn cơ chế khác.
+ */
+const DOC_AUDIT_LOG_WONGUARD = {
+  han: "2027-03-31",
+  ten: [
+    "orders.leg_delete_draft", "orders.leg_insert_guarded", "orders.leg_update_guarded", "orders.leg_close_guarded", "orders.passenger_delete_draft",
+    "orders.passenger_insert_guarded", "orders.passenger_void_guarded", "orders.order_touch_guarded", "orders.service_mirror_update_guarded",
+  ],
+} as const;
```

- **Danh sách tên ĐÃ CHỐT ở Task A7 (2026-09-29, người thi công) — 9 tên**, mọi tên đều có lính gác. Khác bản dự thảo của kế hoạch:
  - câu đầu lô (tự quyết thắng/thua, KHÔNG đọc `audit_log`) mang tên riêng và **không** vào danh sách: `orders.order_touch` (route thêm chặng, route hành khách), `orders.leg_update_checked` (route sửa chặng), `orders.leg_close_checked` (route đóng chặng);
  - `orders.leg_fill_date_on_confirm` **không** vào danh sách: câu này phải chạy TRƯỚC câu đổi trạng thái (Ruling R4c — trigger xét lúc đổi), nên không đứng sau dòng nhật ký được; nó chỉ có điều kiện "đơn còn nháp", không đọc `audit_log`;
  - `orders.leg_insert`, `orders.passenger_insert` (không lính gác) chỉ dùng khi LẬP đơn (lô mới hoàn toàn) — không vào danh sách;
  - tên có lính gác đặt đuôi `_guarded` / `_draft`.
- `violations` bỏ qua **đúng** vi phạm "đọc TRỰC TIẾP bảng audit_log" cho các tên trên; mọi vi phạm khác của cùng câu vẫn đỏ.
- **Bài kèm (siết):**
  - hạn ≥ hôm nay (giờ VN) — quá hạn thì đỏ (khuôn `docs/quyen-hoan.json`);
  - tên trong danh sách không còn đăng ký, hoặc không còn đọc `audit_log`, → đỏ ("ngoại lệ thừa");
  - (thêm ở A7) mỗi câu trong danh sách nhắc `audit_log` ĐÚNG MỘT lần và ở ĐÚNG dạng lính gác `EXISTS (SELECT 1 FROM audit_log WHERE id = ?N)`.
- **Hạn đề xuất `2027-03-31`** (khoảng 6 tháng). Chủ chốt ngày khác thì sửa một chuỗi.
- **Lưu ý khi chốt danh sách:** một câu vừa dùng **có** lính gác (cùng lô, sau câu thắng) vừa dùng **không** lính gác (câu mở đầu của route 2, 3 — tự nó là câu `UPDATE` có điều kiện) phải tách thành **hai tên SQL**. Chỉ tên có lính gác vào danh sách; không thì bài "ngoại lệ thừa" đỏ với tên không đọc `audit_log`.

**3b. `docs/ARCHITECTURE.md` Phần I, bảng thi hành dòng "5.3 Modular monolith"** — cột "Lệch hiện có" thêm:

```diff
-| 5.3 Modular monolith | … | module `LEGACY` (`accounts`, `audit`, `catalog`, `orders`); trigger đọc chéo module **chưa có bài kiểm** | ADR-0002, ADR-0008 |
+| 5.3 Modular monolith | … | module `LEGACY` (`accounts`, `audit`, `catalog`, `orders`) — riêng `orders` có tệp "nửa nghiêm" `orders/chang-hanh-khach-repo.ts` (ADR-0047) chịu bài EXPLAIN, trừ lính gác đọc `audit_log` (nợ có hạn `DOC_AUDIT_LOG_WONGUARD`); trigger đọc chéo module **chưa có bài kiểm** | ADR-0002, ADR-0008, ADR-0047 |
```

| Nếu chủ KHÔNG duyệt mục 3 |
|---|
| Cần một view công bố mới của `audit` chỉ có cột `id` (vd `v_aud_log_id`) để làm lính gác. Đó là hợp đồng mới giữa hai phần, cần điều phối/chủ quyết; thêm một migration nhỏ trong `0034`. Không đổi gì cho người dùng. |

## Mục 4 — Tài liệu luật cho khớp máy (AI không tự sửa)

**4a. `docs/ARCHITECTURE.md`:**
- Phần II "Ranh giới SQL của module nghiêm" (dòng 192), thêm câu cuối: "Riêng `orders` có **tệp nửa nghiêm** `orders/chang-hanh-khach-repo.ts` (hằng `NUA_NGHIEM`, ADR-0047): mọi câu SQL mới của `orders` nằm ở tệp đó, đăng ký bằng `defineSql`, chịu bài `EXPLAIN` và bài chuỗi thô; hai ngoại lệ có tên ở `src/architecture.test.ts` (`XOA_CUNG_NHAP`, `DOC_AUDIT_LOG_WONGUARD` có hạn)."
- Phần II dòng 194: danh sách tiền tố thêm "`ord_` từ `0034_chang_dua_don`" (sau `vc_`); vế ngoại lệ ở mục 2c.
- Phần I bảng thi hành dòng "5.1 Bất biến sát dữ liệu", cột "Lệch hiện có" thêm: "danh sách hành khách nhiều hơn số khách hiệu lực chỉ gắn cờ ở mã + kiểm định kỳ `R-ORD-9` (L-A1 của ADR-0047 — số khách sau sửa nằm trong JSON)".

**4b. `src/CLAUDE.md`:**
- Dòng 14, câu cuối, thêm: "Riêng `orders`: SQL mới chỉ ở tệp nửa nghiêm `orders/chang-hanh-khach-repo.ts` (`defineSql`, EXPLAIN) — không viết câu `ord_*` thô trong `repository.ts`."
- Dòng 25: danh sách tiền tố thêm `ord_` sau `vc_`.
- (Mục 7, người thi công thêm ở A18) Dòng 14 câu vừa thêm nối tiếp: "… Chữ `full_name` (cột họ tên hành khách `ord_passenger.full_name`) chỉ được xuất hiện trong chuỗi SQL của tệp đó, đọc ra dưới bí danh — ngoại lệ có tên của bài R-N1-14."
- (Tuỳ chọn, thêm ở A18) Mục "Dữ liệu": "Giờ đón / điểm đón của dịch vụ nay ĐỌC từ chặng đưa đón `ord_transfer_leg` (dẫn xuất `chieuDiDau`); `order_service.pickup_time/pickup_place` chỉ còn GHI KÉP ở phát hành 1 — không viết SQL mới đọc hai cột này."

**4c. `web/CLAUDE.md` — Phần B điền (Task B7):** các dòng bảng "đổi tệp nào → chạy kịch bản Chrome nào" cho màn chặng + hành khách, sửa dòng `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` (dòng 32) nếu bộ kịch bản đổi.

**4d. `CLAUDE.md` gốc §10 "Bẫy hay dính" (tuỳ chọn, chủ chọn có / không):** thêm một gạch:

> - **Giờ đón / điểm đón** nay ở **chặng đưa đón** `ord_transfer_leg` (ADR-0047). Phát hành 1: `order_service.pickup_time/pickup_place` chỉ là **bản sao ghi kép** (đừng đọc); phát hành 2: cột chết. Lưu nháp xoá–chèn lại chặng và hành khách: thứ tự lô cố định (xoá chặng **trước** xoá dịch vụ, chèn chặng **sau** chèn dịch vụ) — `docs/CHANGE-GUIDE.md` công thức chặng.

Lý do: bẫy này dễ dính (khoá ngoại làm đổ cả lô lưu nháp) và không có ở tài liệu tự nạp nào khác. Chủ không muốn thêm thì bỏ, `CHANGE-GUIDE` vẫn có.

## Mục 5 — SIẾT (để chủ biết; không cần duyệt riêng — Điều 9.4 cho phép siết)

| Hàng rào mới | Chặn gì | Task |
|---|---|---|
| Khoá danh sách bảng `legacy` (T3b) | Bảng mới không tiền tố trốn luật tên bằng cờ `legacy` | A1 |
| `NUA_NGHIEM` — EXPLAIN + bài chuỗi thô cho tệp SQL mới của `orders` | Câu mới của `orders` đọc thẳng bảng module khác, ghi bảng khác, SQL thô | A1, A2 |
| Bài "ngoại lệ không thừa" + hạn của mục 2, 3 | Ngoại lệ phình ra âm thầm; nợ quá hạn | A7 |
| Quét "chỉ `orders` đọc `after_json` / `order_money_adjustment`" | Đường tính số khách thứ hai (bài học Đợt E) | A2 |
| Quét "nơi gọi `soKhachHieuLuc` / `hanhKhachChoChuyen` đứng sau `can()`" | Module khác gọi hàm công bố (có tên khách) mà không kiểm quyền | A13 |
| Hàng rào toàn tuyến "nhật ký không tên, không năm sinh" + `R-ORD-10` | Tên, năm sinh khách lọt vào nhật ký / Bảng tin / danh sách đơn | A14, A15 |
| Bài khoá giá trị `order.passenger.write` = `order.modify` + ghim hàng Đối tác, Tài xế | Ai đó nới ô nhập tên khách khác ô sửa đơn | A12 |
| Bài khoá văn bản: `POST/PUT /api/orders` có lời hỏi `order.passenger.write` | Quên hỏi ô ở đường nháp (giá trị hôm nay trùng `order.modify` nên test hành vi không bắt được) | A12 |
| 13 trigger mới của chặng và hành khách (kế hoạch mục 1.1) | Xoá / sửa đè sau xác nhận; chặng lệch đơn; chuỗi tên sai | A4, A5 |
| `R-ORD-7`…`R-ORD-12` | Lệch ghi kép; nơi trả chưa chốt; danh sách vượt số khách; chuỗi hỏng; dòng `source = 'DRIVER'` | A15 |

## Mục 6 — Phát hành 2 (người thi công Phần C điền ở Task C5)

- `order_service.pickup_time/pickup_place` vào `deprecatedColumns` + bài "cột chết không được đọc" (quét chữ + EXPLAIN mức cột): **siết**, không cần duyệt riêng.
- `0036` (trigger khoá cột cũ): **tuỳ chọn**, điều phối quyết (Ruling R11). Nếu làm, ghi ở đây kèm câu "sau khi áp, không lùi Worker về phát hành 1". **Điều phối chốt 2026-09-29: KHÔNG làm `0036`, trả số.**
- Dòng `CLAUDE.md` §10 (mục 4d) sửa vế "phát hành 1 / phát hành 2" thành trạng thái thật.

## Mục 7 — NỚI (mới, người thi công thêm ở Task A7, 2026-09-29): ngoại lệ có tên của bài R-N1-14 cho cột `ord_passenger.full_name`

- **Bối cảnh:** bài R-N1-14 (`src/architecture.test.ts`, "không đọc staff.role / staff.full_name") quét MỌI tệp `src/**/*.ts` (trừ test) và `scripts/*.mjs`; dòng mã nào có chữ `\bfull_name\b` là đỏ, chỉ miễn hai tệp của `staff` (ghi hằng `''`). Mục đích: không ai đọc cột CHẾT `staff.full_name` (ADR-0005).
- **Va chạm:** ADR-0047 A2 (đã duyệt) chốt tên cột họ tên hành khách là `ord_passenger.full_name`. Câu SQL của tệp nửa nghiêm (`src/modules/orders/chang-hanh-khach-repo.ts`) buộc phải nhắc chữ này (chèn, đọc) ⇒ bài R-N1-14 đỏ. Kế hoạch thi công chưa thấy va chạm này (ghi ở nhật ký A0 bước 10).
- **Đề xuất (mã nhánh thi công mang sẵn, chú thích CHỜ CHỦ DUYỆT):**

```diff
+/**
+ * NGOẠI LỆ CÓ TÊN của R-N1-14 (ADR-0047 A2): cột `ord_passenger.full_name` (họ tên hành khách — tên cột do ADR chốt) trùng TÊN với cột chết `staff.full_name`.
+ * Chỉ tệp SQL nửa nghiêm của orders được nhắc chữ `full_name`; bù lại: bài "câu SQL có full_name không chạm bảng staff" ở cuối tệp (EXPLAIN) + bài
+ * EXPLAIN của NUA_NGHIEM cấm tệp đó đọc thẳng bảng `staff`. NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở
+ * docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md mục 7.
+ */
+const FULL_NAME_ORD_PASSENGER_FILES = new Set(["src/modules/orders/chang-hanh-khach-repo.ts"]);
 test("R-N1-14: không đọc staff.role / staff.full_name; không SELECT * FROM staff", () => {
-  const WRITE_ONLY_FILES = new Set(["src/modules/staff/repository.ts", "scripts/staff-lib.mjs"]);
+  const WRITE_ONLY_FILES = new Set(["src/modules/staff/repository.ts", "scripts/staff-lib.mjs", ...FULL_NAME_ORD_PASSENGER_FILES]);
```

- **Bù lại (siết, cùng commit):** bài mới "ngoại lệ R-N1-14": (i) tệp được miễn phải là tệp nửa nghiêm (có bài EXPLAIN) và phải còn nhắc `full_name` (không thừa); (ii) MỌI câu SQL đã đăng ký của `orders` có chữ `full_name` phải chạm `ord_passenger` và KHÔNG chạm bảng `staff` (EXPLAIN); (iii) chống bài rỗng. Mã TS không bao giờ gõ chữ `full_name`: câu đọc trả họ tên dưới bí danh `ten`. `scripts/audit-checks.mjs` (R-ORD-9/11) không cần cột này.
- **P16 (2026-09-29):** bỏ ngoại lệ → `not ok 24 - R-N1-14 …` đỏ; cắm câu `SELECT full_name FROM staff` vào tệp nửa nghiêm → bài EXPLAIN đỏ + bài ngoại lệ đỏ (`orders.thu_fn: câu có full_name phải chạm ord_passenger`).

| Nếu chủ KHÔNG duyệt mục 7 |
|---|
| (a) Đổi tên cột thành tên khác (vd `passenger_name`) — trái chữ của ADR-0047 A2, cần sửa ADR (chủ duyệt); **hoặc** (b) thu hẹp bài R-N1-14 thành "không đọc cột `full_name` của BẢNG `staff`" bằng EXPLAIN mức cột (như bài cột chết của phát hành 2) — cũng là đổi hàng rào, cần chủ duyệt. Cách đề xuất ở trên hẹp nhất. |
