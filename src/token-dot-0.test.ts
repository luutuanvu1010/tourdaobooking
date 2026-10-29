// Đợt 0 khung chung, Task 1 (đặc tả 2026-10-28 mục 4): token mở rộng (MỚI), giá trị đã duyệt đổi (ĐỔI), token cũ giữ nguyên (GIU),
// năm luật z-index cứng đổi sang token lớp xếp, ba luật ô chọn / công tắc đổi sang token màu mới.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("\n}", css.indexOf(":root")));
const tokens = new Map([...root.matchAll(/\n\s*(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const));
const dauMoc = css.indexOf("/* ---------- app iPhone (PWA)");
const sauMoc = css.slice(dauMoc);

const MOI: Record<string, string> = {
  "--h-control": "44px", "--h-control-lon": "52px",
  "--z-dinh": "10", "--z-tab": "20", "--z-truot": "30", "--z-phu": "40", "--z-tren-cung": "50",
  "--t-nhanh": "150ms", "--t-vua": "200ms", "--bo-control": "var(--radius-sm)", "--w-noi-dung-max": "1280px",
  "--w-ngan-chi-tiet": "360px", "--w-cot-phai": "340px", "--w-thiet-lap-max": "900px", "--w-tim-thanh-tren": "280px", "--w-tim-thanh-tren-min": "160px",
  "--h-tab-gach": "3px", "--w-tab-mo-mep": "32px", "--h-dai-tren": "44px",
  "--c-mat-mang-bg": "var(--c-sand-soft)", "--c-check-border": "var(--c-text-muted)", "--c-switch-off-bg": "var(--c-input-border-hover)", "--c-toast-bg": "var(--c-primary-strong)", "--c-hoan-tac": "var(--c-sand)",
  "--pad-nut": "16px", "--pad-o": "12px", "--pad-chip": "12px", "--pad-tab": "16px", "--pad-huy-hieu-doc": "3px", "--pad-huy-hieu-ngang": "8px", "--pad-huy-hieu-bt": "6px",
  "--pad-the": "16px", "--pad-the-rong": "24px", "--le-trang": "16px", "--le-trang-rong": "32px", "--nhip-khoi": "24px", "--h-o-nhieu-dong": "96px", "--vanh-cach": "2px",
  "--skel-dong": "16px", "--skel-so": "26px", "--skel-vien": "96px", "--vong-trang-thai": "56px",
};
const DOI: Record<string, string> = {
  "--focus-ring": "3px", "--fs-field": "max(16px, var(--fs-step-5))", "--fs-h1": "var(--fs-step-11)", "--fs-h2": "var(--fs-step-7)",
  "--fw-heading": "600", "--fw-bold": "600", "--fw-heavy": "600", "--fw-semibold": "500", "--w-main": "var(--w-noi-dung-max)",
  "--tap-min": "var(--h-control)", "--counter-btn": "var(--h-control)",
  "--h-field": "var(--h-control-lon)", "--h-field-wide": "var(--h-control-lon)", "--search-h": "var(--h-control-lon)", "--h-hdv-btn": "var(--h-control-lon)",
  "--skel-md": "var(--skel-dong)", "--skel-num": "var(--skel-so)", "--skel-pill": "var(--skel-vien)",
  "--z-ntf": "var(--z-phu)", "--z-tl-khung": "var(--z-phu)",
};
const GIU: Record<string, string> = { "--h-hdv-act": "48px", "--row-h": "48px", "--h-dp-tab": "40px", "--m-fast": "180ms", "--m-base": "300ms", "--skel-money-mt": "96px" };

const soKhop = (bang: Record<string, string>): void => {
  for (const [ten, gt] of Object.entries(bang)) assert.equal(tokens.get(ten), gt, `${ten} phải là ${gt}`);
};

test("token MỚI và ĐỔI đúng giá trị thô", () => { soKhop(MOI); soKhop(DOI); });
test("token cũ giá trị khác (GIU) giữ nguyên", () => { soKhop(GIU); });

// Luật sau dấu mốc PWA có thân (không chứa "}") khớp mẫu.
const coLuat = (chon: string, mau: RegExp): boolean => {
  const re = new RegExp(`${chon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`, "g");
  return [...sauMoc.matchAll(re)].some((m) => mau.test(m[1]!));
};

test("năm luật z-index dùng token lớp xếp; sau dấu mốc PWA còn đúng 15 số cứng", () => {
  assert.ok(dauMoc > 0);
  assert.ok(coLuat("#topbar", /z-index:\s*var\(--z-dinh\)/), "#topbar");
  assert.ok(coLuat("#tabbar", /z-index:\s*var\(--z-tab\)/), "#tabbar");
  assert.ok(coLuat(".sheet-root", /z-index:\s*var\(--z-truot\)/), ".sheet-root");
  assert.ok(coLuat(".toast-vung", /z-index:\s*var\(--z-tren-cung\)/), ".toast-vung");
  assert.ok(coLuat(".maint-screen", /z-index:\s*var\(--z-tren-cung\)/), ".maint-screen");
  assert.equal((sauMoc.match(/z-index:\s*\d+/g) ?? []).length, 15);
});

test("ô chọn và công tắc dùng token màu mới", () => {
  assert.ok(coLuat(".vc-radio-dot", /var\(--c-check-border\)/), ".vc-radio-dot");
  assert.ok(coLuat(".dp-switch", /background:\s*var\(--c-switch-off-bg\)/), ".dp-switch");
  assert.ok(coLuat('.dd-switch-o .dp-switch:not([aria-checked="true"])', /var\(--c-switch-off-bg\)/), ".dd-switch-o .dp-switch");
  assert.ok(coLuat(".pick-mark", /var\(--c-text-muted\)/), ".pick-mark");
});
