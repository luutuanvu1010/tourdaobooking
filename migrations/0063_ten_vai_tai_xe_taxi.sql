-- Migration 0063 — ADR-0083 điều 3 (accepted 2026-10-01): đổi CHỮ tên vai TAXI_DRIVER "Tài xế taxi" → "Tài xế taxi (giới thiệu khách)" để khỏi nhầm với
-- vai "Tài xế đối tác" (người lái chuyến). Chỉ đổi chữ: mã vai, nhóm, thứ tự, bộ quyền mặc định (PARTNER, ở src/shared/roles.ts) giữ nguyên; không đổi quyền,
-- vai, hồ sơ của ai. src/roles-schema.test.ts giữ tên ở đây khớp ROLES. Đảo ngược: một UPDATE trả lại tên cũ.
-- Số 0063: 0061 (worktree-dac-ta-2fa) và 0062 (tro-ly-tim-theo-nghia) đã có nhánh khác giữ — soát mọi nhánh cục bộ 2026-10-01.
UPDATE pty_role_type SET name = 'Tài xế taxi (giới thiệu khách)' WHERE code = 'TAXI_DRIVER';
