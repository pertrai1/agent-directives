import { createHash } from 'node:crypto';

const UINT32_BYTES = 4;

/** Hashes a sorted file tree with unambiguous length-prefixed framing. */
export function hashEntries(entries: Array<{ path: string; contents: Buffer }>): string {
  const digest = createHash('sha256');
  for (const entry of entries) {
    const path = Buffer.from(entry.path);
    const pathLength = Buffer.allocUnsafe(UINT32_BYTES);
    const contentLength = Buffer.allocUnsafe(UINT32_BYTES);
    pathLength.writeUInt32BE(path.length);
    contentLength.writeUInt32BE(entry.contents.length);
    digest.update(pathLength);
    digest.update(path);
    digest.update(contentLength);
    digest.update(entry.contents);
  }
  return digest.digest('hex');
}
