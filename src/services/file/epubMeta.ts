import * as FileSystem from 'expo-file-system';
import { unzipSync, strFromU8 } from 'fflate';

export interface EpubMetadata {
  title: string;
  author: string | null;
  coverBase64: string | null;
}

/**
 * Parse EPUB metadata from a local file URI.
 * Reads content.opf inside the zip to extract dc:title and dc:creator.
 */
export async function parseEpubMetadata(fileUri: string): Promise<EpubMetadata> {
  // Read file as base64, convert to Uint8Array for fflate
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

  // Locate content.opf (may be in a subdirectory)
  const opfPath = Object.keys(unzipped).find((p) => p.endsWith('.opf') || p === 'content.opf');
  if (!opfPath) return fallbackMeta();

  const opfXml = strFromU8(unzipped[opfPath]);

  const title = extractXmlTag(opfXml, 'dc:title') ?? 'Unknown Title';
  const author = extractXmlTag(opfXml, 'dc:creator');

  // Try to extract cover image (look for cover-image item)
  const coverBase64 = await extractCoverBase64(unzipped, opfXml);

  return { title, author, coverBase64 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
  return match ? match[1].trim() : null;
}

async function extractCoverBase64(
  unzipped: ReturnType<typeof unzipSync>,
  opfXml: string,
): Promise<string | null> {
  // Find item with properties="cover-image" or id="cover-image"
  const coverHref = extractCoverHref(opfXml);
  if (!coverHref) return null;

  // The cover path in zip may be relative to OPF location
  const coverKey = Object.keys(unzipped).find((p) => p.endsWith(coverHref));
  if (!coverKey) return null;

  const bytes = unzipped[coverKey];
  const ext = coverHref.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const mime = mimeMap[ext] ?? 'image/jpeg';

  const b64 = btoa(String.fromCharCode(...bytes));
  return `data:${mime};base64,${b64}`;
}

function extractCoverHref(opfXml: string): string | null {
  // <item ... properties="cover-image" ... href="images/cover.jpg" .../>
  const propertiesMatch = opfXml.match(/<item[^>]+properties="cover-image"[^>]+href="([^"]+)"/);
  if (propertiesMatch) return propertiesMatch[1];

  // Fallback: <item id="cover-image" ... href="..."/>
  const idMatch = opfXml.match(/<item[^>]+id="cover[^"]*"[^>]+href="([^"]+)"/);
  return idMatch ? idMatch[1] : null;
}

function fallbackMeta(): EpubMetadata {
  return { title: 'Unknown Title', author: null, coverBase64: null };
}
