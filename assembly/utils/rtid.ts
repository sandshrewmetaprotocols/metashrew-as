export function rtid<T>(v: T): u32 {
  return load<u32>(changetype<usize>(v) - 8);
}
