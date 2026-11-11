// ADR-0196 Đ1, Đ2 — luật thuần «khi nào bắt buộc ảnh biên lai» và kiểm MỘT tệp ảnh biên lai. Bài ở mục «Bài kiểm» của ADR (hàm thuần `canBienLai`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { canBienLai, congTyThuChuyenKhoan, kiemBienLai, TOI_DA_BASE64_BIEN_LAI } from "../../shared/bien-lai.ts";
import { canDoiChieu } from "./rules.ts";
import { TOI_DA_BYTE } from "../../shared/tep-dinh-kem.ts";

const CONG_TY = "pty-cong-ty";
const DOI_TAC = "pty-doi-tac";
const BEN_DAT_KHAC = "pty-ben-dat-khac";
const NCC = "pty-ncc";

/** Đi đúng đường máy chủ: `canDoiChieu` tính trước, rồi `canBienLai` nhận kết quả. */
function doi(nguoi: { laDoiTac: boolean; laKeToan: boolean; partyId: string }, role: "COMPANY" | "BOOKER" | "STAFF" | "SUPPLIER", partyThu: string, method: "BANK_TRANSFER" | "CASH") {
  const dc = canDoiChieu({ kind: "CUSTOMER_PAYMENT", collectorRole: role, collectorPartyId: partyThu, method, nguoiGhiPartyId: nguoi.partyId, nguoiGhiLaKeToan: nguoi.laKeToan, congTyId: CONG_TY });
  return { dc, bl: canBienLai({ laDoiTac: nguoi.laDoiTac, laKeToan: nguoi.laKeToan, collectorRole: role, method, canDoiChieu: dc }) };
}

test("Đối tác × (Công ty, Bên đặt khác, Tôi thu, Tại quầy nhà cung cấp) × (Chuyển khoản, Tiền mặt): CHỈ ô Công ty × Chuyển khoản đòi ảnh", () => {
  const dt = { laDoiTac: true, laKeToan: false, partyId: DOI_TAC };
  const ca: [string, "COMPANY" | "BOOKER" | "STAFF" | "SUPPLIER", string][] = [
    ["Công ty", "COMPANY", CONG_TY], ["Bên đặt khác", "BOOKER", BEN_DAT_KHAC], ["Tôi thu (bên đặt chính mình)", "BOOKER", DOI_TAC], ["Tôi thu (nhân viên)", "STAFF", DOI_TAC], ["Tại quầy nhà cung cấp", "SUPPLIER", NCC],
  ];
  for (const [ten, role, party] of ca) {
    for (const m of ["BANK_TRANSFER", "CASH"] as const) {
      const { bl } = doi(dt, role, party, m);
      assert.equal(bl, role === "COMPANY" && m === "BANK_TRANSFER", `${ten} × ${m}`);
    }
  }
});

test("Đối tác khai «khách trả cho bên đặt khác» / «tại quầy nhà cung cấp» (cả chuyển khoản): canDoiChieu ĐÚNG mà KHÔNG đòi ảnh (phương án a3 chủ không chọn)", () => {
  const dt = { laDoiTac: true, laKeToan: false, partyId: DOI_TAC };
  for (const [role, party] of [["BOOKER", BEN_DAT_KHAC], ["SUPPLIER", NCC]] as const) {
    for (const m of ["BANK_TRANSFER", "CASH"] as const) {
      const { dc, bl } = doi(dt, role, party, m);
      assert.equal(dc, true, `${role} × ${m}: là lời khai chờ đối chiếu`);
      assert.equal(bl, false, `${role} × ${m}: không đòi ảnh`);
    }
  }
});

test("Bán hàng, Hướng dẫn viên, Quản trị ghi «Công ty – chuyển khoản»: không đòi ảnh (khuyến nghị câu (a)); Kế toán không đòi; tài khoản lai Kế toán + Đối tác không đòi", () => {
  for (const nguoi of [{ laDoiTac: false, laKeToan: false, partyId: "pty-ban-hang" }, { laDoiTac: false, laKeToan: true, partyId: "pty-ke-toan" }, { laDoiTac: true, laKeToan: true, partyId: DOI_TAC }]) {
    assert.equal(doi(nguoi, "COMPANY", CONG_TY, "BANK_TRANSFER").bl, false, JSON.stringify(nguoi));
  }
});

test("đủ BỐN điều: thiếu canDoiChieu thì không đòi ảnh dù ba điều kia đúng (ví dụ người ghi là chính hồ sơ công ty)", () => {
  assert.equal(canBienLai({ laDoiTac: true, laKeToan: false, collectorRole: "COMPANY", method: "BANK_TRANSFER", canDoiChieu: false }), false);
  assert.equal(canBienLai({ laDoiTac: true, laKeToan: false, collectorRole: "COMPANY", method: "BANK_TRANSFER", canDoiChieu: true }), true);
  assert.equal(congTyThuChuyenKhoan({ collectorRole: "COMPANY", method: "BANK_TRANSFER" }), true);
  assert.equal(congTyThuChuyenKhoan({ collectorRole: "COMPANY", method: "CASH" }), false);
  assert.equal(congTyThuChuyenKhoan({ collectorRole: "BOOKER", method: "BANK_TRANSFER" }), false);
  assert.equal(congTyThuChuyenKhoan({ collectorRole: "COMPANY", method: undefined }), false);
});

// Một điều kiện, một nơi (Hiến chương 5.1; ADR-0196 Đ1 «Cách làm»): cặp `"COMPANY"` + `"BANK_TRANSFER"` của vị từ chỉ viết ở src/shared/bien-lai.ts, `canDoiChieu` gọi lại nó.
test("vị từ «Công ty thu bằng chuyển khoản» chỉ định nghĩa ở MỘT nơi và canDoiChieu dùng lại nó (không viết điều kiện thứ hai)", () => {
  const SRC = fileURLToPath(new URL("../../", import.meta.url));
  const tep = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
  const MAU = /collectorRole\s*===\s*"COMPANY"\s*&&\s*\w+(?:\.\w+)*\.method\s*===\s*"BANK_TRANSFER"|method\s*===\s*"BANK_TRANSFER"\s*&&\s*\w+(?:\.\w+)*\.collectorRole\s*===\s*"COMPANY"/;
  const co = tep(SRC).filter((p) => MAU.test(readFileSync(p, "utf8"))).map((p) => relative(SRC, p).replaceAll("\\", "/"));
  assert.deepEqual(co, ["shared/bien-lai.ts"], "cặp điều kiện Công ty + Chuyển khoản phải chỉ nằm ở src/shared/bien-lai.ts");
  const rules = readFileSync(new URL("./rules.ts", import.meta.url), "utf8");
  const than = /export const canDoiChieu = [\s\S]*?\n\n/.exec(rules)?.[0] ?? "";
  assert.match(than, /congTyThuChuyenKhoan\(input\)/, "canDoiChieu phải gọi congTyThuChuyenKhoan");
});

// ---- Kiểm MỘT tệp (Đ2): đúng một tệp; JPG/PNG/HEIC/PDF theo chữ ký thật; tối đa 10 MB; mã như kiemTepCuaTin ----------------------------------------------------
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

test("kiemBienLai: vắng ⇒ không tệp; một tệp PNG ⇒ được; mảng / nhiều tệp ⇒ 400; base64 hỏng ⇒ 400; HTML đổi đuôi ⇒ 415; quá 10 MB ⇒ 413 (đo chuỗi TRƯỚC khi giải)", () => {
  assert.deepEqual(kiemBienLai(undefined), { ok: true, tep: null });
  assert.deepEqual(kiemBienLai(null), { ok: true, tep: null });
  const ok = kiemBienLai({ noiDung: b64(PNG) });
  assert.ok(ok.ok && ok.tep && ok.tep.loai === "png" && ok.tep.bytes.length === PNG.length);
  for (const sai of [[{ noiDung: b64(PNG) }], [{ noiDung: b64(PNG) }, { noiDung: b64(PNG) }], "abc", { noiDung: 5 }, { noiDung: "@@@@" }, { noiDung: "" }]) {
    const k = kiemBienLai(sai);
    assert.ok(!k.ok && k.status === 400 && k.code === "invalid_input", JSON.stringify(sai).slice(0, 40));
  }
  const html = kiemBienLai({ noiDung: b64(new TextEncoder().encode("<html><script>1</script></html>")) });
  assert.ok(!html.ok && html.status === 415 && html.code === "unsupported_file_type");
  const lon = new Uint8Array(TOI_DA_BYTE + 1);
  lon.set(PNG);
  const k413 = kiemBienLai({ noiDung: b64(lon) });
  assert.ok(!k413.ok && k413.status === 413 && k413.code === "file_too_large");
  const rac = kiemBienLai({ noiDung: "A".repeat(TOI_DA_BASE64_BIEN_LAI + 4) });
  assert.ok(!rac.ok && rac.status === 413, "chuỗi quá dài ⇒ 413 trước khi giải");
  const vua = new Uint8Array(TOI_DA_BYTE);
  vua.set(PNG);
  assert.ok(kiemBienLai({ noiDung: b64(vua) }).ok, "đúng 10 MB được");
});
