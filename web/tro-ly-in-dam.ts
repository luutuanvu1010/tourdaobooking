// Câu trả lời của Mai → các nút DOM: đoạn trong cặp ** thành <strong>, còn lại là chữ thường (yêu cầu chủ 2026-10-01). Dựng bằng h(), không innerHTML;
// luật tách ở src/shared/in-dam.ts (thuần, có test) — ** lẻ hiện nguyên văn.
import { tachInDam } from "../src/shared/in-dam";
import { h, type Child } from "./dom";

export const chuInDam = (chu: string): Child[] => tachInDam(chu).map((d) => (d.dam ? h("strong", null, d.chu) : d.chu));
