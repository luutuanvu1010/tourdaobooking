import assert from "node:assert/strict";
import { test } from "node:test";
import { thoiGianTuongDoi, tomTatThietBi } from "./thoi-gian-tuong-doi.ts";

// «Bây giờ» = 12:00 ngày 27/10/2026 giờ VN = 05:00 UTC.
const NOW = new Date("2026-10-27T05:00:00Z");
const t = (iso: string, now: Date = NOW) => thoiGianTuongDoi(iso, now);

test("thoiGianTuongDoi: dưới 1 phút, dưới 60 phút, cùng ngày", () => {
  assert.equal(t("2026-10-27T04:59:30Z"), "vừa xong");
  assert.equal(t("2026-10-27T04:57:00Z"), "3 phút trước");
  assert.equal(t("2026-10-27T04:01:00Z"), "59 phút trước");
  assert.equal(t("2026-10-27T03:00:00Z"), "10:00"); // 10:00 VN, cách 2 giờ
});

test("thoiGianTuongDoi: hôm qua, cùng năm, khác năm", () => {
  assert.equal(t("2026-10-26T05:00:00Z"), "hôm qua");
  assert.equal(t("2026-10-20T05:00:00Z"), "20/10");
  assert.equal(t("2025-12-31T05:00:00Z"), "31/12/2025");
});

test("thoiGianTuongDoi: ca biên theo giờ Việt Nam", () => {
  // 23:59 VN 26/10 (16:59 UTC), bây giờ 00:01 VN 27/10 (17:01 UTC 26/10): cách 2 phút
  assert.equal(t("2026-10-26T16:59:00Z", new Date("2026-10-26T17:01:00Z")), "2 phút trước");
  // 23:30 VN 26/10 so với 00:45 VN 27/10: quá 60 phút, khác ngày VN ⇒ hôm qua
  assert.equal(t("2026-10-26T16:30:00Z", new Date("2026-10-26T17:45:00Z")), "hôm qua");
  // mốc UTC 17:30 26/10 = 00:30 VN 27/10: cùng ngày VN với now 12:00 VN 27/10
  assert.equal(t("2026-10-26T17:30:00Z"), "00:30");
});

test("tomTatThietBi", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const iphoneChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
  const ipad = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
  const macChrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  const macSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
  const macFirefox = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0";
  const macEdge = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0";
  const winChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  const winEdge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0";
  const winFirefox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
  assert.equal(tomTatThietBi(iphone), "iPhone · Safari");
  assert.equal(tomTatThietBi(iphoneChrome), "iPhone · Chrome");
  assert.equal(tomTatThietBi(ipad), "iPad · Safari");
  assert.equal(tomTatThietBi(android), "Android · Chrome");
  assert.equal(tomTatThietBi(macChrome), "Mac · Chrome");
  assert.equal(tomTatThietBi(macSafari), "Mac · Safari");
  assert.equal(tomTatThietBi(macFirefox), "Mac · Firefox");
  assert.equal(tomTatThietBi(macEdge), "Mac · Edge");
  assert.equal(tomTatThietBi(winChrome), "Windows · Chrome");
  assert.equal(tomTatThietBi(winEdge), "Windows · Edge");
  assert.equal(tomTatThietBi(winFirefox), "Windows · Firefox");
  assert.equal(tomTatThietBi(null), "Thiết bị khác");
  assert.equal(tomTatThietBi(""), "Thiết bị khác");
  assert.equal(tomTatThietBi("curl/8.0"), "Thiết bị khác");
});
