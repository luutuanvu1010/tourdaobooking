// id hồ sơ `pty_party.id`: UUID, hoặc 'pty-<uuid staff>' của hồ sơ nhân sự do migration 0012 tạo.
// Thuần, một nguồn cho server ↔ web (CLAUDE.md §5): module `parties` tái xuất; luật thuần của `orders` và giao diện import thẳng từ đây.
export const PARTY_ID_RE = /^(?:pty-)?[0-9a-f-]{36}$/;
