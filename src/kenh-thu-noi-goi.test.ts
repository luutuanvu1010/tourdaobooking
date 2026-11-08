// ADR-0178 Đ1 mục 2 (Task A3): bài QUÉT nơi gọi — mọi đường ghi khoản thu của khách ở đơn mang dấu Tắt phải đi qua cổng `kiemNguoiThuKenh` TRƯỚC khi dựng lô.
// (1) Mọi câu chèn `bil_payment_receipt` trong src/ (trừ bài) phải nằm trong một hàm dựng câu ĐÃ PHÂN LOẠI (CHẶN hoặc MIỄN có tên) — thêm câu chèn mới mà không phân loại ⇒ đỏ.
// (2) Mỗi HÀM cấp cao nhất (không chỉ mỗi tệp) gọi một hàm dựng câu CHẶN phải gọi `kiemNguoiThuKenh(` ở trước lời gọi đó trong cùng hàm.
// Bản đồ phân loại: .superpowers/sdd/2026-11-06-thu-tien-doi-tac-va-tra-sau-theo-dich-vu/progress.md «Bản đồ nơi chèn bil_payment_receipt»; bảng «Từng đường ghi tiền» của đặc tả.
// Giới hạn (dựa vào kỷ luật): bài đọc chữ — gọi qua bí danh / biến trung gian thì không thấy. Lớp CSDL `bil_receipt_partner_channel` (0144) canh phần đó.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/** CHẶN: khoản khách trả MỚI (CUSTOMER_PAYMENT, không đảo). */
export const CHAN = ["receiptBeforeDeliveredStatement", "receiptAtDeliveryStatement", "receiptOnConfirmStatement", "receiptThayMoiStatement", "receiptTransferInStatement"] as const;
/** MIỄN có tên: tiền ra (CUSTOMER_REFUND) hoặc dòng đảo (chép người thu của dòng gốc). */
export const MIEN = ["receiptRefundStatement", "receiptReversalStatement", "receiptThayDaoStatement", "receiptPayoutStatement", "hoanPhanDinhStatement"] as const;

function tepTs(dir: string): string[] {
  const out: string[] = [];
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) out.push(...tepTs(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}
const TEP = tepTs(SRC).map((p) => ({ ten: relative(ROOT, p), noiDung: readFileSync(p, "utf8") }));

/** Cắt tệp thành các khối cấp cao nhất: mỗi khối bắt đầu ở một dòng khai (cột 0) `function` / `export … function` / `const` / `export const` / `async function`. */
function khoiCapCao(noiDung: string): { ten: string; than: string }[] {
  const dong = noiDung.split("\n");
  const khoi: { ten: string; than: string[] }[] = [];
  const BAT_DAU = /^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z0-9_$]+)|const\s+([A-Za-z0-9_$]+))/;
  for (const d of dong) {
    const m = BAT_DAU.exec(d);
    if (m) khoi.push({ ten: m[1] ?? m[2] ?? "?", than: [d] });
    else if (khoi.length > 0) khoi[khoi.length - 1]!.than.push(d);
  }
  return khoi.map((k) => ({ ten: k.ten, than: k.than.join("\n") }));
}

test("(1) mọi câu chèn bil_payment_receipt nằm trong một hàm dựng câu đã phân loại CHẶN / MIỄN", () => {
  const daPhanLoai = new Set<string>([...CHAN, ...MIEN]);
  const hamChen = new Set<string>();
  let soCau = 0;
  for (const t of TEP) {
    const khoi = khoiCapCao(t.noiDung);
    // Hằng câu SQL chèn khoản thu (khai bằng defineSql ở cấp cao nhất).
    const hang = khoi.filter((k) => /INSERT INTO bil_payment_receipt\b/.test(k.than)).map((k) => k.ten);
    soCau += (t.noiDung.match(/INSERT INTO bil_payment_receipt\b/g) ?? []).length;
    for (const h of hang) {
      // Hàm dựng câu = khối KHÁC dùng hằng đó. Hằng không ai dùng thì vẫn là nơi chèn chưa phân loại.
      const dung = khoi.filter((k) => k.ten !== h && new RegExp(`\\b${h}\\b`).test(k.than)).map((k) => k.ten);
      assert.ok(dung.length > 0, `${t.ten}: câu chèn ${h} không có hàm dựng câu nào — phân loại nó trong bài này`);
      for (const d of dung) hamChen.add(`${t.ten}:${d}`);
    }
  }
  const ten = [...hamChen].map((x) => x.split(":")[1]!);
  const chuaPhanLoai = ten.filter((x) => !daPhanLoai.has(x));
  assert.deepEqual(chuaPhanLoai, [], "hàm chèn khoản thu mới chưa phân loại CHẶN / MIỄN (ADR-0178 Đ1 mục 2) — thêm vào CHAN hoặc MIEN kèm lý do");
  assert.deepEqual([...new Set(ten)].sort(), [...daPhanLoai].sort(), "danh sách phân loại khớp đúng các hàm chèn đang có (bỏ tên chết)");
  assert.equal(soCau, 11, "số câu chèn bil_payment_receipt trong src/ đổi — soát lại bản đồ CHẶN / MIỄN rồi sửa số này");
});

test("(2) mỗi hàm gọi một hàm dựng câu CHẶN phải gọi kiemNguoiThuKenh( trước lời gọi đó, trong cùng hàm", () => {
  const thieu: string[] = [];
  let soNoiGoi = 0;
  for (const t of TEP) {
    for (const k of khoiCapCao(t.noiDung)) {
      if ((CHAN as readonly string[]).includes(k.ten)) continue; // chính định nghĩa
      const than = k.than.split("\n").filter((d) => !/^\s*import\b/.test(d) && !/^\s*\/\//.test(d) && !/^\s*\*/.test(d)).join("\n");
      const viTri = CHAN.map((c) => than.search(new RegExp(`\\b${c}\\(`))).filter((i) => i >= 0);
      if (viTri.length === 0) continue;
      soNoiGoi++;
      const cong = than.search(/\bkiemNguoiThuKenh\(/);
      if (cong < 0 || cong > Math.min(...viTri)) thieu.push(`${t.ten}:${k.ten}`);
    }
  }
  assert.deepEqual(thieu, [], "hàm ghi khoản thu của khách chưa gọi cổng người thu trước khi dựng lô");
  // ghiLanThu, daGiao (service.ts); cauDatCocKhiXacNhan (dat-coc.ts); chuanBiLoThay (thay-lan-thu.ts); ghiChuyen (coc.ts).
  assert.equal(soNoiGoi, 5, "số hàm gọi câu CHẶN đổi — soát lại rồi sửa số này");
});
