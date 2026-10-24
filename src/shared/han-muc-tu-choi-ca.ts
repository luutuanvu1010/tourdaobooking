// BỘ CA CHUNG của luật đếm «Từ chối» (ADR-0032 điều 3, 4; kế hoạch 2026-10-23 mục 3d) — CHỈ DỮ LIỆU, không luật. Hai bài cùng chạy bộ ca này:
// `src/shared/han-muc-tu-choi.test.ts` (bản thuần `demTuChoi`) và `src/modules/dispatch/han-muc-sql.test.ts` (bản SQL `dem_tu_choi` / `dem_theo_nguoi` trên
// SQLite thật) — hai bản không được lệch nhau. Mỗi ca: sự kiện CỦA MỘT NGƯỜI theo thứ tự chèn (seq = vị trí + 1), đơn đang Từ chối X, đầu tuần, kết quả mong đợi.
import type { LoaiSuKien } from "./han-muc-tu-choi.ts";

export interface CaDem {
  ten: string;
  /** [loại, đơn (null chỉ ở RESET), lúc ISO UTC] theo thứ tự xảy ra. */
  suKien: readonly (readonly [LoaiSuKien, string | null, string])[];
  /** Đơn đang Từ chối (null = bảng tổng của văn phòng — không loại đơn nào). */
  x: string | null;
  dauTuan: string;
  mong: { chuoi: number; tuan: number };
}

/** Thứ Hai 19/10/2026 00:00 giờ VN = Chủ nhật 18/10 17:00Z. */
export const DAU_TUAN = "2026-10-18T17:00:00.000Z";
/** Thứ Hai tuần sau (26/10/2026 00:00 giờ VN). */
export const DAU_TUAN_SAU = "2026-10-25T17:00:00.000Z";
const t = (phut: number): string => new Date(Date.parse("2026-10-20T01:00:00.000Z") + phut * 60_000).toISOString();

/** 15 lần Từ chối trong tuần, mỗi lần xen một đơn nhận và GIỮ (K_i) — chuỗi luôn ≤ 1; rồi nhận đơn Z (đơn đang Từ chối). */
const MUOI_LAM: CaDem["suKien"] = [
  ...Array.from({ length: 15 }, (_, i) => [
    ["CLAIM", `K${i}`, t(i * 3)],
    ["CLAIM", `A${i}`, t(i * 3 + 1)],
    ["REFUSE", `A${i}`, t(i * 3 + 2)],
  ] as const).flat(),
  ["CLAIM", "Z", t(100)],
];

export const CA_DEM: readonly CaDem[] = [
  {
    ten: "1. nhận A–từ chối A, nhận B–từ chối B, nhận C → chuỗi(C) = 2 (chặn ở mặc định 2)",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["CLAIM", "C", t(4)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 2, tuan: 2 },
  },
  {
    ten: "2. có K nhận và giữ nằm giữa (A, K, B) → chuỗi(C) = 1",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "K", t(2)], ["CLAIM", "B", t(3)], ["REFUSE", "B", t(4)], ["CLAIM", "C", t(5)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 2 },
  },
  {
    ten: "2b. K được GIAO (ASSIGN) và giữ nằm giữa → cũng là mốc",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["ASSIGN", "K", t(2)], ["CLAIM", "B", t(3)], ["REFUSE", "B", t(4)], ["CLAIM", "C", t(5)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 2 },
  },
  {
    ten: "3. đã từ chối 2, được Giao Y và giữ → chuỗi(Z) = 0",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["ASSIGN", "Y", t(4)], ["CLAIM", "Z", t(5)]],
    x: "Z", dauTuan: DAU_TUAN, mong: { chuoi: 0, tuan: 2 },
  },
  {
    ten: "4a. đã từ chối 2, được Giao Y rồi từ chối Y → đơn kế tiếp Z: chuỗi = 3",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["ASSIGN", "Y", t(4)], ["REFUSE", "Y", t(5)], ["CLAIM", "Z", t(6)]],
    x: "Z", dauTuan: DAU_TUAN, mong: { chuoi: 3, tuan: 3 },
  },
  {
    ten: "4b. đã từ chối 2, được Giao Y, đang Từ chối CHÍNH Y → ASSIGN của Y không là mốc → chuỗi(Y) = 2",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["ASSIGN", "Y", t(4)]],
    x: "Y", dauTuan: DAU_TUAN, mong: { chuoi: 2, tuan: 2 },
  },
  {
    ten: "4c. cùng dữ liệu 4b nhưng bảng tổng (X = null) → ASSIGN của Y (đang giữ) là mốc → chuỗi = 0",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["ASSIGN", "Y", t(4)]],
    x: null, dauTuan: DAU_TUAN, mong: { chuoi: 0, tuan: 2 },
  },
  {
    ten: "5. đệm K rồi Huỷ K (ABORT) → K mất tư cách mốc → chuỗi(C) = 2",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "K", t(2)], ["ABORT", "K", t(3)], ["CLAIM", "B", t(4)], ["REFUSE", "B", t(5)], ["CLAIM", "C", t(6)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 2, tuan: 2 },
  },
  {
    ten: "5b. Huỷ (ABORT) không tính vào chuỗi / tuần",
    suKien: [["CLAIM", "A", t(0)], ["ABORT", "A", t(1)], ["CLAIM", "B", t(2)], ["ABORT", "B", t(3)], ["CLAIM", "C", t(4)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 0, tuan: 0 },
  },
  {
    ten: "5c. nhận lại CHÍNH đơn K sau khi đã Từ chối K và giữ → lần nhận sau là mốc",
    suKien: [["CLAIM", "K", t(0)], ["REFUSE", "K", t(1)], ["CLAIM", "A", t(2)], ["REFUSE", "A", t(3)], ["CLAIM", "K", t(4)], ["CLAIM", "C", t(5)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 0, tuan: 2 },
  },
  {
    ten: "6. RESET sau hai lần → chuỗi = 0, tuần chỉ đếm sau RESET",
    suKien: [["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "B", t(2)], ["REFUSE", "B", t(3)], ["RESET", null, t(4)], ["CLAIM", "D", t(5)], ["REFUSE", "D", t(6)], ["CLAIM", "C", t(7)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 1 },
  },
  {
    ten: "6b. RESET của tuần TRƯỚC không cắt gì thêm trong tuần này",
    suKien: [["RESET", null, "2026-10-10T01:00:00.000Z"], ["CLAIM", "A", t(0)], ["REFUSE", "A", t(1)], ["CLAIM", "C", t(2)]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 1 },
  },
  {
    ten: "7. 15 lần Từ chối trong tuần, xen đủ đơn giữ → tuần = 15 (lần 16 chặn ở mặc định 15), chuỗi = 1",
    suKien: MUOI_LAM, x: "Z", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 15 },
  },
  {
    ten: "7b. cùng dữ liệu, đầu tuần = thứ Hai tuần sau → tuần = 0",
    suKien: MUOI_LAM, x: "Z", dauTuan: DAU_TUAN_SAU, mong: { chuoi: 1, tuan: 0 },
  },
  {
    ten: "8. ranh giới tuần: …T16:59:59.999Z Chủ nhật (23:59:59.999 giờ VN) thuộc tuần cũ; …T17:00:00.000Z thuộc tuần mới",
    suKien: [["CLAIM", "A", "2026-10-18T16:00:00.000Z"], ["REFUSE", "A", "2026-10-18T16:59:59.999Z"], ["CLAIM", "K", "2026-10-18T16:59:59.999Z"], ["CLAIM", "B", "2026-10-18T16:59:59.999Z"], ["REFUSE", "B", "2026-10-18T17:00:00.000Z"], ["CLAIM", "C", "2026-10-18T17:00:00.000Z"]],
    x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 1, tuan: 1 },
  },
  {
    ten: "9. chưa có sự kiện nào → 0 / 0",
    suKien: [], x: "C", dauTuan: DAU_TUAN, mong: { chuoi: 0, tuan: 0 },
  },
];
