// Hạn mức «Từ chối» của hướng dẫn viên (ADR-0032; kế hoạch docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md H11) trên máy chủ thật + D1 local:
// HM-1, HM-2, HM-3, HM-5, HM-6, HM-7, HM-8, HM-9, HM-10, HM-12 (a), HM-13, HM-14. Tài khoản HDV dùng một lần (không đụng `field`/`fieldB` dùng chung).
// Đầu kịch bản đặt «Chặn» 2/15 bằng route; `finally` đặt lại «Chỉ đo» 2/15 (D1 của một nhóm dùng chung cho các kịch bản sau cùng nhóm — run.mjs).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const SUPER = await session(ACCOUNTS.superAdmin);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const b = await me(B);

async function hdvMoi(ten) {
  const phone = randomPhone();
  const r = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone, permissions: ["FIELD"] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { id: r.body.staff.id, partyId: r.body.staff.partyId, cookie: (await login(phone, r.body.pin)).cookie };
}
const tag = Date.now().toString(36);
const H1 = await hdvMoi(`Hạn Mức Một ${tag}`);
const H2 = await hdvMoi(`Hạn Mức Hai ${tag}`);

const BASE = "/api/dispatch/han-muc-tu-choi";
const caiDat = (cheDo, lienTiep = 2, moiTuan = 15, cookie = SUPER) => call(cookie, "POST", `${BASE}/chinh-sach`, { cheDo, lienTiep, moiTuan });
const donCho = async () => {
  const o = (await call(A, "POST", "/api/orders", orderInput({ services: [catalogService({ departDate: vnDate(3) })] }))).body.order;
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
  return o;
};
const nhan = (who, id) => call(who.cookie, "PUT", `/api/orders/${id}/handler`, { staffId: who.id });
const giao = (cookie, id, staffId) => call(cookie, "PUT", `/api/orders/${id}/handler`, { staffId });
const tuChoi = (cookie, id, lyDo = "BAN_LICH") => call(cookie, "POST", `/api/orders/${id}/handler-refuse`, { lyDo });
const nhanVaTuChoi = async (who, lyDo) => {
  const o = await donCho();
  assert.equal((await nhan(who, o.id)).status, 200);
  return { o, r: await tuChoi(who.cookie, o.id, lyDo) };
};
const suKien = (where) => sqlRows(`SELECT party_id, order_id, kind_code, reason_code FROM dsp_release_event WHERE ${where} ORDER BY seq`);

try {
  let r = await caiDat("BLOCK");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(SUPER, "POST", `${BASE}/dat-lai`, { tatCa: true })).status, 200);

  // HM-13: tự nhận → CLAIM; văn phòng giao → ASSIGN; đổi người → ASSIGN cho người mới.
  const k0 = await donCho();
  assert.equal((await nhan(H1, k0.id)).status, 200);
  assert.equal((await giao(ADMIN, k0.id, H2.id)).status, 200);
  assert.deepEqual((await suKien(`order_id = '${k0.id}'`)).map((e) => [e.party_id, e.kind_code]), [[H1.partyId, "CLAIM"], [H2.partyId, "ASSIGN"]]);
  console.log("✓ HM-13: Nhận → CLAIM, đổi người → ASSIGN cho người mới (người cũ không sự kiện)");

  // HM-1: hai lần nhận–từ chối → 200; lần ba → 409 refuse_limit, dòng phụ trách vẫn mở, đúng 1 nhật ký chạm hạn mức.
  // (H1 vẫn đang không giữ đơn nào — k0 đã chuyển cho H2.)
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(H1)).r.status, 200, `lần ${i + 1}`);
  const ba = await nhanVaTuChoi(H1);
  assert.equal(ba.r.status, 409, JSON.stringify(ba.r.body));
  assert.equal(ba.r.body.error.code, "refuse_limit");
  assert.equal(ba.r.body.error.message, "Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.");
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM dsp_assignment WHERE order_id = '${ba.o.id}' AND valid_to_at IS NULL`))[0].n, 1);
  assert.equal((await suKien(`party_id = '${H1.partyId}' AND kind_code = 'REFUSE'`)).length, 2);
  const cham = await sqlRows(`SELECT staff_id, detail FROM audit_log WHERE order_id = '${ba.o.id}' AND action = 'refuse_limit_hit'`);
  assert.deepEqual(cham, [{ staff_id: H1.id, detail: "Liên tiếp 2/2 · tuần 2/15 · Chặn" }]);
  console.log("✓ HM-1: lần thứ ba 409 refuse_limit đúng câu ADR; dòng phụ trách còn mở; không REFUSE ma; một refuse_limit_hit chỉ số");

  // HM-14: «còn N lần» trên đơn đang giữ.
  r = await call(H1.cookie, "GET", `/api/orders/${ba.o.id}/han-muc-tu-choi`);
  assert.deepEqual(r.body, { conLai: { lienTiep: 0, tuan: 13 } });
  assert.equal((await call(H2.cookie, "GET", `/api/orders/${ba.o.id}/han-muc-tu-choi`)).status, 403);
  assert.equal((await call(ACC, "GET", `/api/orders/${ba.o.id}/han-muc-tu-choi`)).status, 403);
  console.log("✓ HM-14: còn {0, 13}; HDV khác / Kế toán 403");

  // HM-9 + HM-2: văn phòng vẫn giao cho người hết lượt; giữ đơn đó → chuỗi về 0 → Từ chối đơn đang kẹt được.
  const giu = await donCho();
  assert.equal((await giao(ADMIN, giu.id, H1.id)).status, 200, "HM-9: giao cho người đã hết lượt");
  assert.deepEqual((await suKien(`order_id = '${giu.id}'`)).map((e) => e.kind_code), ["ASSIGN"]);
  assert.equal((await tuChoi(H1.cookie, ba.o.id)).status, 200, "HM-2: có đơn giữ xen giữa → Từ chối được");
  console.log("✓ HM-9: giao cho HDV hết lượt → 200 + ASSIGN; HM-2: giữ đơn đó thì Từ chối tiếp được");

  // HM-3 (a): từ chối thêm 1 (chuỗi 2 kể từ đơn giữ), rồi Từ chối CHÍNH đơn giữ → 409.
  assert.equal((await nhanVaTuChoi(H1)).r.status, 200);
  r = await tuChoi(H1.cookie, giu.id);
  assert.equal(r.status, 409, "HM-3 (a): Từ chối chính đơn được giao sau 2 lần → chặn");
  console.log("✓ HM-3 (a): ASSIGN của chính đơn đang Từ chối không cắt chuỗi");

  // HM-10: bảng chọn người của đơn H1 đã Từ chối.
  r = await call(A, "GET", `/api/orders/${ba.o.id}/tu-choi-truoc`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.tuChoi[H1.partyId]?.lyDo, "BAN_LICH");
  assert.deepEqual((await call(A, "GET", `/api/orders/${giu.id}/tu-choi-truoc`)).body, { tuChoi: {} });
  assert.equal((await call(H1.cookie, "GET", `/api/orders/${ba.o.id}/tu-choi-truoc`)).status, 403);
  assert.equal((await call(ACC, "GET", `/api/orders/${ba.o.id}/tu-choi-truoc`)).status, 403);
  console.log("✓ HM-10: bảng chọn người thấy lần Từ chối của chính đơn; đơn khác rỗng; HDV / Kế toán 403");

  // HM-7: đặt lại một người → Từ chối được ngay; quyền xem / đổi.
  r = await call(SUPER, "POST", `${BASE}/dat-lai`, { partyId: H1.partyId });
  assert.deepEqual([r.status, r.body], [200, { soNguoi: 1 }]);
  assert.equal((await tuChoi(H1.cookie, giu.id)).status, 200, "HM-7: sau đặt lại → Từ chối được ngay");
  assert.equal((await call(ADMIN, "POST", `${BASE}/dat-lai`, { tatCa: true })).status, 403);
  assert.equal((await caiDat("OFF", 2, 15, ADMIN)).status, 403);
  for (const c of [A, ACC, H1.cookie]) assert.equal((await call(c, "GET", BASE)).status, 403);
  r = await call(ADMIN, "GET", BASE);
  assert.equal(r.status, 200);
  assert.equal(r.body.doiDuoc, false);
  const dongH1 = r.body.nguoi.find((n) => n.partyId === H1.partyId);
  assert.equal(dongH1.biGioiHan, true);
  assert.equal(dongH1.chuoi, 1);
  assert.equal((await call(SUPER, "GET", BASE)).body.doiDuoc, true);
  assert.equal((await call(SUPER, "POST", `${BASE}/dat-lai`, { partyId: b.partyId })).status, 404, "Bán hàng không phải HDV");
  console.log("✓ HM-7: đặt lại một người; Quản trị / Bán hàng / Kế toán / HDV bị chặn đúng; bảng số lần đúng");

  // HM-8: HDV tự huỷ → ABORT; không tính vào chuỗi.
  const k8 = await donCho();
  assert.equal((await nhan(H2, k8.id)).status, 200);
  r = await call(H2.cookie, "POST", `/api/orders/${k8.id}/handler-cancel`, { reason: "customer_requested" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await suKien(`order_id = '${k8.id}' AND kind_code = 'ABORT'`)).map((e) => e.party_id), [H2.partyId]);
  console.log("✓ HM-8: HDV huỷ → một ABORT");

  // HM-6: Bán hàng đang phụ trách — không bị giới hạn (3 lần liên tiếp đều 200).
  for (let i = 0; i < 3; i++) {
    const o = await donCho();
    assert.equal((await giao(ADMIN, o.id, b.id)).status, 200);
    assert.equal((await tuChoi(B, o.id)).status, 200, `Bán hàng lần ${i + 1}`);
  }
  console.log("✓ HM-6: Bán hàng Từ chối lần 3 vẫn 200 (sự kiện vẫn ghi)");

  // HM-12 (a): H2 chuỗi = 1, gửi đồng thời hai lần Từ chối → đúng một 200, một 409 refuse_limit.
  for (let vong = 0; vong < 3; vong++) {
    assert.equal((await call(SUPER, "POST", `${BASE}/dat-lai`, { partyId: H2.partyId })).status, 200);
    assert.equal((await nhanVaTuChoi(H2)).r.status, 200);
    const [x, y] = [await donCho(), await donCho()];
    assert.equal((await nhan(H2, x.id)).status, 200);
    assert.equal((await nhan(H2, y.id)).status, 200);
    const kq = await Promise.all([tuChoi(H2.cookie, x.id), tuChoi(H2.cookie, y.id)]);
    assert.deepEqual(kq.map((k) => k.status).sort(), [200, 409], `vòng ${vong}: ${JSON.stringify(kq.map((k) => k.body))}`);
    assert.equal(kq.find((k) => k.status === 409).body.error.code, "refuse_limit");
  }
  console.log("✓ HM-12 (a): hai lần Từ chối song song ở ngưỡng — đúng một thắng (3 vòng)");

  // HM-5: «Chỉ đo» — lần vượt mức vẫn 200, ghi refuse_limit_hit «Chỉ đo».
  assert.equal((await caiDat("MEASURE")).status, 200);
  assert.equal((await call(SUPER, "POST", `${BASE}/dat-lai`, { partyId: H2.partyId })).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(H2)).r.status, 200);
  const do3 = await nhanVaTuChoi(H2);
  assert.equal(do3.r.status, 200);
  const doRow = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${do3.o.id}' AND action = 'refuse_limit_hit'`);
  assert.deepEqual(doRow, [{ detail: "Liên tiếp 2/2 · tuần 2/15 · Chỉ đo (không chặn)" }]);
  console.log("✓ HM-5: Chỉ đo — lần thứ ba 200 + nhật ký «Chỉ đo»");
} finally {
  const r = await caiDat("MEASURE");
  assert.equal(r.status, 200, "trả cài đặt về Chỉ đo 2/15");
}
console.log("✓ han-muc-tu-choi xong");
