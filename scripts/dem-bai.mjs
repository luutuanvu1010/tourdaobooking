// Bộ báo cáo của `node --test` chỉ để ĐẾM (ADR-0176 Đ2.3): số bài, đạt, đỏ, bỏ qua (skip), để làm (todo), tên bài đỏ — ghi MỘT dòng JSON ra đích
// (`--test-reporter-destination=<tệp>`). Dùng cạnh bộ báo cáo spec (in cho người xem). scripts/kiem-phan.mjs đọc tệp này; tệp điều khiển việc kiểm.
// Không đếm "suite" (describe) — chỉ bài thật; tệp hỏng không chạy được thì node báo một bài đỏ mang tên tệp, nên vẫn đếm là đỏ.
export default async function* demBai(source) {
  // giayTep: giây mỗi TỆP = tổng thời gian các bài cấp ngoài cùng (nesting 0) của tệp — số thật để chia phần cho cân (scripts/thoi-gian-test.json).
  const d = { tests: 0, pass: 0, fail: 0, skipped: 0, todo: 0, baiDo: [], giayTep: {} };
  const ten = (f) => String(f ?? "").replace(/^.*?\/src\//, "src/");
  for await (const ev of source) {
    if (ev.type !== "test:pass" && ev.type !== "test:fail") continue;
    // Chỉ tệp kiểm của bảng chia (src/**/*.test.ts); bài lồng do tệp khác khai (tests/audit/…) không tính riêng.
    if (ev.data?.nesting === 0 && /\/src\/.*\.test\.ts$/.test(String(ev.data?.file ?? "")) && Number.isFinite(ev.data?.details?.duration_ms)) {
      const t = ten(ev.data.file);
      d.giayTep[t] = Math.round(((d.giayTep[t] ?? 0) + ev.data.details.duration_ms / 1000) * 1000) / 1000;
    }
    if (ev.data?.details?.type === "suite") continue;
    d.tests++;
    if (ev.data?.skip !== undefined && ev.data.skip !== false) d.skipped++;
    else if (ev.data?.todo !== undefined && ev.data.todo !== false) d.todo++;
    if (ev.type === "test:pass") d.pass++;
    else {
      d.fail++;
      if (d.baiDo.length < 50) d.baiDo.push(`${ten(ev.data?.file)}: ${ev.data?.name ?? "?"}`);
    }
  }
  yield `${JSON.stringify(d)}\n`;
}
