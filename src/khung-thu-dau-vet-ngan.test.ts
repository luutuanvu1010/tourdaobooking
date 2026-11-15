// Khung thử (tests/audit/harness.mjs) nạp mã máy chủ đã gói (esbuild) qua một URL `data:` base64 ~4,5 MB. Thiếu tên ngắn cho khối mã đó, MỖI khung dấu vết
// lỗi chép lại cả URL: một lỗi chưa bắt sâu 8 tầng in dòng nhật ký ~35 MB. Sự cố 2026-11-07: bài «Task 3 (nợ 7)» (src/tra-sau-duong-ghi.test.ts) in hai dòng
// như thế; máy chạy của GitHub che bí mật từng dòng không theo kịp, ống ra đầy, tiến trình kiểm đứng tới hết giờ ⇒ «npm test phần 2» treo ở mọi lần kiểm.
// Bài này giữ: lỗi chưa bắt đi qua khung thử chỉ in dòng ngắn, không chứa mã gói. Khi đỏ, bài tự bắt `console.error` nên không đổ dòng khổng lồ ra màn hình.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { SUP, setup } from "../tests/audit/xac-nhan-khung.mjs";

const TRAN_DONG = 64 * 1024;

test("lỗi chưa bắt đi qua khung thử: dòng nhật ký ngắn, dấu vết không chép mã gói base64", async () => {
  const w = setup();
  // Làm hỏng nguồn đọc nợ Trả sau để route danh sách hạn mức ném lỗi chưa bắt (cùng cách bài nợ 7 làm).
  w.sqlite.exec("DROP VIEW v_ord_don_tra_sau");
  const dong: string[] = [];
  const goc = console.error;
  console.error = (...a: unknown[]) => void dong.push(a.map(String).join(" "));
  let status: number;
  try {
    status = (await w.call("GET", "/api/tra-sau/han-muc", { as: SUP })).status;
  } finally {
    console.error = goc;
  }
  assert.equal(status, 500, "route phải đi đường lỗi chưa bắt của router");
  const loi = dong.filter((d) => d.includes('"event":"unhandled"'));
  assert.equal(loi.length, 1, `một dòng nhật ký lỗi chưa bắt (thấy ${loi.length})`);
  const d = loi[0];
  assert.match(d.slice(0, 2000), /no such table: v_ord_don_tra_sau/, "dòng vẫn nói rõ lỗi gốc");
  assert.ok(d.length < TRAN_DONG, `dòng nhật ký dài ${d.length} ký tự (trần ${TRAN_DONG}); đầu dòng: ${d.slice(0, 300)}`);
  assert.ok(!d.includes("data:text/javascript"), "dấu vết không được chép URL data: của mã gói");
  assert.match(d, /khung-thu-app\.mjs:\d+:\d+/, "khung dấu vết mang tên ngắn của mã gói, kèm dòng:cột");
});
