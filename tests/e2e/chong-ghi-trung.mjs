// LỚP CHỐNG GHI TRÙNG (ADR-0094, T12): kịch bản F-02 của thử nghiệp vụ 1–2/10 (tình huống 11, 12, 13, HD10, KT03, KT04 — bản gốc ngoài kho ở
// ~/Documents/danh-gia-ux/2026-10-01/kich-ban/) chép thành e2e, BẢN CÓ VÉ: mỗi tình huống gửi HAI LẦN CÙNG MỘT VÉ (`Idempotency-Key`) — đúng điều
// `web/api.ts` làm khi mất phản hồi rồi bấm lại ⇒ đúng MỘT dòng nghiệp vụ, lần 2 nhận 200 `da_ghi_truoc_do`.
// Bản KHÔNG vé của kịch bản gốc và redteam R1/R2 vẫn ra 2 bản ghi ở giai đoạn 1 (ADR-0094 đ7) — chỉ là tiêu chí của BẢN SIẾT, không nằm ở đây.
// HD10 lấy nhánh "Ghi lần thu" (lỗi thật: đã thu 400.000), không lấy "Đã giao kèm thu" (nhánh đó đã chống lặp bằng 409).
// Kèm: T4 (hai lần thu thật, vé khác ⇒ 2 dòng), T5 (đổi số tiền ⇒ vé khác ⇒ lớp không chặn), đồng thời cùng vé ⇒ 1 dòng, 422 khác thân.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, freshIp, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const ACC = await session(ACCOUNTS.accountant);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);
const dem = async (q) => (await sqlRows(q))[0].n;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gửi CÙNG vé như `api()` làm: gặp 409 dang_xu_ly thì chờ rồi gửi lại cùng vé (tối đa 5 lần). */
async function guiVe(cookie, method, path, body, ve) {
  for (let i = 0; ; i++) {
    const r = await call(cookie, method, path, body, freshIp(), { ve });
    if (!(r.status === 409 && r.body?.error?.code === "dang_xu_ly") || i >= 5) return r;
    await ngu(400);
  }
}
const laPhatLai = (r) => r.status === 200 && r.body?.da_ghi_truoc_do === true && r.headers.get("idempotent-replayed") === "true";
/** Lần 1 phải thành công (2xx); lần 2 CÙNG vé phải là phát lại. Trả lần 1. */
async function haiLanCungVe(ten, cookie, method, path, body) {
  const ve = randomUUID();
  const r1 = await guiVe(cookie, method, path, body, ve);
  assert.ok(r1.status >= 200 && r1.status < 300, `${ten} lần 1: ${r1.status} ${JSON.stringify(r1.body)}`);
  const r2 = await guiVe(cookie, method, path, body, ve);
  assert.ok(laPhatLai(r2), `${ten} lần 2 cùng vé phải là "đã ghi": ${r2.status} ${JSON.stringify(r2.body)}`);
  return r1;
}
async function songSongCungVe(ten, cookie, method, path, body) {
  const ve = randomUUID();
  const kq = await Promise.all([1, 2].map(() => guiVe(cookie, method, path, body, ve)));
  assert.equal(kq.filter((r) => r.status >= 200 && r.status < 300 && !laPhatLai(r)).length, 1, `${ten}: đúng một lần chạy thật — ${kq.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join(" | ")}`);
  assert.equal(kq.filter(laPhatLai).length, 1, `${ten}: lần kia là "đã ghi"`);
}

async function lapDon(ten, { ngay = vnDate(3), handler = null, them = {} } = {}) {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ customerName: ten, customerPhone: randomPhone(), services: [catalogService({ pax: { adult: 2 }, departDate: ngay })], ...them }), ...(handler ? { handlerStaffId: handler } : {}) });
  assert.equal(r.status, 201, `lập đơn ${ten}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.order;
}
const xacNhan = async (id) => assert.equal((await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" })).status, 200, `xác nhận ${id}`);
const soLanThu = (id) => dem(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${id}' AND kind_code = 'CUSTOMER_PAYMENT'`);
const TAG = randomUUID().slice(0, 6);

// ---- 11: "Lưu đơn" hai lần (tuần tự + song song) cùng vé ⇒ 1 đơn
{
  const ten = `Lặp Cùng Vé ${TAG}`;
  const body = orderInput({ customerName: ten, customerPhone: randomPhone(), services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(3) })] });
  await haiLanCungVe("11 tuần tự", A, "POST", "/api/orders", body);
  assert.equal(await dem(`SELECT count(*) AS n FROM orders WHERE customer_name = '${ten}'`), 1, "11: một đơn");
  const ten2 = `Lặp Song Song Cùng Vé ${TAG}`;
  await songSongCungVe("11 song song", A, "POST", "/api/orders", orderInput({ customerName: ten2, customerPhone: randomPhone() }));
  assert.equal(await dem(`SELECT count(*) AS n FROM orders WHERE customer_name = '${ten2}'`), 1, "11 song song: một đơn");
  // 422: cùng vé, khác thân
  const ve = randomUUID();
  assert.equal((await guiVe(A, "POST", "/api/orders", orderInput({ customerName: `K422 ${TAG}` }), ve)).status, 201);
  const r = await guiVe(A, "POST", "/api/orders", orderInput({ customerName: `K422 khác ${TAG}` }), ve);
  assert.equal(r.status, 422, JSON.stringify(r.body));
  assert.equal(r.body?.error?.code, "ma_lan_gui_khac_noi_dung");
  console.log("✓ 11: lập đơn gửi lại cùng vé (tuần tự, song song) ⇒ một đơn; cùng vé khác thân ⇒ 422");
}

// ---- 12: "Ghi lần thu" gửi lại cùng vé ⇒ 1 lần thu; T4 hai lần thu thật (vé khác) ⇒ 2; T5 đổi số tiền ⇒ vé khác ⇒ không chặn
{
  const lanThu = { soTien: 60000, hinhThuc: "CASH", nguoiThu: "toi" };
  const o1 = await lapDon(`Thu Cùng Vé ${TAG}`);
  await xacNhan(o1.id);
  await haiLanCungVe("12", A, "POST", `/api/orders/${o1.id}/payments`, lanThu);
  assert.equal(await soLanThu(o1.id), 1, "12: một lần thu");
  const o2 = await lapDon(`Thu Song Song ${TAG}`);
  await xacNhan(o2.id);
  await songSongCungVe("12 song song", A, "POST", `/api/orders/${o2.id}/payments`, lanThu);
  assert.equal(await soLanThu(o2.id), 1, "12 song song: một lần thu");
  const o3 = await lapDon(`Thu Hai Lần Thật ${TAG}`);
  await xacNhan(o3.id);
  assert.equal((await guiVe(A, "POST", `/api/orders/${o3.id}/payments`, lanThu, randomUUID())).status, 201);
  assert.equal((await guiVe(A, "POST", `/api/orders/${o3.id}/payments`, lanThu, randomUUID())).status, 201);
  assert.equal(await soLanThu(o3.id), 2, "T4: hai lần thu thật (vé khác) ⇒ hai dòng — lớp không nuốt lần ghi thật");
  const o4 = await lapDon(`Thu Đổi Số ${TAG}`);
  await xacNhan(o4.id);
  assert.equal((await guiVe(A, "POST", `/api/orders/${o4.id}/payments`, lanThu, randomUUID())).status, 201);
  assert.equal((await guiVe(A, "POST", `/api/orders/${o4.id}/payments`, { ...lanThu, soTien: 70000 }, randomUUID())).status, 201);
  assert.equal(await soLanThu(o4.id), 2, "T5: sửa số tiền ⇒ vé mới ⇒ lớp vé không chặn (việc của lớp nghiệp vụ)");
  console.log("✓ 12: ghi lần thu gửi lại cùng vé ⇒ một lần thu; T4 hai lần thật ⇒ hai; T5 đổi số ⇒ không chặn");
}

// ---- 13: lập đơn có tạo khách mới, gửi lại cùng vé ⇒ 1 hồ sơ, 1 đơn
{
  const phone = randomPhone();
  const ten = `Khách Cùng Vé ${TAG}`;
  await haiLanCungVe("13", A, "POST", "/api/orders", orderInput({ customerName: ten, customerPhone: phone, newBooker: { fullName: ten, phone } }));
  assert.equal(await dem(`SELECT count(DISTINCT party_id) AS n FROM pty_contact_point WHERE value_normalized = '${phone}'`), 1, "13: một hồ sơ");
  assert.equal(await dem(`SELECT count(*) AS n FROM orders WHERE customer_name = '${ten}'`), 1, "13: một đơn");
  console.log("✓ 13: lập đơn kèm khách mới gửi lại cùng vé ⇒ một hồ sơ, một đơn");
}

// ---- HD10 (nhánh "Ghi lần thu"): HDV ở bến ghi lần thu 200.000, mất phản hồi, bấm lại ⇒ 1 lần thu
{
  const o = await lapDon(`HD10 Cùng Vé ${TAG}`, { ngay: vnDate(0), handler: fld.id });
  await xacNhan(o.id);
  await haiLanCungVe("HD10", F, "POST", `/api/orders/${o.id}/payments`, { soTien: 200000, hinhThuc: "CASH", nguoiThu: "toi" });
  assert.equal(await soLanThu(o.id), 1, "HD10: một lần thu");
  console.log("✓ HD10: HDV ghi lần thu gửi lại cùng vé ⇒ một lần thu");
}

// ---- KT03: Kế toán ghi hoàn cho đơn huỷ, gửi lại cùng vé ⇒ 1 lần hoàn
{
  const o = await lapDon(`KT03 Cùng Vé ${TAG}`);
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/payments`, { soTien: 100000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  await xacNhan(o.id);
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200, "huỷ đơn");
  await haiLanCungVe("KT03", ACC, "POST", "/api/ledger/refunds", { orderId: o.id, soTien: 40000, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" });
  assert.equal(await dem(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${o.id}' AND kind_code <> 'CUSTOMER_PAYMENT'`), 1, "KT03: một dòng hoàn");
  console.log("✓ KT03: ghi hoàn gửi lại cùng vé ⇒ một lần hoàn");
}

// ---- KT04: Kế toán ghi HDV nộp tiền, gửi lại cùng vé ⇒ 1 lần nộp; đảo lần thu gửi lại cùng vé ⇒ 1 lần đảo
{
  const o = await lapDon(`KT04 Cùng Vé ${TAG}`, { ngay: vnDate(0), handler: fld.id });
  await xacNhan(o.id);
  assert.equal((await call(F, "POST", `/api/orders/${o.id}/delivered`, { lanThu: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 200, "HDV Đã giao kèm thu");
  const hdvParty = (await sqlRows(`SELECT collector_party_id AS p FROM bil_payment_receipt WHERE order_id = '${o.id}' AND collector_role_code = 'STAFF'`))[0].p;
  const truoc = await dem(`SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_settlement'`);
  await haiLanCungVe("KT04 nộp", ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: hdvParty, phanBo: [{ orderId: o.id, soTien: 200000 }] });
  assert.equal(await dem(`SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_settlement'`), truoc + 1, "KT04: một lần nộp");
  const o2 = await lapDon(`KT04 Đảo ${TAG}`);
  assert.equal((await call(A, "POST", `/api/orders/${o2.id}/payments`, { soTien: 50000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  const receiptId = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${o2.id}' AND kind_code = 'CUSTOMER_PAYMENT'`))[0].id;
  const truocDao = await dem(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${o2.id}'`);
  await haiLanCungVe("KT04 đảo", ACC, "POST", "/api/ledger/adjustments", { loai: "dao_lan_thu", receiptId, lyDo: "Ghi trùng khi mất sóng" });
  assert.equal(await dem(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${o2.id}'`), truocDao + 1, "KT04: một dòng đảo");
  console.log("✓ KT04: ghi nộp và đảo lần thu gửi lại cùng vé ⇒ một lần mỗi việc");
}

// ---- N2 (kiểm độc lập vòng 1): chữ lỗi THẬT của D1 (workerd của wrangler dev, qua binding Worker) khi lô ĐỤNG khoá vé phải khớp mẫu `laLoiDungVe`. Ép đụng
// vé bằng trigger tạm: chèn đơn có tên đánh dấu ⇒ trigger chèn trước đúng dòng vé (cùng tài khoản + vé) ⇒ câu chèn vé ở CUỐI lô đụng khoá chính, cả lô huỷ.
// Khớp mẫu ⇒ router đi bước 5 (đụng vé, tra lại không thấy vì lô đã huỷ) ⇒ 409 dang_xu_ly. KHÔNG khớp ⇒ ngoại lệ thường ⇒ 500. Không có đơn nào được ghi.
{
  const ten = `Ép Đụng Vé ${TAG}`;
  const ve = randomUUID();
  const staffA = (await call(A, "GET", "/api/auth/me")).body.staff.id;
  await sql(`CREATE TRIGGER e2e_ep_dung_ve AFTER INSERT ON orders WHEN NEW.customer_name = '${ten}'
    BEGIN INSERT INTO lg_lan_gui (staff_id, khoa, van_tay, duong, created_at, updated_at) VALUES ('${staffA}', '${ve}', 'x', 'x', '2026-01-01', '2026-01-01'); END`);
  try {
    const r = await call(A, "POST", "/api/orders", orderInput({ customerName: ten, customerPhone: randomPhone() }), freshIp(), { ve });
    assert.equal(r.status, 409, `D1 thật: lô đụng vé phải được nhận ra (409 dang_xu_ly), không phải ${r.status} ${JSON.stringify(r.body)}`);
    assert.equal(r.body?.error?.code, "dang_xu_ly");
    assert.equal(await dem(`SELECT count(*) AS n FROM orders WHERE customer_name = '${ten}'`), 0, "cả lô huỷ");
  } finally {
    await sql("DROP TRIGGER IF EXISTS e2e_ep_dung_ve");
  }
  console.log("✓ N2: D1 thật (wrangler dev) — lô đụng khoá vé được nhận ra đúng (409 dang_xu_ly), cả lô huỷ");
}

// ---- T14 (giai đoạn 1): KHÔNG vé ⇒ cho qua (máy còn bản cũ) — gửi hai lần ra HAI đơn. Chỉ bản siết mới chặn; đây là bài canh hành vi giai đoạn 1.
{
  const ten = `Không Vé ${TAG}`;
  const body = orderInput({ customerName: ten, customerPhone: randomPhone() });
  assert.equal((await call(A, "POST", "/api/orders", body, freshIp(), { veTrong: true })).status, 201);
  assert.equal((await call(A, "POST", "/api/orders", body, freshIp(), { veTrong: true })).status, 201);
  assert.equal(await dem(`SELECT count(*) AS n FROM orders WHERE customer_name = '${ten}'`), 2, "T14: giai đoạn 1 cho qua lệnh thiếu vé");
  console.log("✓ T14: lệnh thiếu vé được cho qua (giai đoạn 1) — hai lần gửi ra hai đơn; bản siết sẽ trả 400");
}

console.log("E2E CHỐNG GHI TRÙNG OK");
