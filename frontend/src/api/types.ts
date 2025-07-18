export type ReadableBytesBuffer = ReadableStreamDefaultReader<
  Uint8Array<ArrayBufferLike>
>;
export type OptionalReadableBytesBuffer = ReadableBytesBuffer | undefined;
