// Sinh docs/DATA-DICTIONARY.md từ docs/data-dictionary.json. Dùng: npm run dict
import { readFileSync, writeFileSync } from "node:fs";
import { renderDictionaryMarkdown } from "./data-dictionary-lib.mjs";

const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8"));
writeFileSync(new URL("../docs/DATA-DICTIONARY.md", import.meta.url), renderDictionaryMarkdown(dict));
console.log("Đã ghi docs/DATA-DICTIONARY.md");
