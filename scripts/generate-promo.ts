import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  loadEnvFile,
  type CollectedDataFile,
  type QuizQuestionOutput,
} from "../lib/pipeline";

const DATA_DIR = join(import.meta.dirname, "..", "resources", "collected_data");
const PROMO_DIR = join(
  import.meta.dirname,
  "..",
  "resources",
  "promotion_images",
);

function latestFile(): string | null {
  try {
    if (!existsSync(DATA_DIR)) return null;
    const files = readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    return files[0] ?? null;
  } catch {
    return null;
  }
}

// ── args ──

async function main() {
  loadEnvFile();

  const fileArg = process.argv.findIndex((a) => a === "--file");
  const filename =
    fileArg !== -1 && fileArg + 1 < process.argv.length
      ? process.argv[fileArg + 1]
      : latestFile();

  if (!filename) {
    console.log("Usage:\n  pnpm generate-promo [--file <name>]");
    console.log(
      "\n  If --file is omitted, the latest file in resources/collected_data/ is used.",
    );
    process.exit(1);
  }

  const filePath = join(DATA_DIR, filename);

  if (!existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(
    await readFile(filePath, "utf-8"),
  ) as CollectedDataFile;
  if (!Array.isArray(data.quizQuestions) || data.quizQuestions.length === 0) {
    console.error("Error: file contains no quizQuestions");
    process.exit(1);
  }

  const topics = [...new Set(data.quizQuestions.map((q) => q.topic))];
  console.log(
    `\nLoaded "${filename}" — ${data.quizQuestions.length} questions, ${data.rawArticles.length} articles`,
  );
  console.log(`Topics: ${topics.join(", ")}`);

  const runId = filename.replace(/\.json$/, "");
  const outDir = join(PROMO_DIR, runId);

  const start = Date.now();
  console.log(`\nRendering to ${outDir}...\n`);

  const browser = await chromium.launch({ headless: true });
  let total = 0;

  for (let i = 0; i < data.quizQuestions.length; i++) {
    const q = data.quizQuestions[i];
    console.log(`[${i + 1}/${data.quizQuestions.length}] ${q.id}`);
    total += (await renderOne(browser, q, outDir)).length;
  }

  await browser.close();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone! ${total} images in ${elapsed}s → ${outDir}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

// ── renderer ──

const W = 1080;
const H = 1080;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ICON_SVG = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`;

const BG = `linear-gradient(90deg,rgba(31,27,24,.09) 1px,transparent 1px) 0 0 / 42px 42px,radial-gradient(circle at 12% 8%,#ff6b9c 0 9%,transparent 10%),radial-gradient(circle at 86% 18%,#38d9a9 0 8%,transparent 9%),#f7e14b`;

const SHARED_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800;900&family=Space+Grotesk:wght@700;800&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
html,body{display:grid;place-items:center;width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;color:#1f1b18;background:${BG}}
body{opacity:0}
body.fonts-loaded{opacity:1;transition:opacity .2s}
.card-wrap{display:flex;flex-direction:column;align-items:center}
.kicker{font-family:"Space Grotesk",sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.16em}
.hero-title-text{font-family:"Space Grotesk",sans-serif;font-weight:900;text-transform:uppercase;line-height:.9;text-shadow:5px 5px 0 #fff}
.tagline{font-weight:800;text-align:center}
.card{border:4px solid #1f1b18;border-radius:8px;background:#fffdf2;box-shadow:10px 10px 0 #1f1b18;width:100%}
.card-image{border-radius:6px;overflow:hidden;margin-bottom:20px}
.card-image img{display:block;width:100%;object-fit:cover;border:2px solid #1f1b18;border-radius:4px}
.option{padding:14px 18px;border:2px solid #1f1b18;border-radius:6px;background:#fff;font-weight:700}
.answer-highlight{padding:16px 20px;border:2px solid #1f1b18;border-radius:6px;background:#c3fae8;font-weight:800}
.summary{padding:18px;border:2px solid #1f1b18;border-radius:6px;background:#f1f3f5;font-weight:500}
.source-url{font-size:7px;color:#6b6b6b;word-break:break-all;margin-top:4px}
.masthead{font-family:"Space Grotesk",sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.16em}
.stamp{border:3px solid #c91a1a;color:#c91a1a;font-family:"Space Grotesk",sans-serif;font-weight:900;font-size:24px;text-transform:uppercase;padding:8px 16px;border-radius:4px;transform:rotate(-12deg);opacity:.85}
.option-num{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-weight:900;margin-right:10px;flex-shrink:0}
.card-image-overlay{position:relative;border-radius:6px;overflow:hidden;margin-bottom:20px}
.card-image-overlay img{display:block;width:100%;object-fit:cover}
.overlay-text{position:absolute;bottom:0;left:0;right:0;padding:28px 32px;background:linear-gradient(transparent,rgba(31,27,24,.85))}
.dossier-card{background:#fdfaf0;background-image:repeating-linear-gradient(-35deg,transparent,transparent 18px,rgba(201,26,26,.04) 18px,rgba(201,26,26,.04) 20px)}
`;

type Style = "classic" | "hero" | "splash" | "trivia" | "minimal" | "dossier";

const STYLES: Record<Style, string> = {
  classic: `
    .card-wrap{gap:20px;width:820px;padding:32px}.icon-wrap{color:#1f1b18}.kicker{font-size:32px}
    .hero-title-text{display:none}.tagline{display:none}.card{padding:40px}
    .prompt{font-size:36px;font-weight:900;line-height:1.15;margin-bottom:24px}
    .card-image img{max-height:280px}
    .options,.answer-block{gap:10px;display:flex;flex-direction:column}
    .option{font-size:20px}.answer-highlight{font-size:22px}.summary{font-size:18px}
  `,
  hero: `
    .card-wrap{gap:16px;width:880px;padding:28px 32px}.icon-wrap{color:#1f1b18}.kicker{font-size:28px}
    .hero-title-text{font-size:52px;margin-top:4px}.tagline{font-size:22px;margin-top:8px}
    .card{padding:38px;margin-top:8px}
    .prompt{font-size:34px;font-weight:900;line-height:1.15;margin-bottom:22px}
    .card-image img{max-height:260px}
    .options,.answer-block{gap:10px;display:flex;flex-direction:column}
    .option{font-size:19px}.answer-highlight{font-size:21px}.summary{font-size:17px}
  `,
  splash: `
    .card-wrap{gap:0;width:920px;padding:20px 32px 32px}
    .masthead{font-size:22px;margin-bottom:16px;align-self:flex-start}
    .hero-title-text{display:none}.tagline{display:none}.icon-wrap{display:none}.kicker{display:none}
    .card{border:3px solid #1f1b18;border-radius:8px;box-shadow:8px 8px 0 #1f1b18;padding:0;overflow:hidden}
    .card-image-overlay img{max-height:420px}
    .overlay-text .prompt{font-size:38px;font-weight:900;line-height:1.1;color:#fff;text-shadow:2px 2px 0 rgba(31,27,24,.5);margin-bottom:0}
    .prompt-plain{font-size:34px;font-weight:900;line-height:1.15;margin-bottom:22px;padding:36px 36px 0}
    .options-plain,.answer-block-plain{padding:0 36px 36px}
    .options,.answer-block{gap:8px;display:flex;flex-direction:column}
    .option{font-size:18px;padding:12px 16px}.answer-highlight{font-size:20px}.summary{font-size:17px}
  `,
  trivia: `
    .card-wrap{gap:18px;width:820px;padding:30px}
    .icon-wrap{color:#1f1b18}.kicker{font-size:28px}
    .hero-title-text{display:none}.tagline{display:none}
    .card{padding:38px}
    .prompt{font-size:34px;font-weight:900;line-height:1.15;margin-bottom:24px}
    .prompt::before{content:"? ";color:#ff6b9c}
    .card-image img{max-height:260px}
    .options,.answer-block{gap:8px;display:flex;flex-direction:column}
    .option{font-size:19px;padding:14px 18px;border-left-width:5px}
    .option:nth-child(1){border-left-color:#ff6b9c}
    .option:nth-child(2){border-left-color:#38d9a9}
    .option:nth-child(3){border-left-color:#f7e14b}
    .option:nth-child(4){border-left-color:#1f1b18}
    .answer-highlight{font-size:21px;border-left:5px solid #38d9a9}
    .summary{font-size:17px}
  `,
  minimal: `
    .card-wrap{gap:28px;width:760px;padding:40px}
    .icon-wrap{color:#1f1b18}.kicker{font-size:22px;align-self:flex-end}
    .hero-title-text{display:none}.tagline{display:none}
    .card{border:1px solid #e0ddd6;border-radius:6px;box-shadow:none;padding:48px 56px}
    .prompt{font-size:40px;font-weight:800;line-height:1.25;margin-bottom:32px;color:#2a2a2a}
    .card-image{border-radius:6px;overflow:hidden;margin-bottom:28px}
    .card-image img{max-height:320px;border:none;border-radius:6px}
    .options,.answer-block{gap:14px;display:flex;flex-direction:column}
    .option{font-size:18px;padding:16px 20px;border:1px solid #e0ddd6;font-weight:600}
    .answer-highlight{font-size:20px;border:1px solid #c3fae8}.summary{font-size:17px}
  `,
  dossier: `
    .card-wrap{gap:16px;width:860px;padding:28px}
    .icon-wrap{color:#1f1b18}.kicker{font-size:24px;align-self:flex-start}
    .hero-title-text{display:none}.tagline{display:none}
    .card{border:3px solid #1f1b18;border-radius:6px;box-shadow:6px 6px 0 #1f1b18;padding:40px}
    .dossier-card .prompt{font-size:32px;font-weight:900;line-height:1.2;margin-bottom:20px}
    .card-image img{max-height:250px}
    .options,.answer-block{gap:8px;display:flex;flex-direction:column}
    .option{font-size:18px;padding:12px 16px;font-family:"Courier New",monospace;border-style:dashed}
    .answer-highlight{font-size:20px;border-left:4px solid #c91a1a}
    .summary{font-size:17px}
  `,
};

function header(style: Style): string {
  switch (style) {
    case "hero":
      return `<div class="icon-wrap">${ICON_SVG(40)}</div>
<div class="kicker">Newser</div>
<div class="hero-title-text">Daily Briefing Brawl</div>
<div class="tagline">Five headlines enter. One reader leaves mildly informed and overconfident.</div>`;
    case "splash":
      return `<div class="masthead">Newser</div>`;
    case "minimal":
      return "";
    default:
      return `<div class="icon-wrap">${ICON_SVG(36)}</div>
<div class="kicker">Newser</div>`;
  }
}

function questionHtml(q: QuizQuestionOutput, style: Style): string {
  if (style === "splash") return splashQuestionHtml(q);
  if (style === "trivia") return triviaQuestionHtml(q);
  if (style === "dossier") return dossierQuestionHtml(q);

  const imgBlock = q.imageUrl
    ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>`
    : "";
  const opts = q.options
    .map((o, i) => `<div class="option">${"ABCD"[i]}. ${esc(o)}</div>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES[style]}</style></head><body>
<div class="card-wrap">${header(style)}<div class="card">${imgBlock}<div class="prompt">${esc(q.prompt)}</div><div class="options">${opts}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function splashQuestionHtml(q: QuizQuestionOutput): string {
  if (q.imageUrl) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.splash}</style></head><body>
<div class="card-wrap">${header("splash")}<div class="card"><div class="card-image-overlay"><img src="${esc(q.imageUrl)}" alt="" /><div class="overlay-text"><div class="prompt">${esc(q.prompt)}</div></div></div><div class="options-plain"><div class="options">${q.options.map((o, i) => `<div class="option">${"ABCD"[i]}. ${esc(o)}</div>`).join("")}</div></div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.splash}</style></head><body>
<div class="card-wrap">${header("splash")}<div class="card"><div class="prompt-plain">${esc(q.prompt)}</div><div class="options-plain"><div class="options">${q.options.map((o, i) => `<div class="option">${"ABCD"[i]}. ${esc(o)}</div>`).join("")}</div></div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function triviaQuestionHtml(q: QuizQuestionOutput): string {
  const nums = ["①", "②", "③", "④"];
  const imgBlock = q.imageUrl
    ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>`
    : "";
  const opts = q.options
    .map((o, i) => `<div class="option"><span class="option-num">${nums[i]}</span>${esc(o)}</div>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.trivia}</style></head><body>
<div class="card-wrap">${header("trivia")}<div class="card">${imgBlock}<div class="prompt">${esc(q.prompt)}</div><div class="options">${opts}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function dossierQuestionHtml(q: QuizQuestionOutput): string {
  const imgBlock = q.imageUrl
    ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>`
    : "";
  const opts = q.options
    .map((o, i) => `<div class="option">${"ABCD"[i]}. ${esc(o)}</div>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.dossier}</style></head><body>
<div class="card-wrap">${header("dossier")}<div class="card dossier-card"><div class="stamp">Confidential</div>${imgBlock}<div class="prompt">${esc(q.prompt)}</div><div class="options">${opts}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function answerHtml(q: QuizQuestionOutput, style: Style): string {
  if (style === "splash") return splashAnswerHtml(q);
  if (style === "trivia") return triviaAnswerHtml(q);
  if (style === "dossier") return dossierAnswerHtml(q);

  const imgBlock = q.imageUrl
    ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>`
    : "";
  const srcUrl = q.articleUrl
    ? `<div class="source-url">${esc(q.articleUrl)}</div>`
    : "";
  const imgUrl = q.imageUrl
    ? `<div class="source-url">${esc(q.imageUrl)}</div>`
    : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES[style]}</style></head><body>
<div class="card-wrap">${header(style)}<div class="card">${imgBlock}<div class="prompt">${esc(q.prompt)}</div>
<div class="answer-block"><div class="answer-highlight">${esc(q.options[q.correctAnswerIndex])}</div><div class="summary">${esc(q.summary)}</div>${srcUrl}${imgUrl}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function splashAnswerHtml(q: QuizQuestionOutput): string {
  const srcUrl = q.articleUrl ? `<div class="source-url">${esc(q.articleUrl)}</div>` : "";
  const imgUrl = q.imageUrl ? `<div class="source-url">${esc(q.imageUrl)}</div>` : "";

  if (q.imageUrl) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.splash}</style></head><body>
<div class="card-wrap">${header("splash")}<div class="card"><div class="card-image-overlay"><img src="${esc(q.imageUrl)}" alt="" /><div class="overlay-text"><div class="prompt">${esc(q.prompt)}</div></div></div><div class="answer-block-plain"><div class="answer-highlight">${esc(q.options[q.correctAnswerIndex])}</div><div class="summary">${esc(q.summary)}</div>${srcUrl}${imgUrl}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.splash}</style></head><body>
<div class="card-wrap">${header("splash")}<div class="card"><div class="prompt-plain">${esc(q.prompt)}</div><div class="answer-block-plain"><div class="answer-highlight">${esc(q.options[q.correctAnswerIndex])}</div><div class="summary">${esc(q.summary)}</div>${srcUrl}${imgUrl}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function triviaAnswerHtml(q: QuizQuestionOutput): string {
  const imgBlock = q.imageUrl ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>` : "";
  const srcUrl = q.articleUrl ? `<div class="source-url">${esc(q.articleUrl)}</div>` : "";
  const imgUrl = q.imageUrl ? `<div class="source-url">${esc(q.imageUrl)}</div>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.trivia}</style></head><body>
<div class="card-wrap">${header("trivia")}<div class="card">${imgBlock}<div class="prompt">${esc(q.prompt)}</div>
<div class="answer-block"><div class="answer-highlight">${esc(q.options[q.correctAnswerIndex])}</div><div class="summary">${esc(q.summary)}</div>${srcUrl}${imgUrl}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

function dossierAnswerHtml(q: QuizQuestionOutput): string {
  const imgBlock = q.imageUrl ? `<div class="card-image"><img src="${esc(q.imageUrl)}" alt="" /></div>` : "";
  const srcUrl = q.articleUrl ? `<div class="source-url">${esc(q.articleUrl)}</div>` : "";
  const imgUrl = q.imageUrl ? `<div class="source-url">${esc(q.imageUrl)}</div>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${SHARED_CSS}${STYLES.dossier}</style></head><body>
<div class="card-wrap">${header("dossier")}<div class="card dossier-card"><div class="stamp">Declassified</div>${imgBlock}<div class="prompt">${esc(q.prompt)}</div>
<div class="answer-block"><div class="answer-highlight">${esc(q.options[q.correctAnswerIndex])}</div><div class="summary">${esc(q.summary)}</div>${srcUrl}${imgUrl}</div></div></div>
<script>document.fonts.ready.then(function(){document.body.classList.add('fonts-loaded')})</script></body></html>`;
}

async function renderOne(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  question: QuizQuestionOutput,
  outputDir: string,
): Promise<string[]> {
  const styles: Style[] = ["classic", "hero", "splash", "trivia", "minimal", "dossier"];
  const paths: string[] = [];
  const qDir = join(outputDir, question.id);

  await mkdir(qDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const st of styles) {
    for (const variant of ["square", "answer"] as const) {
      const name = `${st}-${variant}`;
      const outPath = join(qDir, `${name}.png`);
      const html =
        variant === "square"
          ? questionHtml(question, st)
          : answerHtml(question, st);
      try {
        await page.setContent(html, { waitUntil: "networkidle" });
        await page.waitForSelector("body.fonts-loaded", { timeout: 10000 });
        await page.screenshot({ path: outPath, fullPage: true });
        paths.push(outPath);
        console.log(`    ${name}`);
      } catch (err: any) {
        console.error(`    Failed ${name}: ${err.message}`);
      }
    }
  }

  await context.close();
  return paths;
}
