# G17 — báo tài xế khi `PUT /api/orders/:id/trip` đổi ngày / giờ đón chặng đã xếp (kế hoạch thi công, 2026-10-09)

> Hồ sơ có ngày. Nguồn chuẩn: sổ thi công `2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md` mục **G17** (sáu điều kiện) và G8; bảng việc `2026-10-08-van-chuyen-goi-a-c-danh-sach-viec.md` việc 6.
> Căn cứ: ADR-0052 D6.2 (dòng MQ-07), ADR-0096 :59; ADR-0104 Đ2.4 (route này KHÔNG gọi máy đồng bộ — giữ nguyên). Không migration: view `v_aud_order_change` (0086)
> đã suy `leg_id` từ `target_id` cho `order_leg_updated`. Không thêm `trip_updated` vào `HANH_DONG_TIN_GIO_HEN`.

## Khuôn `detail` của dòng `order_leg_updated` do `PUT /trip` ghi (điều kiện 2)

`moTaChang(<tên dịch vụ>, trước, sau)` của `src/shared/chang-dua-don.ts` — CÙNG hàm viết của route sửa chặng, nên hàm đọc `phanDoiCuaTin` đọc đúng khuôn chặng:

    "<Chiều đi|Chiều về> · <tên dịch vụ, che dãy ≥ 8 số>: ngày đón A → B; giờ đón C → D" [+ đuôi đặt gấp của `kemDatGap` khi lệnh mang `datGap`]

- `trước` / `sau` chỉ mang chiều, ngày đón, giờ đón; nơi đón / nơi trả truyền GIỐNG NHAU ở hai bên ⇒ không bao giờ có phần "nơi đón …" (luật cũ của `PUT /trip`: nhật ký không chứa giá trị địa điểm — e2e `trip.mjs` khối 12; đổi nơi vẫn chỉ ghi "đổi điểm đón" ở dòng `trip_updated`).
- Chỉ chặng thao tác `update` mà ngày đón HOẶC giờ đón đổi mới có dòng. Thêm / đóng chiều đi (thân cũ) không thêm dòng (ngoài phạm vi G17).
- Bài: ca chỉ đổi ngày ⇒ `phanDoiCuaTin("order_leg_updated", detail).gioHen === true`, phần cụ thể "Chiều đi: ngày đón …".

## Lô ghi `updateTrip` (điều kiện 1, 4)

Thứ tự: `UPDATE orders` → `trip_updated` (`changes() > 0`) → câu dịch vụ → với mỗi thao tác chặng: câu chặng (có lính gác) và, nếu là `update` có `detail` chặng, NGAY SAU nó
`auditStatement(order_leg_updated, targetType "order", targetId = id chặng, at = cùng mốc, detail)` với điều kiện `changes() > 0` (câu chặng có lính gác đã thắng ⇔ có dòng).
Không câu mới đọc `audit_log` từ `orders` (không chạm danh sách `DOC_AUDIT_LOG_WONGUARD`).

Trần: tối đa `2 + MAX_SERVICES × (1 + 2 × MAX_CHANG_MOI_DICH_VU + 1)` = 442 câu (trước G17: 232). Bài: đếm câu lô thật qua `db` giả với ca xấu nhất, so công thức,
và công thức ≤ 900 (trần D1 1000 câu / lần gọi Worker theo tài liệu — cách áp cho `batch` chưa kiểm trên D1 thật; chừa 100 câu cho phần đọc của route).

## Gõ cửa màn hình khoá (điều kiện 3)

`doi_vua_ghi` thôi `LIMIT 1`: trả MỌI dòng đổi của người làm trên đơn, từ `batDau`, ở MỐC MỚI NHẤT (một lô — cùng định nghĩa lô của `locHopThongBao`).
`dayGoCuaDoi` ghép chuyến cho cả lô (`ganChuyenCuaChang`) rồi `dayGoCua(env, { loDoi }, …)`; `nguoiNhanDay` nhận biến thể `{ loDoi: DongDon[] }` (biến thể `{ don }` giữ cho đường dựng sẵn của gốc lắp ráp).

## Bài đỏ trước (mỗi bài: sửa cố ý → đỏ nguyên văn → hoàn nguyên)

1. Thuần: `keHoachChangTrip` dời ngày ⇒ thao tác `update` mang `detail` chặng; `gioHen === true`; đổi nơi (thân cũ) không có phần nơi.
2. Khung thử route (`tin-doi-hop.test.ts`): chặng đã xếp, Quản trị `PUT /trip` dời ngày ⇒ mỗi chặng đổi một dòng `order_leg_updated` (target = chặng, cùng mốc với `trip_updated`); tài xế đang lái có tin "Văn phòng vừa đổi giờ đón …"; người lập (Bán hàng) đúng một tin "gọi báo khách"; người sửa không.
3. Gõ cửa: HAI chặng trên HAI chuyến (DRIVER, DRIVER2), một lệnh `PUT /trip` dời ngày ⇒ gõ cửa cả hai tài xế + người lập, không người sửa (với `LIMIT 1` tối đa một tài xế được gõ — đỏ chắc chắn).
4. Trần lô `updateTrip` như trên.
5. e2e `tin-chuyen.mjs`: sau khi xếp, `PUT /trip` dời ngày ⇒ tài xế nhận tin giờ hẹn (D1 local thật, view thật).

Việc lớn (nhật ký chỉ-thêm): kiểm độc lập chỉ-đọc do điều phối giao sau khi thi công xong.
