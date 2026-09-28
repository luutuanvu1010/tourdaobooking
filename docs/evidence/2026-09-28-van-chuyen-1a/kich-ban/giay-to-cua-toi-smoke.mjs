// Kịch bản Chrome — màn 05 "Giấy tờ của tôi" ở trang Tôi (mọi nhân viên nội bộ — ADR-0040 D2, chủ trả lời "Mọi nhân viên"; Đối tác không) —
// docs/design/van-chuyen-1a/project/05 Giay to cua toi.dc.html.
// 1–2) tài xế (390 / 1040): khối "Giấy tờ của tôi" ngay dưới thẻ hồ sơ; giấy gần hết hạn nhất đứng đầu; số CHE, số đủ không có trong DOM; không nút sửa, không
//      "Xem đủ số"; một dòng hướng dẫn "Báo văn phòng để cập nhật"; máy tính có hàng tiêu đề LOẠI / SỐ / HẾT HẠN / CÒN.
// 3) Bán hàng CHƯA có giấy tờ: không có khối (trang Tôi y như trước), vẫn gọi được API (mọi nhân viên).
// 4) Đối tác và tài khoản LAI Tài xế + Đối tác (Ruling R18): không khối và KHÔNG gọi /api/parties/documents/mine (máy chủ trả 403 cho mọi tài khoản mang
//    quyền Đối tác — giao diện không gọi rồi hiện lỗi). Tài khoản lai có giấy tờ trong hồ sơ vẫn không thấy.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/giay-to-cua-toi-smoke.mjs
import { ACCOUNTS, DESK, DRIVER, LAI, MOB, PARTNER, apiCalls, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, sleep, vnDate } from "./vc-lib.mjs";

const dem = boDem("GIAY TO CUA TOI SMOKE");
const { env, ids, themGiayNguoi } = await dungMoiTruong([DRIVER, PARTNER, LAI]);
const SO = ["001090000412", "790100000412"]; // số GIẢ
const d = (n) => vnDate(n).split("-").reverse().join("/");
try {
  const hung = ids[DRIVER.phone].partyId;
  await themGiayNguoi(hung, { typeCode: "CCCD", number: SO[0], issuedDate: vnDate(-1000), issuedPlace: "Cục Cảnh sát QLHC về TTXH", expiryDate: vnDate(3818) });
  await themGiayNguoi(hung, { typeCode: "GPLX", number: SO[1], classCode: "D2", issuedDate: vnDate(-1900), issuedPlace: "Sở GTVT Khánh Hoà", expiryDate: vnDate(38) });
  await themGiayNguoi(hung, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-363), expiryDate: vnDate(2) });
  await themGiayNguoi(hung, { typeCode: "TRANSPORT_TRAINING", issuedDate: vnDate(-200), expiryDate: vnDate(154) });

  const read = (p) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
      const s = document.querySelector('#my-docs');
      const vis = (el) => !!el && el.getClientRects().length > 0;
      return s && {
        order: [...document.querySelector('.account-layout').children].filter(vis).map((e) => e.id),
        heading: t(s.querySelector('h2')),
        head: vis(s.querySelector('.vc-mydocs-head')) ? [...s.querySelectorAll('.vc-mydocs-head span')].map(t) : null,
        // Ô số: điện thoại ẩn hẳn khi giấy không có số (bản vẽ: hasNo); máy tính hiện "—" (bản vẽ: noOrDash). innerText bỏ phần CSS ẩn ("Hết hạn " chỉ ở điện thoại).
        rows: [...s.querySelectorAll('.vc-mydoc')].map((r) => ({ title: t(r.querySelector('.vc-doc-title')), no: vis(r.querySelector('.vc-mydoc-no')) ? t(r.querySelector('.vc-mydoc-no')) : null, exp: t(r.querySelector('.vc-mydoc-exp')), chip: t(r.querySelector('.vc-chip')) })),
        buttons: [...s.querySelectorAll('button, a')].map(t),
        note: t(s.querySelector('.vc-note')),
        html: document.documentElement.outerHTML,
      };
    })()`);

  for (const [id, ten, vp] of [["1", "390", MOB], ["2", "1040", DESK]]) {
    await dem.step(id, `05 tài xế (${ten}): khối dưới thẻ hồ sơ, gần hạn nhất đầu, số che, không nút, dòng hướng dẫn` + axeNote(), async () => {
      const p = await env.as(DRIVER, "/account", vp);
      try {
        await p.waitFor("document.querySelectorAll('#my-docs .vc-mydoc').length === 4", "khối Giấy tờ của tôi", 10000);
        const s = await read(p);
        assert.deepEqual(s.order.slice(0, 2), ["me", "my-docs"], JSON.stringify(s.order));
        assert.equal(s.heading, "Giấy tờ của tôi");
        assert.deepEqual(s.rows, [
          { title: "Khám sức khoẻ", no: null, exp: `Hết hạn ${d(2)}`, chip: "Còn 2 ngày" },
          { title: "Giấy phép lái xe hạng D2", no: "••••0412", exp: `Hết hạn ${d(38)}`, chip: "Còn 38 ngày" },
          { title: "Tập huấn nghiệp vụ vận tải", no: null, exp: `Hết hạn ${d(154)}`, chip: "Còn 154 ngày" },
          { title: "Căn cước công dân (CCCD)", no: "••••0412", exp: `Hết hạn ${d(3818)}`, chip: "Còn hạn" },
        ].map((r) => (ten === "1040" ? { ...r, exp: r.exp.replace("Hết hạn ", ""), no: r.no ?? "—" } : r)));
        assert.deepEqual(s.buttons, [], "chỉ xem: không nút sửa, không “Xem đủ số”");
        assert.equal(s.note, "Thông tin sai hoặc đã có giấy mới? Báo văn phòng để cập nhật.");
        assert.deepEqual(s.head, ten === "1040" ? ["LOẠI", "SỐ", "HẾT HẠN", "CÒN"] : null);
        for (const so of SO) assert.ok(!s.html.includes(so), `số đủ ${so} không được có trong DOM`);
        await axe(p, `05 ${ten}`);
        await shotFull(p, `05-giay-to-cua-toi-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }

  await dem.step("3", "05 Bán hàng chưa có giấy tờ: không có khối, trang Tôi như trước", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", MOB);
    try {
      await p.waitFor("!!document.querySelector('#links .row-link')", "trang Tôi", 10000);
      await sleep(1500);
      assert.equal(await p.ev("!!document.querySelector('#my-docs')"), false);
      assert.ok(apiCalls(p).some((c) => c.path === "/api/parties/documents/mine"), "nhân viên nội bộ vẫn hỏi (mọi nhân viên)");
    } finally {
      p.close();
    }
  });

  await themGiayNguoi(ids[LAI.phone].partyId, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-100), expiryDate: vnDate(20) });
  for (const [id, ai, ten] of [["4a", PARTNER, "Đối tác"], ["4b", LAI, "tài khoản lai Tài xế + Đối tác (R18)"]]) {
    await dem.step(id, `05 ${ten}: không khối, không lời gọi /api/parties/documents/mine`, async () => {
      const p = await env.as(ai, "/account", MOB);
      try {
        await p.waitFor("!!document.querySelector('#links .row-link')", "trang Tôi", 10000);
        await sleep(1500);
        assert.equal(await p.ev("!!document.querySelector('#my-docs')"), false);
        assert.deepEqual(apiCalls(p).filter((c) => c.path.includes("/documents")), []);
        assert.deepEqual(p.consoleErrors, []);
      } finally {
        p.close();
      }
    });
  }
} finally {
  await env.stop();
}
dem.xong();
