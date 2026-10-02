// Kịch bản Chrome — màn 03 Chi tiết xe + giấy tờ xe (ADR-0040 D1; docs/design/van-chuyen-1a/project/03 Chi tiet xe.dc.html).
// 1–2) 1040 / 390: đầu thẻ (biển số, trạng thái, tên · số người không kể tài xế), khối tóm tắt, giấy tờ xếp đã hết → sắp hết → còn hạn → không hạn, chip đúng,
//      "Gia hạn" chỉ với giấy có hạn, "Lịch sử (N)" chỉ khi có dòng cũ; nút "Thêm giấy tờ" (máy tính: góc phải đầu thẻ; điện thoại: dính đáy).
// 3) "Lịch sử (1)" mở ngay dưới dòng: dòng cũ nền xám + "Đã thay".  4) "Gia hạn" → bảng: chữ nhắc giữ dòng cũ, thiếu ngày hết hạn → câu lỗi, đủ → dòng mới + Lịch sử.
// 5) "Sửa sai" → nút Lưu KHOÁ tới khi chọn lý do (danh sách đóng của máy chủ, chỉ lý do cho xe); chọn "Nhập sai ngày hết hạn" → ô ngày → Lưu → đổi; nhật ký
//    có dòng sửa sai KHÔNG kèm số.  6) "Thêm giấy tờ" (xe v2 đã có Kiểm định → ô loại không còn "Kiểm định"; xe v1 đủ 6 loại → nút tắt + câu hướng dẫn): chọn loại không có hạn → ẩn ô hết hạn; loại có hạn → ô hết hạn + "Giấy này không có hạn".
// 7) xe đã ngừng: không "Thêm giấy tờ", không "Gia hạn", có câu nói rõ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-chi-tiet-smoke.mjs
import { ACCOUNTS, DESK, MOB, assert, axe, axeNote, boDem, clickVisible, dungMoiTruong, shotFull, shotView, sleep, txt, typeInto, vnDate } from "./vc-lib.mjs";

const dem = boDem("XE CHI TIET SMOKE");
const { env, call, themXe, themGiayXe, giaHanGiayXe } = await dungMoiTruong([]);
const ADMIN = ACCOUNTS.admin;
const d = (n) => vnDate(n).split("-").reverse().join("/");
try {
  const v1 = await themXe({ plateNumber: "79B-123.45", chassisNumber: "KHUNGV1000001", name: "Ford Transit 2019", passengerCapacity: 15 });
  await themGiayXe(v1.id, { typeCode: "REGISTRATION", number: "012345", issuedDate: vnDate(-2700) });
  await themGiayXe(v1.id, { typeCode: "INSPECTION", number: "KD-0456", issuedDate: vnDate(-166), expiryDate: vnDate(17) });
  const bhCu = await themGiayXe(v1.id, { typeCode: "TPL_INSURANCE", number: "BH-7700", issuedDate: vnDate(-726), expiryDate: vnDate(-361) });
  await giaHanGiayXe(v1.id, bhCu.id, { number: "BH-7788", issuedDate: vnDate(-361), expiryDate: vnDate(4) });
  await themGiayXe(v1.id, { typeCode: "CONTRACT_BADGE", number: "PH-0091", expiryDate: vnDate(-8) });
  await themGiayXe(v1.id, { typeCode: "TRIP_MONITOR", expiryDate: vnDate(94) });
  await themGiayXe(v1.id, { typeCode: "DRIVER_CAMERA", expiryDate: vnDate(94) });
  const v2 = await themXe({ plateNumber: "79C-246.80", chassisNumber: "KHUNGV2000002", name: "Hyundai Solati 2020", passengerCapacity: 16 });
  await themGiayXe(v2.id, { typeCode: "INSPECTION", number: "KD-0777", issuedDate: vnDate(-100), expiryDate: vnDate(200) });
  const v4 = await themXe({ plateNumber: "79A-135.79", chassisNumber: "KHUNGV4000004", name: "Kia Carnival 2018", passengerCapacity: 6 });
  await themGiayXe(v4.id, { typeCode: "INSPECTION", number: "KD-0999", issuedDate: vnDate(-100), expiryDate: vnDate(200) });
  const ngung = await call(ADMIN, "PUT", `/api/van-chuyen/xe/${v4.id}`, { plateNumber: v4.plateNumber, chassisNumber: v4.chassisNumber, name: v4.name, modelYear: null, passengerCapacity: 6, status: "retired", expectedUpdatedAt: v4.updatedAt });
  assert.equal(ngung.status, 200, ngung.text);

  const readDesk = (p) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      return {
        plate: t(document.querySelector('h1.vc-plate')), status: t(document.querySelector('.vc-xe-head .vc-chip')), sub: t(document.querySelector('.vc-xe-sub')),
        summary: t(document.querySelector('.vc-xe-head .vc-alert')), summaryTone: [...(document.querySelector('.vc-xe-head .vc-alert')?.classList ?? [])].find((c) => c.startsWith('vc-alert-')) ?? null,
        rows: [...document.querySelectorAll('#docs-table .vc-dt-row')].map((r) => ({ type: t(r.querySelector('.vc-doc-title')), sub: t(r.querySelector('.vc-doc-sub')), exp: t(r.querySelector('.vc-dt-exp')), chip: t(r.querySelector('.vc-chip')), buttons: [...r.querySelectorAll('button')].map(t) })),
        head: [...document.querySelectorAll('#docs-table .vc-dt-head span')].map(t),
      };
    })()`);

  await dem.step("1", "03 máy tính: đầu thẻ, tóm tắt, bảng giấy tờ đúng thứ tự / chip / nút" + axeNote(), async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#docs-table .vc-dt-row').length === 6", "sáu giấy tờ", 10000);
      const s = await readDesk(p);
      assert.equal(s.plate, "79B-123.45");
      assert.equal(s.status, "Đang dùng");
      assert.equal(s.sub, "Ford Transit 2019 · 15 người (không kể tài xế)");
      assert.equal(s.summary, "1 giấy đã hết hạn · 2 giấy sắp hết hạn trong 30 ngày");
      assert.equal(s.summaryTone, "vc-alert-danger");
      assert.deepEqual(s.head, ["LOẠI · SỐ · NGÀY CẤP", "HẾT HẠN", "CÒN", ""]);
      assert.deepEqual(s.rows.map((r) => [r.type, r.chip]), [
        ["Phù hiệu xe hợp đồng", "Đã hết hạn 8 ngày"],
        ["Bảo hiểm trách nhiệm dân sự", "Còn 4 ngày"],
        ["Kiểm định", "Còn 17 ngày"],
        ["Camera người lái", "Còn 94 ngày"],
        ["Giám sát hành trình", "Còn 94 ngày"],
        ["Đăng ký xe", "Không hạn"],
      ]);
      assert.equal(s.rows[1].sub, `Số BH-7788 · cấp ${d(-361)}`);
      assert.equal(s.rows[1].exp, d(4));
      assert.deepEqual(s.rows[1].buttons, ["Lịch sử (1)", "Sửa sai", "Gia hạn"]);
      assert.deepEqual(s.rows[5].buttons, ["Sửa sai"], "giấy không hạn: không Gia hạn");
      assert.equal(s.rows[5].exp, "Không hạn");
      assert.equal(s.rows[3].sub, "—", "không số, không ngày cấp → gạch");
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('.vc-xe-head-actions a, .vc-xe-head-actions button')].filter((b) => b.getClientRects().length > 0).map((b) => b.innerText.trim())`), ["Sửa thông tin xe", "Thêm giấy tờ"]);
      assert.equal(await p.ev(txt("#bar-title")), "Vận chuyển › Xe › 79B-123.45");
      await axe(p, "03 máy tính");
      await shotFull(p, "03-chi-tiet-xe-1040.png");
    } finally {
      p.close();
    }
  });

  await dem.step("2", "03 điện thoại: thẻ đầu (Sửa thông tin xe), “Giấy tờ xe”, từng dòng: loại + chip, dòng số · cấp · hết hạn, nút Gia hạn / Sửa sai / Lịch sử; “Thêm giấy tờ” dính đáy" + axeNote(), async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, MOB);
    try {
      await p.waitFor("document.querySelectorAll('#docs-list .vc-doc').length === 6", "sáu giấy tờ", 10000);
      assert.equal(await p.ev(txt("#bar-title")), "79B-123.45");
      const rows = await p.ev(`[...document.querySelectorAll('#docs-list .vc-doc')].map((r) => ({ type: r.querySelector('.vc-doc-title').innerText.trim(), line: r.querySelector('.vc-doc-line').innerText.trim(), buttons: [...r.querySelectorAll('.vc-doc-btns button')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim()) }))`);
      assert.deepEqual(rows[0], { type: "Phù hiệu xe hợp đồng", line: `Số PH-0091 · hết hạn ${d(-8)}`, buttons: ["Gia hạn", "Sửa sai"] });
      assert.deepEqual(rows[1].buttons, ["Gia hạn", "Sửa sai", "Lịch sử (1)"]);
      assert.equal(rows[5].line, `Số 012345 · cấp ${d(-2700)} · không hạn`);
      assert.ok(await p.ev(`[...document.querySelectorAll('.vc-bottom-bar button')].some((b) => b.getClientRects().length > 0 && b.innerText.trim() === 'Thêm giấy tờ')`));
      assert.ok(await p.ev(`[...document.querySelectorAll('.vc-xe-head a')].some((a) => a.getClientRects().length > 0 && a.innerText.trim() === 'Sửa thông tin xe')`));
      await axe(p, "03 điện thoại");
      await shotFull(p, "03-chi-tiet-xe-390.png");
    } finally {
      p.close();
    }
  });

  await dem.step("3", "“Lịch sử (1)” mở ngay dưới dòng: dòng cũ nền xám + “Đã thay”; mũi tên xoay; đóng lại được (390)", async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, MOB);
    try {
      await p.waitFor("document.querySelectorAll('#docs-list .vc-doc').length === 6", "giấy tờ", 10000);
      assert.ok(await p.ev(clickVisible("#docs-list", "Lịch sử (1)")));
      await p.waitFor("!!document.querySelector('#docs-list .vc-hist')", "lịch sử mở", 5000);
      const h = await p.ev(`(() => { const b = [...document.querySelectorAll('#docs-list button')].find((x) => x.innerText.trim() === 'Lịch sử (1)'); return { expanded: b.getAttribute('aria-expanded'), rows: [...document.querySelectorAll('#docs-list .vc-hist-row')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()) }; })()`);
      assert.equal(h.expanded, "true");
      assert.deepEqual(h.rows, [`BH-7700 · ${d(-726)} → ${d(-361)} Đã thay`]);
      await shotFull(p, "03-lich-su-390.png");
      assert.ok(await p.ev(clickVisible("#docs-list", "Lịch sử (1)")));
      await p.waitFor("!document.querySelector('#docs-list .vc-hist')", "lịch sử đóng", 5000);
    } finally {
      p.close();
    }
  });

  await dem.step("4", "“Gia hạn” Kiểm định (1040): chữ nhắc giữ dòng cũ; thiếu ngày hết hạn → “Nhập ngày hết hạn.”; đủ → dòng mới, Kiểm định có “Lịch sử (1)”", async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#docs-table .vc-dt-row').length === 6", "giấy tờ", 10000);
      assert.ok(await p.ev(`(() => { const r = [...document.querySelectorAll('#docs-table .vc-dt-row')].find((x) => x.querySelector('.vc-doc-title').innerText.trim() === 'Kiểm định'); const b = [...r.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Gia hạn'); b.click(); return true; })()`));
      await p.waitFor("document.querySelector('.sheet-root.open')", "bảng Gia hạn", 5000);
      assert.equal(await p.ev(txt(".sheet-title")), "Gia hạn · Kiểm định");
      assert.equal(await p.ev(txt(".vc-renew-note")), `Dòng hiện tại (KD-0456 · hết hạn ${d(17)}) được giữ làm lịch sử. Gia hạn thêm một dòng mới.`);
      assert.equal(await p.ev("document.querySelector('#gt-issued').value"), vnDate(0), "ngày cấp mặc định hôm nay");
      await shotView(p, "03-gia-han-1040.png");
      assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu gia hạn")));
      await p.waitFor("!document.querySelector('#gt-error').hidden", "câu lỗi", 5000);
      assert.equal(await p.ev(txt("#gt-error")), "Nhập ngày hết hạn.");
      await p.ev(typeInto("#gt-no", "KD-1002"));
      await p.ev(typeInto("#gt-exp", vnDate(382)));
      assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu gia hạn")));
      await p.waitFor("!document.querySelector('.sheet-root')", "bảng đóng", 8000);
      await p.waitFor(`[...document.querySelectorAll('#docs-table .vc-dt-row')].some((r) => r.querySelector('.vc-doc-title').innerText.trim() === 'Kiểm định' && r.innerText.includes('Lịch sử (1)') && r.innerText.includes('Còn hạn'))`, "Kiểm định đã gia hạn", 8000);
    } finally {
      p.close();
    }
  });

  await dem.step("5", "“Sửa sai” (390): Lưu khoá tới khi chọn lý do; bốn lý do cho xe; “Nhập sai ngày hết hạn” → ô ngày → Lưu → chip đổi; nhật ký không kèm số", async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, MOB);
    try {
      await p.waitFor("document.querySelectorAll('#docs-list .vc-doc').length === 6", "giấy tờ", 10000);
      assert.ok(await p.ev(`(() => { const r = [...document.querySelectorAll('#docs-list .vc-doc')].find((x) => x.querySelector('.vc-doc-title').innerText.trim() === 'Camera người lái'); [...r.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Sửa sai').click(); return true; })()`));
      await p.waitFor("document.querySelector('.sheet-root.open')", "bảng Sửa sai", 5000);
      assert.equal(await p.ev(txt(".sheet-title")), "Sửa sai · Camera người lái");
      assert.equal(await p.ev("document.querySelector('#gt-submit').disabled"), true, "Lưu khoá khi chưa chọn lý do");
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('.vc-reasons [role=radio]')].map((b) => b.innerText.trim())`), ["Nhập sai số", "Nhập sai ngày cấp", "Nhập sai ngày hết hạn", "Nhập nhầm cả dòng (huỷ dòng này)"]);
      assert.ok((await p.ev(txt(".vc-fix-note"))).includes("Giấy mới được cấp thì dùng “Gia hạn”."));
      await shotView(p, "03-sua-sai-chua-chon-390.png");
      assert.ok(await p.ev(clickVisible(".vc-reasons", "Nhập sai ngày hết hạn")));
      await p.waitFor("!!document.querySelector('#gt-exp') && document.querySelector('#gt-submit').disabled === false", "ô ngày hết hạn + Lưu mở", 5000);
      assert.equal(await p.ev("document.querySelector('#gt-exp').value"), vnDate(94));
      await p.ev(typeInto("#gt-exp", vnDate(20)));
      await shotView(p, "03-sua-sai-da-chon-390.png");
      assert.ok(await p.ev(clickVisible(".sheet-root", "Lưu sửa sai")));
      await p.waitFor("!document.querySelector('.sheet-root')", "bảng đóng", 8000);
      await p.waitFor(`[...document.querySelectorAll('#docs-list .vc-doc')].some((r) => r.querySelector('.vc-doc-title').innerText.trim() === 'Camera người lái' && r.querySelector('.vc-chip').innerText.trim() === 'Còn 20 ngày')`, "chip Camera đổi", 8000);
      const nk = env.sql("SELECT detail FROM audit_log WHERE action = 'vehicle_document_corrected'");
      assert.equal(nk.length, 1, JSON.stringify(nk));
      assert.ok(nk[0].detail.startsWith("xe 79B-123.45: Camera người lái: Nhập sai ngày hết hạn"), nk[0].detail);
    } finally {
      p.close();
    }
  });

  await dem.step("6", "“Thêm giấy tờ” (1040) trên xe v2 (đã có Kiểm định): ô loại KHÔNG có “Kiểm định”; loại không có hạn → ẩn ô hết hạn; loại có hạn → ô hết hạn + “Giấy này không có hạn”; thêm được; xe v1 đủ sáu loại → nút tắt + câu hướng dẫn (ADR-0056 VK3-B)", async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v2.id}`, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#docs-table .vc-dt-row').length === 1", "giấy tờ", 10000);
      assert.ok(await p.ev(clickVisible(".vc-xe-head-actions", "Thêm giấy tờ")));
      await p.waitFor("document.querySelector('.sheet-root.open') && !!document.querySelector('#gt-type')", "bảng Thêm giấy tờ", 5000);
      assert.equal(await p.ev(txt(".sheet-title")), "Thêm giấy tờ");
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#gt-type option')].map((o) => o.textContent)`), ["Đăng ký xe", "Bảo hiểm trách nhiệm dân sự", "Phù hiệu xe hợp đồng", "Giám sát hành trình", "Camera người lái"], "loại đã có dòng hiện hành (Kiểm định) không còn trong ô loại");
      await p.ev(typeInto("#gt-type", "REGISTRATION"));
      assert.equal(await p.ev("!!document.querySelector('#gt-exp') || !!document.querySelector('#gt-noexp')"), false, "loại không có hạn: không ô hết hạn");
      await p.ev(typeInto("#gt-type", "TPL_INSURANCE"));
      assert.equal(await p.ev("!!document.querySelector('#gt-exp') && !!document.querySelector('#gt-noexp')"), true);
      await shotView(p, "03-them-giay-to-1040.png");
      await p.ev("document.querySelector('#gt-noexp').click()");
      assert.equal(await p.ev("!!document.querySelector('#gt-exp')"), false, "“không có hạn” ẩn ô hết hạn");
      await p.ev(typeInto("#gt-no", "BH-THEM-1"));
      assert.ok(await p.ev(clickVisible(".sheet-root", "Thêm giấy tờ")));
      await p.waitFor("!document.querySelector('.sheet-root') && document.querySelectorAll('#docs-table .vc-dt-row').length === 2", "thêm xong", 8000);
    } finally {
      p.close();
    }
    const q = await env.as(ADMIN, `/xe-chi-tiet?id=${v1.id}`, DESK);
    try {
      await q.waitFor("document.querySelectorAll('#docs-table .vc-dt-row').length === 6", "giấy tờ v1", 10000);
      assert.equal(await q.ev("document.querySelector('.vc-xe-head-actions button').disabled"), true, "xe đủ loại: nút Thêm giấy tờ tắt");
      assert.equal(await q.ev(txt(".vc-xe-head-actions .dp-note")), "Xe đã có đủ các loại giấy tờ — dùng Gia hạn hoặc Sửa sai.");
      await shotView(q, "03-xe-du-loai-1040.png");
    } finally {
      q.close();
    }
  });

  await dem.step("7", "xe đã ngừng (1040): chip “Ngừng”, không “Thêm giấy tờ”, không “Gia hạn”, có câu nói rõ; vẫn “Sửa sai”", async () => {
    const p = await env.as(ADMIN, `/xe-chi-tiet?id=${v4.id}`, DESK);
    try {
      await p.waitFor("document.querySelectorAll('#docs-table .vc-dt-row').length === 1", "giấy tờ", 10000);
      assert.equal(await p.ev(txt(".vc-xe-head .vc-chip")), "Ngừng");
      assert.equal(await p.ev(`[...document.querySelectorAll('button')].some((b) => b.getClientRects().length > 0 && (b.innerText.trim() === 'Thêm giấy tờ' || b.innerText.trim() === 'Gia hạn'))`), false);
      assert.equal(await p.ev(txt(".vc-retired-note")), "Xe đã ngừng dùng — không thêm hay gia hạn giấy tờ. Muốn dùng lại: Sửa thông tin xe → Dùng lại xe.");
      assert.ok(await p.ev(`[...document.querySelectorAll('#docs-table button')].some((b) => b.innerText.trim() === 'Sửa sai')`));
      await shotFull(p, "03-xe-da-ngung-1040.png");
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
dem.xong();
