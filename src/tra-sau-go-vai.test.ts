// ADR-0181 Đ2: thôi làm đối tác thì hết hạn mức Trả sau. (a) Hạn mức chỉ có hiệu lực khi hồ sơ đang mang loại đối tác được hưởng — CÙNG định nghĩa trigger
// `bil_credit_limit_party_ok` (0141: vai đang mở nhóm EXTERNAL, hoặc OTHER có nhãn đối tác). (b) Gỡ vai được hưởng cuối cùng ở Danh bạ hay ở Tài khoản đóng hạn mức trong
// CÙNG lô, có nhật ký; mang vai lại thì chưa có Trả sau. Khung thử thật (tests/audit/xac-nhan-khung.mjs). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ADM, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const KTK = "pty-12121212-1212-4121-8121-121212121212"; // đại lý chưa có tài khoản (Danh bạ)
const R_DL = "11111111-2222-4333-8444-555555555551"; // vai Công ty lữ hành của KTK
const R_CTV = "11111111-2222-4333-8444-555555555552"; // vai Cộng tác viên của KTK
type W = ReturnType<typeof setup>;

const homQua = (): string => inDays(-1);
function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại Lý Không Tài Khoản', 1, ?, ?)").run(KTK, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(KTK, AT, AT);
  for (const [rid, ma] of [[R_DL, "TRAVEL_AGENCY"], [R_CTV, "COLLABORATOR"]]) {
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(rid, KTK, ma, AT, AT);
  }
  return w;
}
const batTraSau = async (w: W, partyId: string): Promise<void> => {
  const r = await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId, hanMuc: 10_000_000, gioTra: 36, gioAnHan: 0, lyDo: "thử" } });
  assert.equal(r.status, 201, r.text);
};
const hanMucXem = async (w: W, partyId: string): Promise<number | null> => {
  const r = await w.call("GET", `/api/tra-sau/han-muc/${partyId}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  return r.json.hanMuc as number | null;
};
const dongMo = (w: W, partyId: string): number => Number(w.q("SELECT count(*) AS n FROM bil_credit_limit WHERE party_id = ? AND valid_to_date IS NULL", partyId)[0].n);
const nhatKyDong = (w: W, partyId: string) => w.q("SELECT staff_id, detail FROM audit_log WHERE action = 'credit_limit_stopped' AND target_id = ?", partyId) as { staff_id: string; detail: string }[];
const goVaiDanhBa = (w: W, rid: string) => w.call("POST", `/api/parties/${KTK}/roles/${rid}/end`, { as: ADM, body: { validTo: homQua() } });
const doiVaiTaiKhoan = (w: W, roles: string[]) => w.call("PUT", `/api/staff/${DT}/roles`, { as: ADM, body: { roles } });

test("ADR-0181 tiêu chí 3 (Danh bạ): gỡ một vai khi còn vai được hưởng khác — hạn mức giữ; gỡ vai được hưởng cuối cùng — hạn mức đóng cùng lô, có nhật ký; mang vai lại — chưa có Trả sau", async () => {
  const w = dung();
  await batTraSau(w, KTK);
  const g1 = await goVaiDanhBa(w, R_CTV);
  assert.equal(g1.status, 200, g1.text);
  assert.equal(dongMo(w, KTK), 1, "còn vai Công ty lữ hành: hạn mức giữ nguyên");
  assert.equal(await hanMucXem(w, KTK), 10_000_000);
  assert.deepEqual(nhatKyDong(w, KTK), []);
  const g2 = await goVaiDanhBa(w, R_DL);
  assert.equal(g2.status, 200, g2.text);
  assert.equal(dongMo(w, KTK), 0, "vai được hưởng cuối cùng đã gỡ: hạn mức đóng");
  const nk = nhatKyDong(w, KTK);
  assert.equal(nk.length, 1, "một dòng nhật ký đóng hạn mức");
  assert.equal(nk[0]!.staff_id, ADM, "người gỡ vai là người ghi nhật ký");
  assert.match(nk[0]!.detail, /gỡ vai trò đối tác cuối cùng/);
  assert.equal(await hanMucXem(w, KTK), null);
  const lai = await w.call("POST", `/api/parties/${KTK}/roles`, { as: ADM, body: { roleTypeCode: "TRAVEL_AGENCY" } });
  assert.equal(lai.status, 201, lai.text);
  assert.equal(await hanMucXem(w, KTK), null, "mang vai lại: phải bật Trả sau lại từ đầu");
  assert.equal(dongMo(w, KTK), 0);
});

test("ADR-0181 tiêu chí 3 (Tài khoản): đổi sang vai đối tác khác — hạn mức giữ; đổi sang vai nội bộ — hạn mức đóng cùng lô, có nhật ký; mang vai lại — chưa có Trả sau", async () => {
  const w = dung();
  await batTraSau(w, BEN);
  const d1 = await doiVaiTaiKhoan(w, ["GUIDE_FREELANCE"]);
  assert.equal(d1.status, 200, d1.text);
  assert.equal(dongMo(w, BEN), 1, "Hướng dẫn viên tự do vẫn là loại đối tác được hưởng: hạn mức giữ");
  assert.equal(await hanMucXem(w, BEN), 10_000_000);
  const d2 = await doiVaiTaiKhoan(w, ["SALES_STAFF"]);
  assert.equal(d2.status, 200, d2.text);
  assert.equal(dongMo(w, BEN), 0, "không còn vai được hưởng: hạn mức đóng");
  const nk = nhatKyDong(w, BEN);
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.staff_id, ADM);
  assert.match(nk[0]!.detail, /gỡ vai trò đối tác cuối cùng/);
  const d3 = await doiVaiTaiKhoan(w, ["TRAVEL_AGENCY"]);
  assert.equal(d3.status, 200, d3.text);
  assert.equal(await hanMucXem(w, BEN), null, "mang vai lại: chưa có Trả sau");
});

test("ADR-0181 tiêu chí 3 (lớp đọc): vai hết hạn theo ngày mà hạn mức còn mở (đường không qua route) — không xác nhận được đơn Trả sau; các màn đều báo không có hạn mức", async () => {
  const w = dung();
  await batTraSau(w, BEN);
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  // Vai kết thúc từ hôm qua bằng SQL (gộp hồ sơ, dữ liệu cũ…) — hạn mức vẫn còn dòng mở.
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = ?, updated_at = ? WHERE id = ?").run(homQua(), AT, `r-${DT}`);
  assert.equal(dongMo(w, BEN), 1, "dòng hạn mức còn mở");
  const xn = await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.deepEqual([xn.status, xn.json?.error?.code], [409, "khong_co_han_muc"], xn.text);
  assert.equal(await hanMucXem(w, BEN), null, "ô Trả sau ở Cấp độ đại lý");
  const conDung = (await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`, { as: A })).json;
  assert.equal(conDung.coHanMuc, false, "đường hẹp của người lập đơn");
  assert.equal((await w.call("GET", "/api/tra-sau/cua-toi", { as: DT })).json.coHanMuc, false, "«Trả sau của tôi»");
  const ds = (await w.call("GET", "/api/tra-sau/han-muc", { as: ADM })).json.danhSach as { partyId: string; coHanMuc: boolean }[];
  assert.equal(ds.find((x) => x.partyId === BEN)?.coHanMuc ?? false, false, "màn danh sách hạn mức");
  // Đối chứng: hồ sơ còn vai thì vẫn đọc được hạn mức.
  await batTraSau(w, KTK);
  assert.equal(await hanMucXem(w, KTK), 10_000_000);
});
