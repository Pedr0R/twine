import { Injectable } from '@angular/core';
import { HttpRequestConfig } from './request.service';

// ── Internal models ─────────────────────────────────────────────────────────

export interface AuthConfig {
  authType: 'none' | 'bearer' | 'basic' | 'apiKey' | 'inherit';
  authActive: boolean;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyAddTo?: 'header' | 'query';
}

export interface CollectionRequest {
  id: string;
  name: string;
  description: string;
  config: HttpRequestConfig;
  auth: AuthConfig;
  timestamp: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  requests: CollectionRequest[];
  folders: CollectionFolder[];
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: CollectionRequest[];
  folders: CollectionFolder[];
}

// ── Hoppscotch schema types (for import/export) ──────────────────────────────

interface HoppHeader {
  key: string;
  value: string;
  active: boolean;
  description: string;
}

interface HoppParam {
  key: string;
  value: string;
  active: boolean;
  description: string;
}

interface HoppAuth {
  authType: string;
  authActive: boolean;
  token?: string;         // bearer
  username?: string;      // basic
  password?: string;      // basic
  key?: string;           // apiKey
  value?: string;         // apiKey
  addTo?: string;         // apiKey
}

interface HoppBody {
  contentType: string | null;
  body: string | any[] | null;
}

interface HoppRequest {
  v: string;
  name: string;
  method: string;
  endpoint: string;
  params: HoppParam[];
  headers: HoppHeader[];
  preRequestScript: string;
  testScript: string;
  auth: HoppAuth;
  body: HoppBody;
  requestVariables: any[];
  responses: Record<string, any>;
  description: string | null;
}

interface HoppFolder {
  v: number;
  id?: string;
  name: string;
  folders: HoppFolder[];
  requests: HoppRequest[];
  auth?: HoppAuth;
  headers?: HoppHeader[];
}

interface HoppCollection {
  v: number;
  id?: string;
  name: string;
  folders: HoppFolder[];
  requests: HoppRequest[];
  auth?: HoppAuth;
  headers?: HoppHeader[];
}

// ── Conversion helpers ────────────────────────────────────────────────────────

function toHoppRequest(req: CollectionRequest): HoppRequest {
  const cfg = req.config;
  const auth = req.auth ?? { authType: 'none', authActive: false };

  // Build headers array from record
  const headers: HoppHeader[] = Object.entries(cfg.headers ?? {}).map(([key, value]) => ({
    key,
    value,
    active: true,
    description: ''
  }));

  // Build body
  let hoppBody: HoppBody = { contentType: null, body: null };
  if (cfg.body) {
    hoppBody = { contentType: 'application/json', body: cfg.body };
  } else if (cfg.formDataPayload && Object.keys(cfg.formDataPayload).length > 0) {
    hoppBody = {
      contentType: 'multipart/form-data',
      body: Object.entries(cfg.formDataPayload).map(([key, value]) => ({
        key, value, active: true, isFile: false
      }))
    };
  }

  // Build Hopp auth
  let hoppAuth: HoppAuth = { authType: 'none', authActive: false };
  switch (auth.authType) {
    case 'bearer':
      hoppAuth = { authType: 'bearer', authActive: auth.authActive, token: auth.bearerToken ?? '' };
      break;
    case 'basic':
      hoppAuth = {
        authType: 'basic', authActive: auth.authActive,
        username: auth.basicUsername ?? '', password: auth.basicPassword ?? ''
      };
      break;
    case 'apiKey':
      hoppAuth = {
        authType: 'api-key', authActive: auth.authActive,
        key: auth.apiKeyName ?? '', value: auth.apiKeyValue ?? '',
        addTo: auth.apiKeyAddTo === 'query' ? 'QUERY_PARAMS' : 'HEADERS'
      };
      break;
    case 'inherit':
      hoppAuth = { authType: 'inherit', authActive: true };
      break;
    default:
      hoppAuth = { authType: 'none', authActive: false };
  }

  return {
    v: '17',
    name: req.name,
    method: cfg.method,
    endpoint: cfg.url,
    params: [],
    headers,
    preRequestScript: '',
    testScript: '',
    auth: hoppAuth,
    body: hoppBody,
    requestVariables: [],
    responses: {},
    description: req.description || null
  };
}

function fromHoppRequest(hopp: HoppRequest): CollectionRequest {
  // Headers → record
  const headers: Record<string, string> = {};
  (hopp.headers ?? []).filter(h => h.active).forEach(h => {
    headers[h.key] = h.value;
  });

  // Body
  let body: string | undefined;
  let formDataPayload: Record<string, string> | undefined;

  const ct = hopp.body?.contentType ?? '';
  const rawBody = hopp.body?.body;

  if (ct === 'application/json' && typeof rawBody === 'string') {
    body = rawBody;
  } else if (ct === 'application/x-www-form-urlencoded' && typeof rawBody === 'string') {
    body = rawBody;
  } else if (ct === 'multipart/form-data' && Array.isArray(rawBody)) {
    formDataPayload = {};
    (rawBody as any[]).forEach((item: any) => {
      if (item.key) formDataPayload![item.key] = item.value ?? '';
    });
  } else if (typeof rawBody === 'string' && rawBody) {
    body = rawBody;
  }

  // Auth
  let auth: AuthConfig = { authType: 'none', authActive: false };
  const ha = hopp.auth ?? {};
  switch (ha.authType) {
    case 'bearer':
      auth = { authType: 'bearer', authActive: ha.authActive ?? true, bearerToken: ha.token ?? '' };
      break;
    case 'basic':
      auth = {
        authType: 'basic', authActive: ha.authActive ?? true,
        basicUsername: ha.username ?? '', basicPassword: ha.password ?? ''
      };
      break;
    case 'api-key':
    case 'apiKey':
      auth = {
        authType: 'apiKey', authActive: ha.authActive ?? true,
        apiKeyName: ha.key ?? '', apiKeyValue: ha.value ?? '',
        apiKeyAddTo: ha.addTo === 'QUERY_PARAMS' ? 'query' : 'header'
      };
      break;
    case 'inherit':
      auth = { authType: 'inherit', authActive: true };
      break;
    default:
      auth = { authType: 'none', authActive: false };
  }

  const config: HttpRequestConfig = {
    url: hopp.endpoint ?? '',
    method: hopp.method ?? 'GET',
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(formDataPayload ? { formDataPayload } : {})
  };

  return {
    id: crypto.randomUUID(),
    name: hopp.name ?? 'Untitled Request',
    description: hopp.description ?? '',
    config,
    auth,
    timestamp: Date.now()
  };
}

function toHoppFolder(folder: CollectionFolder): HoppFolder {
  return {
    v: 1,
    id: folder.id,
    name: folder.name,
    folders: (folder.folders ?? []).map(toHoppFolder),
    requests: (folder.requests ?? []).map(toHoppRequest),
    auth: { authType: 'inherit', authActive: true },
    headers: []
  };
}

function fromHoppFolder(hf: HoppFolder): CollectionFolder {
  return {
    id: crypto.randomUUID(),
    name: hf.name ?? 'Untitled Folder',
    requests: (hf.requests ?? []).map(fromHoppRequest),
    folders: (hf.folders ?? []).map(fromHoppFolder)
  };
}

function toHoppCollection(col: Collection): HoppCollection {
  return {
    v: 11,
    id: col.id,
    name: col.name,
    folders: (col.folders ?? []).map(toHoppFolder),
    requests: col.requests.map(toHoppRequest),
    auth: { authType: 'inherit', authActive: true },
    headers: []
  };
}

function fromHoppCollection(raw: HoppCollection): Collection {
  return {
    id: crypto.randomUUID(),
    name: raw.name ?? 'Imported Collection',
    description: '',
    createdAt: Date.now(),
    folders: (raw.folders ?? []).map(fromHoppFolder),
    requests: (raw.requests ?? []).map(fromHoppRequest)
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private readonly STORAGE_KEY = 'twine_collections_v1';

  constructor() {}

  // ── Read ───────────────────────────────────────────────────────────────────

  getCollections(): Collection[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return [];
  }

  // ── Collection CRUD ────────────────────────────────────────────────────────

  addCollection(name: string, description: string): Collection {
    const collections = this.getCollections();
    const newCol: Collection = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: Date.now(),
      requests: [],
      folders: []
    };
    collections.unshift(newCol);
    this.save(collections);
    return newCol;
  }

  updateCollection(id: string, name: string, description: string): void {
    const collections = this.getCollections();
    const col = collections.find(c => c.id === id);
    if (col) {
      col.name = name;
      col.description = description;
      this.save(collections);
    }
  }

  deleteCollection(id: string): void {
    const collections = this.getCollections().filter(c => c.id !== id);
    this.save(collections);
  }

  // ── Request CRUD ───────────────────────────────────────────────────────────

  addRequestToCollection(
    collectionId: string,
    name: string,
    description: string,
    config: HttpRequestConfig,
    auth?: AuthConfig
  ): CollectionRequest | null {
    const collections = this.getCollections();
    const col = collections.find(c => c.id === collectionId);
    if (!col) return null;

    const newReq: CollectionRequest = {
      id: crypto.randomUUID(),
      name,
      description,
      config: JSON.parse(JSON.stringify(config)),
      auth: auth ?? { authType: 'none', authActive: false },
      timestamp: Date.now()
    };
    col.requests.unshift(newReq);
    this.save(collections);
    return newReq;
  }

  updateRequest(
    collectionId: string,
    requestId: string,
    name: string,
    description: string,
    config?: HttpRequestConfig,
    auth?: AuthConfig
  ): void {
    const collections = this.getCollections();
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const req = col.requests.find(r => r.id === requestId);
    if (!req) return;
    req.name = name;
    req.description = description;
    if (config) req.config = JSON.parse(JSON.stringify(config));
    if (auth) req.auth = auth;
    this.save(collections);
  }

  removeRequestFromCollection(collectionId: string, requestId: string): void {
    const collections = this.getCollections();
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    col.requests = col.requests.filter(r => r.id !== requestId);
    this.save(collections);
  }

  // ── Export / Import (Hoppscotch-compatible) ────────────────────────────────

  /**
   * Exports a single collection as a Hoppscotch-compatible JSON file.
   */
  exportCollection(id: string): void {
    const col = this.getCollections().find(c => c.id === id);
    if (!col) return;

    const hopp = toHoppCollection(col);
    const json = JSON.stringify(hopp, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-${col.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports ALL collections as a Hoppscotch-compatible JSON array.
   */
  exportAllCollections(): void {
    const collections = this.getCollections();
    const hopp = collections.map(toHoppCollection);
    const json = JSON.stringify(hopp, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twine-collections.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse raw JSON text (Hoppscotch format) and merge into existing collections.
   * Accepts: a single collection object, or an array of collections.
   * Returns the imported collections or throws on parse/validation error.
   */
  importFromJson(jsonText: string): Collection[] {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('Invalid JSON file');
    }

    // Accept single object or array
    const raw: any[] = Array.isArray(parsed) ? parsed : [parsed];

    const imported: Collection[] = raw.map(item => {
      // Validate minimum fields
      if (!item.name) {
        throw new Error('Invalid collection format — missing "name" field');
      }

      // Detect Hoppscotch format (has "requests" and/or "folders" array, or "v" field)
      if ('v' in item || 'endpoint' in (item.requests?.[0] ?? {})) {
        return fromHoppCollection(item as HoppCollection);
      }

      // Legacy Twine format fallback
      return {
        id: crypto.randomUUID(),
        name: item.name,
        description: item.description ?? '',
        createdAt: item.createdAt ?? Date.now(),
        folders: [],
        requests: (Array.isArray(item.requests) ? item.requests : []).map((r: any) => ({
          id: crypto.randomUUID(),
          name: r.name ?? 'Untitled Request',
          description: r.description ?? '',
          config: r.config ?? { method: 'GET', url: '' },
          auth: r.auth ?? { authType: 'none', authActive: false },
          timestamp: r.timestamp ?? Date.now()
        }))
      } as Collection;
    });

    const collections = this.getCollections();
    const merged = [...imported, ...collections];
    this.save(merged);
    return imported;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private save(collections: Collection[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(collections));
  }
}
