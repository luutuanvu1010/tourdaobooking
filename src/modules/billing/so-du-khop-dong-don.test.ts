// Khoá sổ công nợ (kế hoạch góp ý Hỗ trợ 24/10, bước 5 — YC-0021 vế công nợ): số dư của MỘT bên với công ty chủ trên màn Sổ công nợ (`GET /api/ledger`,
// câu SQL `balancesWithOwner` cộng view `v_bil_party_balance`) PHẢI bằng tổng số dư từng đơn tính bằng luật thuần `soDuCap` trên chính các dòng nợ của đơn đó, và bằng số
// «đang giữ» của sổ người đó tự xem (`GET /api/ledger/mine`, hàm `soCuaToi`). Gọi qua route thật: đó là con số người dùng thấy. Ba cách tính, một con số — lệch là màn tổng nói khác chi tiết từng đơn.
// Dữ liệu cố ý có: dòng đảo (phải triệt tiêu dòng gốc), dòng hai chiều (công ty nợ lại người), dòng giữa hai bên KHÔNG phải công ty chủ (không được tính).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoDongTienKhop } from "../../../tests/audit/dong-tien.mjs";
import { soDuCap } from "./rules.ts";

const SA = "77777777-7777-4777-8777-777777777777";
const SB = "88888888-8888-4888-8888-888888888888";
const AT = "2026-09-30T01:00:00.000Z";

test("Σ số dư theo đối tác (màn Sổ công nợ) = Σ số dư từng đơn (soDuCap) = «đang giữ» của sổ người đó", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: SB, phone: "0900000008", name: "HDV B", perms: ["FIELD"] });
  const A = `pty-${SA}`;
  const B = `pty-${SB}`;
  const ct = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;

  for (const o of ["o1", "o2", "o3"]) {
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'K', '0900000099', 300000, 300000, 300000, ?, ?)`).run(o, `TD-${o}`, SA, AT, AT);
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-10')").run(`sv-${o}`, o);
    gieoDongTienKhop(w.sqlite, o);
    w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, o);
    w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'RECEIPT', ?, NULL, NULL, '2026-09-30', NULL, ?, ?, ?, ?)`).run(`p-${o}`, o, AT, SA, AT, SA);
  }
  const line = (id: string, order: string, no: string, duocNo: string, amount: number, reverses: string | null = null) =>
    w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
      created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'HELD', ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)`).run(id, `p-${order}`, no, duocNo, amount, order, reverses, AT, SA, AT, SA);

  line("a1", "o1", A, ct, 500000); //            A nợ công ty 500.000 ở đơn 1
  line("a2", "o2", A, ct, 200000); //            A nợ công ty 200.000 ở đơn 2 …
  line("a2r", "o2", ct, A, 200000, "a2"); //     … rồi bị đảo ⇒ đơn 2 về 0
  line("a3", "o3", ct, A, 70000); //             công ty nợ lại A 70.000 ở đơn 3 (chiều ngược)
  line("b1", "o1", B, ct, 1750000); //           B nợ công ty 1.750.000 ở đơn 1
  line("x1", "o3", A, B, 999000); //             A nợ B — không dính công ty chủ, KHÔNG được vào số dư với công ty

  const tatCaDong = w.q("SELECT debtor_party_id, creditor_party_id, amount, order_id FROM bil_debt_line") as { debtor_party_id: string; creditor_party_id: string; amount: number; order_id: string }[];
  const theoDon = (ben: string): number => {
    let tong = 0;
    for (const o of new Set(tatCaDong.map((l) => l.order_id))) {
      tong += soDuCap(tatCaDong.filter((l) => l.order_id === o).map((l) => ({ debtorPartyId: l.debtor_party_id, creditorPartyId: l.creditor_party_id, amount: l.amount })), ben, ct);
    }
    return tong;
  };

  const r = await w.call("GET", "/api/ledger", { as: SA });
  assert.equal(r.status, 200, r.text);
  const man = new Map((r.json.soDu as { partyId: string; dangGiu: number }[]).map((d) => [d.partyId, d.dangGiu]));
  for (const [id, ben] of [[SA, A], [SB, B]]) {
    assert.equal(man.get(ben) ?? 0, theoDon(ben), `số dư màn Sổ công nợ của ${ben} phải bằng tổng từng đơn`);
    const cuaToi = await w.call("GET", "/api/ledger/mine", { as: id });
    assert.equal(cuaToi.status, 200, cuaToi.text);
    assert.equal(cuaToi.json.dangGiu, theoDon(ben), `«đang giữ» ở sổ của ${ben} phải bằng tổng từng đơn`);
  }
  // Đáp án viết tay để ba cách tính không cùng sai một kiểu: A = 500.000 + 0 − 70.000; B = 1.750.000.
  assert.equal(man.get(A), 430000);
  assert.equal(man.get(B), 1750000);
  assert.equal(man.has(ct), false, "công ty chủ không có dòng số dư với chính mình");
});
