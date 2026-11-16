// Dấu xác minh của hồ sơ (ADR-0210 Đ3, Đ4; đợt 1 Task 12): «Đã xác minh» (dấu tích xanh), «Chưa xác minh» (vòng xám), «Cần xác minh lại» (dấu chấm than vàng) — chữ nguyên văn trang trình lượt B.
// Máy chủ tính trạng thái (giao diện KHÔNG tự tính); null = không hiện dấu (khách lẻ, chưa có hồ sơ). Chỉ để biết, không chặn việc gì. Tệp nhỏ, không import bộ biểu tượng
// (trang Quản lý tài khoản, Danh bạ, Tôi đều nhúng): hình vẽ bằng ba đường SVG riêng. `den` (tuỳ chọn) = nơi bấm dấu dẫn tới (Đ4: chính chủ → chỗ bổ sung).
import { TEN_DAU_XAC_MINH, type DauXacMinh } from "../src/shared/dau-xac-minh";
import { h } from "./dom";

const NS = "http://www.w3.org/2000/svg";
const TONG: Record<DauXacMinh, string> = { DA: "la", CHUA: "xam", CAN_LAI: "cat" };
const HINH: Record<DauXacMinh, string[]> = { DA: ["M5 12l5 5 9-10"], CHUA: ["M12 4a8 8 0 1 0 0.01 0"], CAN_LAI: ["M12 4l9 16H3L12 4z", "M12 10v4M12 17v.01"] };

function hinh(d: DauXacMinh): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  for (const p of HINH[d]) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", p);
    svg.append(path);
  }
  return svg;
}

export function dauXacMinh(d: DauXacMinh | null | undefined, den?: string): HTMLElement | null {
  if (!d) return null;
  const noi = [hinh(d), TEN_DAU_XAC_MINH[d]];
  const thuoc = { class: "huy-hieu dau-xm", "data-tong": TONG[d], "data-dau-xac-minh": d };
  return den ? h("a", { ...thuoc, href: den }, ...noi) : h("span", thuoc, ...noi);
}
