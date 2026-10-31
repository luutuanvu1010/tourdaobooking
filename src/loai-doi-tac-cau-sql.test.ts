// ADR-0117 lần 1, Task 3 — LỚP SQL của việc tắt / bật loại đối tác (không qua route). Route đã chặn trước bằng `loaiVaiChiTiet` (mã không phải loại nhãn ⇒ 404), nên nếu ai bỏ vế
// `AND is_partner_label = 1` khỏi câu cập nhật thì bài ở mức route KHÔNG đỏ — bài này canh riêng câu UPDATE (khuôn src/da-giao-khe-hoa-hong.test.ts ca 7): năm vai bên ngoài có sẵn
// là vai đăng nhập, câu tắt / bật không được chạm cờ nào của chúng, và câu thứ hai của lô (cờ danh sách được hưởng) đi theo `changes() > 0` của câu đứng ngay trước.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, fakeD1 } from "../tests/audit/harness.mjs";
import { datHoatDongLoaiDoiTacStatement, themLoaiDoiTacStatement } from "./modules/parties/repository.ts";
import { insertBeneficiaryStatement, setBeneficiaryActiveStatement } from "./modules/pricing/repository.ts";

const AT = "2026-10-14T00:00:00.000Z";
type W = ReturnType<typeof world>;
const db = (w: W) => fakeD1(w.sqlite) as unknown as D1Database;
const hai = (w: W, code: string) => ({
  pty: w.q("SELECT active AS a FROM pty_role_type WHERE code = ?", code)[0].a as number, prc: w.q("SELECT active AS a FROM prc_beneficiary_role WHERE role_type_code = ?", code)[0].a as number,
});
async function themNhan(w: W, code: string, ten: string): Promise<void> {
  const d = db(w);
  await d.batch([themLoaiDoiTacStatement(d, { code, ten, at: AT, staffId: "t" }), insertBeneficiaryStatement(d, code, AT, "t")]);
}

test("câu tắt / bật CHỈ chạm loại có nhãn: vai bên ngoài có sẵn (TRAVEL_AGENCY…) và vai nội bộ ⇒ 0 dòng đổi, cả hai cờ nguyên", async () => {
  const w = world();
  const d = db(w);
  for (const code of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR", "SALES_STAFF", "CUSTOMER"]) {
    for (const bat of [false, true]) {
      const kq = await datHoatDongLoaiDoiTacStatement(d, code, bat, AT, "t").run();
      assert.equal((kq.meta as { changes: number }).changes, 0, `${code} bat=${bat}`);
    }
  }
  assert.deepEqual(hai(w, "TRAVEL_AGENCY"), { pty: 1, prc: 1 });
  // Cả lô (câu một + câu cờ danh sách được hưởng): câu hai đi theo changes() của câu một ⇒ cờ danh sách được hưởng của vai cũ KHÔNG đổi.
  const kq = await d.batch([datHoatDongLoaiDoiTacStatement(d, "TRAVEL_AGENCY", false, AT, "t"), setBeneficiaryActiveStatement(d, "TRAVEL_AGENCY", false, AT, "t")]);
  assert.equal((kq[0]!.meta as { changes: number }).changes, 0);
  assert.equal((kq[1]!.meta as { changes: number }).changes, 0, "câu cờ danh sách được hưởng không được chạy khi câu trước thua");
  assert.deepEqual(hai(w, "TRAVEL_AGENCY"), { pty: 1, prc: 1 });
});

test("loại có nhãn: tắt đổi 1 dòng, tắt lần hai 0 dòng; bật ngược lại; câu hai của lô theo đúng câu một", async () => {
  const w = world();
  const d = db(w);
  await themNhan(w, "LD_ABCDEFGH", "Lễ tân spa");
  assert.equal((await datHoatDongLoaiDoiTacStatement(d, "LD_ABCDEFGH", false, AT, "t").run()).meta.changes, 1);
  assert.equal((await datHoatDongLoaiDoiTacStatement(d, "LD_ABCDEFGH", false, AT, "t").run()).meta.changes, 0);
  assert.deepEqual(hai(w, "LD_ABCDEFGH"), { pty: 0, prc: 1 });
  const lo = await d.batch([datHoatDongLoaiDoiTacStatement(d, "LD_ABCDEFGH", true, AT, "t"), setBeneficiaryActiveStatement(d, "LD_ABCDEFGH", true, AT, "t")]);
  assert.equal(lo[0]!.meta.changes, 1);
  assert.equal(lo[1]!.meta.changes, 1);
  assert.deepEqual(hai(w, "LD_ABCDEFGH"), { pty: 1, prc: 1 });
  const thua = await d.batch([datHoatDongLoaiDoiTacStatement(d, "LD_ABCDEFGH", true, AT, "t"), setBeneficiaryActiveStatement(d, "LD_ABCDEFGH", false, AT, "t")]);
  assert.equal(thua[0]!.meta.changes, 0);
  assert.equal(thua[1]!.meta.changes, 0, "bên thua không đổi cờ danh sách được hưởng");
  assert.deepEqual(hai(w, "LD_ABCDEFGH"), { pty: 1, prc: 1 });
});

test("câu thêm: nhóm OTHER, nhãn, đang dùng; sort_order = 100 + số loại nhãn đã có (xếp cuối)", async () => {
  const w = world();
  await themNhan(w, "LD_AAAAAAAA", "Loại một");
  await themNhan(w, "LD_BBBBBBBB", "Loại hai");
  assert.deepEqual(w.q("SELECT code, role_group, is_partner_label, active, sort_order FROM pty_role_type WHERE is_partner_label = 1 ORDER BY sort_order").map((r: object) => ({ ...r })), [
    { code: "LD_AAAAAAAA", role_group: "OTHER", is_partner_label: 1, active: 1, sort_order: 100 }, { code: "LD_BBBBBBBB", role_group: "OTHER", is_partner_label: 1, active: 1, sort_order: 101 },
  ]);
});
