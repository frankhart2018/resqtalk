import type { ReadableBytesBuffer } from "../api/types";

export interface TextIteratorResponse {
  text: string;
  isFirstChunk: boolean;
}

export async function* textResponseIteratorCleaner(
  reader: ReadableBytesBuffer
): AsyncGenerator<TextIteratorResponse> {
  const decoder = new TextDecoder();
  let isFirstChunk = true;
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const data = extractData(line);
        if (data) {
          yield {
            text: data,
            isFirstChunk: isFirstChunk,
          };
          isFirstChunk = false;
        }
      }
    }

    const finalData = extractData(buffer);
    if (finalData) {
      yield {
        text: finalData,
        isFirstChunk: isFirstChunk,
      };
    }
  } catch (error) {
    console.error("Error in textResponseIterator:", error);
    throw error;
  }

  function extractData(line: string): string | null {
    if (line.startsWith("data: ")) {
      const data = line.substring(6);
      return data.trim() ? data : null;
    }
    return null;
  }
}
