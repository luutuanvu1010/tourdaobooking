// Lý do Từ chối đơn (ADR-0030 điều 2) — danh sách ĐÓNG, mã là HỢP ĐỒNG với ADR-0032 (dòng REFUSE của `dsp_release_event` lưu đúng mã này — kế hoạch
// 2026-10-20 mục 3b). Đổi mã = đổi hợp đồng: bài này khoá cả mã, nhãn và thứ tự.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_TU_CHOI, docLyDoTuChoi, nhanLyDoTuChoi } from "./ly-do-tu-choi.ts";

test("LY_DO_TU_CHOI: đúng bốn mục, đúng thứ tự, mã và nhãn nguyên văn ADR-0030 điều 2", () => {
  assert.deepEqual(
    LY_DO_TU_CHOI.map((l) => [l.ma, l.nhan]),
    [
      ["BAN_LICH", "Bận lịch khác"],
      ["OM_VIEC_RIENG", "Ốm / việc riêng"],
      ["KHONG_PHU_HOP", "Không phù hợp tuyến/dịch vụ"],
      ["OTHER", "Khác"],
    ],
  );
});

test("docLyDoTuChoi: mỗi mã hợp lệ → ok, trả mã và nhãn", () => {
  for (const l of LY_DO_TU_CHOI) {
    assert.deepEqual(docLyDoTuChoi({ lyDo: l.ma }), { ok: true, ma: l.ma, nhan: l.nhan });
  }
  assert.equal(nhanLyDoTuChoi("BAN_LICH"), "Bận lịch khác");
});

test("docLyDoTuChoi: thiếu / mã lạ / không phải chuỗi / thân không phải đối tượng → lỗi, câu báo liệt kê bốn nhãn", () => {
  const sai: unknown[] = [null, {}, { lyDo: "" }, { lyDo: "ban_lich" }, { lyDo: "KHAC" }, { lyDo: 1 }, { lyDo: ["BAN_LICH"] }, { lyDo: null }];
  for (const body of sai) {
    const r = docLyDoTuChoi(body as Record<string, unknown> | null);
    assert.equal(r.ok, false, JSON.stringify(body));
    if (!r.ok) for (const l of LY_DO_TU_CHOI) assert.ok(r.message.includes(l.nhan), `câu báo thiếu "${l.nhan}"`);
  }
});

test("docLyDoTuChoi: KHÔNG có ô chữ — mọi khoá khác ngoài lyDo (kể cả với «Khác») → lỗi", () => {
  for (const extra of ["ghiChu", "note", "reason", "lyDoKhac"]) {
    for (const ma of ["OTHER", "BAN_LICH"]) {
      const r = docLyDoTuChoi({ lyDo: ma, [extra]: "bận" });
      assert.equal(r.ok, false, `${ma} + ${extra}`);
    }
  }
});

test("docLyDoTuChoi: không nhận mã kế thừa từ Object.prototype", () => {
  assert.equal(docLyDoTuChoi({ lyDo: "toString" }).ok, false);
  assert.equal(docLyDoTuChoi({ lyDo: "__proto__" }).ok, false);
});
