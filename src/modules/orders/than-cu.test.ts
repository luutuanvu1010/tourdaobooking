import { test } from "node:test";
import assert from "node:assert/strict";
import { laThanDonCu, laThanTripCu } from "./than-cu.ts";
import { newManualDraft, toServiceInput } from "../../shared/service-form.ts";
import { emptyTrip, tripPayload } from "../../shared/trip-form.ts";

const svcCu = { kind: "catalog", catalogCode: "ZA1", pax: { adult: 1 }, departDate: "2026-10-10", pickupTime: "07:00", pickupPlace: "Khách sạn A" };

test("thân đơn cũ: có dịch vụ thiếu khoá legs (kể cả không có pickupTime) → cũ; mọi dịch vụ có legs → không", () => {
  assert.equal(laThanDonCu({ services: [svcCu] }), true);
  const { pickupTime: _a, pickupPlace: _b, ...khongGio } = svcCu;
  assert.equal(laThanDonCu({ services: [khongGio] }), true);
  assert.equal(laThanDonCu({ services: [{ ...khongGio, legs: [] }, khongGio] }), true);
  assert.equal(laThanDonCu({ services: [{ ...khongGio, legs: [] }] }), false);
  for (const rac of [null, undefined, "x", 1, [], {}, { services: "x" }, { services: [null, 1] }]) assert.equal(laThanDonCu(rac), false, JSON.stringify(rac));
});

test("thân PUT /trip cũ: dịch vụ có khoá pickupTime HOẶC pickupPlace (kể cả rỗng) → cũ", () => {
  const base = { id: "s1", departDate: "2026-10-10", departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [{ ...base, pickupTime: "" }] }), true);
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [{ ...base, pickupPlace: "A" }] }), true);
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [base] }), false);
  for (const rac of [null, {}, { services: {} }]) assert.equal(laThanTripCu(rac), false);
});

test("Review Focus 2: thân do giao diện HIỆN TẠI dựng (toServiceInput, tripPayload) KHÔNG bị nhận là cũ", () => {
  const d = newManualDraft("k1");
  const tripCoGio = { ...emptyTrip(), departDate: "2026-10-10", pickupTime: "07:00", pickupPlace: "Khách sạn A" };
  assert.equal(laThanDonCu({ services: [toServiceInput({ ...d, trip: tripCoGio })] }), false);
  assert.equal(laThanTripCu(tripPayload([{ id: "s1", trip: tripCoGio }], "2026-10-01T00:00:00.000Z")), false);
});
