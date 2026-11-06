// Cổng Trả sau ở `orders` (ADR-0168 Đ2; bài đặt ở gốc `src/` vì đọc dòng phiên bản của billing — bài trong src/modules/orders/ không được nhắc `bil_`; kế hoạch 2026-11-05 Task 3): hình thức lưu trên đơn, cổng hạn mức ở CẢ BA đường xác nhận, chốt phiên bản khi hai lệnh cùng lúc,
// hạn trả chụp một lần. Khung thử thật (tests/audit/harness.mjs). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, PARTNER, SUP, datCo, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { addDays, vnToday } from "./shared/vn-date.ts";
import { cachBayGio, datMocTraSau, datQuaHan } from "../tests/audit/tra-sau-moc.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN = `pty-${DT}`;
const HOM_NAY = () => vnToday(new Date());
const T_ZB1 = 600_000; // 2 người lớn × 300.000
const T_ZA1 = 1_000_000; // 2 người lớn × 500.000 (dịch vụ cần xác nhận)

type W = ReturnType<typeof setup>;
function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT}`, BEN, AT, AT);
  datCo(w, "SERVICE", "ZA1", true);
  return w;
}
const hanMuc = (w: W, hanMuc: number, gioTra = 168, gioAnHan = 0) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc, gioTra, gioAnHan, lyDo: "thử" } });
const congGio = (iso: string, gio: number) => new Date(Date.parse(iso) + gio * 3_600_000).toISOString();
const coBen = (extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", ...extra });
/** Lập đơn nháp. `as` = DT thì bên đặt tự là hồ sơ của DT; văn phòng thì truyền bookerPartyId. */
async function lap(w: W, as: string, o: { ma?: string; term?: "PREPAID" | "CREDIT"; booker?: string | null; coc?: number } = {}) {
  const ma = o.ma ?? "ZB1";
  const body = coBen({
    services: [svc(ma, inDays(3))],
    ...(o.term ? { paymentTerm: o.term } : {}),
    ...(as === DT ? {} : { bookerPartyId: o.booker === undefined ? BEN : o.booker }),
    ...(o.coc !== undefined ? { declaredDeposit: o.coc } : {}),
  });
  return w.call("POST", "/api/orders", { as, body });
}
async function nhapTS(w: W, as: string, ma = "ZB1"): Promise<{ id: string; updatedAt: string }> {
  const r = await lap(w, as, { ma, term: "CREDIT" });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
// ---- ba đường xác nhận: mỗi đường nhận một đơn nháp, trả phản hồi của lệnh xác nhận (đường ZA1 qua «Gửi xác nhận» rồi Quản trị bấm Còn vé) ----
const DUONG = [
  { ten: "POST /status", ma: "ZB1", tong: T_ZB1, as: A,
    xn: (w: W, o: { id: string }) => w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } }) },
  { ten: "gui-don nhánh B", ma: "ZB1", tong: T_ZB1, as: DT,
    xn: (w: W, o: { id: string }) => w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} }) },
  { ten: "quyet-dinh Còn vé", ma: "ZA1", tong: T_ZA1, as: DT,
    // Cả hai đơn gửi xin xác nhận khi nợ còn 0 (gui-don nhánh A mở yêu cầu), rồi mới lần lượt Quản trị bấm Còn vé.
    truoc: async (w: W, o: { id: string }) => {
      const g = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: DT, body: {} });
      assert.equal(g.status, 201, g.text);
    },
    xn: async (w: W, o: { id: string }) => {
      const xem = (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json;
      return w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt } });
    } },
] as const;
const trangThai = (w: W, id: string) => w.q("SELECT status, payment_term AS t, credit_due_at AS h FROM orders WHERE id = ?", id)[0] as { status: string; t: string; h: string | null };
/** Hai mốc, ngày cũ và giờ xác nhận của đơn (ADR-0172 Đ3 mục 2). */
const moc = (w: W, id: string) => w.q("SELECT confirmed_at AS c, credit_due_at AS h, credit_grace_until AS g, credit_due_date AS n FROM orders WHERE id = ?", id)[0] as { c: string; h: string; g: string; n: string };
const phienBan = (w: W) => w.q("SELECT version FROM bil_credit_guard WHERE party_id = ?", BEN)[0]?.version ?? null;

for (const d of DUONG) {
  test(`(${d.ten}) hạn mức đủ thì xác nhận được và chụp hạn trả = giờ xác nhận + thời hạn, hết ân hạn = hạn trả + ân hạn; vượt thì 409 có số tiền, đơn ở lại nháp, không dòng nào của lô`, async () => {
    const w = dung();
    assert.equal((await hanMuc(w, Math.floor(d.tong * 1.5), 36, 12)).status, 201);
    const d1 = await nhapTS(w, d.as, d.ma);
    const d2 = await nhapTS(w, d.as, d.ma); // lưu được vì lúc lưu nợ còn 0
    if ("truoc" in d) {
      await d.truoc(w, d1);
      await d.truoc(w, d2);
    }
    const r1 = await d.xn(w, d1);
    assert.equal(r1.status, 200, r1.text);
    const m = moc(w, d1.id);
    assert.equal(m.h, congGio(m.c, 36), "hạn trả = giờ xác nhận (cùng mốc của lô) + 36 giờ");
    assert.equal(m.g, congGio(m.c, 48), "hết ân hạn = hạn trả + 12 giờ");
    assert.equal(m.n, vnToday(new Date(m.h)), "cột ngày cũ = ngày Việt Nam của hạn trả (lùi bản an toàn)");
    assert.deepEqual([trangThai(w, d1.id).status, trangThai(w, d1.id).t], ["confirmed", "CREDIT"]);
    assert.equal(phienBan(w), 2, "một lần đặt hạn mức + một lần xác nhận");
    const truoc = w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d2.id)[0].n;
    const r2 = await d.xn(w, d2);
    assert.equal(r2.status, 409, r2.text);
    assert.equal(r2.json.error.code, "vuot_han_muc");
    assert.match(r2.json.error.message, new RegExp(String(d.tong).replace(/(\d)(?=(\d{3})+$)/g, "$1.")), "câu báo có số tiền của đơn");
    assert.deepEqual({ ...trangThai(w, d2.id) }, { status: "draft", t: "CREDIT", h: null });
    assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d2.id)[0].n, truoc, "không nhật ký nào của lô thua");
    assert.equal(w.q("SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", d2.id)[0].n, 0, "không bản chụp nào");
    assert.equal(phienBan(w), 2, "lô bị từ chối không tăng phiên bản");
  });
}

test("đúng bằng số còn lại thì qua, hơn một đồng thì 409 (hạn mức đổi giữa lúc lưu và lúc xác nhận)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const vua = await nhapTS(w, A);
  const hon = await nhapTS(w, A);
  assert.equal((await hanMuc(w, T_ZB1)).status, 201, "hạ hạn mức đúng bằng một đơn");
  assert.equal((await w.call("POST", `/api/orders/${vua.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "vừa đủ");
  const r = await w.call("POST", `/api/orders/${hon.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "vuot_han_muc");
  assert.equal((await hanMuc(w, T_ZB1 * 2 - 1)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${hon.id}/status`, { as: A, body: { status: "confirmed" } })).status, 409, "còn lại thiếu một đồng");
  assert.equal((await hanMuc(w, T_ZB1 * 2)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${hon.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
});

test("chưa được cấp hạn mức: lưu đơn Trả sau 409 khong_co_han_muc; hạn mức bị ngừng giữa lúc lưu và lúc xác nhận cũng 409; đơn Trả trước của bên đó vẫn đặt được", async () => {
  const w = dung();
  const chua = await lap(w, A, { term: "CREDIT" });
  assert.equal(chua.status, 409);
  assert.equal(chua.json.error.code, "khong_co_han_muc");
  assert.equal(w.q("SELECT count(*) AS n FROM orders")[0].n, 0, "không lưu gì");
  assert.equal((await hanMuc(w, 5_000_000)).status, 201);
  const nhap = await nhapTS(w, A);
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/${BEN}/ngung`, { as: SUP, body: {} })).status, 200);
  const r = await w.call("POST", `/api/orders/${nhap.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.deepEqual([r.status, r.json.error.code], [409, "khong_co_han_muc"]);
  const tra = await lap(w, A, { term: "PREPAID" });
  assert.equal(tra.status, 201, tra.text);
  assert.equal((await w.call("POST", `/api/orders/${tra.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "Trả trước vẫn xác nhận được");
});

test("đơn Trả trước đi đường cũ: không câu nào chạm dòng phiên bản, hình thức mặc định PREPAID, hạn trả trống", async () => {
  const w = dung();
  const r = await lap(w, A);
  assert.equal(r.status, 201, r.text);
  assert.deepEqual([r.json.order.paymentTerm, r.json.order.hanTra], ["PREPAID", null]);
  const thay: string[] = [];
  w.chenTruocLo((stmts: { sql: string }[]) => (thay.push(...stmts.map((s) => s.sql)), false), () => undefined, 99);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.ok(thay.length > 0, "chống bài rỗng: có thấy lô xác nhận");
  assert.ok(!thay.some((s) => /bil_credit_guard|credit_due_date|credit_due_at/.test(s)), "lô của đơn Trả trước không có câu Trả sau");
  assert.equal(phienBan(w), null);
});

test("hai lệnh cùng lúc: lô thứ hai thua phiên bản, đơn thứ hai ở lại nháp, không bản chụp, không nhật ký; mở lại thì xác nhận được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const d1 = await nhapTS(w, A);
  // Ngay trước lô của d1, một lệnh khác (xác nhận đơn của cùng bên đặt) vừa tăng phiên bản.
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /UPDATE bil_credit_guard SET version = \?2 \+ 1/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE bil_credit_guard SET version = version + 1 WHERE party_id = ?").run(BEN);
  });
  const truoc = w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d1.id)[0].n;
  const r = await w.call("POST", `/api/orders/${d1.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.deepEqual([r.status, r.json.error.code], [409, "credit_version_stale"]);
  assert.match(r.json.error.message, /Hạn mức vừa thay đổi/);
  assert.equal(trangThai(w, d1.id).status, "draft");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", d1.id)[0].n, truoc);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", d1.id)[0].n, 0);
  assert.equal((await w.call("POST", `/api/orders/${d1.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "đọc lại phiên bản mới thì qua");
});

test("ADR-0172 tiêu chí 4: trong ân hạn chưa chặn; hết ân hạn còn nợ chặn đơn Trả sau mới (co_don_qua_han); đơn Trả trước vẫn qua (ADR-0173 Đ2 mục 3); trả hết thì Trả sau mở lại", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const cu = await nhapTS(w, A);
  assert.equal((await w.call("POST", `/api/orders/${cu.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const anHan = await nhapTS(w, A);
  const moi = await nhapTS(w, A);
  datMocTraSau(w.sqlite, cu.id, cachBayGio(-1), cachBayGio(11)); // T+37 của ví dụ ADR: qua hạn trả, còn trong ân hạn
  assert.equal((await w.call("POST", `/api/orders/${anHan.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "trong ân hạn: chưa chặn");
  datQuaHan(w.sqlite, cu.id); // T+49: hết ân hạn mà còn nợ
  datMocTraSau(w.sqlite, anHan.id, cachBayGio(100));
  const r = await w.call("POST", `/api/orders/${moi.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.deepEqual([r.status, r.json.error.code], [409, "co_don_qua_han"]);
  const tra = await lap(w, A);
  assert.equal((await w.call("POST", `/api/orders/${tra.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "Trả trước qua");
  const thu = await w.call("POST", `/api/orders/${cu.id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  assert.equal(trangThai(w, cu.id).status, "confirmed", "ADR-0173 Đ2 mục 4: máy không tự huỷ đơn quá hạn");
  assert.equal((await w.call("POST", `/api/orders/${moi.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200, "hết nợ thì mở lại");
});

test("Trả sau không nhận lời khai đặt cọc: 409 lúc lưu; đơn nháp lỡ mang cả hai thì 409 lúc xác nhận; thiếu bên đặt 409; thân sai giá trị 400", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const luu = await lap(w, DT, { term: "CREDIT", coc: 100_000 });
  assert.deepEqual([luu.status, luu.json.error.code], [409, "tra_sau_khong_nhan_coc"]);
  const nhap = await nhapTS(w, A);
  w.sqlite.prepare("UPDATE orders SET declared_deposit = 50000 WHERE id = ?").run(nhap.id); // lách qua lưu (kiểm tra lớp lô)
  const xn = await w.call("POST", `/api/orders/${nhap.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.deepEqual([xn.status, xn.json.error.code], [409, "tra_sau_khong_nhan_coc"]);
  const thieu = await lap(w, A, { term: "CREDIT", booker: null });
  assert.deepEqual([thieu.status, thieu.json.error.code], [409, "tra_sau_thieu_ben_dat"]);
  const sai = await w.call("POST", "/api/orders", { as: A, body: coBen({ services: [svc("ZB1", inDays(3))], paymentTerm: "LATER" }) });
  assert.equal(sai.status, 400);
});

test("ADR-0172 tiêu chí 5: hạn trả chụp một lần — đổi thời hạn sau đó không đổi mốc của đơn cũ, đơn mới theo số mới; đơn đã xác nhận không đổi hình thức được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000, 36, 12)).status, 201);
  const o = await nhapTS(w, A);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const cu = moc(w, o.id);
  assert.equal((await hanMuc(w, 10_000_000, 72, 0)).status, 201);
  assert.deepEqual(moc(w, o.id), cu, "đơn đã xác nhận giữ mốc cũ");
  const o2 = await nhapTS(w, A);
  assert.equal((await w.call("POST", `/api/orders/${o2.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const m2 = moc(w, o2.id);
  assert.deepEqual([m2.h, m2.g], [congGio(m2.c, 72), congGio(m2.c, 72)], "đơn mới theo số mới");
  const xem = (await w.call("GET", `/api/orders/${o.id}`, { as: A })).json.order;
  assert.deepEqual([xem.paymentTerm, xem.hanTra, xem.hetAnHan], ["CREDIT", cu.h, cu.g]);
  const sua = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: coBen({ services: [svc("ZB1", inDays(3))], paymentTerm: "PREPAID", expectedUpdatedAt: xem.updatedAt }) });
  assert.equal(sua.status, 409, sua.text);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET payment_term = 'PREPAID' WHERE id = ?").run(o.id), /payment_term_locked/);
});

test("đơn cũ đều PREPAID; đổi hình thức khi còn nháp được (và đổi lại); sửa nháp thiếu khoá hình thức thì giữ hình thức đang lưu", async () => {
  const w = dung();
  const r = await lap(w, A);
  assert.equal(r.json.order.paymentTerm, "PREPAID");
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const id = r.json.order.id;
  const dv = () => [{ ...svc("ZB1", inDays(3)), id: w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id }];
  const moc = () => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u;
  const sua = (extra: Record<string, unknown>) => w.call("PUT", `/api/orders/${id}`, { as: A, body: coBen({ services: dv(), bookerPartyId: BEN, expectedUpdatedAt: moc(), ...extra }) });
  assert.equal((await sua({ paymentTerm: "CREDIT" })).status, 200);
  assert.equal(trangThai(w, id).t, "CREDIT");
  assert.equal((await sua({})).status, 200, "thân không có khoá hình thức");
  assert.equal(trangThai(w, id).t, "CREDIT", "giữ hình thức đang lưu");
  assert.equal((await sua({ paymentTerm: "PREPAID" })).status, 200);
  assert.equal(trangThai(w, id).t, "PREPAID");
});

test("gốc lắp ráp không tiêm cổng hạn mức: đơn Trả sau bị chặn 503 (không đoán «đủ hạn mức»), đơn Trả trước vẫn lập được", async () => {
  const w = setup({ khongTiemTraSau: true });
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT}`, BEN, AT, AT);
  const r = await lap(w, A, { term: "CREDIT" });
  assert.deepEqual([r.status, r.json.error.code], [503, "tra_sau_chua_dung_duoc"]);
  assert.equal((await lap(w, A)).status, 201);
});

test("quét nơi gọi: mọi lời gọi `soanXacNhan` / `confirmOrder` ngoài định nghĩa truyền `cong.traSau` của `kiemCongXacNhan`, và mọi lời gọi `kiemCongXacNhan` truyền cổng Trả sau", async () => {
  const { readFileSync } = await import("node:fs");
  const doc = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");
  let soLoiGoi = 0;
  for (const f of ["./modules/orders/index.ts", "./modules/orders/xac-nhan-route.ts"]) {
    const nguon = doc(f);
    for (const k of nguon.matchAll(/(?<!function )\b(soanXacNhan|confirmOrder)\(/g)) {
      soLoiGoi++;
      const loi = nguon.slice(k.index!, nguon.indexOf(";", k.index!));
      assert.match(loi, /\bcong\.traSau\b/, `${f}: lời gọi không truyền cong.traSau: ${loi.slice(0, 100)}`);
    }
    for (const k of nguon.matchAll(/\bkiemCongXacNhan\(/g)) {
      const loi = nguon.slice(k.index!, nguon.indexOf(";", k.index!));
      assert.match(loi, /traSau: \{ kiemTraSau, cauGacPhienBanTraSau \}/, `${f}: kiemCongXacNhan không truyền cổng Trả sau: ${loi.slice(0, 100)}`);
    }
  }
  assert.equal(soLoiGoi, 3, "ba đường xác nhận: /status, quyet-dinh Còn vé, gui-don nhánh B");
});

test("«Đã giao» đơn Trả sau còn nợ đi qua ROUTE THẬT: 409 «Đơn trả sau còn nợ … — chờ đối tác thanh toán»; thu đủ thì qua (tiêu chí 8, không chỉ quét chữ trong mã)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000, 168)).status, 201);
  // Bên đặt mang vai được hưởng nên «Đã giao» đòi có mức hoa hồng: đặt một mức để lý do «còn nợ» là lý do duy nhất còn lại.
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01" } })).status, 201);
  const o = await nhapTS(w, A);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(HOM_NAY(), o.id); // «Đã giao» chỉ bấm từ ngày đi trở đi
  const chua = await w.call("POST", `/api/orders/${o.id}/delivered`, { as: SUP, body: {} });
  assert.equal(chua.status, 409, chua.text);
  assert.ok(String(chua.json.error.message).includes(`Đơn trả sau còn nợ ${T_ZB1.toLocaleString("vi-VN")} ₫ — chờ đối tác thanh toán.`), chua.text);
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", o.id)[0].delivered_at, null, "đơn chưa sang Đã giao");
  assert.equal((await w.call("POST", `/api/orders/${o.id}/payments`, { as: ACC, body: { soTien: T_ZB1, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const du = await w.call("POST", `/api/orders/${o.id}/delivered`, { as: SUP, body: {} });
  assert.equal(du.status, 200, du.text);
});
