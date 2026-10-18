// Thao tác THẬT qua CDP cho các kịch bản của đợt Tạo đơn thiết kế lại (18/10/2026): chạm (cảm ứng ở khổ điện thoại, chuột ở khổ máy tính), gõ chữ (`Input.insertText` — như
// bàn phím ảo chèn chữ, bắn beforeinput/input thật), phím thật. Không gọi `.click()` / `.value =` của JS: sự kiện đi qua trình duyệt như người dùng (blur, tiêu điểm, pointerdown…).
// Dùng chung: than-gui.mjs (CACH=noi), dua-don-mot-o-smoke.mjs, the-gap-smoke.mjs.
import { sleep } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

/** Chạm thật vào phần tử (biểu thức JS trả phần tử): cảm ứng ở `mobile`, chuột ở máy tính. `cuon` = cuộn phần tử vào giữa khung trước (tránh thanh dính che). */
export async function cham(p, mobile, sel, cuon = true) {
  if (cuon) {
    await p.ev(`(${sel}).scrollIntoView({ block: 'center' }); true`);
    await sleep(150);
  }
  const { x, y } = await p.ev(`(() => { const r = (${sel}).getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 48)), y: Math.round(r.top + Math.min(r.height / 2, 20)) }; })()`);
  if (mobile) {
    await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  await sleep(250);
}

/** Gõ chữ vào ô đang có tiêu điểm (chèn như bàn phím ảo). */
export async function goChu(p, chu) {
  await p.send("Input.insertText", { text: chu });
  await sleep(200);
}

const PHIM = {
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 },
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  " ": { key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " },
};
/** Bấm phím thật (keyDown + keyUp) vào phần tử đang có tiêu điểm. */
export async function phim(p, ten) {
  const k = PHIM[ten];
  if (!k) throw new Error(`phím chưa khai: ${ten}`);
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", ...k });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
  await sleep(200);
}

/** Danh sách gợi ý của ô nơi (bản MỘT ô, Task 7): biểu thức trả `<ul role=listbox>` mà ô `o` trỏ tới bằng aria-controls. */
export const dsCua = (o) => `document.getElementById((${o}).getAttribute('aria-controls'))`;
/** Biểu thức trả dòng gợi ý ĐANG HIỆN của ô `o` có chữ bắt đầu bằng `dau` (null = không có). */
export const dongCua = (o, dau) => `(() => { const ds = ${dsCua(o)}; if (!ds || ds.hidden) return null; return [...ds.querySelectorAll('[role=option]')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(dau)})) ?? null; })()`;

/**
 * Ô "Nơi đón" / "Nơi trả" bản MỘT ô: chạm ô → gõ `tim` (nếu có) → chờ dòng gợi ý bắt đầu bằng `dong` → chạm dòng đó; chờ danh sách đóng. `xoaTruoc` = chọn hết chữ đang có
 * trong ô trước khi gõ (sửa địa chỉ gõ tự do đã lưu).
 */
export async function chonNoiMotO(p, mobile, o, { tim = "", dong, xoaTruoc = false }) {
  await cham(p, mobile, o);
  await p.waitFor(`(() => { const ds = ${dsCua(o)}; return !!ds && !ds.hidden; })()`, `danh sách gợi ý mở sau khi chạm ô (${dong})`);
  if (xoaTruoc) await p.ev(`(${o}).select(); true`);
  if (tim) await goChu(p, tim);
  await p.waitFor(`!!${dongCua(o, dong)}`, `dòng gợi ý "${dong}"`);
  await cham(p, mobile, dongCua(o, dong));
  await p.waitFor(`(() => { const ds = ${dsCua(o)}; return !ds || ds.hidden; })()`, `danh sách đóng sau khi chọn "${dong}"`);
  await sleep(150);
}
