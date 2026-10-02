import { test } from "node:test";
import assert from "node:assert/strict";
import { MAC_DINH, NUM, PHONG, bienCss, docTokensDaLuu, dungCss, kiemGiaoDien, tuongPhan } from "./giao-dien.ts";

test("tuongPhan: trắng/đen 21:1, cùng màu 1:1, đối xứng", () => {
  assert.equal(tuongPhan("#ffffff", "#000000").toFixed(2), "21.00");
  assert.equal(tuongPhan("#0c4a6e", "#0c4a6e"), 1);
  assert.equal(tuongPhan("#0c4a6e", "#dcebf6"), tuongPhan("#dcebf6", "#0c4a6e"));
});

test("mặc định hợp lệ; tập rỗng hợp lệ", () => {
  assert.deepEqual(kiemGiaoDien({}), []);
  assert.deepEqual(kiemGiaoDien({ ...MAC_DINH }), []);
});

test("mỗi núm có khoá duy nhất, nhãn tiếng Việt, token bắt đầu --, có giá trị mặc định", () => {
  const khoa = NUM.map((n) => n.khoa);
  assert.equal(new Set(khoa).size, khoa.length);
  for (const n of NUM) {
    assert.match(n.token, /^--[a-z0-9-]+$/);
    assert.ok(MAC_DINH[n.khoa] !== undefined, `thiếu mặc định ${n.khoa}`);
    assert.match(n.nhan, /[àáảãạăâđèéêìíòóôơùúưỳýÀ-ỹ]/i, `nhãn ${n.khoa} phải tiếng Việt có dấu`);
  }
});

test("từ chối: không phải object, khoá lạ, sai dạng màu, ngoài khoảng, phông lạ", () => {
  assert.equal(kiemGiaoDien(null).length, 1);
  assert.equal(kiemGiaoDien([]).length, 1);
  assert.equal(kiemGiaoDien({ "khong-co": "#ffffff" })[0]!.khoa, "khong-co");
  assert.ok(kiemGiaoDien({ "nen-trang": "red" }).some((l) => l.khoa === "nen-trang"));
  assert.ok(kiemGiaoDien({ "nen-trang": "#fff" }).some((l) => l.khoa === "nen-trang"), "chỉ nhận #rrggbb");
  assert.ok(kiemGiaoDien({ "co-noi-dung": "40" }).some((l) => l.khoa === "co-noi-dung"));
  assert.ok(kiemGiaoDien({ "co-noi-dung": "15.5" }).some((l) => l.khoa === "co-noi-dung"), "cỡ là số nguyên px");
  assert.ok(kiemGiaoDien({ "phong-noi-dung": "comic-sans" }).some((l) => l.khoa === "phong-noi-dung"));
});

test("chặn chèn CSS qua giá trị (Review Focus 1)", () => {
  for (const xau of ["#ffffff;}body{display:none}", "16;--x:1", "#ffffff\n", "500}", "be-vietnam-pro;}", "<style>"]) {
    for (const n of NUM) {
      const loi = kiemGiaoDien({ [n.khoa]: xau });
      assert.ok(loi.some((l) => l.khoa === n.khoa), `${n.khoa} nhận "${xau}"`);
    }
  }
  assert.equal(dungCss({ "nen-trang": "#ffffff;}body{display:none}" }), ":root{}");
});

test("chặn tương phản dưới 4,5:1, câu lỗi nêu tên ô bằng tiếng Việt kèm tỉ lệ", () => {
  const loi = kiemGiaoDien({ "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#dddddd" });
  const l = loi.find((x) => x.khoa === "chu-thanh-tren");
  assert.ok(l, JSON.stringify(loi));
  assert.match(l!.message, /khó đọc/);
  assert.match(l!.message, /\d,\d+:1/);
  assert.match(l!.message, /4,5:1/);
});

test("tương phản đi theo núm cha: đổi nền thẻ / màu chính / màu chính nhạt kéo thanh và nút theo", () => {
  const a = kiemGiaoDien({ "nen-the": "#0c4a6e" });
  assert.ok(a.some((l) => l.khoa === "nen-thanh-tren" && /khó đọc/.test(l.message)), JSON.stringify(a));
  assert.ok(a.some((l) => l.khoa === "nen-thanh-ben"), JSON.stringify(a));
  const b = kiemGiaoDien({ "mau-chinh": "#dcebf6" });
  assert.ok(b.some((l) => /nút chính/i.test(l.message)), JSON.stringify(b));
  // núm con tự đặt thì thắng núm cha: nền thanh trên tối + chữ thanh trên sáng hợp lệ dù nền thẻ đổi
  assert.deepEqual(kiemGiaoDien({ "nen-the": "#0c4a6e", "nen-thanh-tren": "#ffffff" }).filter((l) => l.khoa === "nen-thanh-tren" || l.khoa === "chu-thanh-tren"), []);
});

test("câu lỗi màu không lộ định dạng kỹ thuật", () => {
  assert.equal(kiemGiaoDien({ "nen-trang": "red" })[0]!.message, "Nền trang: chọn một màu trong bảng màu.");
});

test("độ đậm: mọi giá trị chọn được ở mọi núm độ đậm đều có tệp phông ở MỌI phông (Review Focus 5); số lẻ bị chặn", () => {
  for (const n of NUM.filter((x) => x.loai === "dam")) {
    for (let d = n.min!; d <= n.max!; d += 100) {
      for (const p of Object.values(PHONG)) assert.ok(p.dam.includes(d), `${p.ten} thiếu độ đậm ${d} mà núm ${n.khoa} cho chọn — thu hẹp khoảng hoặc bỏ phông`);
      assert.deepEqual(kiemGiaoDien({ [n.khoa]: String(d) }), [], `${n.khoa}=${d}`);
    }
  }
  assert.ok(kiemGiaoDien({ "dam-noi-dung": "450" }).some((l) => l.khoa === "dam-noi-dung"));
});

test("bienCss / dungCss: chỉ khoá hợp lệ, đúng token, cỡ thêm px, phông thành chồng phông", () => {
  const css = dungCss({ "nen-thanh-tren": "#123456", "co-noi-dung": "17", "phong-noi-dung": "nunito", "khong-co": "#000000" });
  assert.match(css, /^:root\{.*\}$/s);
  assert.match(css, /--c-bar-bg:#123456;/);
  assert.match(css, /--fs-step-5:17px;/);
  assert.match(css, /--font:"Nunito",/);
  assert.doesNotMatch(css, /khong-co|#000000/);
  assert.deepEqual(bienCss({}), []);
});

test("docTokensDaLuu: JSON hỏng → {}, khoá lạ/sai dạng bị bỏ, khoá đúng giữ (Review Focus 2)", () => {
  assert.deepEqual(docTokensDaLuu("không phải json"), {});
  assert.deepEqual(docTokensDaLuu("[]"), {});
  assert.deepEqual(docTokensDaLuu("null"), {});
  assert.deepEqual(docTokensDaLuu("5"), {});
  assert.deepEqual(docTokensDaLuu(JSON.stringify({ "co-noi-dung": 16, "nen-trang": "#f0f0f0" })), { "nen-trang": "#f0f0f0" }, "giá trị không phải chuỗi bị bỏ");
  assert.deepEqual(docTokensDaLuu(JSON.stringify({ "da-bo": "#ffffff", "nen-trang": "#f0f0f0", "nen-the": "x" })), { "nen-trang": "#f0f0f0" });
});
