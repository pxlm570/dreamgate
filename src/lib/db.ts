/**
 * IndexedDB 存储层（基于 idb 库）
 * 数据库 'dreamgate-db' v1，3 个 object store：dreams / meta / inspirations
 * 对应 spec 附录 A 数据模型。
 */
import { openDB as openIDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Dream, Meta, Inspiration } from './types';

interface DreamGateDB extends DBSchema {
  dreams: {
    key: string;
    value: Dream;
    indexes: { 'by-createdAt': number };
  };
  meta: {
    key: string;
    value: Meta;
  };
  inspirations: {
    key: string;
    value: Inspiration;
  };
}

const DB_NAME = 'dreamgate-db';
const DB_VERSION = 1;
const META_KEY = 'meta';

let dbPromise: Promise<IDBPDatabase<DreamGateDB>> | null = null;

/** 打开/创建数据库 'dreamgate-db' v1，3 个 object store */
export function openDB(): Promise<IDBPDatabase<DreamGateDB>> {
  if (!dbPromise) {
    dbPromise = openIDB<DreamGateDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dreams')) {
          const dreams = db.createObjectStore('dreams', { keyPath: 'id' });
          dreams.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('meta')) {
          // 单条 meta 记录，key 固定为 'meta'
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('inspirations')) {
          db.createObjectStore('inspirations', { keyPath: 'dreamId' });
        }
      },
    }).catch((err) => {
      // 打开失败（隐私模式禁用 IndexedDB / 配额 / Safari ITP）：不缓存 rejected promise，
      // 置空以便下次重试，并抛出交由调用方降级处理（否则会永久卡在加载态白屏）。
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** 别名（与 spec 命名兼容） */
export const openDreamDB = openDB;

/** 关闭数据库（主要用于测试） */
export function closeDreamDB(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
    dbPromise = null;
  }
}

// ────────────────────────────── dreams CRUD ──────────────────────────────

/** 新增梦境（id 已存在则覆盖） */
export async function addDream(dream: Dream): Promise<string> {
  const db = await openDreamDB();
  await db.put('dreams', dream);
  return dream.id;
}

/** 获取单条梦境 */
export async function getDream(id: string): Promise<Dream | undefined> {
  const db = await openDreamDB();
  return db.get('dreams', id);
}

/** 获取全部梦境（按 createdAt 升序） */
export async function getAllDreams(): Promise<Dream[]> {
  const db = await openDreamDB();
  const all = await db.getAllFromIndex('dreams', 'by-createdAt');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** 更新梦境（需含 id） */
export async function updateDream(dream: Dream): Promise<string> {
  const db = await openDreamDB();
  await db.put('dreams', dream);
  return dream.id;
}

/** 删除单条梦境 */
export async function deleteDream(id: string): Promise<void> {
  const db = await openDreamDB();
  await db.delete('dreams', id);
}

/** 清空全部梦境 */
export async function clearAllDreams(): Promise<void> {
  const db = await openDB();
  await db.clear('dreams');
}

/** 别名（与 spec 命名兼容）：清空全部梦境 */
export const clearAll = clearAllDreams;

// ────────────────────────────── meta ──────────────────────────────

/** 读取 meta（无则返回 undefined） */
export async function getMeta(): Promise<Meta | undefined> {
  const db = await openDreamDB();
  return db.get('meta', META_KEY);
}

/** 写入/覆盖 meta（单条） */
export async function setMeta(meta: Meta): Promise<void> {
  const db = await openDreamDB();
  await db.put('meta', meta, META_KEY);
}

// ────────────────────────────── inspirations (P1) ──────────────────────────────

/** 加入灵感（dreamId 为主键，重复则覆盖） */
export async function addInspiration(inspiration: Inspiration): Promise<string> {
  const db = await openDreamDB();
  await db.put('inspirations', inspiration);
  return inspiration.dreamId;
}

/** 获取全部灵感（按 addedAt 升序） */
export async function getAllInspirations(): Promise<Inspiration[]> {
  const db = await openDreamDB();
  const all = await db.getAll('inspirations');
  return all.sort((a, b) => a.addedAt - b.addedAt);
}

/** 移除单条灵感 */
export async function removeInspiration(dreamId: string): Promise<void> {
  const db = await openDreamDB();
  await db.delete('inspirations', dreamId);
}
