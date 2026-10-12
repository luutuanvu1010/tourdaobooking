// Thông tin chuyến đi theo từng dịch vụ (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md): dòng tiền do MÁY CHỦ sinh,
// lệch giá danh mục, xác nhận đòi đủ chuyến, đua tranh chấp, khoá lạc quan, bản chụp cho nháp cũ, sửa trường vận hành sau xác nhận.
// Dùng danh mục GIẢ (mã ZT*) chèn thẳng vào D1 — không phụ thuộc Google Sheet; dọn ở `finally`.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, makeLegacyManual, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog(); // orderInput() mặc định dùng danh mục giả ZE1 (khối 10: PUT thiếu mốc phải qua được bước kiểm dịch vụ rồi mới 400 đúng lý do)
const A = await session(ACCOUNTS.salesA);
const Bc = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);

const T = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZT1','Tour thử','perPax',850000,595000,850000,0,'Trẻ em cao từ 1 m đến 1,4 mét',NULL,NULL,2,1,${T},${T}),
  ('ZT2','Phao thử','per5Pax',1000000,NULL,NULL,NULL,NULL,NULL,NULL,3,1,${T},${T}),
  ('ZT3','Motor thử','perPax',800000,NULL,NULL,NULL,NULL,NULL,NULL,4,1,${T},${T})`);

const cat = (extra = {}) => ({ kind: "catalog", catalogCode: "ZT1", pax: { adult: 2, child: 1 }, catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: vnDate(7), ...extra });
/** Dịch vụ danh mục ZT3 (một dòng người lớn, 800.000) — thay dịch vụ nhập tay cũ của tệp này (API không nhận dịch vụ nhập tay mới từ 2026-09-26). */
const motor = (extra = {}) => cat({ catalogCode: "ZT3", pax: { adult: 1 }, catalogPriceSeen: { adult: 800000 }, ...extra });
const lines = (order) => order.services.flatMap((s) => s.items);
const post = (services, extra = {}) => call(A, "POST", "/api/orders", orderInput({ services, ...extra }));
const put = (order, services, extra = {}) => call(A, "PUT", `/api/orders/${order.id}`, orderInput({ services, expectedUpdatedAt: order.updatedAt, ...extra }));
const confirm = (who, order) => call(who, "POST", `/api/orders/${order.id}/status`, { status: "confirmed" });
const get = async (who, order) => (await call(who, "GET", `/api/orders/${order.id}`)).body;
const tripOf = (sv) => ({
  departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
  checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
});
/** PUT /trip gửi ĐỦ thông tin chuyến của dịch vụ đầu (trường vắng = xoá), rồi ghi đè `changes`. */
const trip = (o, changes, who = A, expected = o.updatedAt) =>
  call(who, "PUT", `/api/orders/${o.id}/trip`, { expectedUpdatedAt: expected, services: [{ id: o.services[0].id, ...tripOf(o.services[0]), ...changes }] });

let r;
try {
  // 1) MÁY CHỦ SINH DÒNG TIỀN: không nhận số lượng từ client; lưu catalog_price, loại khách, số khách
  r = await post([cat({ items: [{ description: "hack", quantity: 99, unitPrice: 1 }] }), cat({ catalogCode: "ZT2", pax: { adult: 7 }, catalogPriceSeen: { adult: 1000000 } })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o1 = r.body.order;
  assert.deepEqual(lines(o1).map((i) => [i.catalogCode, i.paxCode, i.quantity, i.unitPrice, i.catalogPrice, i.lineTotal]), [
    ["ZT1", "adult", 2, 850000, 850000, 1700000],
    ["ZT1", "child", 1, 595000, 595000, 595000],
    ["ZT2", "adult", 2, 1000000, 1000000, 2000000], // 7 khách / nhóm 5 = 2 lượt
  ]);
  assert.equal(o1.subtotal, 4295000);
  assert.deepEqual(o1.services.map((s) => [s.kind, s.unit, s.pax.adult, s.pax.child, s.catalogStatus]), [["catalog", "perPax", 2, 1, "ok"], ["catalog", "per5Pax", 7, 0, "ok"]]);
  assert.equal(lines(o1)[1].detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  console.log("✓ máy chủ sinh dòng tiền từ danh mục, bỏ qua số lượng giả");

  // 2) ĐƠN GIÁ THƯƠNG LƯỢNG: lưu unitPrice khác catalogPrice, nhật ký ghi lệch giá (không chặn)
  r = await post([cat({ unitPrices: { adult: 800000 } })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual(lines(r.body.order).map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
  assert.match((await get(A, r.body.order)).history[0].detail, /lệch giá danh mục: ZT1 người lớn 850\.000 ₫ → 800\.000 ₫/);
  console.log("✓ đơn giá thương lượng: lưu lệch giá + ghi nhật ký, không chặn");

  // 3) GIÁ DANH MỤC VỪA ĐỔI giữa lúc mở form và lúc lưu → 409 catalog_changed, không lưu gì
  const newest = async () => (await call(A, "GET", "/api/orders?limit=1")).body.orders[0].id;
  const before = await newest();
  r = await post([cat({ catalogPriceSeen: { adult: 900000, child: 595000 } })]);
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "catalog_changed");
  assert.deepEqual(r.body.error.changes, [{ serviceIndex: 0, catalogCode: "ZT1", pax: "adult", seen: 900000, current: 850000 }]);
  assert.equal(await newest(), before, "không lưu đơn nào");
  console.log("✓ giá danh mục đổi giữa chừng → 409 catalog_changed");

  // 4) LỖI ĐẦU VÀO
  r = await post([cat({ catalogCode: "NOPE" })]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  const rejected = [
    [cat({ catalogCode: "ZT3", pax: { adult: 1, child: 1 }, catalogPriceSeen: { adult: 800000 } }), /không có giá cho trẻ em/],
    [cat({ catalogCode: "ZT2", pax: { adult: 3, child: 1 }, catalogPriceSeen: { adult: 1000000 } }), /tính theo nhóm/],
    [cat({ pax: { adult: 51 }, catalogPriceSeen: { adult: 850000 } }), /số khách người lớn/],
    [cat({ pax: { adult: 30, child: 21 } }), /tối đa 50 khách/],
    [cat({ pax: { infant: 2 }, catalogPriceSeen: { infant: 0 } }), /không phải em bé/],
    [cat({ departDate: "2026-02-30" }), /ngày khởi hành/],
    [cat({ departTime: "24:00" }), /giờ khởi hành/],
    [cat({ pickupPlace: "x".repeat(201) }), /tối đa 200/],
    [cat({ unitPrices: { adult: 1.5 } }), /số nguyên/],
    [{ ...cat(), kind: "khac" }, /loại dịch vụ/],
  ];
  for (const [svc, re] of rejected) {
    r = await post([svc]);
    assert.equal(r.status, 400, JSON.stringify(svc));
    assert.match(r.body.error.message, re);
  }
  console.log("✓ đầu vào sai bị từ chối đúng lý do");

  // 5) TAB CŨ gửi `items` phẳng kiểu cũ → 409 client_outdated
  r = await call(A, "POST", "/api/orders", { customerName: "A", customerPhone: "0901234567", items: [{ description: "x", quantity: 1, unitPrice: 1 }] });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "client_outdated");

  // 6) THÔNG TIN CHUYẾN lưu và đọc lại đúng, đã chuẩn hoá
  r = await post([cat({ departTime: "07:30", pickupTime: "06:45", pickupPlace: "KS A\n50 Trần Phú", checkinDate: vnDate(7), checkinTime: "07:00", checkinPlace: "Cảng Cầu Đá", note: "ăn chay\nsay sóng" })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const s = r.body.order.services[0];
  assert.deepEqual([s.departTime, s.pickupTime, s.pickupPlace, s.checkinDate, s.checkinTime, s.checkinPlace, s.note], ["07:30", "06:45", "KS A 50 Trần Phú", vnDate(7), "07:00", "Cảng Cầu Đá", "ăn chay\nsay sóng"]);
  console.log("✓ thông tin chuyến lưu và chuẩn hoá");

  // 7) XÁC NHẬN ĐÒI ĐỦ CHUYẾN (Q4): nháp thiếu ngày lưu được, xác nhận 409, bổ sung rồi mới xác nhận được
  r = await post([cat({ departDate: "" }), motor({ departDate: "" })]); // ADR-0021: cả đơn cùng "chưa có ngày"
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d1 = r.body.order;
  r = await confirm(A, d1);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "incomplete_trip");
  assert.deepEqual(r.body.error.missing, [{ serviceId: d1.services[0].id, name: "Tour thử", reasons: ["no_date"] }, { serviceId: d1.services[1].id, name: "Motor thử", reasons: ["no_date"] }]);
  let g = await get(A, d1);
  assert.equal(g.order.status, "draft");
  assert.deepEqual(g.history.map((h) => h.action), ["created"], "xác nhận thất bại không ghi nhật ký");
  r = await put(d1, [cat({ id: d1.services[0].id, departDate: vnDate(9) }), motor({ id: d1.services[1].id, departDate: vnDate(9) })]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.order.services.map((x) => x.id), d1.services.map((x) => x.id), "id dịch vụ ổn định qua lần sửa");
  r = await confirm(A, r.body.order);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.status, "confirmed");
  assert.deepEqual((await get(A, d1)).history.map((h) => h.action), ["created", "updated", "confirmed", "order_terms_captured"]); // sổ đại lý đợt 1: lô Xác nhận ghi thêm dòng chụp mức
  console.log("✓ xác nhận đòi đủ ngày khởi hành; nhật ký khớp");

  // 8) QUÁ KHỨ / QUÁ XA / 0 KHÁCH (Q12): nháp lưu được, xác nhận bị chặn; hai đầu khoảng [hôm nay, +365] thì được
  // `noGuests`: dịch vụ danh mục bắt buộc ≥ 1 khách khi lưu, dịch vụ nhập tay (nay API không nhận mới) thì không → nháp "0 khách" dựng bằng SQL: đổi
  // dịch vụ vừa lưu thành nhập tay CŨ rồi đặt 0 khách (trigger 0008 chỉ khoá đơn ĐÃ xác nhận) — đúng trạng thái đơn nhập tay cũ còn trong dữ liệu thật,
  // và không làm lệch bất biến "số lượng dòng = số khách" của dịch vụ DANH MỤC ở khối 13.
  const dated = async (departDate, noGuests = false) => {
    const x = await post([motor({ departDate })]);
    assert.equal(x.status, 201, JSON.stringify(x.body));
    if (noGuests) {
      await makeLegacyManual(x.body.order.id, x.body.order.services[0].id, { unitPrice: 1 });
      await sql(`UPDATE order_service SET pax_adult = 0 WHERE order_id = '${x.body.order.id}'`);
    }
    return x.body.order;
  };
  const gap = async (order) => {
    const x = await confirm(A, order);
    assert.equal(x.status, 409, JSON.stringify(x.body));
    assert.equal(x.body.error.code, "incomplete_trip");
    return x.body.error.missing[0].reasons;
  };
  assert.deepEqual(await gap(await dated(vnDate(-1))), ["past_date"]);
  assert.deepEqual(await gap(await dated(vnDate(366))), ["too_far"]);
  assert.deepEqual(await gap(await dated(vnDate(7), true)), ["no_guests"]);
  for (const day of [vnDate(0), vnDate(365)]) {
    const x = await confirm(A, await dated(day));
    assert.equal(x.status, 200, `${day}: ${JSON.stringify(x.body)}`);
  }
  console.log("✓ xác nhận chặn quá khứ / quá xa / 0 khách; biên hôm nay và +365 được");

  // 9) ĐUA "lưu xoá ngày" với "xác nhận": không bao giờ ra đơn xác nhận thiếu ngày (điều kiện nằm trong câu UPDATE)
  for (let round = 0; round < 5; round++) {
    const d = (await post([motor()])).body.order;
    const clear = put(d, [motor({ id: d.services[0].id, departDate: "" })]);
    const [p, c] = await Promise.all([clear, confirm(ADMIN, d)]);
    const now = (await get(A, d)).order;
    // Mỗi bên chỉ được 200 hoặc 409 SẠCH — không 500. Nếu điều kiện xác nhận không nằm trong câu UPDATE mà chỉ có trigger đỡ phía sau,
    // bên thua trả 500 (trigger ném lỗi) dù trạng thái cuối vẫn đúng: bài đua này là chốt duy nhất cho yêu cầu đó.
    assert.ok([200, 409].includes(p.status) && [200, 409].includes(c.status), `PUT ${p.status} / xác nhận ${c.status}: ${JSON.stringify([p.body, c.body])}`);
    if (now.status === "confirmed") {
      assert.deepEqual([c.status, p.status], [200, 409], "xác nhận thắng thì lưu-xoá-ngày phải bị 409");
      assert.ok(now.services.every((sv) => sv.departDate), "đơn xác nhận thiếu ngày");
    } else {
      assert.equal(now.status, "draft");
      assert.deepEqual([p.status, c.status], [200, 409], "lưu-xoá-ngày thắng thì xác nhận phải bị 409");
    }
  }
  console.log("✓ đua lưu-xoá-ngày với xác nhận: không có đơn xác nhận thiếu ngày");

  // 10) KHOÁ LẠC QUAN: mốc cũ → 409 stale; thiếu mốc → 400; hai PUT cùng mốc → đúng một bên thắng, bên thua không để lại gì
  const s0 = (await post([motor()])).body.order;
  const same = (order) => [motor({ id: order.services[0].id })];
  r = await put(s0, same(s0), { customerNote: "v1" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await put(s0, same(s0), { customerNote: "v2" }); // mốc đã cũ
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
  r = await call(A, "PUT", `/api/orders/${s0.id}`, orderInput());
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "invalid_input");
  assert.match(r.body.error.message, /expectedUpdatedAt/, "thiếu mốc phải bị từ chối ĐÚNG lý do, không phải lỗi khác");
  // Hai bên ghi nội dung KHÁC NHAU: nếu bên thua lọt qua điều kiện, dòng tiền của nó sẽ đè lên bản của bên thắng và lệch với ghi chú đơn.
  // Lặp trên đơn mới mỗi vòng: nếu hai request tình cờ chạy nối tiếp thì vòng đó chưa thử được tranh chấp thật.
  // Mỗi bên gửi một ĐƠN GIÁ khác nhau (dịch vụ danh mục: mô tả dòng do máy chủ sinh, không phân biệt được hai bên bằng mô tả như dịch vụ nhập tay cũ).
  const PRICE = { x: 810000, y: 820000 };
  const mine = (order, tag) => put(order, [motor({ id: order.services[0].id, unitPrices: { adult: PRICE[tag] } })], { customerNote: tag });
  for (let round = 0; round < 3; round++) {
    const fresh = (await post([motor()])).body.order;
    const [x, y] = await Promise.all([mine(fresh, "x"), mine(fresh, "y")]);
    assert.deepEqual([x.status, y.status].sort(), [200, 409], `${x.status}/${y.status}`);
    const winner = x.status === 200 ? "x" : "y";
    const after = await get(A, fresh);
    assert.equal(after.order.services.length, 1);
    assert.equal(lines(after.order).length, 1, "bên thua không được nhân đôi dòng");
    assert.equal(after.order.customerNote, winner);
    assert.equal(lines(after.order)[0].unitPrice, PRICE[winner], "dòng tiền phải là của bên thắng, không bị bên thua đè");
    assert.deepEqual(after.history.map((h) => h.action), ["created", "updated"]);
  }
  console.log("✓ khoá lạc quan: stale / thiếu mốc / hai PUT cùng mốc");

  // 11) BẢN CHỤP CHO NHÁP CŨ (Q11): dịch vụ bị ẩn / đổi giá — nháp vẫn sửa và xác nhận được; đổi số khách thì phải chọn lại
  const sn = (await post([cat({ pax: { adult: 2 } })])).body.order;
  const snId = sn.services[0].id;
  const keep = (o, extra = {}) => put(o, [cat({ id: snId, pax: { adult: 2 }, ...extra })]);
  await sql("UPDATE catalog_item SET in_sheet = 0 WHERE code = 'ZT1'"); // rời khỏi Sheet → không còn hiện
  let v = (await get(A, sn)).order;
  assert.equal(v.services[0].catalogStatus, "unavailable");
  r = await keep(v);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  v = r.body.order;
  assert.deepEqual([v.services[0].catalogStatus, v.services[0].name], ["unavailable", "Tour thử"]);
  r = await put(v, [cat({ id: snId, pax: { adult: 3 }, catalogPriceSeen: { adult: 850000 } })]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  r = await post([cat()]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  await sql("UPDATE catalog_item SET in_sheet = 1, price_adult = 700000 WHERE code = 'ZT1'"); // hiện lại, Sheet đổi giá 850k → 700k
  v = (await get(A, sn)).order;
  assert.equal(v.services[0].catalogStatus, "price_changed");
  assert.equal(lines(v)[0].unitPrice, 850000);
  r = await keep(v);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([lines(r.body.order)[0].unitPrice, lines(r.body.order)[0].catalogPrice], [850000, 850000], "giữ giá đã lưu");
  r = await confirm(A, r.body.order);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await sql("UPDATE catalog_item SET price_adult = 850000 WHERE code = 'ZT1'");
  console.log("✓ bản chụp: dịch vụ ẩn/đổi giá vẫn sửa + xác nhận được, đổi số khách thì phải chọn lại");

  // 12) SỬA TRƯỜNG VẬN HÀNH SAU XÁC NHẬN (Q9)
  const cf = (await post([cat({ pickupPlace: "KS Novotel phòng 1205" })])).body.order;
  r = await confirm(A, cf);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  let c = r.body.order;
  r = await trip(c, { pickupTime: "06:30", pickupPlace: "Sân bay Cam Ranh", note: "đổi giờ đón" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.order.status, r.body.order.services[0].pickupTime, r.body.order.services[0].pickupPlace], ["confirmed", "06:30", "Sân bay Cam Ranh"]);
  c = r.body.order;
  const history = (await get(A, c)).history;
  // G17: cùng lô có thêm dòng "Sửa chặng đưa đón" của chặng đổi giờ (đứng SAU dòng trip_updated) — chỉ ngày / giờ, không nơi.
  assert.deepEqual(history.slice(-2).map((h) => h.action), ["trip_updated", "order_leg_updated"]);
  assert.match(history.at(-1).detail, /^Chiều đi · .+: giờ đón \(trống\) → 06:30$/);
  const last = history.at(-2);
  assert.match(last.detail, /giờ đón \(trống\) → 06:30/);
  assert.match(last.detail, /đổi điểm đón/);
  // Không dòng nhật ký nào (created/confirmed/trip_updated) được chứa giá trị địa điểm hay nội dung ghi chú (dữ liệu cá nhân)
  for (const h of history) for (const secret of ["Cam Ranh", "Novotel", "đổi giờ đón"]) assert.ok(!(h.detail ?? "").includes(secret), `nhật ký ${h.action} chứa "${secret}": ${h.detail}`);
  r = await trip(c, { departDate: vnDate(20) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  c = r.body.order;
  for (const bad of [{ departDate: vnDate(-1) }, { departDate: vnDate(400) }, { departDate: "" }, { departTime: "24:00" }]) assert.equal((await trip(c, bad)).status, 400, JSON.stringify(bad));
  const n0 = (await get(A, c)).history.length;
  r = await trip(c, {}); // không đổi gì
  assert.equal(r.status, 200);
  assert.equal((await get(A, c)).history.length, n0, "không đổi gì thì không ghi nhật ký");
  assert.equal((await get(A, c)).order.updatedAt, c.updatedAt, "PUT /trip không đổi gì thì không được đổi updated_at (các lần sửa sau dùng lại mốc này)");
  r = await trip(c, { note: "x" }, A, cf.updatedAt); // mốc cũ
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
  assert.equal((await trip(c, { note: "x" }, Bc)).status, 403);
  assert.equal((await call(null, "PUT", `/api/orders/${c.id}/trip`, {})).status, 401);
  // dịch vụ của đơn KHÁC không sửa được qua đơn này (IDOR)
  const other = (await post([motor()])).body.order;
  r = await call(A, "PUT", `/api/orders/${c.id}/trip`, { expectedUpdatedAt: c.updatedAt, services: [{ id: other.services[0].id, ...tripOf(other.services[0]), note: "chui" }] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.match(r.body.error.message, /không thuộc đơn này/);
  assert.equal((await get(A, other)).order.services[0].note, null, "dịch vụ của đơn khác không được đổi");
  r = await trip(c, { note: "admin sửa" }, ADMIN);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  c = r.body.order;
  // NGƯỜI PHỤ TRÁCH (khác người lập) sửa được thông tin chuyến SAU xác nhận (ADR-0009, order.trip.edit); người lập vẫn sửa được sau khi đã giao lại;
  // số khách/dịch vụ/tiền vẫn khoá với người phụ trách (order.money.edit không mở)
  const bId = (await call(Bc, "GET", "/api/auth/me")).body.staff.id;
  assert.equal((await trip(c, { note: "B chưa được giao" }, Bc)).status, 403, "chưa được giao → 403");
  r = await call(A, "PUT", `/api/orders/${c.id}/handler`, { staffId: bId });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await trip(c, { pickupTime: "05:45", pickupPlace: "Cảng Cầu Đá (người phụ trách)" }, Bc);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.order.status, r.body.order.services[0].pickupTime, r.body.order.services[0].pickupPlace], ["confirmed", "05:45", "Cảng Cầu Đá (người phụ trách)"]);
  c = r.body.order;
  const byHandler = (await get(Bc, c)).history.findLast((h) => h.action === "trip_updated"); // người phụ trách xem được nhật ký (G17: dòng chặng đứng sau)
  assert.deepEqual([byHandler.action, byHandler.staffName], ["trip_updated", "NV Bán B (test)"], "nhật ký ghi đúng người phụ trách");
  assert.ok(!(byHandler.detail ?? "").includes("Cầu Đá"), "nhật ký không chứa nội dung điểm đón");
  r = await trip(c, { note: "người lập sửa sau khi đã giao lại" }, A);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  c = r.body.order;
  r = await call(Bc, "PUT", `/api/orders/${c.id}`, orderInput({ services: same(c), expectedUpdatedAt: c.updatedAt }));
  assert.equal(r.status, 409, "người phụ trách cũng không sửa được số khách/dịch vụ/tiền sau xác nhận");
  assert.equal(r.body.error.code, "not_editable");
  // đơn đã xác nhận: sửa toàn bộ đơn bị từ chối; số khách/dịch vụ/ngày bị trigger giữ ngay cả khi ghi thẳng D1
  assert.equal((await put(c, same(c))).status, 409);
  const svId = c.services[0].id;
  await assert.rejects(sql(`UPDATE order_service SET pax_adult = 9 WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`UPDATE order_service SET name = 'Đổi tên' WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`DELETE FROM order_service WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`INSERT INTO order_service (id, order_id, name, unit) VALUES ('zz1', '${c.id}', 'T', 'perPax')`), /order_frozen/);
  await assert.rejects(sql(`UPDATE order_service SET depart_date = NULL WHERE id = '${svId}'`), /incomplete_trip/);
  await sql(`UPDATE order_service SET note = 'ghi thẳng D1' WHERE id = '${svId}'`); // trường vận hành vẫn ghi được
  // ngày đã qua (đơn đã đi) vẫn sửa được ghi chú nếu KHÔNG đổi ngày
  const pd = (await post([motor({ departDate: vnDate(0) })])).body.order;
  assert.equal((await confirm(A, pd)).status, 200);
  await sql(`UPDATE order_service SET depart_date = '${vnDate(-3)}' WHERE order_id = '${pd.id}'`);
  const pdNow = (await get(A, pd)).order;
  r = await trip(pdNow, { note: "đã đi xong" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await trip(r.body.order, { departDate: vnDate(-2) })).status, 400, "ĐỔI sang ngày quá khứ vẫn bị chặn");
  // đơn huỷ: không sửa được chuyến
  r = await call(ADMIN, "POST", `/api/orders/${c.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
  assert.equal(r.status, 200);
  assert.equal((await trip(r.body.order, { note: "sau huỷ" })).status, 409);
  console.log("✓ sửa trường vận hành sau xác nhận: có nhật ký, khoá số khách/dịch vụ, chặn ngày sai");

  // 12b) MỘT NGÀY CHO CẢ ĐƠN (ADR-0021, đặc tả 2026-09-25-mot-ngay-ca-don.md): máy chủ chặn đơn lệch ngày; sửa chuyến đổi ngày phải gom cả đơn
  const ONE_DATE = "Mọi dịch vụ trong đơn phải cùng một ngày khởi hành.";
  r = await post([cat(), cat({ catalogCode: "ZT3", pax: { adult: 1 }, catalogPriceSeen: { adult: 800000 }, departDate: vnDate(8) })]);
  assert.equal(r.status, 400, JSON.stringify(r.body)); assert.equal(r.body.error.message, ONE_DATE);
  r = await post([cat(), cat({ catalogCode: "ZT3", pax: { adult: 1 }, catalogPriceSeen: { adult: 800000 }, departDate: undefined })]);
  assert.equal(r.status, 400, "một có ngày, một trống cũng là lệch"); assert.equal(r.body.error.message, ONE_DATE);
  r = await post([cat(), cat({ catalogCode: "ZT3", pax: { adult: 1 }, catalogPriceSeen: { adult: 800000 } })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const two = r.body.order;
  r = await put(two, [cat({ id: two.services[0].id }), cat({ id: two.services[1].id, catalogCode: "ZT3", pax: { adult: 1 }, catalogPriceSeen: { adult: 800000 }, departDate: vnDate(9) })]);
  assert.equal(r.status, 400, "sửa nháp thành lệch ngày → chặn"); assert.equal(r.body.error.message, ONE_DATE);
  assert.equal((await confirm(A, two)).status, 200);
  const two2 = (await get(A, two)).order;
  r = await trip(two2, { departDate: vnDate(9) }); // gửi MỘT PHẦN: chỉ dịch vụ đầu đổi ngày → đơn lệch
  assert.equal(r.status, 400, JSON.stringify(r.body)); assert.equal(r.body.error.message, ONE_DATE);
  r = await call(A, "PUT", `/api/orders/${two2.id}/trip`, { expectedUpdatedAt: two2.updatedAt, services: two2.services.map((s) => ({ id: s.id, ...tripOf(s), departDate: vnDate(9) })) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await get(A, two2)).order.services.map((s) => s.departDate), [vnDate(9), vnDate(9)]);
  // đơn CŨ lệch ngày (dựng bằng SQL — API nay chặn): chỉ sửa ghi chú vẫn được; đổi ngày mà vẫn lệch thì chặn
  await sql(`UPDATE order_service SET depart_date = '${vnDate(12)}' WHERE id = '${two2.services[1].id}'`);
  const old = (await get(A, two2)).order;
  r = await trip(old, { note: "chỉ sửa ghi chú" });
  assert.equal(r.status, 200, `đơn cũ lệch ngày vẫn sửa ghi chú được: ${JSON.stringify(r.body)}`);
  const old2 = (await get(A, two2)).order;
  r = await trip(old2, { departDate: vnDate(10) });
  assert.equal(r.status, 400); assert.equal(r.body.error.message, ONE_DATE);
  console.log("✓ một ngày cho cả đơn: chặn lập/sửa nháp lệch ngày, chặn sửa chuyến làm lệch (kể cả gửi một phần), gom về một ngày được, đơn cũ sửa ghi chú được");

  // 13) BẤT BIẾN (Điều 8.3): kiểm bằng SQL trên MỌI đơn của lần chạy
  const noPax = await sqlRows(`SELECT COUNT(*) AS n FROM order_item i JOIN order_service s ON s.id = i.service_id WHERE s.catalog_code IS NOT NULL AND (i.pax_code IS NULL OR i.catalog_price IS NULL)`);
  assert.equal(noPax[0].n, 0, "dòng của dịch vụ danh mục phải có loại khách + giá danh mục");
  const skew = await sqlRows(`SELECT COUNT(*) AS n FROM order_item i JOIN order_service s ON s.id = i.service_id WHERE s.catalog_code IS NOT NULL AND (
      (s.unit = 'perPax' AND i.quantity <> CASE i.pax_code WHEN 'adult' THEN s.pax_adult WHEN 'child' THEN s.pax_child WHEN 'senior' THEN s.pax_senior WHEN 'infant' THEN s.pax_infant END)
      OR (s.unit = 'per5Pax' AND i.quantity <> (s.pax_adult + 4) / 5))`);
  assert.equal(skew[0].n, 0, "Σ số lượng dòng tiền phải khớp số khách của dịch vụ danh mục");
  const incomplete = await sqlRows(`SELECT COUNT(*) AS n FROM orders o WHERE o.status = 'confirmed' AND EXISTS (
      SELECT 1 FROM order_service s WHERE s.order_id = o.id AND (s.depart_date IS NULL OR s.pax_adult + s.pax_child + s.pax_senior + s.pax_infant < 1))`);
  assert.equal(incomplete[0].n, 0, "không có đơn xác nhận thiếu ngày/khách");
  const orphan = await sqlRows(`SELECT COUNT(*) AS n FROM order_item WHERE service_id IS NULL OR service_id NOT IN (SELECT id FROM order_service)`);
  assert.equal(orphan[0].n, 0, "mọi dòng tiền thuộc một dịch vụ");
  console.log("✓ bất biến SQL: số lượng khớp số khách, đơn xác nhận đủ chuyến, không dòng tiền mồ côi");
} finally {
  // Dọn mà không che lỗi gốc: nếu một câu dọn thất bại, chỉ ghi log — không thay thế AssertionError đang bay ra.
  for (const q of ["DELETE FROM catalog_override WHERE code LIKE 'ZT%'", "DELETE FROM catalog_item WHERE code LIKE 'ZT%'"]) {
    await sql(q).catch((e) => console.error("dọn danh mục giả ZT* thất bại:", String(e).slice(0, 200)));
  }
}
console.log("E2E OK");
