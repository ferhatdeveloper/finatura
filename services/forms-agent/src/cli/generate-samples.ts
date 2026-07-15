import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sampleAracKapora } from "../forms/arac-kapora/sample.js";
import { sampleYerGosterme } from "../forms/yer-gosterme/sample.js";
import { renderForm } from "../pdf/renderFormPdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../../output");

async function writeRendered(
  label: string,
  result: ReturnType<typeof renderForm>,
): Promise<void> {
  const target = path.join(outDir, result.fileName);
  if (typeof result.body === "string") {
    await writeFile(target, result.body, "utf8");
  } else {
    await writeFile(target, result.body);
  }
  console.log(`[ok] ${label} → ${target} (${result.mimeType})`);
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });

  await writeRendered(
    "yer-gosterme html",
    renderForm("yer_gosterme", sampleYerGosterme, { engine: "html" }),
  );
  await writeRendered(
    "yer-gosterme pdf stub",
    renderForm("yer_gosterme", sampleYerGosterme, { engine: "html-to-pdf-stub" }),
  );
  await writeRendered(
    "arac-kapora html",
    renderForm("arac_kapora", sampleAracKapora, { engine: "html" }),
  );
  await writeRendered(
    "arac-kapora pdfkit stub",
    renderForm("arac_kapora", sampleAracKapora, { engine: "pdfkit-stub" }),
  );

  console.log("\nÖrnekler hazır. HTML dosyalarını tarayıcıda açıp yazdır / PDF alabilirsiniz.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
