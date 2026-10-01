// Lịch sử MẪU ĐƯA ĐÓN của một dịch vụ ở màn Danh mục (bản vẽ M7 — docs/design/2026-10-01-dua-don-hanh-khach/; ADR-0054 D10.1, ADR-0076). Luật thuần,
// dùng ở web/catalog.ts. Máy chủ (`GET/POST /api/van-chuyen/mau-chang/:code`) trả các BẢN, mới nhất trước; "cũ" của một bản = bản kế tiếp (cũ hơn); bản cũ
// nhất so với "chưa cài" = Không đưa đón (route: hienHanh null = không đưa đón). Câu ví dụ của bản vẽ: "Một chiều → Hai chiều, giờ về 16:30",
// "Không đưa đón → Một chiều, nơi trả gợi ý Ga cáp treo Vinpearl". Ca bản vẽ không vẽ (chỉ đổi giờ, bỏ giờ / nơi trả, điểm đã ngưng, lưu y nguyên) là giả
// định bề mặt — ghi ở docs/superpowers/plans/2026-10-01-danh-muc-dua-don-canh-bao-xep-nhat-ky.md.
import type { MauChangBanDto } from "./contracts.ts";
import { CHE_DO_DUA_DON, type CheDoDuaDon } from "./chang-mac-dinh.ts";
import { tenNguoiGhi } from "./lich-su-nhom.ts";

/** Nhãn chip ở danh sách dịch vụ: mã vắng trong mẫu hiện hành = Không đưa đón. */
export const nhanCheDoCua = (mode: CheDoDuaDon | undefined): string => CHE_DO_DUA_DON[mode ?? "NONE"];

/** ISO UTC → "dd/mm/yyyy hh:mm" giờ Việt Nam (cột "Lúc" của bản vẽ: "30/09/2026 09:12"). */
export function lucLichSuMauChang(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const p = (t: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
}

const CHUA_CAI: Pick<MauChangBanDto, "mode" | "returnTimeHint" | "noiTraMacDinh"> = { mode: "NONE", returnTimeHint: null, noiTraMacDinh: null };
const tenDiem = (d: NonNullable<MauChangBanDto["noiTraMacDinh"]>): string => (d.dangDung ? d.ten : `${d.ten} (điểm đã ngưng dùng)`);

/** Câu "Cũ → mới" của một bản so với bản trước nó. Tắt đưa đón: chỉ nêu chế độ (giờ về, nơi trả mất theo). */
function cauDoi(moi: MauChangBanDto, cu: Pick<MauChangBanDto, "mode" | "returnTimeHint" | "noiTraMacDinh">): string {
  const phan: string[] = [];
  const doiCheDo = cu.mode !== moi.mode;
  if (doiCheDo) phan.push(`${CHE_DO_DUA_DON[cu.mode]} → ${CHE_DO_DUA_DON[moi.mode]}`);
  if (moi.mode !== "NONE") {
    if (cu.returnTimeHint !== moi.returnTimeHint) {
      if (moi.returnTimeHint === null) {
        if (!doiCheDo && cu.returnTimeHint !== null) phan.push(`bỏ giờ về ${cu.returnTimeHint}`);
      } else phan.push(!doiCheDo && cu.returnTimeHint !== null ? `giờ về ${cu.returnTimeHint} → ${moi.returnTimeHint}` : `giờ về ${moi.returnTimeHint}`);
    }
    const a = cu.noiTraMacDinh;
    const b = moi.noiTraMacDinh;
    if ((a?.id ?? null) !== (b?.id ?? null)) {
      if (b) phan.push(a ? `nơi trả gợi ý ${tenDiem(a)} → ${tenDiem(b)}` : `nơi trả gợi ý ${tenDiem(b)}`);
      else if (a) phan.push(`bỏ nơi trả gợi ý ${tenDiem(a)}`);
    }
  }
  const cau = phan.length > 0 ? phan.join(", ") : "lưu lại, không đổi";
  return cau.charAt(0).toUpperCase() + cau.slice(1);
}

/**
 * Dòng lịch sử (mới nhất trước): "Lúc" + "Người đổi" + "Cũ → mới". Người đổi ghép từ `createdBy` (id tài khoản) qua danh sách tài khoản (`GET /api/staff`)
 * — cùng luật lịch sử nhóm (`tenNguoiGhi`). Chưa tải được danh sách → Map rỗng → "Người dùng cũ".
 */
export function dongLichSuMauChang(lichSu: readonly MauChangBanDto[], tenNguoi: ReadonlyMap<string, string> = new Map()): { luc: string; ai: string; doi: string }[] {
  return lichSu.map((b, i) => ({ luc: lucLichSuMauChang(b.tuLuc), ai: tenNguoiGhi(b.createdBy, tenNguoi), doi: cauDoi(b, lichSu[i + 1] ?? CHUA_CAI) }));
}
