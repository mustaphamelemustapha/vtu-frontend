import Link from 'next/link';

export const metadata = {
  title: 'MELE DATA | Developer API Documentation',
  description: 'Integrate mobile airtime, data, and utility payments into your application with our high-speed API.',
};

export default function DevDocs() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-white hover:text-orange-500 transition-colors">
            MELE DATA <span className="text-orange-500">API</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 px-3">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-full py-2 px-4 transition-all">
              Apply for API Access
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center lg:text-left max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Expose MELE DATA to your applications
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            A secure, simple, and high-performance REST API to automate airtime topups, data bundles distribution, and wallet management on your own platform.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* Docs Section */}
          <div className="space-y-12">
            {/* Auth */}
            <section id="authentication">
              <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Authentication</h2>
              <p className="mt-3 text-slate-400 text-sm leading-6">
                All API requests require a Secret Key passed in the HTTP headers. You must first apply to be a developer from your dashboard, generate keys, and use the key pair as shown below:
              </p>
              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                Authorization: Bearer MELE_SEC_YOUR_SECRET_KEY
              </div>
            </section>

            {/* Base URL */}
            <section id="base-url">
              <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Base URL</h2>
              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-orange-400">
                https://meledata.ng/api/v1/developer
              </div>
            </section>

            {/* Endpoints Details */}
            <section id="endpoints" className="space-y-8">
              <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Endpoints</h2>

              {/* Balance */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded">GET</span>
                  <span className="font-mono text-sm text-slate-200">/wallet/balance</span>
                </div>
                <p className="text-slate-400 text-sm">Retrieve your developer wallet balance instantly.</p>
              </div>

              {/* Data Purchase */}
              <div className="space-y-3 pt-4 border-t border-slate-900">
                <div className="flex items-center gap-3">
                  <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-2 py-1 rounded">POST</span>
                  <span className="font-mono text-sm text-slate-200">/data/purchase</span>
                </div>
                <p className="text-slate-400 text-sm">Purchase a mobile data plan. Idempotency is enforced using your custom reference.</p>
              </div>

              {/* Airtime Purchase */}
              <div className="space-y-3 pt-4 border-t border-slate-900">
                <div className="flex items-center gap-3">
                  <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-2 py-1 rounded">POST</span>
                  <span className="font-mono text-sm text-slate-200">/airtime/purchase</span>
                </div>
                <p className="text-slate-400 text-sm">Purchase airtime topups for any recipient phone number.</p>
              </div>
            </section>
          </div>

          {/* Code Playgrounds / Payloads */}
          <div className="space-y-8 lg:sticky lg:top-24 h-fit">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Request Body Example (Buy Data)</span>
                <span className="text-xs font-mono text-orange-500">JSON</span>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto leading-5">
{`{
  "phone_number": "08123456789",
  "network": "MTN",
  "plan_code": "MTN_1GB_SME",
  "reference": "my_unique_tx_ref_001"
}`}
              </pre>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Response Example (Success)</span>
                <span className="text-xs font-mono text-emerald-400">JSON</span>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto leading-5">
{`{
  "status": "success",
  "reference": "DEV_DATA_my_unique_tx_ref_001",
  "amount": 220.00,
  "message": "Transaction successful"
}`}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
