import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGELOG, compareVersions, changelogProblems, hasUnseenRelease, isNewForViewer, releaseGate, type ReleaseNote } from "./changelog.ts";

const note = (version: string, date: string, text = "Có tính năng mới cho nhân viên.", kind: "moi" | "sua" | "doi" = "moi"): ReleaseNote => ({ version, date, items: [{ kind, text }] });

test("CHANGELOG thật hợp lệ theo mọi luật viết", () => {
  assert.deepEqual(changelogProblems(CHANGELOG), []);
  assert.ok(CHANGELOG.length >= 1);
});

test("compareVersions so theo SỐ, không theo chữ", () => {
  assert.ok(compareVersions("1.10", "1.9") > 0);
  assert.ok(compareVersions("1.9", "1.10") < 0);
  assert.equal(compareVersions("2.0", "2.0"), 0);
  assert.ok(compareVersions("2.0", "1.99") > 0);
  for (const bad of ["1", "1.a", "", "v1.0", "1.0.0"]) assert.throws(() => compareVersions(bad, "1.0"), /phiên bản/i, bad);
});

test("hasUnseenRelease: chưa xem / cũ hơn / rác ⇒ có chấm; bằng hoặc mới hơn ⇒ không", () => {
  assert.equal(hasUnseenRelease(null, "1.3"), true);
  assert.equal(hasUnseenRelease("1.2", "1.3"), true);
  assert.equal(hasUnseenRelease("1.9", "1.10"), true);
  assert.equal(hasUnseenRelease("1.3", "1.3"), false);
  assert.equal(hasUnseenRelease("1.4", "1.3"), false);
  for (const junk of ["", "abc", "1"]) assert.equal(hasUnseenRelease(junk, "1.3"), true, `rác "${junk}" coi như chưa xem`);
});

test("isNewForViewer: chưa từng xem thì chỉ bản mới nhất có nhãn; đã xem X thì mọi bản > X", () => {
  assert.equal(isNewForViewer("1.3", null, "1.3"), true);
  assert.equal(isNewForViewer("1.2", null, "1.3"), false);
  assert.equal(isNewForViewer("1.3", "1.1", "1.3"), true);
  assert.equal(isNewForViewer("1.2", "1.1", "1.3"), true);
  assert.equal(isNewForViewer("1.1", "1.1", "1.3"), false);
  assert.equal(isNewForViewer("1.3", "abc", "1.3"), true, "rác: như chưa từng xem");
});

test("changelogProblems bắt từng loại lỗi viết", () => {
  const ok = [note("1.1", "2026-09-22"), note("1.0", "2026-09-21")];
  assert.deepEqual(changelogProblems(ok), []);
  assert.match(changelogProblems([]).join(), /rỗng/);
  assert.match(changelogProblems([note("1.0", "2026-09-21"), note("1.1", "2026-09-22")]).join(), /tăng dần/, "đảo thứ tự");
  assert.match(changelogProblems([note("1.1", "2026-09-22"), note("1.1", "2026-09-21")]).join(), /tăng dần/, "trùng số");
  assert.match(changelogProblems([note("1.1", "2026-09-20"), note("1.0", "2026-09-21")]).join(), /ngày/, "ngày giảm");
  assert.match(changelogProblems([note("1.0", "2026-02-30")]).join(), /ngày/, "ngày sai lịch");
  assert.match(changelogProblems([note("1.a", "2026-09-21")]).join(), /phiên bản/i);
  assert.match(changelogProblems([{ version: "1.0", date: "2026-09-21", items: [] }]).join(), /ít nhất một/);
  assert.match(changelogProblems([note("1.0", "2026-09-21", "   ")]).join(), /rỗng/);
  assert.match(changelogProblems([note("1.0", "2026-09-21", "a".repeat(161))]).join(), /160/);
  assert.match(changelogProblems([{ version: "1.0", date: "2026-09-21", items: [{ kind: "x" as "moi", text: "Chữ thường." }] }]).join(), /loại/);
});

test("changelogProblems chặn chữ kỹ thuật lộ ra nhân viên", () => {
  for (const bad of ["Thêm API mới.", "Sửa route đăng nhập.", "Chạy migration mới.", "Xong Task 3.", "Đã deploy lại.", "Sửa lỗi `null`.", "Thêm cột last_login_at.", "Sửa e2e.", "Đổi Worker.", "Bảng D1 mới."]) {
    assert.ok(changelogProblems([note("1.0", "2026-09-21", bad)]).length > 0, `phải chặn: ${bad}`);
  }
  for (const good of ["Đăng nhập bằng Face ID.", "Xem nhật ký thay đổi ở trang Trợ giúp.", "Chạm vào ảnh xác nhận để tải về."]) {
    assert.deepEqual(changelogProblems([note("1.0", "2026-09-21", good)]), [], `không chặn nhầm: ${good}`);
  }
});

test("releaseGate trước deploy: chỉ ĐẠT khi bản ở máy mới hơn production", () => {
  assert.equal(releaseGate("1.4", "1.3", "truoc").ok, true);
  assert.equal(releaseGate("1.3", "1.3", "truoc").ok, false);
  assert.equal(releaseGate("1.2", "1.3", "truoc").ok, false);
  assert.equal(releaseGate("1.10", "1.9", "truoc").ok, true);
  const first = releaseGate("1.4", null, "truoc");
  assert.equal(first.ok, true);
  assert.match(first.message, /coi là 1\.0/, "production chưa báo số: nói rõ là coi như 1.0");
  assert.equal(releaseGate("1.4", "rác", "truoc").ok, false, "production trả số lạ: không đạt");
});

test("releaseGate sau deploy: chỉ ĐẠT khi production đúng bằng bản ở máy", () => {
  assert.equal(releaseGate("1.4", "1.4", "sau").ok, true);
  assert.equal(releaseGate("1.4", "1.3", "sau").ok, false);
  assert.equal(releaseGate("1.4", null, "sau").ok, false);
});
