// Kịch bản Chrome — nút «Đồng bộ ngay từ Google Sheet» ở màn hẹp của Quản lý bán hàng (ADR-0186 Đ5, đặc tả 2026-11-08 tiêu chí N8). 390 + 1040, D1 tạm,
// không gọi production. CẦN MẠNG: bấm đồng bộ là đọc Google Sheet thật (chỉ đọc), như e2e `tests/e2e/catalog.mjs`.
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=$PWD/docs/evidence/2026-11-08-tac-nhan-dong-bo/anh node docs/evidence/2026-11-08-tac-nhan-dong-bo/kich-ban/ql-dong-bo-smoke.mjs
// Bước: 1 Bán hàng thường: không nút, máy chủ 403. 2 Quản lý: màn hẹp có nút, nút của màn đủ ẩn. 3 Quản lý bấm: câu báo kết quả, danh sách vẽ lại, nhật ký mang
//       mã người bấm (không mã tác nhân). 4 Quản trị: màn đủ vẫn có nút.
// Không sửa kịch bản ngày 5/11 (`docs/evidence/2026-11-05-quan-ly-ban-hang/`, hồ sơ có ngày): câu «không đồng bộ» ở bước 2 của nó là luật cũ, thay bởi ADR-0186.
import assert from "node:assert/strict";
import { ACCOUNTS, KHO, axeKiem, bam, bocucSach, buoc, chup, diToi, goiApi, ketThuc, startEnv, taoMoTrang } from "../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs";

ACCOUNTS.quanLy = { name: "Quản Lý Bán", phone: "0900000288", pin: "246820", permissions: ["SALES", "SALES_MANAGER"] };
const NUT = '[data-action="dong-bo"]';
const TEN_NUT = "Đồng bộ ngay từ Google Sheet";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const choHep = (p) => p.waitFor("!document.getElementById('man-hep').hidden && !!document.querySelector('.kv-ds details')", "màn hẹp đã vẽ");
  let daKiemNhatKy = false;

  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;

    const b = await moTrang(ACCOUNTS.salesA, "/catalog", vp);
    try {
      await buoc(`1${kho}`, "Bán hàng thường: không có nút đồng bộ; máy chủ từ chối lệnh đồng bộ", async () => {
        await b.waitFor("!document.getElementById('error').hidden", "câu từ chối");
        assert.equal(await b.ev(`!!document.querySelector('${NUT}')`), false, "màn của Bán hàng thường không có nút");
        const r = await call(ACCOUNTS.salesB, "POST", "/api/catalog/sync", {});
        assert.equal(r.status, 403, JSON.stringify(r.json));
        assert.match(r.json?.error?.message ?? r.json?.message ?? "", /Đồng bộ ngay từ Google Sheet/, "câu từ chối nói đúng tên nút");
      });
    } finally { b.close(); }

    const q = await moTrang(ACCOUNTS.quanLy, "/catalog", vp);
    try {
      await buoc(`2${kho}`, "Quản lý bán hàng: màn hẹp có nút «Đồng bộ ngay từ Google Sheet»; nút của màn đủ vẫn ẩn", async () => {
        await choHep(q);
        assert.equal(await q.ev(`[...document.querySelectorAll('${NUT}')].filter((x) => x.offsetParent !== null).map((x) => x.textContent.trim()).join('|')`), TEN_NUT);
        assert.equal(await q.ev("document.getElementById('pull').offsetParent"), null, "nút của màn đủ ẩn (màn đủ ẩn)");
        await bocucSach(q, `2${kho}`);
        await chup(q, `dong-bo-${tenKho}-1-man-hep`);
      });
      await buoc(`3${kho}`, "Quản lý bán hàng bấm: câu báo kết quả, danh sách vẽ lại, nhật ký mang mã người bấm", async () => {
        assert.equal(await bam(q, NUT), true);
        await q.waitFor("!document.getElementById('notice').hidden || !document.getElementById('error').hidden", "có kết quả", 90_000);
        const loi = await q.ev("document.getElementById('error').hidden ? '' : document.getElementById('error').textContent");
        assert.equal(loi, "", `máy chủ báo lỗi (mạng tới Google Sheet?): ${loi}`);
        assert.match(await q.ev("document.getElementById('notice').textContent"), /^Đã đồng bộ xong: thêm \d+, đổi \d+, ẩn \d+, giữ nguyên \d+\./);
        await q.waitFor(`!document.querySelector('${NUT}').disabled && !!document.querySelector('.kv-ds details')`, "nút bấm lại được, danh sách vẽ lại");
        if (!daKiemNhatKy) {
          const [d] = env.sql("SELECT s.phone AS phone, a.agent_code AS agent FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id WHERE a.action = 'catalog_synced' ORDER BY a.rowid DESC LIMIT 1");
          assert.deepEqual([d?.phone, d?.agent ?? null], [ACCOUNTS.quanLy.phone, null], "dòng nhật ký mang mã người bấm, không mang mã tác nhân");
          daKiemNhatKy = true;
        }
        await bocucSach(q, `3${kho}`);
        await axeKiem(q, `3${kho}`);
        await chup(q, `dong-bo-${tenKho}-2-da-dong-bo`);
      });
    } finally { q.close(); }

    const a = await moTrang(ACCOUNTS.admin, "/catalog", vp);
    try {
      await buoc(`4${kho}`, "Quản trị: màn đủ vẫn có nút «Đồng bộ ngay từ Google Sheet»", async () => {
        await a.waitFor("!document.getElementById('man-du').hidden && document.querySelectorAll('[data-code]').length > 0", "màn đủ đã vẽ");
        assert.equal(await a.ev("document.getElementById('pull').offsetParent !== null && document.getElementById('pull').textContent.trim()"), TEN_NUT);
        assert.equal(await a.ev(`!!document.querySelector('${NUT}')`), false, "màn đủ không có nút thứ hai");
        await diToi(a, env, "/catalog");
      });
    } finally { a.close(); }
  }
} finally {
  await env.stop();
}
ketThuc("DONG BO QUAN LY BAN HANG");
