import * as FileSystem from 'expo-file-system/legacy';
import { unzipSync, strFromU8 } from 'fflate';

export interface EpubMetadata {
  title: string;
  author: string | null;
  coverBase64: string | null;
}

/**
 * Parse EPUB metadata from a local file URI.
 * Supports EPUB2 (<meta name="cover">) and EPUB3 (properties="cover-image").
 */
export async function parseEpubMetadata(fileUri: string): Promise<EpubMetadata> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  let unzipped: ReturnType<typeof unzipSync>;
  try {
    unzipped = unzipSync(binary);
  } catch {
    return fallbackMeta();
  }

  // Locate content.opf
  const opfPath = findOpfPath(unzipped);
  if (!opfPath) return fallbackMeta();

  const opfXml = strFromU8(unzipped[opfPath]);
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const title = extractXmlTag(opfXml, 'dc:title') ?? 'Unknown Title';
  const author = extractXmlTag(opfXml, 'dc:creator');
  const coverBase64 = extractCover(unzipped, opfXml, opfDir);

  return { title, author, coverBase64 };
}

// ---------------------------------------------------------------------------
// OPF location
// ---------------------------------------------------------------------------

function findOpfPath(unzipped: ReturnType<typeof unzipSync>): string | null {
  // Try META-INF/container.xml first (spec-compliant)
  const containerKey = Object.keys(unzipped).find(
    (k) => k.toLowerCase() === 'meta-inf/container.xml',
  );
  if (containerKey) {
    const xml = strFromU8(unzipped[containerKey]);
    const m = xml.match(/full-path="([^"]+\.opf)"/i);
    if (m) return m[1];
  }
  // Fallback: any .opf file
  return Object.keys(unzipped).find((p) => p.endsWith('.opf')) ?? null;
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function extractXmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
  return m ? m[1].trim() : null;
}

/** Get value of any attribute on a tag (attribute order-independent). */
function getAttr(tag: string, attr: string): string | null {
  const m = tag.match(new RegExp(`${attr}="([^"]+)"`));
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Cover extraction
// ---------------------------------------------------------------------------

function extractCover(
  unzipped: ReturnType<typeof unzipSync>,
  opfXml: string,
  opfDir: string,
): string | null {
  const coverHref = findCoverHref(opfXml);
  if (!coverHref) return null;

  const bytes = resolveZipEntry(unzipped, opfDir, coverHref);
  if (!bytes) return null;

  const ext = coverHref.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const mime = mimeMap[ext] ?? 'image/jpeg';
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

function findCoverHref(opfXml: string): string | null {
  // Build id→href map for all manifest items
  const itemMap = new Map<string, string>();
  for (const m of opfXml.matchAll(/<item\s([^>]+)\/>/g)) {
    const tag = m[1];
    const id = getAttr(tag, 'id');
    const href = getAttr(tag, 'href');
    if (id && href) itemMap.set(id, href);
  }

  // EPUB3: properties="cover-image" (attribute order-insensitive)
  for (const m of opfXml.matchAll(/<item\s([^>]+)\/>/g)) {
    const tag = m[1];
    if (/properties="[^"]*cover-image[^"]*"/.test(tag)) {
      const href = getAttr(tag, 'href');
      if (href) return href;
    }
  }

  // EPUB2: <meta name="cover" content="cover-item-id"/>
  const metaCover = opfXml.match(/<meta\s[^>]*name="cover"[^>]*content="([^"]+)"/);
  if (metaCover) {
    const href = itemMap.get(metaCover[1]);
    if (href) return href;
  }
  // same tag, reversed attribute order
  const metaCover2 = opfXml.match(/<meta\s[^>]*content="([^"]+)"[^>]*name="cover"/);
  if (metaCover2) {
    const href = itemMap.get(metaCover2[1]);
    if (href) return href;
  }

  // id contains "cover" and media-type is image/*
  for (const m of opfXml.matchAll(/<item\s([^>]+)\/>/g)) {
    const tag = m[1];
    const id = getAttr(tag, 'id') ?? '';
    const mediaType = getAttr(tag, 'media-type') ?? '';
    if (/cover/i.test(id) && mediaType.startsWith('image/')) {
      const href = getAttr(tag, 'href');
      if (href) return href;
    }
  }

  // Last resort: first image in manifest
  for (const m of opfXml.matchAll(/<item\s([^>]+)\/>/g)) {
    const tag = m[1];
    const mediaType = getAttr(tag, 'media-type') ?? '';
    if (mediaType.startsWith('image/')) {
      const href = getAttr(tag, 'href');
      if (href) return href;
    }
  }

  return null;
}

/** Resolve a path relative to opfDir, then find it in the zip (case-insensitive). */
function resolveZipEntry(
  unzipped: ReturnType<typeof unzipSync>,
  opfDir: string,
  href: string,
): Uint8Array | null {
  // Normalize: join opfDir + href, collapse ../
  const raw = (opfDir + href).replace(/[^/]+\/\.\.\//g, '').replace(/^\//, '');
  const keys = Object.keys(unzipped);

  // Exact match
  if (unzipped[raw]) return unzipped[raw];

  // Case-insensitive match
  const lower = raw.toLowerCase();
  const found = keys.find((k) => k.toLowerCase() === lower);
  if (found) return unzipped[found];

  // basename match as last resort
  const base = href.split('/').pop()!.toLowerCase();
  const byBase = keys.find((k) => k.toLowerCase().endsWith('/' + base) || k.toLowerCase() === base);
  return byBase ? unzipped[byBase] : null;
}

// ---------------------------------------------------------------------------
// btoa for large Uint8Arrays (avoids max-call-stack on spread)
// ---------------------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fallbackMeta(): EpubMetadata {
  return { title: 'Unknown Title', author: null, coverBase64: null };
}
