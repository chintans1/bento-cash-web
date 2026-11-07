import {
  parseAppleCardPdfLines,
  type AppleCardFile,
} from "./apple-card-import";

export async function parseAppleCardPdf(file: File): Promise<AppleCardFile> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  const lines: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pieces = content.items
        .filter(
          (item): item is Extract<typeof item, { str: string }> => "str" in item
        )
        .filter((item) => item.str.trim())
        .map((item) => ({
          x: item.transform[4],
          y: item.transform[5],
          text: item.str.trim(),
        }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const grouped: { y: number; parts: typeof pieces }[] = [];
      for (const piece of pieces) {
        const line = grouped.find(
          (candidate) => Math.abs(candidate.y - piece.y) < 2.5
        );
        if (line) line.parts.push(piece);
        else grouped.push({ y: piece.y, parts: [piece] });
      }
      for (const line of grouped.sort((a, b) => b.y - a.y)) {
        lines.push(
          line.parts
            .sort((a, b) => a.x - b.x)
            .map((part) => part.text)
            .join(" ")
        );
      }
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return parseAppleCardPdfLines(lines);
}
