import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(here, "xiaohongshu-post.html");
const output = path.join(here, "output");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
await mkdir(output, { recursive: true });

const names = ["封面", "痛点", "演示", "功能", "互动尾页"];
for (let index = 0; index < names.length; index += 1) {
  const card = `card${index + 1}`;
  const destination = path.join(output, `${index + 1}-${names[index]}.png`);
  const result = spawnSync(chrome, [
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--force-device-scale-factor=2",
    "--window-size=750,1000",
    `--screenshot=${destination}`,
    `${pathToFileURL(html).href}?card=${card}`,
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Could not export ${card}`);
  }
}

console.log(`Exported ${names.length} cards to ${output}`);
