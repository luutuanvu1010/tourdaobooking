// ADR-0185 Đ3 mục 1, mục 2 (kế hoạch K11): hai câu đọc CHỈ ĐỌC cho chủ (scripts/cau-doc-doi-tac-thieu-vai-tro.mjs). Câu tài khoản so NGUYÊN VĂN với tệp ADR (chủ đã
// thử 7/11); cả hai chạy trên dữ liệu thử của CẢ ứng dụng (tests/audit/harness.mjs). Ca Đổi khách (Đ3 mục 2 ghi «chưa chạy thử với ca này; kế hoạch phải có ca
// thử»): đơn đã xác nhận của Đối tác kiểu cũ — hoa hồng «không người hưởng», dữ liệu trước ADR-0185 — → Toàn quyền gán vai trò → Quản trị «Đổi khách» chọn hồ sơ
// đối tác ⇒ máy chụp lại hoa hồng (ADR-0077 điều 9) và đơn rời danh sách. Bài đối chiếu câu tài khoản với trigger lc1c và R-LC-1c: src/audit-invariants.test.ts (H4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ADM, LAI, SUP, inDays, lap, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const TEP = new URL("../scripts/cau-doc-doi-tac-thieu-vai-tro.mjs", import.meta.url);
const { CAU_DOC_TAI_KHOAN, CAU_DOC_DON, lenhChoChu } = (await import(TEP.href)) as {
  CAU_DOC_TAI_KHOAN: string;
  CAU_DOC_DON: string;
  lenhChoChu: (sql: string) => string;
};
const DT_CU = "8b8b8b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b"; // Đối tác kiểu cũ: vai trò đối tác đã kết thúc, hồ sơ chỉ còn vai STAFF (seedStaff kieuCu)

test("câu tài khoản là NGUYÊN VĂN câu đọc của ADR-0185 Đ3 mục 1; hai câu chỉ đọc; chạy tệp in đúng hai lệnh chép–dán được trong Terminal (ngoặc kép của zsh)", () => {
  const adr = readFileSync(new URL("../docs/adr/ADR-0185-chan-don-doi-tac-thieu-vai-tro.md", import.meta.url), "utf8");
  const khoi = /```sql\n\s*(SELECT[^\n]*)\n/.exec(adr)?.[1]?.trim();
  assert.ok(khoi, "ADR phải có khối sql của câu đọc");
  assert.equal(CAU_DOC_TAI_KHOAN, khoi);
  const inRa = execFileSync(process.execPath, [fileURLToPath(TEP)], { encoding: "utf8" });
  for (const cau of [CAU_DOC_TAI_KHOAN, CAU_DOC_DON]) {
    assert.match(cau, /^SELECT /);
    assert.doesNotMatch(cau, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|PRAGMA)\b/i, "chỉ đọc");
    assert.doesNotMatch(cau, /["!$`\\\n]/, "không ký tự làm hỏng lệnh trong ngoặc kép của zsh");
    assert.equal(lenhChoChu(cau), `npx wrangler d1 execute tourdao-sales-db --remote --command "${cau}"`);
    assert.ok(inRa.includes(lenhChoChu(cau)), "chạy thẳng tệp in lệnh này");
  }
});

test("ca Đổi khách: đơn đã xác nhận của Đối tác kiểu cũ (không người hưởng) có trong câu đơn; gán vai trò chưa đủ; Quản trị «Đổi khách» chọn hồ sơ đối tác ⇒ chụp lại, người hưởng là đối tác, đơn rời danh sách", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: DT_CU, phone: "0900000012", name: "Đối Tác Cũ", perms: ["PARTNER"], kieuCu: true });
  const taiKhoan = (): string[] => w.q(CAU_DOC_TAI_KHOAN).map((r: any) => r.id).sort();
  const donTrongDs = (): string[] => w.q(CAU_DOC_DON).map((r: any) => r.id);
  const hienHanh = (id: string): any[] =>
    w.q("SELECT t.id, t.commission_status, t.beneficiary_party_id, t.supersedes_id FROM ord_service_terms t WHERE t.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)", id);

  assert.deepEqual(taiKhoan(), [LAI, DT_CU].sort(), "Đối tác kiểu cũ và tài khoản lai kiểu cũ hiện; Đối tác có vai trò (PARTNER của khung) không");

  // Dữ liệu trước ADR-0185: Đối tác kiểu cũ lập nháp (bên đặt trống), văn phòng xác nhận thay (khung thử Task 3) ⇒ bản chụp «không người hưởng».
  const o = await lap(w, DT_CU, [svc("ZB1", inDays(3))]);
  const x = await w.xacNhanDonCu(o.id, DT_CU, A);
  assert.equal(x.status, 200, x.text);
  const cu = hienHanh(o.id);
  assert.ok(cu.length > 0 && cu.every((r) => r.commission_status === "NONE" && r.beneficiary_party_id === null), JSON.stringify(cu));
  // Đối chứng: nháp khác của DT_CU (chưa xác nhận) và đơn khách lẻ của văn phòng (A tự lập, đã xác nhận, cũng «không người hưởng») không vào danh sách.
  await lap(w, DT_CU, [svc("ZB1", inDays(4))]);
  const vp = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.equal((await w.xacNhanDon(vp.id, A)).status, 200);
  assert.deepEqual(donTrongDs(), [o.id]);
  assert.deepEqual(Object.keys(w.q(CAU_DOC_DON)[0]).sort(), ["id", "order_code", "staff_id"], "chỉ mã đơn và mã người lập — không tên, SĐT khách");
  assert.equal(w.q(CAU_DOC_DON)[0].staff_id, DT_CU);

  // Toàn quyền gán vai trò: tài khoản rời câu tài khoản; đơn cũ VẪN «không người hưởng» nên còn trong câu đơn.
  const gan = await w.call("PUT", `/api/staff/${DT_CU}/roles`, { as: SUP, body: { roles: ["TRAVEL_AGENCY"] } });
  assert.equal(gan.status, 200, gan.text);
  assert.deepEqual(taiKhoan(), [LAI]);
  assert.deepEqual(donTrongDs(), [o.id], "gán vai trò chưa đủ: đơn đã xác nhận cần «Đổi khách»");

  // Quản trị «Đổi khách» chọn hồ sơ đối tác làm bên đặt (Bán hàng chỉ đổi được đơn của mình hoặc đơn mình phụ trách) ⇒ máy chụp lại: bản mới trỏ bản cũ, bản cũ còn.
  const u = w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0].u;
  const doi = await w.call("PUT", `/api/orders/${o.id}/booker`, { as: ADM, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: `pty-${DT_CU}`, expectedUpdatedAt: u } });
  assert.equal(doi.status, 200, doi.text);
  const moi = hienHanh(o.id);
  assert.equal(moi.length, cu.length);
  assert.ok(moi.every((r) => r.beneficiary_party_id === `pty-${DT_CU}` && r.commission_status !== "NONE"), JSON.stringify(moi));
  assert.deepEqual(moi.map((r) => r.supersedes_id).sort(), cu.map((r) => r.id).sort(), "bản mới thay đúng bản cũ");
  assert.equal(Number(w.q("SELECT count(*) n FROM ord_service_terms WHERE order_id = ?", o.id)[0].n), cu.length * 2, "bản cũ vẫn còn (chỉ-thêm)");
  assert.deepEqual(donTrongDs(), [], "đơn rời danh sách");
});
