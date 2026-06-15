// Uniform bucketing for concept artifacts. MUST be identical in the build
// pipeline and the client so a concept's bucket is computed the same way on
// both sides. FNV-1a (32-bit) gives an even spread across buckets — unlike
// `BigInt(id) % n`, which clusters badly on structured SNOMED SCTIDs.
export function bucketOf(id: string, n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % n;
}
