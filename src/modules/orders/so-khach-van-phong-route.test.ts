// VĂN PHÒNG SỬA SỐ KHÁCH SAU XÁC NHẬN — route thật `POST /api/orders/:id/money-edit` (ADR-0063 D1, chủ duyệt 2026-10-08) qua khung thử (ứng dụng thật + SQLite).
//
// TIÊU CHÍ NGHIỆM THU (viết TRƯỚC khi làm — gói A2; mỗi tiêu chí có ít nhất một bài dưới đây hoặc ghi rõ nơi khác):
//  TC1 Quyền: Bán hàng đơn MÌNH lập → 200; Bán hàng đơn người khác lập → 403 kể cả đang phụ trách đơn đó; tài khoản lai Bán hàng + Hướng dẫn viên đang phụ trách
//      đơn người khác lập → 403 (route KHÔNG truyền `assigned`); Kế toán, Quản trị, Toàn quyền → 200; Hướng dẫn viên (kể cả đang phụ trách), Đối tác, Thực tập,
//      Tài xế, Tài xế đối tác, Nhân sự → 403. Mọi 403 không ghi dòng điều chỉnh, không ghi nhật ký.
//  TC2 Thứ tự từ chối: mã đơn sai dạng / không có → 404; 403 trước 409; "Đã giao" → 409 `order_delivered` TRƯỚC khi đọc thân; đơn nháp → 409 (sửa trong form);
//      đơn huỷ → 409; thân sai → 400; thua chỉ mục `seq` (người khác vừa ghi) → 409 `stale`, cả lô không để lại gì.
//  TC3 Lý do mã đóng (ADR-0023 điều 4): bốn mã nhận; thiếu / lạ → 400; thân có chữ lý do tự gõ hay trường lạ (kể cả "Khác" kèm ghi chú) → 400, không ghi.
//      Nhật ký ghi NHÃN của mã, không bao giờ chứa dãy số.
//  TC4 Một luật tiền: máy chủ tính bằng `planMoneyEdit` — thân gửi số tiền → 400; cùng đầu vào thì tiền sau sửa bằng ĐÚNG số đường hướng dẫn viên tính; dịch vụ
//      nhập tay giữ nguyên tiền và vẫn được cộng; giảm giá giữ nguyên.
//  TC5 Nhật ký + tin: hành động `order_money_adjusted` ("Sửa số khách (văn phòng)"), id nhật ký = id dòng điều chỉnh, người ghi = người sửa; `detail` theo khuôn
//      A3 "số khách: <tên>: người lớn A → B · lý do: <nhãn>"; tin "đơn đổi sau xác nhận" tự tới người lập + hướng dẫn viên phụ trách (không tới người sửa).
//  TC6 Số khách y nguyên → 200 `daGhi: false`, không dòng mới, không nhật ký.
//  TC7 Văn phòng sửa được cả sau ngày đi (khác hướng dẫn viên).
//  TC8 Giảm giá > tiền dịch vụ sau khi bớt khách: KHÔNG chặn — 200, dòng được ghi, phản hồi mang câu cảnh báo; phải thu KẸP 0 (ADR-0109); hoàn hết rồi Đã giao,
//      Hoàn thành được (TC8b); chưa trả đồng nào cũng Đã giao được (TC8c); đơn huỷ (TC8d); khoá giamGiaHieuLuc (TC8e).
//  TC9 Bảng tin: route gọi `baoThayDoi` đúng một lần sau khi ghi (bài src/bang-tin-guard.test.ts).
//  TC10 Đường hướng dẫn viên `handler-money-edit` giữ nguyên hành vi (bài cũ: src/modules/dispatch/sua-so-khach.test.ts, money-edit-plan.test.ts, …; ở đây so số).
//  TC11 Chỗ cho ADR-0104 Đ2: phần ghi đơn soạn thành danh sách câu CHƯA chạy kèm `auditId` sinh trước, route chạy MỘT `db.batch` (bài tĩnh
//      src/so-khach-mot-luat-tien.test.ts; ở đây: id nhật ký = id dòng điều chỉnh).
//  TC12 GET chi tiết đơn: `suaSoKhach` có (loại khách sửa được theo BẢN CHỤP GỐC — loại đã về 0 vẫn còn) khi người xem sửa được; `null` với người khác / nháp /
//      đã giao. Hàm ẩn/hiện của giao diện (`duocSuaSoKhachVanPhong`) bằng đúng quyết định của route cho mọi quyền đơn lẻ.
//  TC13 Giao diện: nút "Sửa số khách dịch vụ" chỉ hiện khi `duocSuaSoKhachVanPhong`; bảng bốn lý do, không ô chữ; lưu → tải lại đơn; câu tổng âm hiện (kịch bản Chrome).
//  TC14 Sổ vàng: golden/sua-so-khach-van-phong.json khớp từng đồng qua mã thật (src/so-vang-sua-so-khach.test.ts); ca hoa hồng chỉ trên giấy (chưa có mã ADR-0077).
//  TC15 `npm run typecheck` 0 lỗi, `npm test` 0 đỏ, e2e (`tests/e2e/sua-so-khach.mjs` + orders, so-tien, thongbao, dispatch) xanh.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { AUDIT_ACTIONS } from "../../shared/audit-actions.ts";
import { CAU_GIAM_GIA_VUOT, LY_DO_SUA_SO_KHACH, MA_LY_DO_SUA_SO_KHACH, duocSuaSoKhachVanPhong } from "../../shared/so-khach-van-phong.ts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";

const ID = {
  SALES: "11111111-1111-4111-8111-111111111111", // người lập mọi đơn thử
  SALES_B: "22222222-2222-4222-8222-222222222222",
  ACC: "33333333-3333-4333-8333-333333333333",
  FIELD: "44444444-4444-4444-8444-444444444444",
  SUPER: "55555555-5555-4555-8555-555555555555",
  ADMIN: "66666666-6666-4666-8666-666666666666",
  PARTNER: "77777777-7777-4777-8777-777777777777",
  INTERN: "88888888-8888-4888-8888-888888888888",
  DRIVER: "99999999-9999-4999-8999-999999999999",
  DRIVER_PARTNER: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  HR: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  LAI: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", // tài khoản lai Bán hàng + Hướng dẫn viên
} as const;
const TEN: Record<keyof typeof ID, string> = {
  SALES: "An", SALES_B: "Bình", ACC: "Cúc", FIELD: "Dũng", SUPER: "Em", ADMIN: "Giang", PARTNER: "Hạnh", INTERN: "Khoa", DRIVER: "Lâm", DRIVER_PARTNER: "Minh",
  HR: "Nga", LAI: "Oanh",
};
const QUYEN: Record<keyof typeof ID, PermissionCode[]> = {
  SALES: ["SALES"], SALES_B: ["SALES"], ACC: ["ACCOUNTING"], FIELD: ["FIELD"], SUPER: ["SUPER_ADMIN"], ADMIN: ["ADMIN"], PARTNER: ["PARTNER"], INTERN: ["INTERN"],
  DRIVER: ["DRIVER"], DRIVER_PARTNER: ["DRIVER_PARTNER"], HR: ["HR"], LAI: ["SALES", "FIELD"],
};

function setup() {
  const w = world();
  (Object.keys(ID) as (keyof typeof ID)[]).forEach((k, i) => seedStaff(w.sqlite, { id: ID[k], phone: `09000001${String(i).padStart(2, "0")}`, name: TEN[k], perms: QUYEN[k] }));
  w.sqlite.exec(
    "INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 50000, 1, '2026-01-01', '2026-01-01')",
  );
  return w;
}
/** Ngày theo giờ VN, lệch `n` ngày so với hôm nay. */
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
type Pax = { adult: number; child: number; senior: number; infant: number };
const P = (adult: number, child = 0, infant = 0): Pax => ({ adult, child, senior: 0, infant });

/** Đơn của SALES (Tour đảo, mặc định 2 người lớn), xác nhận ngay (trừ khi `nhap`). `extra` = dịch vụ thêm (vd nhập tay). */
async function taoDon(w: any, o: { pax?: Pax; discount?: number; nhap?: boolean; extra?: unknown[] } = {}) {
  const r = await w.call("POST", "/api/orders", {
    as: ID.SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", discount: o.discount ?? 0,
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: o.pax ?? P(2), catalogPriceSeen: { adult: 500000, child: 300000, infant: 50000 }, departDate: vnDay(3) }, ...(o.extra ?? [])],
    },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  if (!o.nhap) assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: ID.SALES, body: { status: "confirmed" } })).status, 200);
  return { id, code: r.json.order.orderCode as string, svc: r.json.order.services[0].id as string, services: r.json.order.services as { id: string }[] };
}
const giao = async (w: any, orderId: string, staffId: string) => assert.equal((await w.call("PUT", `/api/orders/${orderId}/handler`, { as: ID.SALES, body: { staffId } })).status, 200);
const sua = (w: any, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/money-edit`, { as, body });
const than = (svc: string, pax: Pax, lyDo = "THEM_NGUOI") => ({ lyDo, services: [{ id: svc, pax }] });
const soDong = (w: any, orderId: string) => w.q("SELECT COUNT(*) AS n FROM order_money_adjustment WHERE order_id = ?", orderId)[0].n as number;
const soNhatKy = (w: any, orderId: string) => w.q("SELECT COUNT(*) AS n FROM audit_log WHERE order_id = ?", orderId)[0].n as number;
const dongCuoi = (w: any, orderId: string) =>
  w.q(
    `SELECT a.id, a.subtotal_before, a.subtotal_after, a.after_json, l.id AS audit_id, l.action, l.staff_id, l.detail
     FROM order_money_adjustment a JOIN audit_log l ON l.id = a.id WHERE a.order_id = ? ORDER BY a.seq DESC LIMIT 1`,
    orderId,
  )[0];

// ---------------------------------------------------------------- TC1 quyền

test("TC1: chỉ người lập (Bán hàng), Kế toán, Quản trị, Toàn quyền sửa được; Bán hàng / tài khoản lai ĐANG PHỤ TRÁCH đơn người khác lập → 403; người khác → 403; 403 không ghi gì", async () => {
  const w = setup();
  const d = await taoDon(w);
  await giao(w, d.id, ID.SALES_B); // Bán hàng B đang phụ trách đơn của A
  const dLai = await taoDon(w);
  await giao(w, dLai.id, ID.LAI); // tài khoản lai đang phụ trách đơn của A
  const dHdv = await taoDon(w);
  await giao(w, dHdv.id, ID.FIELD); // hướng dẫn viên đang phụ trách

  const tuChoi: [keyof typeof ID, string][] = [
    ["SALES_B", d.id], ["LAI", dLai.id], ["FIELD", dHdv.id], ["PARTNER", d.id], ["INTERN", d.id], ["DRIVER", d.id], ["DRIVER_PARTNER", d.id], ["HR", d.id],
  ];
  for (const [ai, orderId] of tuChoi) {
    const [dong, nk] = [soDong(w, orderId), soNhatKy(w, orderId)];
    const r = await sua(w, ID[ai], orderId, than(orderId === d.id ? d.svc : orderId === dLai.id ? dLai.svc : dHdv.svc, P(3)));
    assert.equal(r.status, 403, `${ai}: ${r.text}`);
    assert.match(r.json.error.message, /[À-ỹ]/, `${ai}: câu tiếng Việt`);
    assert.deepEqual([soDong(w, orderId), soNhatKy(w, orderId)], [dong, nk], `${ai}: 403 không ghi gì`);
  }

  // 200: người lập, Kế toán, Quản trị, Toàn quyền — mỗi lần một số khách mới ⇒ mỗi lần đúng một dòng + một nhật ký.
  let n = 2;
  for (const ai of ["SALES", "ACC", "ADMIN", "SUPER"] as const) {
    n += 1;
    const r = await sua(w, ID[ai], d.id, than(d.svc, P(n)));
    assert.equal(r.status, 200, `${ai}: ${r.text}`);
    assert.equal(r.json.daGhi, true);
    assert.equal(r.json.order.services[0].pax.adult, n, `${ai}: số khách hiện hành mới`);
    assert.equal(dongCuoi(w, d.id).staff_id, ID[ai], `${ai}: nhật ký ghi đúng người sửa`);
  }
  assert.equal(soDong(w, d.id), 4);
});

// ---------------------------------------------------------------- TC2 thứ tự từ chối

test("TC2: 404 (mã sai dạng / không có) → 403 trước 409 → Đã giao 409 trước khi đọc thân → nháp / huỷ 409 → thân sai 400", async () => {
  const w = setup();
  assert.equal((await sua(w, ID.ACC, "khong-phai-uuid", {})).status, 404);
  assert.equal((await sua(w, ID.ACC, "12345678-1234-4234-8234-123456789012", {})).status, 404);

  // Đã giao: người không có quyền → 403 (trước 409); Kế toán thân rỗng → 409 order_delivered (không đọc thân), không ghi gì.
  const dg = await taoDon(w);
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run("2026-10-01T00:00:00.000Z", ID.SUPER, dg.id);
  assert.equal((await sua(w, ID.SALES_B, dg.id, {})).status, 403, "403 trước 409");
  const r409 = await sua(w, ID.ACC, dg.id, {});
  assert.equal(r409.status, 409, r409.text);
  assert.equal(r409.json.error.code, "order_delivered");
  assert.equal(soDong(w, dg.id), 0);

  const nhap = await taoDon(w, { nhap: true });
  const rn = await sua(w, ID.ACC, nhap.id, than(nhap.svc, P(3)));
  assert.equal(rn.status, 409, rn.text);
  assert.equal(rn.json.error.code, "use_order_form");
  assert.match(rn.json.error.message, /nháp/);

  const huy = await taoDon(w);
  assert.equal((await w.call("POST", `/api/orders/${huy.id}/status`, { as: ID.SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  const rh = await sua(w, ID.ACC, huy.id, than(huy.svc, P(3)));
  assert.equal(rh.status, 409, rh.text);
  assert.equal(soDong(w, huy.id), 0);

  const d = await taoDon(w);
  for (const bad of [{}, { lyDo: "THEM_NGUOI" }, { lyDo: "THEM_NGUOI", services: [] }, { lyDo: "THEM_NGUOI", services: [{ id: "khac", pax: P(3) }] }, than(d.svc, { adult: -1, child: 0, senior: 0, infant: 0 })]) {
    const r = await sua(w, ID.ACC, d.id, bad);
    assert.equal(r.status, 400, `${JSON.stringify(bad)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal(soDong(w, d.id), 0);
});

test("TC2: thua chỉ mục seq (người khác vừa ghi) → 409 stale, cả lô quay lại: không dòng điều chỉnh, không nhật ký", async () => {
  const w = setup();
  const d = await taoDon(w);
  // Giả lập đúng lỗi D1 khi hai người cùng ghi một `seq` (cùng chữ với chỉ mục duy nhất của 0021 — isAdjustmentSeqCollision so khớp chữ này).
  w.sqlite.exec(`CREATE TRIGGER thu_dua_seq BEFORE INSERT ON order_money_adjustment WHEN NEW.order_id = '${d.id}'
    BEGIN SELECT RAISE(ABORT, 'UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq'); END`);
  const nk = soNhatKy(w, d.id);
  const r = await sua(w, ID.ACC, d.id, than(d.svc, P(3)));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.deepEqual([soDong(w, d.id), soNhatKy(w, d.id)], [0, nk]);
  w.sqlite.exec("DROP TRIGGER thu_dua_seq");
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(3)))).status, 200, "gỡ trigger thì lệnh đó qua — ca trên đỏ vì đua, không vì thân sai");
});

// ---------------------------------------------------------------- TC3 lý do

test("TC3: bốn mã lý do đều nhận, nhật ký ghi đúng NHÃN của mã ở cuối; mã lạ / thiếu → 400; chữ tự gõ hay trường lạ (kể cả 'Khác' kèm ghi chú, số tiền) → 400 không ghi", async () => {
  const w = setup();
  const d = await taoDon(w);
  let n = 2;
  for (const ma of MA_LY_DO_SUA_SO_KHACH) {
    n += 1;
    const r = await sua(w, ID.ACC, d.id, than(d.svc, P(n), ma));
    assert.equal(r.status, 200, `${ma}: ${r.text}`);
    const detail = dongCuoi(w, d.id).detail as string;
    assert.ok(detail.endsWith(` · lý do: ${LY_DO_SUA_SO_KHACH[ma]}`), detail);
    assert.doesNotMatch(detail, /\d{5,}/, "nhật ký không có dãy số dài");
  }
  const truoc = [soDong(w, d.id), soNhatKy(w, d.id)];
  const sai: unknown[] = [
    { lyDo: "OTHER", services: [{ id: d.svc, pax: P(9) }] },
    { services: [{ id: d.svc, pax: P(9) }] },
    { reason: "Khách thêm người", services: [{ id: d.svc, pax: P(9) }] },
    { lyDo: "THEM_NGUOI", reason: "gọi 0905123456", services: [{ id: d.svc, pax: P(9) }] },
    { lyDo: "KHAC", ghiChu: "khách báo qua 0905123456", services: [{ id: d.svc, pax: P(9) }] },
    { lyDo: "THEM_NGUOI", subtotal: 1, services: [{ id: d.svc, pax: P(9) }] },
    { lyDo: "THEM_NGUOI", total: 0, services: [{ id: d.svc, pax: P(9) }] },
  ];
  for (const b of sai) {
    const r = await sua(w, ID.ACC, d.id, b);
    assert.equal(r.status, 400, `${JSON.stringify(b)}: ${r.text}`);
    assert.match(r.json.error.message, /[À-ỹ]/);
  }
  assert.deepEqual([soDong(w, d.id), soNhatKy(w, d.id)], truoc, "mọi 400 không ghi gì");
  assert.ok(!w.q("SELECT detail FROM audit_log WHERE order_id = ?", d.id).some((x: any) => /0905/.test(x.detail ?? "")), "không SĐT nào lọt vào nhật ký");
});

// ---------------------------------------------------------------- TC4 một luật tiền

test("TC4: cùng đầu vào, văn phòng và hướng dẫn viên ra ĐÚNG cùng tiền (một luật planMoneyEdit); đường HDV vẫn ghi lý do tự gõ và hành động của HDV", async () => {
  const w = setup();
  const a = await taoDon(w, { pax: P(2, 1), discount: 100000 });
  const b = await taoDon(w, { pax: P(2, 1), discount: 100000 });
  await giao(w, b.id, ID.FIELD);
  const vp = await sua(w, ID.ACC, a.id, than(a.svc, P(3, 2)));
  assert.equal(vp.status, 200, vp.text);
  const hdv = await w.call("POST", `/api/orders/${b.id}/handler-money-edit`, { as: ID.FIELD, body: { reason: "Khách báo thêm", services: [{ id: b.svc, pax: P(3, 2) }] } });
  assert.equal(hdv.status, 200, hdv.text);
  const [x, y] = [dongCuoi(w, a.id), dongCuoi(w, b.id)];
  // 2 NL + 1 TE = 1.300.000 → 3 NL + 2 TE = 2.100.000; giảm 100.000 giữ nguyên ⇒ tổng 2.000.000.
  assert.deepEqual([x.subtotal_before, x.subtotal_after], [1_300_000, 2_100_000]);
  assert.deepEqual([y.subtotal_before, y.subtotal_after], [x.subtotal_before, x.subtotal_after], "cùng tiền trước/sau");
  assert.equal(vp.json.order.total, 2_000_000);
  assert.equal(vp.json.order.discount, 100000, "giảm giá không đổi");
  assert.deepEqual([x.action, y.action], ["order_money_adjusted", "order_money_adjusted_by_field"]);
  assert.ok((y.detail as string).endsWith(" · lý do: Khách báo thêm"), "đường HDV vẫn ghi chữ tự gõ (hành vi cũ)");
});

test("TC4: đơn có dịch vụ nhập tay — văn phòng sửa dịch vụ danh mục, tiền nhập tay giữ nguyên và vẫn cộng vào tổng; dịch vụ nhập tay không có trong thân", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/cai-dat/nhap-tay", { as: ID.SUPER, body: { batNhapTay: true } })).status, 200);
  const d = await taoDon(w, {
    pax: P(3), extra: [{ kind: "manual", name: "Phí phát sinh", pax: { adult: 1 }, departDate: vnDay(3), items: [{ description: "Phụ thu", detail: "", quantity: 1, unitPrice: 200000 }] }],
  });
  const r = await sua(w, ID.ACC, d.id, than(d.svc, P(2), "BOT_NGUOI"));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([dongCuoi(w, d.id).subtotal_before, dongCuoi(w, d.id).subtotal_after], [1_700_000, 1_200_000]);
  assert.equal(r.json.order.total, 1_200_000);
  const detail = dongCuoi(w, d.id).detail as string;
  assert.equal(detail, "số khách: Tour đảo: người lớn 3 → 2 · lý do: Khách bớt người");
  // Liệt kê dịch vụ nhập tay trong thân → 400 (đường này chỉ sửa số khách dịch vụ danh mục; không phải đường thêm / sửa dịch vụ nhập tay).
  const nhapTay = d.services[1]!.id;
  const r2 = await sua(w, ID.ACC, d.id, { lyDo: "THEM_NGUOI", services: [{ id: d.svc, pax: P(3) }, { id: nhapTay, pax: P(2) }] });
  assert.equal(r2.status, 400, r2.text);
});

// ---------------------------------------------------------------- TC5 nhật ký + tin

test("TC5: nhật ký order_money_adjusted (nhãn 'Sửa số khách (văn phòng)'), id = id dòng điều chỉnh, detail khuôn A3; tin 'đơn đổi sau xác nhận' tới người lập + HDV, không tới người sửa", async () => {
  const w = setup();
  const d = await taoDon(w);
  await giao(w, d.id, ID.FIELD);
  const r = await sua(w, ID.ACC, d.id, than(d.svc, P(3)));
  assert.equal(r.status, 200, r.text);
  const x = dongCuoi(w, d.id);
  assert.equal(x.audit_id, x.id, "nhật ký nối một-một với dòng điều chỉnh qua id");
  assert.equal(x.action, "order_money_adjusted");
  assert.equal(AUDIT_ACTIONS.order_money_adjusted.label, "Sửa số khách (văn phòng)");
  assert.equal(x.detail, "số khách: Tour đảo: người lớn 2 → 3 · lý do: Khách thêm người");
  assert.deepEqual(JSON.parse(x.after_json).map((e: any) => e.pax), [P(3)]);

  const tinDoi = async (as: string) => {
    const t = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as });
    assert.equal(t.status, 200, t.text);
    return (t.json.tin as { loai: string; cau: string }[]).filter((x) => x.loai === "doi_sau_xac_nhan").map((x) => x.cau);
  };
  const cau = `${TEN.ACC} đổi đơn ${d.code}: đổi số khách (Tour đảo: người lớn 2 → 3)`;
  assert.deepEqual(await tinDoi(ID.SALES), [cau], "người lập nhận câu cụ thể");
  assert.deepEqual(await tinDoi(ID.FIELD), [cau], "hướng dẫn viên phụ trách nhận câu cụ thể");
  assert.deepEqual(await tinDoi(ID.ACC), [], "người sửa không nhận tin của chính mình");
  // Lịch sử đơn hiện nhãn hành động văn phòng.
  const ls = (await w.call("GET", `/api/orders/${d.id}`, { as: ID.SALES })).json.history as { action: string; detail: string | null }[];
  assert.ok(ls.some((e) => e.action === "order_money_adjusted" && e.detail === x.detail));
});

// ---------------------------------------------------------------- TC6, TC7

test("TC6: số khách y nguyên → 200 daGhi false, không dòng điều chỉnh, không nhật ký", async () => {
  const w = setup();
  const d = await taoDon(w);
  const nk = soNhatKy(w, d.id);
  const r = await sua(w, ID.ACC, d.id, than(d.svc, P(2)));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.daGhi, false);
  assert.deepEqual([soDong(w, d.id), soNhatKy(w, d.id)], [0, nk]);
});

test("TC7: văn phòng sửa được cả sau ngày đi (hướng dẫn viên thì bị chặn 409 departed)", async () => {
  const w = setup();
  const d = await taoDon(w);
  await giao(w, d.id, ID.FIELD);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(vnDay(-2), d.id);
  const hdv = await w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as: ID.FIELD, body: { reason: "x", services: [{ id: d.svc, pax: P(3) }] } });
  assert.equal(hdv.status, 409, "đối chứng: HDV bị chặn sau ngày đi");
  const r = await sua(w, ID.ADMIN, d.id, than(d.svc, P(3)));
  assert.equal(r.status, 200, r.text);
  assert.equal(soDong(w, d.id), 1);
});

// ---------------------------------------------------------------- TC8 giảm giá vượt tạm tính (ADR-0109: phải thu không âm)

test("TC8 (ADR-0109): bớt khách tới giảm giá > tạm tính — KHÔNG chặn: 200, dòng được ghi, có câu cảnh báo; phải thu KẸP 0 (giảm giá đã lưu không đổi); dư = đúng số khách đã trả", async () => {
  const w = setup();
  // 2 NL × 500.000 = 1.000.000, giảm 800.000 ⇒ tổng 200.000; khách trả đủ 200.000. (Ca hộp hỏi của chủ — SV-SK-04.)
  const d = await taoDon(w, { discount: 800000 });
  const thu = await w.call("POST", `/api/orders/${d.id}/payments`, { as: ID.ACC, body: { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  const r = await sua(w, ID.ACC, d.id, than(d.svc, P(1), "BOT_NGUOI"));
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.daGhi, true);
  assert.equal(r.json.canhBaoTongAm, CAU_GIAM_GIA_VUOT);
  assert.deepEqual([r.json.order.subtotal, r.json.order.discount, r.json.order.total, r.json.order.giamGiaHieuLuc], [500000, 800000, 0, 500000], "max(0, 500.000 − 800.000)");
  assert.equal(soDong(w, d.id), 1);
  const p = (await w.call("GET", `/api/orders/${d.id}/payments`, { as: ID.ACC })).json;
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 200000, 0, 200000], "dư chờ hoàn = đúng số khách đã trả, không phồng");
  // GET đơn của Kế toán (người không vừa sửa) cũng thấy số đã kẹp.
  const g = (await w.call("GET", `/api/orders/${d.id}`, { as: ID.ACC })).json.order;
  assert.deepEqual([g.total, g.giamGiaHieuLuc], [0, 500000]);
  // Sửa tiếp về tổng không âm → phản hồi không còn câu cảnh báo, tiền y như trước kẹp.
  const r2 = await sua(w, ID.ACC, d.id, than(d.svc, P(2), "THEM_NGUOI"));
  assert.equal(r2.json.canhBaoTongAm, null);
  assert.deepEqual([r2.json.order.total, r2.json.order.giamGiaHieuLuc], [200000, 800000]);
});

test("TC8b (ADR-0109 bài 3, đảo ghim 'HIỆN TRẠNG CHỜ CHỦ QUYẾT' theo chủ chọn 8/10): hoàn 200.000 rồi 'Đã giao' được (due_snapshot 0), rồi 'Hoàn thành' được", async () => {
  const w = setup();
  const d = await taoDon(w, { discount: 800000 });
  await giao(w, d.id, ID.FIELD);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(vnDay(0), d.id);
  assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ID.ACC, body: { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(1), "BOT_NGUOI"))).status, 200);
  const hoan = await w.call("POST", "/api/ledger/refunds", { as: ID.ACC, body: { orderId: d.id, soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" } });
  assert.ok([200, 201].includes(hoan.status), hoan.text);
  const hoanThem = await w.call("POST", "/api/ledger/refunds", { as: ID.ACC, body: { orderId: d.id, soTien: 1, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" } });
  assert.equal(hoanThem.status, 400, "không hoàn quá số khách đã trả");
  const p = (await w.call("GET", `/api/orders/${d.id}/payments`, { as: ID.FIELD })).json;
  assert.deepEqual([p.phaiThu, p.daThu, p.du, p.lyDoChuaGiao?.ma], [0, 0, 0, undefined], "hoàn xong thì không còn bị giữ vì khách trả dư");
  const giaoR = await w.call("POST", `/api/orders/${d.id}/delivered`, { as: ID.FIELD, body: {} });
  assert.equal(giaoR.status, 200, giaoR.text);
  // Bản chụp phải thu trên phiếu Đã giao (= 0) khoá ở src/modules/billing/phai-thu-khong-am.test.ts — `orders` không nhắc bảng của billing (ADR-0024 điều 4).
  const xong = await w.call("POST", `/api/orders/${d.id}/completed`, { as: ID.ACC });
  assert.equal(xong.status, 200, xong.text);
});

test("TC8c (ADR-0109, phiếu kiểm 5b): khách CHƯA trả đồng nào, bớt khách tới giảm giá > tạm tính → khối Thanh toán [0, 0, 0, 0]; 'Đã giao' được (trước đây 409 overpaid)", async () => {
  const w = setup();
  const d = await taoDon(w, { discount: 800000 });
  await giao(w, d.id, ID.FIELD);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(vnDay(0), d.id);
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(1), "BOT_NGUOI"))).status, 200);
  const p = (await w.call("GET", `/api/orders/${d.id}/payments`, { as: ID.ACC })).json;
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 0, 0, 0]);
  const giaoR = await w.call("POST", `/api/orders/${d.id}/delivered`, { as: ID.FIELD, body: {} });
  assert.equal(giaoR.status, 200, giaoR.text);
});

test("TC8d (ADR-0109 QĐ5, bài 6): bớt khách tới giảm giá > tạm tính rồi HUỶ → chi tiết đơn Tổng cộng 0 (không âm); khối Thanh toán còn lại 0, dư 0; số cọc khách đã trả 200.000 không đổi", async () => {
  const w = setup();
  const d = await taoDon(w, { discount: 800000 });
  assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ID.ACC, body: { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(1), "BOT_NGUOI"))).status, 200);
  const huy = await w.call("POST", `/api/orders/${d.id}/status`, { as: ID.SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 200, huy.text);
  const g = (await w.call("GET", `/api/orders/${d.id}`, { as: ID.ACC })).json.order;
  assert.deepEqual([g.status, g.total, g.giamGiaHieuLuc], ["cancelled", 0, 500000]);
  const p = (await w.call("GET", `/api/orders/${d.id}/payments`, { as: ID.ACC })).json;
  assert.deepEqual([p.conLai, p.du, p.coc?.daTra], [0, 0, 200000], "đơn huỷ đi nhánh huỷ của conLai (0/0); cọc giữ đúng số khách đã trả");
});

test("TC8e (ADR-0109 NT-12): GET chi tiết đơn có khoá giamGiaHieuLuc ở CẢ đơn chưa điều chỉnh (= discount) lẫn đơn đã điều chỉnh; tạm tính − giảm giá hiệu lực = tổng", async () => {
  const w = setup();
  const d = await taoDon(w, { discount: 100000 });
  const g0 = (await w.call("GET", `/api/orders/${d.id}`, { as: ID.ACC })).json.order;
  assert.deepEqual([g0.subtotal, g0.discount, g0.giamGiaHieuLuc, g0.total], [1000000, 100000, 100000, 900000], "đơn chưa điều chỉnh");
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(1), "BOT_NGUOI"))).status, 200);
  const g1 = (await w.call("GET", `/api/orders/${d.id}`, { as: ID.ACC })).json.order;
  assert.deepEqual([g1.subtotal, g1.discount, g1.giamGiaHieuLuc, g1.total], [500000, 100000, 100000, 400000], "đơn không âm: không đổi đồng nào");
  for (const o of [g0, g1]) assert.equal(o.subtotal - o.giamGiaHieuLuc, o.total);
});

// ---------------------------------------------------------------- TC12 GET chi tiết + hàm ẩn/hiện

test("TC12: GET chi tiết đơn — suaSoKhach theo bản chụp gốc (loại khách đã về 0 vẫn sửa được) cho người sửa được; null với người khác, đơn nháp, đơn đã giao", async () => {
  const w = setup();
  const d = await taoDon(w, { pax: P(2, 1) });
  await giao(w, d.id, ID.FIELD);
  const xem = async (as: string, id = d.id) => (await w.call("GET", `/api/orders/${id}`, { as })).json.suaSoKhach;
  assert.deepEqual(await xem(ID.ACC), [{ serviceId: d.svc, loaiKhach: ["adult", "child"] }]);
  assert.equal((await sua(w, ID.ACC, d.id, than(d.svc, P(2, 0), "BOT_NGUOI"))).status, 200);
  assert.deepEqual(await xem(ID.SALES), [{ serviceId: d.svc, loaiKhach: ["adult", "child"] }], "trẻ em về 0 vẫn còn ô (giá đã chụp vẫn còn)");
  assert.equal(await xem(ID.SALES_B), null, "Bán hàng không lập đơn");
  assert.equal(await xem(ID.FIELD), null, "hướng dẫn viên dùng 'Việc của tôi'");
  const nhap = await taoDon(w, { nhap: true });
  assert.equal(await xem(ID.ACC, nhap.id), null, "đơn nháp");
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run("2026-10-01T00:00:00.000Z", ID.SUPER, d.id);
  assert.equal(await xem(ID.ACC), null, "đã giao");
});

test("TC12: hàm ẩn/hiện của giao diện (duocSuaSoKhachVanPhong) bằng ĐÚNG quyết định của route cho mọi quyền đơn lẻ (người lập / không phải người lập)", async () => {
  const w = setup();
  const d = await taoDon(w);
  const meta = { staffId: ID.SALES, status: "confirmed" as const, deliveredAt: null };
  let n = 2;
  for (const p of PERMISSION_CODES) {
    const k = (Object.keys(QUYEN) as (keyof typeof ID)[]).find((x) => QUYEN[x].length === 1 && QUYEN[x][0] === p && x !== "SALES")!;
    const nguoi = p === "SALES" ? ID.SALES : ID[k];
    const r = await sua(w, nguoi, d.id, than(d.svc, P(n + 1)));
    if (r.status === 200) n += 1;
    assert.equal(r.status === 200, duocSuaSoKhachVanPhong({ id: nguoi, permissions: [p] }, meta), `${p}: route ${r.status}`);
  }
  // Bán hàng không phải người lập: hàm nói không, route 403.
  assert.equal(duocSuaSoKhachVanPhong({ id: ID.SALES_B, permissions: ["SALES"] }, meta), false);
  assert.equal((await sua(w, ID.SALES_B, d.id, than(d.svc, P(n + 1)))).status, 403);
});
