export const SCHEMA_VERSION = 2;

export async function getLocalDb(): Promise<never> {
  throw new Error("Local SQLite is not available on web");
}

export async function getMeta(_key: string): Promise<string | null> {
  return null;
}

export async function setMeta(_key: string, _value: string): Promise<void> {}

export async function clearLocalData(): Promise<void> {}
