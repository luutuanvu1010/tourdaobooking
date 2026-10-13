# Bài "đỏ" để phiên thi công sau dùng

> Không có lỗi Critical. Dưới đây là bài đỏ cho lỗi High (D-1) và cho hai Medium quan trọng (D-2, C-2). Các bài này **chưa nằm trong cây mã**; phiên thi công đặt vào `tests/audit/` hoặc `src/` theo khuôn sẵn có. Khung thử `tests/audit/harness.mjs` và `tests/audit/dieu-phoi-khung.mjs` là cái người kiểm đã dùng; bản gốc các bài thử nằm ở thư mục tạm của phiên (mất khi dọn máy), nên phần cốt lõi chép lại đây.

## D-1 — Đối tác không được thấy lý do/người duyệt nội bộ (đã chạy: bài hiện đỏ khi đổi thành khẳng định "không thấy")

```js
import { test } from "node:test";
import assert from "node:assert/strict";
const K = await import("<repo>/tests/audit/dieu-phoi-khung.mjs");
test("Đối tác không thấy lý do nội bộ của hoàn cọc", async () => {
  const w = K.setup();
  const LY_DO = "Khách quen của giám đốc, hoàn thêm dù quá hạn, đừng báo đối tác";
  const pr = await w.call("POST", "/api/orders", { as: K.PARTNER, body: { customerName: "Khách Đối Tác", customerPhone: "0933333333",
    services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: K.NGAY, legs: [] }] } });
  const id = pr.json.order.id;
  await w.call("POST", `/api/orders/${id}/status`, { as: K.PARTNER, body: { status: "confirmed" } });
  await w.call("POST", `/api/orders/${id}/payments`, { as: K.PARTNER, body: { soTien: 300000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  const lt = (await w.call("GET", `/api/orders/${id}/payments`, { as: K.ACC })).json.lanThu[0];
  await w.call("POST", `/api/ledger/company-receipts/${lt.id}/confirm`, { as: K.ACC, body: {} });
  await w.call("POST", `/api/orders/${id}/status`, { as: K.SUP, body: { status: "cancelled", lyDo: "THOI_TIET" } });
  await w.call("POST", `/api/orders/${id}/coc/duyet`, { as: K.SUP, body: { loai: "hoan", soTien: 100000, lyDo: LY_DO } });
  const pay = await w.call("GET", `/api/orders/${id}/payments`, { as: K.PARTNER });
  const ord = await w.call("GET", `/api/orders/${id}`, { as: K.PARTNER });
  assert.ok(!JSON.stringify(pay.json).includes(LY_DO), "payments lộ lý do");
  assert.ok(!JSON.stringify(ord.json.history).includes(LY_DO), "history lộ lý do");
  assert.ok(!JSON.stringify(ord.json.history).includes("Kế Toán"), "history lộ tên Kế toán");
});
```

Kết quả hiện tại (đã chạy, 13/10): `PARTNER payments.coc.khoanDuyet` có `lyDo` và `nguoiDuyet:"Chủ"`; `PARTNER history` có `["ledger_company_received","Kế Toán"]`, `["cancelled","Chủ"…]`, `["deposit_refund_approved","Chủ", LY_DO]`.

**Bài phụ nên thêm**: duyệt mọi hành động trong `src/shared/audit-actions.ts`, gieo mỗi hành động một dòng `audit_log` cho một đơn của Đối tác, rồi khẳng định Đối tác chỉ thấy các hành động trong một danh sách cho phép tường minh. Bài này chặn loại dòng mới tự lộ trong tương lai.

## D-2 — HR không được có đường xem đơn

Các bước (đã chạy, đúng): HR `POST /api/staff` tạo tài khoản vai `SALES` → 201 và nhận PIN trong phản hồi; `POST /api/auth/login` bằng PIN đó → 200; `GET /api/orders` bằng tài khoản mới → 200 (kỳ vọng sau khi vá: 403 hoặc không tạo được; hoặc quyết định chủ chấp nhận thì ghi vào ADR-0071 §16).

## C-2 — Trần điều chỉnh sổ phải cộng dồn

Đơn phải thu 500.000, đã thu 300.000. Gửi hai lần `POST /api/ledger/adjustments` {loại điều chỉnh, tăng nợ 500.000}. Kỳ vọng: lần hai bị 409 `adjustment_exceeds_cap`. Hiện: 201, 201, số dư nhân viên với công ty = 1.000.000.

## Hai bài Medium khác (đã chạy trong thư mục tạm của phiên)

- C-1: sau `POST /api/pricing/hoa-hong` {PER_PAX, moiKhach 300000} và xác nhận đơn đại lý 200.000/1 khách, kỳ vọng `POST` bị 400 hoặc `giaDaiLy >= 0`; hiện trả −100000.
- B-1: `PUT /api/orders/:id/trip` với `checkinDate 2001-01-01` và `pickupTime` sau `departTime`, kỳ vọng 400; hiện 200.
- F-1: hàm thuần `planSync` với 5 dịch vụ cũ và 1 dòng lỗi giá, kỳ vọng `missing: []`; hiện `['T1']`.
