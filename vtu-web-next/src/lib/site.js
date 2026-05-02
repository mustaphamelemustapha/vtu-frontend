function normalizeBase(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

const AXISVTU_CANONICAL_ORIGIN = 'https://axisvtu.com';

function isVercelHost(origin) {
  try {
    const host = new URL(String(origin || '')).hostname.toLowerCase();
    return host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function getSiteOrigin() {
  const env = normalizeBase(process.env.NEXT_PUBLIC_SITE_URL);
  const canonical = AXISVTU_CANONICAL_ORIGIN;
  const envResolved = env && !isVercelHost(env) ? env : canonical;

  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = String(window.location.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (isLocalHost) return window.location.origin;
    if (host.endsWith('.vercel.app')) return canonical;
    return envResolved || canonical;
  }

  return envResolved || canonical;
}

export function buildReferralUrl(code) {
  const value = String(code || '').trim();
  if (!value) return '';
  return `${getSiteOrigin()}/register?ref=${encodeURIComponent(value)}`;
}
