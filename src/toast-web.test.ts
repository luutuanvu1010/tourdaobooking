// Thông báo ngắn kiểu mới (Đợt 0, Task 10): thời gian tự tắt, Hoàn tác, trần 3 cái, Bảng tin giữ 6 giây.
import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { dungDomGia } from "./dom-gia.ts";

dungDomGia();
const { hienBaoNgan, hienThongBao, TU_AN_NGAN_MS, TU_AN_HOAN_TAC_MS, TU_AN_MS } = await import("../web/toast.ts");
const dom = globalThis as unknown as { document: { querySelectorAll(s: string): any[]; querySelector(s: string): any } };
const toasts = (s = ".toast") => dom.document.querySelectorAll(s);

describe("web/toast.ts", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
  afterEach(() => {
    mock.timers.tick(10_000);
    mock.timers.reset();
  });

  it("hằng số thời gian", () => {
    assert.deepEqual([TU_AN_NGAN_MS, TU_AN_HOAN_TAC_MS, TU_AN_MS], [3000, 5000, 6000]);
  });

  it("báo ngắn: tông lá mặc định, tự tắt đúng 3 giây", () => {
    hienBaoNgan("Đã lưu");
    const t = dom.document.querySelector(".toast");
    assert.equal(t.getAttribute("data-tong"), "la");
    assert.equal(t.parent.className, "toast-vung");
    assert.equal(t.querySelector(".toast-cau").textContent, "Đã lưu");
    assert.equal(t.querySelector(".toast-dong").getAttribute("aria-label"), "Đóng");
    mock.timers.tick(2999);
    assert.equal(toasts().length, 1);
    mock.timers.tick(1);
    assert.equal(toasts().length, 0);
  });

  it("tông đỏ", () => {
    hienBaoNgan("Gửi chưa thành", { tong: "do" });
    assert.equal(dom.document.querySelector(".toast").getAttribute("data-tong"), "do");
  });

  it("Hoàn tác: 5 giây, bấm được, gọi một lần", () => {
    let n = 0;
    hienBaoNgan("Đã xoá", { hoanTac: { khiBam: () => n++ } });
    const t = dom.document.querySelector(".toast");
    assert.ok(t.classList.contains("toast-bam-duoc"));
    mock.timers.tick(4999);
    assert.equal(toasts().length, 1);
    const nut = t.querySelector(".toast-hoan-tac");
    assert.equal(nut.textContent, "Hoàn tác");
    nut.click();
    assert.equal(n, 1);
    assert.equal(toasts().length, 0, "bấm Hoàn tác thì thông báo mất ngay");
    nut.click();
    assert.equal(n, 1, "bấm lần hai không gọi lại");
    mock.timers.tick(1);
  });

  it("nút đóng gỡ ngay", () => {
    hienBaoNgan("x");
    dom.document.querySelector(".toast-dong").click();
    assert.equal(toasts().length, 0);
  });

  it("trần 3 cái", () => {
    for (const c of ["a", "b", "c", "d"]) hienBaoNgan(c);
    assert.equal(toasts().length, 3);
  });

  it("Bảng tin: liên kết, giữ 6 giây", () => {
    hienThongBao({ cau: "Đơn mới", lienKet: "/orders" } as never);
    const t = dom.document.querySelector(".toast");
    assert.equal(t.tag, "a");
    assert.equal(t.getAttribute("href"), "/orders");
    mock.timers.tick(5999);
    assert.equal(toasts().length, 1);
    mock.timers.tick(1);
    assert.equal(toasts().length, 0);
  });
});
