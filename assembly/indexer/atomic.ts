import { IndexPointer } from "./tables";

export class AtomicTransaction {
  temp: Map<ArrayBuffer, ArrayBuffer>;
  saved: Map<ArrayBuffer, ArrayBuffer>;

  constructor() {
    this.temp = new Map<ArrayBuffer, ArrayBuffer>();
    this.saved = new Map<ArrayBuffer, ArrayBuffer>();
  }

  checkpoint(): void {
    const keys = this.temp.keys();
    for (let i = 0; i < keys.length; i++) {
      this.saved.set(keys[i], this.temp.get(keys[i]));
    }
  }

  commit(): void {
    const keys = this.saved.keys();
    for (let i = 0; i < keys.length; i++) {
      IndexPointer.wrap(keys[i]).set(this.saved.get(keys[i]));
    }

    this.saved.clear();
  }

  rollback(): void {
    this.temp.clear();
  }

  set(key: ArrayBuffer, value: ArrayBuffer): void {
    this.temp.set(key, value);
  }

  get(key: ArrayBuffer): ArrayBuffer {
    if (this.temp.has(key)) {
      return this.temp.get(key);
    }
    return changetype<ArrayBuffer>(0);
  }

  setValue<T>(key: ArrayBuffer, value: T): void {
    const container = new ArrayBuffer(sizeof<T>());
    store<T>(changetype<usize>(container), bswap<T>(value));
    this.set(key, container);
  }

  getValue<T>(key: ArrayBuffer): T {
    const value = this.get(key);
    let container: T = changetype<T>(0);
    memory.copy(
      changetype<usize>(container),
      changetype<usize>(value),
      sizeof<T>(),
    );
    return container;
  }

  setKeyword(key: string, value: ArrayBuffer): void {
    const container = String.UTF8.encode(key);
    this.set(container, value);
  }

  getKeyword(key: string): ArrayBuffer {
    const container = String.UTF8.encode(key);
    return this.get(container);
  }
  nullify(key: ArrayBuffer): void {
    this.set(key, new ArrayBuffer(0));
  }
  rollbackKey(key: ArrayBuffer): void {
    if (this.temp.has(key)) this.temp.delete(key);
  }
  nullifyIndexPointerList(ptr: IndexPointer): void {
    for (let i = 0; i < ptr.length(); i++) {
      this.nullify(ptr.selectIndex(i).unwrap());
    }
    this.nullify(ptr.lengthKey().unwrap());
  }
  extendIndexPointerList(ptr: IndexPointer): ArrayBuffer {
    let length: u32;
    const lengthKey = ptr.lengthKey();
    if (this.temp.has(lengthKey.unwrap())) {
      length = this.getValue<u32>(lengthKey.unwrap());
    } else {
      length = lengthKey.getValue<u32>();
    }
    this.setValue<u32>(lengthKey.unwrap(), length + 1);
    return ptr.selectIndex(length).unwrap();
  }
  appendIndexPointerList(ptr: IndexPointer, value: ArrayBuffer): void {
    this.set(this.extendIndexPointerList(ptr), value);
  }
}
