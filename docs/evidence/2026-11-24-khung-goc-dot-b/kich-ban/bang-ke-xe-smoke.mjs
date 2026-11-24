// BẢN CHÉP (đợt B khung gốc, 24/11/2026) của docs/evidence/2026-10-02-tien-xe-thue/kich-ban/bang-ke-xe-smoke.mjs — hồ sơ có ngày giữ nguyên. Đổi BỘ CHỌN theo khung gốc
// (ADR-0222, khuôn Danh sách): mỗi nhà xe một khối .bk-nhom (tên ở .khoi-dau h2, «N chuyến» ở .khoi-mo-ta, tổng nhóm ở [data-tong]) có bảng (tr[data-chuyen]) và
// danh sách dòng (a.dong[data-chuyen]) — KHỐI từ 800 hiện bảng, hẹp hơn hiện danh sách. Bước máy tính so dữ liệu của BẢNG (luôn dựng trong DOM; đọc chữ từng ô
// theo nút con, không theo bố cục) và so thêm cách trình bày đang hiện; bấm dòng thì bấm bản đang hiện. Tổng cộng: khối [aria-label="Tổng cộng"].
// Đổi CÓ CHỦ Ý (ghi ở README-kich-ban-xe.md): dòng danh sách ở điện thoại đưa số tiền xuống cuối dòng; dòng «chưa có giá» không tô nền nữa (chỉ huy hiệu + chữ —
// chú thích đầu web/bang-ke-xe.ts) nên phép so lớp is-thieu GIỮ NGUYÊN nhưng dời xuống CUỐI bước 2 để các phép so khác vẫn chạy; đỏ ở đó cần người điều phối quyết.
// G4 — Bảng kê chi phí xe thuê (/bang-ke-xe): ADR-0057 T2 C9; câu 4.1 (chưa có "Tải bảng kê"), 4.2 (cột điều chỉnh = số tiền máy chủ); bản vẽ màn 1c.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-02-tien-xe-thue node docs/evidence/2026-11-24-khung-goc-dot-b/kich-ban/bang-ke-xe-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán). `call` của Kế toán / Bán hàng chỉ dùng khi dựng dữ liệu.
import { randomUUID } from "node:crypto";
// OUT mặc định /tmp/dot-b-khung-goc-vc (dp-lib đọc OUT lúc nạp ⇒ đặt biến TRƯỚC rồi nạp động; dp-lib, tx-lib gốc dùng nguyên).
process.env.OUT ??= "/tmp/dot-b-khung-goc-vc";
const {
  ACCOUNTS, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shown, txt, typeInto, vnDate,
} = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { dungNenGia, taiXe, xe } = await import("../../2026-10-02-tien-xe-thue/kich-ban/tx-lib.mjs");
// Khung gốc: ô tổng cộng; phần tử ĐANG HIỆN khớp bộ chọn.
const TONG = "document.querySelector('[aria-label=\"Tổng cộng\"] [data-tong]')";
const HIEN = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getClientRects().length > 0)`;

const { env, call } = await dungMoiTruong();
const b = boDem("BANG KE XE SMOKE");
try {
  const n = await dungNenGia(env, call, (nx) => ({
    txPT: taiXe(env, nx.PT.id, "Trần Văn Thành"), txMT: taiXe(env, nx.MT.id, "Lê Minh Tâm"),
    xA: xe(env, nx.PT.id, "79A-123.45", 16), xB: xe(env, nx.PT.id, "79A-246.80", 16), xC: xe(env, nx.PT.id, "79C-318.77", 16), xD: xe(env, nx.MT.id, "79C-555.12", 16),
  }));
  const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
  const NGAY = vnDate(2);
  const tao = async (xeId, tx, tuyen, tu, den) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx, tuyen, batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den } });
    dung(r, 201, "tạo chuyến");
    return r.json.chuyen;
  };
  const dieuChinh = async (id, soTien, lyDo) => {
    const cp = (await call(ACCOUNTS.accounting, "GET", `/api/van-chuyen/chuyen/${id}/chi-phi`)).json.chiPhi;
    dung(await call(ACCOUNTS.accounting, "POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { requestId: randomUUID(), phienBanChiPhi: cp.phienBanChiPhi, soTien, lyDo }), 201, "điều chỉnh");
  };
  // A: 450.000 + phụ thu 150.000, chạy xong ⇒ Đã phát sinh 600.000. B: huỷ + phí huỷ 300.000. C: tuyến chưa có giá ⇒ Chưa có giá. D (Minh Tâm): chưa chạy 1.600.000.
  const A = await tao(n.them.xA, n.them.txPT, n.tuyen.CR, "06:00", "07:00");
  await dieuChinh(A.id, 150_000, "CPX_PHU_THU_CHO");
  dung(await call(ACCOUNTS.salesA, "POST", `/api/van-chuyen/chuyen/${A.id}/xuat-ben`, { requestId: randomUUID() }), 200, "xuất bến A");
  dung(await call(ACCOUNTS.salesA, "POST", `/api/van-chuyen/chuyen/${A.id}/ket-thuc`, { requestId: randomUUID() }), 200, "kết thúc A");
  const B = await tao(n.them.xB, n.them.txPT, n.tuyen.CR, "08:30", "09:30");
  {
    const ct = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${B.id}`)).json;
    dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${B.id}/huy`, { requestId: randomUUID(), version: ct.chuyen.version, lyDo: ct.lyDo.find((l) => l.nhom === "HUY_CHUYEN").code }), 200, "huỷ B");
    await dieuChinh(B.id, 300_000, "CPX_HUY_MUON");
  }
  const C = await tao(n.them.xC, n.them.txPT, n.tuyen.DM, "11:00", "12:00");
  const D = await tao(n.them.xD, n.them.txMT, n.tuyen.BB, "13:00", "14:00");
  const Q = `?tu=${vnDate(0)}&den=${vnDate(5)}`;

  const choKq = (p) => p.waitFor(`!document.querySelector('.tx-tai') && (!!document.querySelector('.bk-ket-qua > *') || !document.getElementById('error').hidden)`, "bảng kê dựng xong");
  // Chữ một ô bảng theo nút con (không phụ thuộc bố cục — bảng có thể đang ẩn khi khối hẹp hơn 800).
  const nhom = `[...document.querySelectorAll('.bk-nhom')].map((g) => ({ ten: g.querySelector('.khoi-dau h2').textContent, so: g.querySelector('.khoi-mo-ta').textContent, tong: g.querySelector('[data-tong]').textContent, dong: [...g.querySelectorAll('tbody tr[data-chuyen]')].map((r) => [...r.children].map((c) => [...c.childNodes].map((n) => n.textContent.replace(/\\s+/g, ' ').trim()).filter(Boolean).join(' ')).join(' | ')) }))`;

  // ---- Bán hàng --------------------------------------------------------------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, `/bang-ke-xe${Q}`, DESK);
  await s.waitFor(`!document.getElementById('error').hidden`, "câu từ chối");
  await b.step("1", "Bán hàng mở thẳng /bang-ke-xe: câu không có quyền, không bảng, không gọi route chi phí", async () => {
    assert.equal(await s.ev(txt("#error")), "Tài khoản này không xem được bảng kê chi phí xe.");
    assert.equal(apiCalls(s).filter((r) => r.path.startsWith("/api/van-chuyen/chi-phi")).length, 0);
  });
  await s.close();

  // ---- Quản trị, máy tính -----------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.admin, `/bang-ke-xe${Q}`, DESK);
  await choKq(p);
  await b.step("2", `1c 1040: lọc 4 ô + chú thích; tóm tắt "4 chuyến · 2 nhà xe · 1 chuyến chưa có giá" (số máy chủ); nhóm theo nhà xe (TỔNG NHÓM máy chủ); dòng chưa có giá nổi bật; cột ĐIỀU CHỈNH = số tiền; TỔNG CỘNG = tongCong; KHÔNG nút "Tải bảng kê"${axeNote()}`, async () => {
    assert.equal(await p.ev(txt("h1")), "Bảng kê chi phí xe thuê");
    assert.equal(await p.ev(txt(".dau-trang .doan-dan")), "Chuyến nào, nhà xe nào, bao nhiêu — để trả tay cho nhà xe.");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bk-loc label')].map((l) => l.textContent)`), ["Từ ngày", "Đến ngày", "Nhà xe", "Trạng thái"]);
    assert.equal(await p.ev(txt("#bk-trang > p.doan-dan")), "Lọc theo ngày chạy, tối đa khoảng 3 tháng. Trạng thái: Đã phát sinh (đã chạy xong) · Chưa chạy · Đang chạy · Đã huỷ · Chưa có giá.");
    assert.equal(await p.ev(txt(".bk-ket-qua > p.doan-dan")), "4 chuyến · 2 nhà xe · 1 chuyến chưa có giá");
    const ds = await p.ev(nhom);
    const pt = ds.find((g) => g.ten === "Nhà xe Phúc Thành");
    const mt = ds.find((g) => g.ten === "Nhà xe Minh Tâm");
    assert.deepEqual([pt.so, pt.tong, mt.so, mt.tong], ["3 chuyến", "900.000 ₫", "1 chuyến", "1.600.000 ₫"]);
    const dm = NGAY.slice(8, 10) + "/" + NGAY.slice(5, 7);
    assert.ok(pt.dong.includes(`${A.ma} ${dm} | 79A-123.45 Nha Trang – sân bay Cam Ranh | Đã phát sinh Giá bảng | + 150.000 ₫ | 600.000 ₫`), JSON.stringify(pt.dong));
    assert.ok(pt.dong.some((x) => x.startsWith(`${B.ma}`) && x.includes("Đã huỷ") && x.endsWith("300.000 ₫")), JSON.stringify(pt.dong));
    assert.ok(pt.dong.includes(`${C.ma} ${dm} | 79C-318.77 Nha Trang – Đầm Môn | Chưa có giá Chưa có giá | — | Chưa có giá`), JSON.stringify(pt.dong));
    assert.ok(mt.dong.some((x) => x.startsWith(D.ma) && x.includes("Chưa chạy") && x.endsWith("1.600.000 ₫")));
    // L2 (vòng vá 1): nguồn giá dòng huỷ (B) tông trung tính, dòng chưa huỷ thiếu giá (C) tông cảnh báo — cùng luật với khối Chi phí chuyến.
    const tone = (id) => `document.querySelector('tr[data-chuyen="${id}"] td:nth-child(3) [data-tone]')?.dataset.tone`;
    assert.deepEqual([await p.ev(tone(B.id)), await p.ev(tone(C.id))], ["muted", "warn"]);
    assert.equal(await p.ev(`${TONG}.innerText.trim()`), "2.500.000 ₫");
    assert.equal(await p.ev(txt('[aria-label="Tổng cộng"] .khoi-mo-ta')), "Chuyến chưa có giá chưa được tính.");
    const may = await fetchTrang(p, "GET", `/api/van-chuyen/chi-phi?tu=${vnDate(0)}&den=${vnDate(5)}`);
    assert.equal(await p.ev(`${TONG}.dataset.tong`), String(may.json.tongCong), "TỔNG CỘNG = số máy chủ");
    assert.equal(await p.ev(`document.querySelector('main').innerText.includes('Tải bảng kê')`), false, "câu 4.1: chưa làm");
    // khung gốc: «không thẻ dọc ở máy tính» thành «đúng một cách trình bày theo bề rộng khối» (khối từ 800 bảng, hẹp hơn danh sách dòng).
    const rongKhoi = await p.ev("document.querySelector('.bk-nhom').getBoundingClientRect().width");
    console.log(`    ◦ 1040: khối nhà xe rộng ${Math.round(rongKhoi)} → ${rongKhoi >= 800 ? "bảng" : "danh sách dòng"}`);
    assert.deepEqual([await p.ev(shown(".bk-nhom table")), await p.ev(shown(".bk-nhom .ds-dong[data-thay-bang]"))], rongKhoi >= 800 ? [true, false] : [false, true], "đúng một cách trình bày theo bề rộng khối");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "bảng kê 1040");
    await shotFull(p, "g4-bang-ke-may-tinh.png");
    // Dời xuống cuối bước (đợt B): dòng chưa có giá «nổi bật» bằng lớp is-thieu — thiết kế mới bỏ tô nền (xem đầu tệp).
    assert.ok(await p.ev(`document.querySelector('tr[data-chuyen="${C.id}"]')?.classList.contains('is-thieu')`), "dòng chưa có giá nổi bật (lớp is-thieu)");
  });

  await b.step("3", `Lọc "Đã phát sinh" ⇒ chỉ chuyến chạy xong, TỔNG CỘNG 600.000 ₫; lọc nhà xe Minh Tâm ⇒ một nhóm (danh sách nhà xe = nhà xe có chuyến trong khoảng)`, async () => {
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#bk-nha-xe option')].map((o) => o.textContent)`), ["Tất cả nhà xe", "Nhà xe Minh Tâm", "Nhà xe Phúc Thành"]);
    await p.ev(typeInto("#bk-trang-thai", "DA_PHAT_SINH"));
    await p.waitFor(`${TONG}?.dataset.tong === '600000'`, "lọc đã phát sinh");
    assert.equal(await p.ev(`document.querySelectorAll('.bk-nhom tbody tr[data-chuyen]').length`), 1);
    await p.ev(typeInto("#bk-trang-thai", ""));
    await p.ev(typeInto("#bk-nha-xe", n.MT.id));
    await p.waitFor(`${TONG}?.dataset.tong === '1600000' && document.querySelectorAll('.bk-nhom').length === 1`, "lọc nhà xe");
    assert.match(await p.ev(`location.search`), /nha-xe=/);
    await p.ev(typeInto("#bk-nha-xe", ""));
    await p.waitFor(`document.querySelectorAll('.bk-nhom').length === 2`, "bỏ lọc");
  });

  await b.step("4", "Khoảng ngày quá 92 ngày ⇒ câu máy chủ nguyên văn", async () => {
    await p.ev(typeInto("#bk-tu", vnDate(-120)));
    await p.waitFor(`!!document.querySelector('.bk-ket-qua .banner-danger')`, "câu lỗi khoảng");
    assert.equal(await p.ev(txt(".bk-ket-qua .banner-danger")), "Khoảng ngày chạy tối đa 92 ngày (khoảng 3 tháng).");
    await p.ev(typeInto("#bk-tu", vnDate(0)));
    await p.waitFor(`document.querySelectorAll('.bk-nhom').length === 2`, "khoảng hợp lệ");
  });

  await b.step("5", "Bấm một dòng ⇒ mở Chi tiết chuyến của dòng đó", async () => {
    await p.ev(`${HIEN(`a.dong[data-chuyen="${A.id}"], tr[data-chuyen="${A.id}"] a`)}.click()`);
    await p.waitFor(`location.pathname === '/chuyen' && document.querySelector('.dp-ct-title')?.textContent === ${JSON.stringify(A.ma)}`, "sang chi tiết chuyến");
  });
  await p.close();

  // ---- Quản trị, điện thoại ---------------------------------------------------------------------------------------------------------------------------------
  const m = await env.as(ACCOUNTS.admin, `/bang-ke-xe${Q}`, MOB);
  await choKq(m);
  await b.step("6", `1c 390: thẻ dọc (mã + số tiền một hàng; ngày · biển số · tuyến; chip + nguồn; dòng điều chỉnh); không tràn ngang${axeNote()}`, async () => {
    assert.equal(await m.ev(shown(".bk-nhom table")), false);
    const the = await m.ev(`document.querySelector('a.dong[data-chuyen="${A.id}"]').innerText.replace(/\\s+/g, ' ').trim()`);
    // khung gốc: số tiền đứng cuối dòng (có chủ ý) — cùng các phần, đổi thứ tự.
    assert.match(the, new RegExp(`^${A.ma} .* · 79A-123\\.45 · Nha Trang – sân bay Cam Ranh Đã phát sinh Giá bảng Điều chỉnh \\+ 150\\.000 ₫ 600\\.000 ₫$`), the);
    assert.ok(await m.ev(noOverflowX));
    await axe(m, "bảng kê 390");
    await shotFull(m, "g4-bang-ke-dien-thoai.png");
  });
  await m.close();

  // ---- Kế toán (mở sau cùng) --------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, "/bang-ke-xe", DESK);
  await choKq(k);
  await b.step("7", "Kế toán mở không tham số: Từ ngày = đầu tháng, Đến ngày = hôm nay (chuyến của bài chạy ngày sau nên trống: câu trạng thái trống)", async () => {
    assert.equal(await k.ev(`document.querySelector('#bk-tu').value`), `${vnDate(0).slice(0, 8)}01`);
    assert.equal(await k.ev(`document.querySelector('#bk-den').value`), vnDate(0));
    assert.equal(await k.ev(txt(".bk-ket-qua .rong")), "Không có chuyến xe thuê nào trong khoảng này.");
    await shotFull(k, "g4-bang-ke-trong-may-tinh.png");
  });
  await b.step("8", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, p, m, k]) assert.deepEqual(pg.consoleErrors, []);
  });
  await k.close();
} catch (e) {
  console.log("✗ dựng dữ liệu / kịch bản dừng:", e?.stack ?? e, "\n--- nhật ký máy chủ ---\n", env.logs.join("").slice(-4000));
  process.exitCode = 1;
} finally {
  b.xong();
  await env.stop();
}
