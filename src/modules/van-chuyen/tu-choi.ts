// LỆNH TỪ CHỐI CHUYẾN của tài xế (ADR-0053 D8.3, D8.4; kế hoạch A4 T7, G-A4-24, G-A4-25). Tệp riêng (không gộp vào dieu-phoi-lenh.ts) để lệnh mới không
// chen vào tệp nhiều việc đang sửa song song. Route (`index.ts`) đã kiểm ô, đang lái, thân, lệnh lặp; hàm này kiểm lý do, đọc hạn, dựng lô (dieu-phoi.ts —
// `loTuChoi`), chạy, và khi câu cổng thua thì ĐỌC LẠI để trả đúng 409 (G-A4-25) thay cho `stale` chung chung.
import type { StaffProfile } from "../../shared/contracts";
import { error } from "../../shared/http";
import { lyDoDangDung } from "./chuyen-repo";
import { loTuChoi } from "./dieu-phoi";
import { docNen, type NenChuyen } from "./dieu-phoi-doc";
import { CHUYEN_CU, chayLo } from "./dieu-phoi-route";
import type { TuChoiThan } from "./dieu-phoi-than";
import { hanTuChoiCuaCap } from "./han-tu-choi-repo";
import { CAU_QUA_HAN_TU_CHOI } from "./rules";

const KHONG_CON_KE_HOACH = () => error(409, "trip_not_planned", "Chuyến đã xuất bến, kết thúc hoặc bị huỷ.");
const QUA_HAN = () => error(409, "refuse_deadline_passed", CAU_QUA_HAN_TU_CHOI);

/**
 * G-A4-25: phân loại lý do không Từ chối được, theo thứ tự (a) chuyến không còn PLANNED; (b) người gọi không còn dòng lái mở → stale; (c) quá hạn (hoặc thiếu
 * dòng hạn — đóng mặc định); (d) còn lại → stale. `null` = đủ điều kiện.
 */
async function lyDoKhongDuoc(db: D1Database, n: NenChuyen | null, partyId: string, bayGioMs: number): Promise<Response | null> {
  if (!n || n.trip.status !== "PLANNED") return KHONG_CON_KE_HOACH();
  if (n.trip.driver_party_id !== partyId) return CHUYEN_CU();
  const han = await hanTuChoiCuaCap(db, n.trip.id, partyId);
  if (han === null || bayGioMs > han) return QUA_HAN(); // G-A4-1: Từ chối được khi bayGio ≤ hạn
  return null;
}

/** `staff.partyId` = hồ sơ tài xế ĐANG LÁI (route đã kiểm `dangLai`). Trả `Response` khi từ chối, `null` khi đã ghi. */
export async function lenhTuChoi(db: D1Database, nen: NenChuyen, b: TuChoiThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const partyId = staff.partyId ?? "";
  const lyDo = (await lyDoDangDung(db)).find((r) => r.code === b.lyDo && r.reason_group === "TU_CHOI_CHUYEN");
  if (!lyDo) return error(400, "invalid_input", "Lý do từ chối không có trong danh mục.");
  const chan = await lyDoKhongDuoc(db, nen, partyId, bayGioMs);
  if (chan) return chan;
  const lo = loTuChoi(db, {
    cmd: crypto.randomUUID(), requestId: b.requestId, lucIso: new Date(bayGioMs).toISOString(), nguoiId: staff.id,
    tripId: t.id, version: t.version, taiXePartyId: partyId, lyDo: b.lyDo, bayGioMs,
    detail: `${t.code}: tài xế từ chối chuyến — ${b.lyDo}`, // G-A4-20: mã chuyến + mã lý do (không tên, không chữ tự do)
  });
  const r = await chayLo(db, lo, b.requestId);
  if (r.ok) return null;
  // Câu cổng thua (đua với văn phòng đổi tài xế / dời giờ, hoặc vừa qua hạn) → đọc lại, trả đúng 409; không phân loại được → stale.
  if (r.res.status === 409 && ((await r.res.clone().json()) as { error?: { code?: string } }).error?.code === "stale") {
    return (await lyDoKhongDuoc(db, await docNen(db, t.id), partyId, bayGioMs)) ?? CHUYEN_CU();
  }
  return r.res;
}
