'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DevDocs() {
  const [activeTab, setActiveTab] = useState('data'); // 'balance' | 'data' | 'airtime'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-sans">
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

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[220px_1fr] gap-8">
        
        {/* Left Side Sidebar Navigation */}
        <aside className="hidden lg:block space-y-6 h-fit sticky top-24">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Getting Started</h3>
            <ul className="space-y-1 text-sm text-slate-300">
              <li><a href="#authentication" className="block py-1 hover:text-orange-500 transition-colors">Authentication</a></li>
              <li><a href="#base-url" className="block py-1 hover:text-orange-500 transition-colors">Base URL</a></li>
              <li><a href="#networks" className="block py-1 hover:text-orange-500 transition-colors">Supported Networks</a></li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Endpoints</h3>
            <ul className="space-y-1 text-sm text-slate-300">
              <li><a href="#balance" className="block py-1 hover:text-orange-500 transition-colors font-mono">/wallet/balance</a></li>
              <li><a href="#data" className="block py-1 hover:text-orange-500 transition-colors font-mono">/data/purchase</a></li>
              <li><a href="#airtime" className="block py-1 hover:text-orange-500 transition-colors font-mono">/airtime/purchase</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Responses</h3>
            <ul className="space-y-1 text-sm text-slate-300">
              <li><a href="#http-status" className="block py-1 hover:text-orange-500 transition-colors">HTTP Status Codes</a></li>
            </ul>
          </div>
        </aside>

        {/* Center / Right Section */}
        <main className="space-y-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Developer API Documentation
            </h1>
            <p className="mt-4 text-base text-slate-400 leading-7">
              Automate mobile data distributions, airtime topups, and wallet balances using our secure REST API. Clean integration designed for resellers and developers.
            </p>
          </div>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-20">
            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Authentication</h2>
            <p className="mt-3 text-slate-400 text-sm leading-6">
              All API requests must include your secret API key as a Bearer token in the HTTP Authorization headers.
            </p>
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              Authorization: Bearer MELE_SEC_YOUR_SECRET_KEY
            </div>
          </section>

          {/* Base URL */}
          <section id="base-url" className="scroll-mt-20">
            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Base URL</h2>
            <p className="mt-3 text-slate-400 text-sm leading-6">
              All requests are made to the following base endpoint URL:
            </p>
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-orange-400">
              https://meledata.ng/api/v1/developer
            </div>
          </section>

          {/* Supported Networks */}
          <section id="networks" className="scroll-mt-20">
            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Supported Networks</h2>
            <p className="mt-3 text-slate-400 text-sm leading-6">
              Use these string values exactly under the <code className="font-mono text-orange-400">network</code> field for any purchases:
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map((net) => (
                <div key={net} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center font-mono text-sm font-semibold text-slate-200">
                  {net}
                </div>
              ))}
            </div>
          </section>

          {/* API Endpoints & Playground Section */}
          <section className="grid gap-10 xl:grid-cols-[1fr_1.1fr]">
            
            {/* Left Specs */}
            <div className="space-y-12">
              <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">API Endpoints</h2>

              {/* Balance */}
              <div id="balance" className="space-y-3 scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded">GET</span>
                  <span className="font-mono text-sm text-slate-200">/wallet/balance</span>
                </div>
                <p className="text-slate-400 text-sm">Fetch the current balance of your developer wallet.</p>
              </div>

              {/* Data Plans */}
              <div id="plans" className="space-y-3 pt-6 border-t border-slate-900 scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded">GET</span>
                  <span className="font-mono text-sm text-slate-200">/data/plans</span>
                </div>
                <p className="text-slate-400 text-sm">Retrieve a list of all active data plans, including their plan codes and your custom agent pricing.</p>
              </div>

              {/* Data Purchase */}
              <div id="data" className="space-y-3 pt-6 border-t border-slate-900 scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-2 py-1 rounded">POST</span>
                  <span className="font-mono text-sm text-slate-200">/data/purchase</span>
                </div>
                <p className="text-slate-400 text-sm leading-6">
                  Initiate a data purchase request. 
                  Provide a unique <code className="font-mono text-slate-200">reference</code> string to enforce idempotency and prevent double charging in case of retries.
                </p>
              </div>

              {/* Airtime Purchase */}
              <div id="airtime" className="space-y-3 pt-6 border-t border-slate-900 scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-2 py-1 rounded">POST</span>
                  <span className="font-mono text-sm text-slate-200">/airtime/purchase</span>
                </div>
                <p className="text-slate-400 text-sm leading-6">
                  Topup airtime for any phone number. Minimum amount is ₦100.
                </p>
              </div>
            </div>

            {/* Right Tabbed Playground */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                {(['data', 'airtime', 'balance', 'plans']).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-semibold capitalize transition-all border-b-2 -mb-[2px] ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab} Example
                  </button>
                ))}
              </div>

              {activeTab === 'data' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Request POST /data/purchase</span>
                      <span className="text-xs font-mono text-orange-500">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "phone_number": "08123456789",
  "network": "MTN",
  "plan_code": "MTN_1GB_SME",
  "reference": "unique_data_ref_001"
}`}
                    </pre>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Response (Success)</span>
                      <span className="text-xs font-mono text-emerald-400">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "status": "success",
  "reference": "DEV_DATA_unique_data_ref_001",
  "amount": 220.00,
  "message": "Data transaction was successful"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'airtime' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Request POST /airtime/purchase</span>
                      <span className="text-xs font-mono text-orange-500">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "phone_number": "08098765432",
  "network": "GLO",
  "amount": 200.00,
  "reference": "unique_airtime_ref_002"
}`}
                    </pre>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Response (Success)</span>
                      <span className="text-xs font-mono text-emerald-400">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "status": "success",
  "reference": "DEV_AIRTIME_unique_airtime_ref_002",
  "amount": 200.00,
  "message": "Airtime topup succeeded"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'balance' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Request GET /wallet/balance</span>
                      <span className="text-xs font-mono text-slate-500">Headers Only</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`Authorization: Bearer MELE_SEC_YOUR_SECRET_KEY`}
                    </pre>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Response</span>
                      <span className="text-xs font-mono text-emerald-400">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "balance": 14250.75
}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'plans' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Request GET /data/plans</span>
                      <span className="text-xs font-mono text-slate-500">Headers Only</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`Authorization: Bearer MELE_SEC_YOUR_SECRET_KEY`}
                    </pre>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Response</span>
                      <span className="text-xs font-mono text-emerald-400">JSON</span>
                    </div>
                    <pre className="p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-5">
{`{
  "plans": [
    {
      "plan_code": "MTN_1GB_SME",
      "network": "MTN",
      "plan_name": "MTN SME 1GB",
      "data_size": "1GB",
      "validity": "30 days",
      "price": 290.00
    },
    {
      "plan_code": "GLO_1GB",
      "network": "GLO",
      "plan_name": "GLO 1GB",
      "data_size": "1GB",
      "validity": "30 days",
      "price": 320.00
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Response Status Codes */}
          <section id="http-status" className="scroll-mt-20">
            <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Response Status Codes</h2>
            <div className="mt-4 overflow-x-auto border border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-800 text-sm text-left">
                <thead className="bg-slate-900/60 font-semibold text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-mono">Code</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-400">
                  <tr>
                    <td className="px-4 py-3 font-mono text-emerald-400">200 OK</td>
                    <td className="px-4 py-3 text-slate-300">Request was fully processed and successful.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-orange-400">400 Bad Request</td>
                    <td className="px-4 py-3">Payload validation failed or missing required fields.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-red-400">401 Unauthorized</td>
                    <td className="px-4 py-3">API Secret Key header is missing, incorrect, or suspended.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-red-400">402 Payment Required</td>
                    <td className="px-4 py-3">Insufficient funds in your developer wallet balance.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-red-400">409 Conflict</td>
                    <td className="px-4 py-3">Duplicate request. Reference code was already used.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
