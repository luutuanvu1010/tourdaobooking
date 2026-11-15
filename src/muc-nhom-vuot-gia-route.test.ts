// ADR-0161 Đ4, Đ5 — tiêu chí 6 và 7 của đặc tả 2026-11-03 bằng ROUTE THẬT với mức phạm vi NHÓM (nhóm không có một giá để so nên lúc nhập được nhận; chặn nằm ở Đã giao và ở trần giảm giá).
// Mức 500.000 đ/khách cho nhóm có vé 300.000 đ, đơn 2 khách ⇒ hoa hồng gốc 1.000.000 đ > thành tiền 600.000 đ. Khung thử thật (tests/audit/harness.mjs + xac-nhan-khung.mjs): ứng dụng + SQLite dựng từ migrations.
//  - tiêu chí 6: Đã giao 409 `not_deliverable`, sổ không ghi dòng nào; màn đơn không có số âm;
//  - tiêu chí 7: Bán hàng và Đối tác giảm 1 đ đều bị từ chối bằng câu nói rõ mức đang vượt (dòng vượt tính 0 khi tính trần);
//  - các cổng còn lại của Đ5: Gửi đơn (nhánh B) và Còn vé với đơn nháp có giảm giá mà mức vừa thành vượt SAU khi giảm được nhận.
// Luật thuần (hoa-hong-dong.ts): bài luật thuần trong modules/orders/tran-giam-gia-don.test.ts. Sổ vàng (mức «tất cả dịch vụ»): modules/orders/tran-giam-gia-don.test.ts (tệp này nằm ngoài orders vì chạm sổ `bil_` — ADR-0024 điều 4).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, A as SALES, PARTNER, SUP, datCo, inDays, lap, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { dongVuotThanhTien } from "./shared/hoa-hong-dong.ts";
import { CAU_HOA_HONG_VUOT, chuGiaDaiLy, chuTongGiaDaiLy } from "./shared/phan-doi-tac-hien-thi.ts";

const AT = "2026-10-01T00:00:00.000Z";
const DLF = "dda00000-0000-4000-8000-0000000000f1"; // đại lý F — bên đặt của đơn do Bán hàng lập
const BEN_DT = `pty-${PARTNER}`;
const CAU_VUOT_0 = "Chưa giảm giá được: mức hoa hồng của dịch vụ trong đơn đang vượt giá bán — nhờ Kế toán xem lại.";
type W = ReturnType<typeof setup>;
type Res = { status: number; json: any; text: string };

/** Khung: vé ZB1 300.000 đ thuộc nhóm TDA; đại lý F và hồ sơ của tài khoản Đối tác cùng mang vai được hưởng và cùng một mức «tất cả» 10% (trần của đơn 2 khách = 60.000 đ). */
async function dung(): Promise<W> {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý F', 1, ?, ?)").run(DLF, AT, AT);
  for (const p of [DLF, BEN_DT]) {
    if (p === DLF) w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${p}`, p, AT, AT);
    const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { tuNgay: "2026-01-01", doiTuong: { loai: "DOI_TAC", partyId: p }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
    assert.equal(m.status, 201, m.text);
  }
  w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES ('g-zb1', 'ZB1', 'TDA', 1, ?, ?, ?)").run(AT, AT, AT);
  assert.equal(w.q("SELECT group_code FROM v_ctl_service_group WHERE catalog_code = 'ZB1'")[0].group_code, "TDA", "bài tự kiểm: vé ZB1 thật sự thuộc nhóm TDA");
  return w;
}
/** Mức nhóm TDA 500.000 đ/khách cho một bên, qua route của Kế toán — được nhận vì nhóm không có một giá để so (Đ4). Có hiệu lực từ 2026-01-01 nên áp ngay hôm nay. */
async function datMucNhom(w: W, ben: string, moiKhach = 500_000): Promise<void> {
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { tuNgay: "2026-01-01", doiTuong: { loai: "DOI_TAC", partyId: ben }, phamVi: "GROUP", groupCode: "TDA", kieu: "PER_PAX", moiKhach } });
  assert.equal(m.status, 201, `mức nhóm ${moiKhach} phải được nhận: ${m.text}`);
}
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const ve = (ngay = inDays(3)) => svc("ZB1", ngay); // 2 người lớn × 300.000 = 600.000
const lapRaw = (w: W, as: string, extra: Record<string, unknown>, ngay = inDays(3)): Promise<Res> =>
  w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [ve(ngay)], ...extra } });
const datGiam = (w: W, id: string, giam: number) =>
  w.sqlite.prepare("UPDATE orders SET discount = ?, total = subtotal - ?, remaining_amount = subtotal - ? - deposit_amount WHERE id = ?").run(giam, giam, giam, id);
const trangThai = (w: W, id: string): string => String(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status);
const vuotGia = (r: Res, ten: string) => {
  assert.equal(r.status, 400, `${ten} ${r.text}`);
  assert.deepEqual([r.json.error.code, r.json.error.message], ["discount_exceeds_commission", CAU_VUOT_0], ten);
};

test("tiêu chí 7: mức nhóm 500.000 đ/khách, vé 300.000 đ — Bán hàng và Đối tác giảm 1 đ đều bị từ chối bằng câu nói rõ mức đang vượt; giảm 0 lập được", async () => {
  const w = await dung();
  await datMucNhom(w, DLF);
  await datMucNhom(w, BEN_DT);
  for (const [ten, who, extra] of [["Bán hàng", SALES, { bookerPartyId: DLF }], ["Đối tác (đơn của chính mình)", PARTNER, {}]] as const) {
    const truoc = dem(w, "SELECT count(*) AS n FROM orders");
    vuotGia(await lapRaw(w, who, { ...extra, discount: 1 }), `${ten}: lập giảm 1 đ`);
    assert.equal(dem(w, "SELECT count(*) AS n FROM orders"), truoc, `${ten}: bị từ chối thì không lưu đơn`);
    const nhap = await lapRaw(w, who, extra);
    assert.equal(nhap.status, 201, `${ten}: giảm 0 lập được: ${nhap.text}`);
    const sua = await w.call("PUT", `/api/orders/${nhap.json.order.id}`, {
      as: who, body: { customerName: "Khách Thử", customerPhone: "0912345678", ...extra, services: [{ ...ve(), id: nhap.json.order.services[0].id }], discount: 1, expectedUpdatedAt: nhap.json.order.updatedAt },
    });
    vuotGia(sua, `${ten}: lưu nháp giảm 1 đ`);
    assert.equal(w.q("SELECT discount FROM orders WHERE id = ?", nhap.json.order.id)[0].discount, 0, `${ten}: nháp không đổi`);
  }
});

test("đối chứng tiêu chí 7: mức nhóm 100.000 đ/khách (hoa hồng 200.000 đ, trong thành tiền) — trần là hoa hồng của đơn, câu cũ «Giảm tối đa 200.000 ₫»", async () => {
  const w = await dung();
  await datMucNhom(w, DLF, 100_000);
  const qua = await lapRaw(w, SALES, { bookerPartyId: DLF, discount: 200_001 });
  assert.deepEqual([qua.status, qua.json.error.code, qua.json.error.message], [400, "discount_exceeds_commission", "Giảm tối đa 200.000 ₫ (bằng hoa hồng của đơn)."], qua.text);
  assert.equal((await lapRaw(w, SALES, { bookerPartyId: DLF, discount: 200_000 })).status, 201);
});

test("tiêu chí 6: mức nhóm 500.000 đ/khách, vé 300.000 đ — đơn xác nhận được; màn đơn ghi cảnh báo, không số âm; Đã giao 409 not_deliverable và sổ không ghi dòng nào", async () => {
  const w = await dung();
  await datMucNhom(w, DLF);
  const don = (await lapRaw(w, SALES, { bookerPartyId: DLF }, inDays(0))).json.order;
  assert.ok(don?.id, "lập đơn ngày đi hôm nay");
  const xn = await w.xacNhanDon(don.id, SALES);
  assert.equal(xn.status, 200, `đơn có dòng vượt vẫn xác nhận được (ADR-0077): ${xn.text}`);
  // Màn đơn: máy chủ vẫn trả số thật của công thức (giá đại lý −400.000 đ — công thức và sổ không đổi, Đ4); CHỮ trên màn do hàm hiển thị dùng chung quyết: dòng hoa hồng 1.000.000 > thành tiền 600.000
  // ⇒ ô giá đại lý của dòng và ô «Tổng giá đại lý» ghi câu cảnh báo, không ô nào ghi số âm.
  const tm = await w.call("GET", `/api/orders/${don.id}/thuong-mai`, { as: ACC });
  assert.equal(tm.status, 200, tm.text);
  const vp = tm.json.vanPhong;
  assert.equal(vp.dong.length, 1);
  assert.deepEqual([vp.dong[0].thanhTien, vp.dong[0].hoaHong], [600_000, 1_000_000]);
  assert.equal(dongVuotThanhTien(vp.dong[0]), true, "dòng vượt thành tiền");
  const chu = [chuGiaDaiLy(vp.dong[0], (n) => String(n)), chuTongGiaDaiLy(vp.tong, vp.dong, (n) => String(n))];
  assert.deepEqual(chu, [CAU_HOA_HONG_VUOT, CAU_HOA_HONG_VUOT], "ô giá đại lý của dòng và ô tổng ghi câu cảnh báo");
  assert.doesNotMatch(chu.join(" "), /-\d/, "không số âm trên chữ hiển thị");
  // Đã giao: thu đủ rồi bấm — 409, câu nói mức vượt giá bán, sổ không phiếu / dòng nào.
  const thu = await w.call("POST", `/api/orders/${don.id}/payments`, { as: SUP, body: { soTien: 600_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  const g = await w.call("POST", `/api/orders/${don.id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "not_deliverable");
  assert.match(g.json.error.message, /vượt giá bán/);
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", don.id)[0].delivered_at, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", don.id), 0, "không phiếu Đã giao");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", don.id), 0, "sổ công nợ không dòng nào");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_delivered'", don.id), 0);
});

test("Gửi đơn (nhánh B) của Đối tác: nháp giảm 50.000 đ trong trần 60.000 đ, rồi mức nhóm 500.000 đ/khách vừa có hiệu lực ⇒ 400 cùng câu, vẫn nháp, không bản chụp; hạ giảm giá về 0 thì gửi được", async () => {
  const w = await dung();
  const nhap = await lapRaw(w, PARTNER, { discount: 50_000 });
  assert.equal(nhap.status, 201, `trong trần 10% (60.000 đ): ${nhap.text}`);
  const id = nhap.json.order.id as string;
  await datMucNhom(w, BEN_DT); // mức vừa thành vượt: dòng vé hoa hồng 1.000.000 > 600.000 ⇒ tính 0 ⇒ trần 0
  const gui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  vuotGia(gui, "Gửi đơn");
  assert.equal(trangThai(w, id), "draft");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), 0, "không bản chụp");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", id), 0, "không mở yêu cầu xác nhận");
  datGiam(w, id, 0);
  const lai = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.json.nhanh, "B");
  assert.equal(trangThai(w, id), "confirmed");
});

test("Còn vé: yêu cầu xác nhận mở khi giảm 50.000 đ còn trong trần, rồi mức nhóm 500.000 đ/khách vừa có hiệu lực ⇒ Quản trị bấm Còn vé nhận 400 cùng câu, đơn vẫn nháp và yêu cầu còn mở", async () => {
  const w = await dung();
  datCo(w, "SERVICE", "ZB1", true); // dịch vụ «cần xác nhận» ⇒ Gửi đơn mở yêu cầu (nhánh A) chờ Còn vé
  const nhap = await lapRaw(w, PARTNER, { discount: 50_000 });
  assert.equal(nhap.status, 201, nhap.text);
  const id = nhap.json.order.id as string;
  const gui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(gui.status, 201, gui.text);
  assert.equal(gui.json.nhanh, "A");
  await datMucNhom(w, BEN_DT); // mức vừa thành vượt giữa lúc chờ
  const xem = (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json;
  const qd = await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt } });
  vuotGia(qd, "Còn vé");
  assert.equal(trangThai(w, id), "draft");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), 0, "không bản chụp");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ? AND outcome IS NULL", id), 1, "yêu cầu vẫn mở");
});
