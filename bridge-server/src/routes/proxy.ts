import { Router, type Request, type Response, type Router as RouterType } from 'express';

const router: RouterType = Router();

// Figma's manifest only allows the plugin to reach http://localhost:4001, and widening
// `allowedDomains` to "*" would put a "can access any URL" warning on the Community listing. So
// remote image fetches are proxied here instead: the plugin asks the local server, the server makes
// the outbound request. See docs/community-build.md.

const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

// Block anything that is not a plain http(s) URL, and refuse to fetch back into the local network.
// A plugin command carries a caller-supplied URL, so this endpoint must not become an SSRF hop.
function rejectionReason(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'Not a valid absolute URL';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `Unsupported protocol "${url.protocol}" — only http and https are proxied`;
  }

  const host = url.hostname.toLowerCase();
  const isLoopback =
    host === 'localhost' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host);
  const isPrivate =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith('.internal') ||
    host.endsWith('.local');

  if (isLoopback || isPrivate) {
    return 'Refusing to proxy a request to a loopback or private-network address';
  }

  return null;
}

// GET /proxy?url=... — fetch a remote asset on the plugin's behalf and stream the bytes back.
router.get('/', async (req: Request, res: Response) => {
  const raw = typeof req.query.url === 'string' ? req.query.url : '';

  if (!raw) {
    res.status(400).json({ error: 'Missing required query parameter: url' });
    return;
  }

  const reason = rejectionReason(raw);
  if (reason) {
    res.status(400).json({ error: reason });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(raw, { signal: controller.signal, redirect: 'follow' });

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream responded ${upstream.status} ${upstream.statusText}` });
      return;
    }

    const declared = Number(upstream.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) {
      res.status(413).json({ error: `Asset is ${declared} bytes, over the ${MAX_BYTES} byte limit` });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      res.status(413).json({ error: `Asset is ${buffer.byteLength} bytes, over the ${MAX_BYTES} byte limit` });
      return;
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.send(buffer);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error('[Proxy] Error fetching', raw, error);
    res
      .status(aborted ? 504 : 502)
      .json({ error: aborted ? `Upstream timed out after ${TIMEOUT_MS}ms` : 'Failed to fetch the asset' });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
