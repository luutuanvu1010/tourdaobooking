// Luật thuần ô «Vé do ai phát» (ADR-0175 Đ1.2, ADR-0230 Đ3): dòng riêng của dịch vụ thắng, không thì dòng của nhóm hiện tại, không thì vé hãng ngoài.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nguonVeCua, type NguonVe } from "./nguon-ve.ts";

const bang = (dv: [string, NguonVe][] = [], nhom: [string, NguonVe][] = []) => ({ nguonDichVu: new Map(dv), nguonNhom: new Map(nhom) });

test("nguonVeCua: không có dòng, hoặc dịch vụ nhập tay (mã null), là HANG_NGOAI; có dòng riêng thì theo dòng riêng", () => {
  assert.deepEqual(nguonVeCua("ZVD1", null, bang()), { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" });
  assert.deepEqual(nguonVeCua(null, "N1", bang([["ZVD1", "TOUR_DAO"]], [["N1", "TOUR_DAO"]])), { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" });
  assert.deepEqual(nguonVeCua("ZVD1", null, bang([["ZVD1", "TOUR_DAO"]])), { nguonVe: "TOUR_DAO", theo: "SERVICE" });
  assert.deepEqual(nguonVeCua("ZVD1", null, bang([["ZVD1", "HANG_NGOAI"]])), { nguonVe: "HANG_NGOAI", theo: "SERVICE" });
  assert.deepEqual(nguonVeCua("KHAC", null, bang([["ZVD1", "TOUR_DAO"]])), { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" });
});

test("nguonVeCua (ADR-0230 Đ3): không có dòng riêng thì theo nhóm hiện tại; dòng riêng thắng dòng nhóm; nhóm khác không áp", () => {
  assert.deepEqual(nguonVeCua("ZVD1", "N1", bang([], [["N1", "TOUR_DAO"]])), { nguonVe: "TOUR_DAO", theo: "GROUP" });
  assert.deepEqual(nguonVeCua("ZVD1", "N1", bang([["ZVD1", "HANG_NGOAI"]], [["N1", "TOUR_DAO"]])), { nguonVe: "HANG_NGOAI", theo: "SERVICE" });
  assert.deepEqual(nguonVeCua("ZVD1", "N1", bang([["ZVD1", "TOUR_DAO"]], [["N1", "HANG_NGOAI"]])), { nguonVe: "TOUR_DAO", theo: "SERVICE" });
  assert.deepEqual(nguonVeCua("ZVD1", "N2", bang([], [["N1", "TOUR_DAO"]])), { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" });
  assert.deepEqual(nguonVeCua("ZVD1", null, bang([], [["N1", "TOUR_DAO"]])), { nguonVe: "HANG_NGOAI", theo: "CHUA_KHAI" });
});
