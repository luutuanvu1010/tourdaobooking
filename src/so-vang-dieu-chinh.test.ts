// Sổ vàng golden/dieu-chinh-cong-no.json (Hiến chương 5.17; ADR-0115 đợt 1): điều chỉnh công nợ cần người thứ hai duyệt. Khuôn src/so-vang-don-huy.test.ts:
//  LỚP 1 tự cân: dựng lại số dư sau MỖI bước bằng số học viết tay (chỉ tính bước "duyệt" có mong_doi 201), so với đáp án — bắt CA MẪU viết sai, không gọi mã.
//  LỚP 2 chạy từng ca qua CHÍNH các route thật trên khung thử (tests/audit/harness.mjs): mã kết quả, mã lỗi, số dư sau từng bước, số phiếu điều chỉnh, dòng nhật ký.
// Mọi ca đang "cho_xac_nhan" (AI soạn, chờ Kế toán / chủ xác nhận — Hiến pháp N8). Lớp 2 SIẾT từ đầu: lệch là ĐỎ (ca chờ vẫn phải khớp mã, như sổ vàng sửa số khách
// từ ADR-0109) — nếu Kế toán sửa con số thì sửa luật, không nới bài. SV-DC-05 (đợt 2: chi phí chuyến) chỉ qua lớp 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
type Buoc = {
  lam: "thu" | "yeu_cau" | "duyet"; ai?: string; huong?: "tang" | "giam"; so_tien?: number; nhan?: string; yeu_cau?: string; tuoi_ngay?: number;
  mong_doi: { ma: number; loi?: string }; so_du_sau: number; nhat_ky?: string;
};
type Ca = {
  ma: string; ap_dung?: string; xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { phai_thu?: number; da_thu_cong_ty?: number; so_du_dau?: number; chi_phi_chuyen?: number; dieu_chinh?: number };
  buoc?: Buoc[]; dap_an: { so_du_cuoi?: number; so_phieu_dieu_chinh?: number; tong_khi_cho_duyet?: number; tong_sau_duyet?: number };
};
const cases = (JSON.parse(readFileSync(join(ROOT, "golden/dieu-chinh-cong-no.json"), "utf8")) as { cac_ca: Ca[] }).cac_ca;
const dongTien = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

test("sổ vàng dieu-chinh-cong-no LỚP 1: đủ 5 ca (SV-DC-01…05), mã không trùng, số nguyên đồng, mỗi ca tự cân từng bước", () => {
  assert.deepEqual(cases.map((c) => c.ma), ["SV-DC-01", "SV-DC-02", "SV-DC-03", "SV-DC-04", "SV-DC-05"]);
  for (const c of cases) {
    assert.equal(c.xac_nhan.trang_thai, "cho_xac_nhan", `${c.ma}: AI không tự xác nhận (N8)`);
    if (c.ap_dung === "dot_2") {
      const { chi_phi_chuyen: g, dieu_chinh: d } = c.dau_vao;
      assert.ok(dongTien(g) && Number.isInteger(d), c.ma);
      assert.equal(c.dap_an.tong_khi_cho_duyet, g, `${c.ma}: chờ duyệt thì tổng vẫn như cũ`);
      assert.equal(c.dap_an.tong_sau_duyet, g! + d!, `${c.ma}: sau duyệt = giá thoả thuận + điều chỉnh`);
      continue;
    }
    let soDu = c.dau_vao.so_du_dau!;
    const yc = new Map<string, { huong: string; so: number }>();
    const daDuyet = new Set<string>();
    let phieu = 0;
    for (const b of c.buoc!) {
      assert.ok([201, 409].includes(b.mong_doi.ma), c.ma);
      assert.equal(b.mong_doi.ma === 409, !!b.mong_doi.loi, `${c.ma}: 409 phải kèm mã lỗi, 201 thì không`);
      if (b.lam === "thu") {
        assert.ok(dongTien(b.so_tien) && b.so_tien! > 0, c.ma);
        soDu += b.so_tien!;
      } else if (b.lam === "yeu_cau") {
        assert.ok(dongTien(b.so_tien) && b.so_tien! > 0 && (b.huong === "tang" || b.huong === "giam") && b.nhan && !yc.has(b.nhan), c.ma);
        if (b.mong_doi.ma === 201) yc.set(b.nhan!, { huong: b.huong!, so: b.so_tien! });
      } else {
        const y = yc.get(b.yeu_cau!);
        assert.ok(y, `${c.ma}: duyệt yêu cầu chưa gửi ${b.yeu_cau}`);
        if (b.mong_doi.ma === 201) {
          assert.ok(!daDuyet.has(b.yeu_cau!), `${c.ma}: yêu cầu ${b.yeu_cau} duyệt hai lần`);
          daDuyet.add(b.yeu_cau!);
          soDu += y!.huong === "tang" ? y!.so : -y!.so;
          phieu++;
        }
      }
      assert.ok(soDu >= 0, `${c.ma}: số dư không âm`);
      assert.equal(soDu, b.so_du_sau, `${c.ma}: số dư sau bước ${b.lam} ${b.nhan ?? b.yeu_cau ?? ""}`);
    }
    assert.equal(soDu, c.dap_an.so_du_cuoi, `${c.ma}: số dư cuối`);
    assert.equal(phieu, c.dap_an.so_phieu_dieu_chinh, `${c.ma}: số phiếu điều chỉnh`);
  }
});

// ---------------------------------------------------------------- LỚP 2 — chạy qua route thật ----------------------------------------------------------------
const NGUOI = {
  ke_toan_1: ["11111111-1111-4111-8111-111111111111", "0904000001", "Lan Kế Toán", ["ACCOUNTING"]],
  ke_toan_2: ["22222222-2222-4222-8222-222222222222", "0904000002", "Mai Kế Toán", ["ACCOUNTING"]],
  toan_quyen: ["33333333-3333-4333-8333-333333333333", "0904000003", "Toàn Quyền", ["SUPER_ADMIN"]],
  hdv: ["44444444-4444-4444-8444-444444444444", "0904000004", "Nam HDV", ["FIELD"]],
  ban: ["55555555-5555-4555-8555-555555555555", "0904000005", "An Bán", ["SALES"]],
} as const;
const AT = "2026-09-01T00:00:00.000Z";
type W = ReturnType<typeof world>;
function dungDon(w: W, tong: number): string {
  const id = "99999999-9999-4999-8999-000000000001";
  const vn = new Date(Date.now() + 7 * 3600_000 + 10 * 86400_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, 'SV-DC', ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, NGUOI.ban[0], tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vn);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001', ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(id, `pty-${NGUOI.hdv[0]}`, AT, AT, AT);
  return id;
}

test("sổ vàng dieu-chinh-cong-no LỚP 2: từng ca SV-DC-01…04 chạy qua route thật — mã kết quả, mã lỗi, số dư sau mỗi bước, số phiếu, nhật ký (SIẾT: lệch là đỏ)", async () => {
  for (const c of cases.filter((x) => x.ap_dung !== "dot_2")) {
    const w = world();
    for (const [id, phone, name, perms] of Object.values(NGUOI)) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
    const orderId = dungDon(w, c.dau_vao.phai_thu!);
    const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
    const hdv = `pty-${NGUOI.hdv[0]}`;
    if ((c.dau_vao.da_thu_cong_ty ?? 0) > 0) {
      const r = await w.call("POST", `/api/orders/${orderId}/payments`, { as: NGUOI.ke_toan_1[0], body: { soTien: c.dau_vao.da_thu_cong_ty, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
      assert.equal(r.status, 201, `${c.ma}: ${r.text}`);
    }
    const soDu = (): number => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ?2 AND creditor_party_id = ?3 THEN amount
      WHEN debtor_party_id = ?3 AND creditor_party_id = ?2 THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?1`, orderId, hdv, ct)[0].n);
    assert.equal(soDu(), c.dau_vao.so_du_dau, `${c.ma}: số dư đầu`);
    const ycId = new Map<string, string>();
    let stt = 0;
    for (const b of c.buoc!) {
      const nhan = `${c.ma} bước ${++stt} (${b.lam} ${b.nhan ?? b.yeu_cau ?? ""})`;
      let status: number;
      let loi: string | undefined;
      if (b.lam === "thu") {
        const r = await w.call("POST", `/api/orders/${orderId}/payments`, { as: NGUOI.hdv[0], body: { soTien: b.so_tien, hinhThuc: "CASH", nguoiThu: "toi" } });
        status = r.status;
        loi = r.json?.error?.code;
      } else if (b.lam === "yeu_cau") {
        const tang = b.huong === "tang";
        const r = await w.call("POST", "/api/ledger/adjustments", {
          as: NGUOI[b.ai as keyof typeof NGUOI][0],
          body: {
            loai: "dieu_chinh", orderId, benNo: tang ? hdv : ct, benDuocNo: tang ? ct : hdv, loaiDong: tang ? "HELD" : "SETTLEMENT", soTien: b.so_tien,
            lyDo: "ca mẫu sổ vàng điều chỉnh công nợ",
          },
        });
        status = r.status;
        loi = r.json?.error?.code;
        if (status === 201) {
          ycId.set(b.nhan!, r.json.yeuCauId);
          if (b.tuoi_ngay) {
            // Lùi mốc tạo (và mốc dòng REQUEST) về `tuoi_ngay` ngày trước — chèn lại đúng khuôn route; bảng chỉ-thêm nên thay bằng dòng mới cùng nội dung.
            const cu = w.q("SELECT * FROM bil_adjustment_request WHERE id = ?", r.json.yeuCauId)[0];
            const lui = new Date(Date.now() - b.tuoi_ngay * 86400_000).toISOString();
            w.sqlite.exec("DROP TRIGGER bil_adjustment_request_no_delete");
            w.sqlite.prepare("DELETE FROM bil_adjustment_request WHERE id = ?").run(cu.id);
            w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id,
              cap_snapshot, created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`)
              .run(cu.id, cu.order_id, cu.debtor_party_id, cu.creditor_party_id, cu.amount, cu.line_kind_code, cu.occurred_date, cu.direction, cu.reason, lui, cu.created_by, lui, cu.created_by);
            w.sqlite.exec(`CREATE TRIGGER bil_adjustment_request_no_delete BEFORE DELETE ON bil_adjustment_request
              BEGIN SELECT RAISE(ABORT, 'bil_append_only: yêu cầu điều chỉnh không xoá được'); END`);
            // audit_log của dòng «gửi yêu cầu» giữ nguyên mốc — bài không đọc nó.
          }
        }
      } else {
        const r = await w.call("POST", `/api/ledger/adjustment-requests/${ycId.get(b.yeu_cau!)}/approve`, { as: NGUOI[b.ai as keyof typeof NGUOI][0] });
        status = r.status;
        loi = r.json?.error?.code;
      }
      assert.equal(status, b.mong_doi.ma, `${nhan}: mã kết quả (lỗi ${loi})`);
      if (b.mong_doi.loi) assert.equal(loi, b.mong_doi.loi, `${nhan}: mã lỗi`);
      assert.equal(soDu(), b.so_du_sau, `${nhan}: số dư sau bước`);
      if (b.nhat_ky) {
        const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'ledger_adjustment' ORDER BY created_at DESC, rowid DESC", orderId);
        assert.ok(String(nk[0]?.detail).includes(b.nhat_ky), `${nhan}: nhật ký phải chứa «${b.nhat_ky}», thật: ${String(nk[0]?.detail)}`);
      }
    }
    assert.equal(soDu(), c.dap_an.so_du_cuoi, `${c.ma}: số dư cuối`);
    assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_posting WHERE kind_code = 'ADJUSTMENT' AND order_id = ?", orderId)[0].n), c.dap_an.so_phieu_dieu_chinh, `${c.ma}: số phiếu điều chỉnh`);
  }
});
