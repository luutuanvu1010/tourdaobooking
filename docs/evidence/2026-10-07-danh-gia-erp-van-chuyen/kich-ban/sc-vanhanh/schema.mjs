import { openDb } from "../../../../../tests/audit/harness.mjs";
const db = openDb();
for (const t of ["vc_trip_event","vc_trip_stop","vc_trip_allocation","vc_trip","vc_dispatch_policy","lg_lan_gui","vc_trip_driver"]) {
  try { console.log(t, db.prepare(`PRAGMA table_info(${t})`).all().map(r=>r.name).join(",")); } catch(e) { console.log(t, "ERR", e.message); }
}
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'vc_%'").all().map(r=>r.name).join(","));
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%policy%' OR name LIKE '%chinh%')").all().map(r=>r.name).join(","));
