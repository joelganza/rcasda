import { createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Downloads a file with resume support. The connection to GitHub's raw host can
 * drop on slow links, so a truncated body is retried with a Range request until
 * the file reaches the expected byte length.
 */
export async function download(
  url: string,
  destination: string,
  expectedBytes: number,
  attempts = 12,
): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const current = await stat(destination).catch(() => null);
    const start = current?.size ?? 0;
    if (start >= expectedBytes) return;

    const headers: Record<string, string> = {};
    if (start > 0) headers.Range = `bytes=${start}-`;

    console.log(
      `  download ${url.split("/").pop()} — attempt ${attempt}, ${start}/${expectedBytes} bytes`,
    );

    try {
      const response = await fetch(url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const temporary = `${destination}.part`;
      const sink = createWriteStream(temporary, { flags: "w" });
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        if (!sink.write(Buffer.from(chunk))) {
          await new Promise<void>((resolve) => sink.once("drain", () => resolve()));
        }
      }
      await new Promise<void>((resolve, reject) => {
        sink.end(() => resolve());
        sink.on("error", reject);
      });
      await rename(temporary, destination);
    } catch (error) {
      console.warn(`  interrupted: ${(error as Error).message}`);
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500 * attempt));
    }
  }

  const finalSize = (await stat(destination).catch(() => null))?.size ?? 0;
  if (finalSize < expectedBytes) {
    throw new Error(
      `Could not download ${url} completely (${finalSize}/${expectedBytes} bytes).`,
    );
  }
}
