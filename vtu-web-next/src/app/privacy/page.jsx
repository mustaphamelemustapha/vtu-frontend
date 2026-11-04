import React from 'react';

export const metadata = {
  title: 'Privacy Policy | KULLOMA DATA & MMTECHGLOBE',
  description: 'Comprehensive Privacy Policy and Data Safety disclosures for KULLOMA DATA, MELE DATA, MZ DATA, and MMTECHGLOBE services.',
};

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800 dark:text-slate-200">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-4xl font-black text-blue-600 dark:text-blue-400">Privacy Policy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Effective Date: October 11, 2026 &bull; Last Updated: October 2026
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Applies to: MELE DATA, MZ DATA, KULLOMA DATA &bull; Operated by MMTECHGLOBE
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">1. Introduction &amp; Scope</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          Welcome to the digital platform ecosystem operated by <strong>MMTECHGLOBE</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), 
          including our mobile applications and web services available under <strong>MELE DATA</strong>, <strong>MZ DATA</strong>, 
          and <strong>KULLOMA DATA</strong>.
        </p>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">
          We are committed to respecting your privacy, protecting your personal data, and complying with the Nigeria Data Protection Act 
          (NDPA 2023), Google Play Console Data Safety policies, and Apple App Store Review Guidelines. This Privacy Policy outlines 
          how we collect, use, process, and safeguard your information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">2. Information We Collect</h2>
        <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">
          To provide instant mobile airtime, data top-ups, utility bill vending, and digital wallet services, we collect:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Personal Identity Information:</strong> Full name, verified mobile phone number, and email address provided during account registration.
          </li>
          <li>
            <strong>Financial &amp; Wallet Information:</strong> Dedicated virtual bank account numbers assigned to your wallet (e.g. Wema Bank, Sterling Bank, Moniepoint MFB, 9PSB) generated through our Central Bank of Nigeria (CBN)-licensed payment infrastructure partners (Monnify / Paystack).
          </li>
          <li>
            <strong>Transaction Records:</strong> History of mobile data purchases, airtime top-ups, electricity meter tokens, cable TV smartcard numbers, exam registration PINs, deposit reference IDs, and timestamps.
          </li>
          <li>
            <strong>Device &amp; App Diagnostics:</strong> Operating system version, device model, IP address, and Firebase Cloud Messaging (FCM) tokens utilized exclusively to deliver real-time push notification receipts and critical security alerts.
          </li>
          <li>
            <strong>Biometric Data (Device-Local Only):</strong> Optional fingerprint and Face ID authentication credentials are processed exclusively within your device&apos;s local hardware security enclave (iOS Secure Enclave / Android Keystore). Biometric biometric data is <em>never</em> collected, stored, or transmitted to our servers.
          </li>
        </ul>
        <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-sm text-blue-900 dark:text-blue-200">
          <strong>Privacy Guarantee on Sensitive Identifiers:</strong> We do <u>NOT</u> store or retain your Bank Verification Number (BVN) or National Identification Number (NIN). Any identity verification required by regulatory tiering is transmitted directly through encrypted channels to CBN-licensed payment partners for automated virtual account provisioning.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">3. How We Use Your Information</h2>
        <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">
          We use the information collected strictly for legitimate business and operational purposes:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>To fulfill synchronous telecom top-ups and bill payments with instant electronic delivery receipts.</li>
          <li>To manage, credit, and safeguard your prepaid wallet balance against unauthorized debit.</li>
          <li>To prevent fraudulent transactions, duplicate billing, and malicious platform abuse.</li>
          <li>To provide real-time WhatsApp and email customer support for transaction reconciliation.</li>
          <li>To send critical operational notifications, including wallet credits, login alerts, and service status updates.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">4. Data Sharing &amp; Third Parties</h2>
        <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">
          We never sell, rent, or trade your personal data to advertisers or unauthorized commercial entities. We share necessary data only with:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Licensed Telecom Operators &amp; Gateways:</strong> MTN Nigeria, Airtel Nigeria, Globacom, 9mobile, and licensed aggregator APIs to credit your recipient phone numbers.
          </li>
          <li>
            <strong>Regulated Payment Gateways:</strong> CBN-licensed institutions (Monnify / Moniepoint MFB / Paystack) to process bank transfers and manage automated virtual accounts.
          </li>
          <li>
            <strong>Utility Providers:</strong> Electricity distribution companies (DISCOs) and multi-choice cable operators (DSTV, GOTV, StarTimes) to generate recharge tokens.
          </li>
          <li>
            <strong>Legal &amp; Regulatory Authorities:</strong> When strictly mandated by Nigerian law, court subpoena, or applicable Anti-Money Laundering (AML) enforcement.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">5. Data Security &amp; Encryption</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          All network communications between your mobile device, our web portal, and our backend servers are secured using industry-standard 
          Transport Layer Security (TLS 1.3 / HTTPS). Sensitive authentication secrets, including your account password and 4-digit transaction PIN, 
          are hashed using modern cryptographic algorithms (Argon2 / bcrypt) and can never be read in plain text by our team.
        </p>
      </section>

      <section id="deletion" className="mb-8 p-6 rounded-2xl border-2 border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
        <h2 className="text-2xl font-bold mb-3 text-red-900 dark:text-red-200">
          6. Account Deletion &amp; Data Retention Policy
        </h2>
        <p className="mb-3 leading-relaxed text-slate-800 dark:text-slate-200">
          In compliance with Google Play Console Data Safety requirements and Apple App Store Guideline 5.1.1(v), 
          you have the absolute right to delete your account and request full anonymization of your personal data at any time.
        </p>
        <div className="space-y-3 mt-4 text-slate-800 dark:text-slate-200">
          <p>
            <strong>Option A: Immediate In-App Deletion</strong><br />
            Open the mobile app (MELE DATA, MZ DATA, or KULLOMA DATA), navigate to <strong>Profile &gt; Delete Account</strong>, 
            review the wallet balance warning, and type <code>DELETE</code> to confirm. Your account session will terminate immediately, 
            authentication credentials will be purged, and your profile will be deactivated.
          </p>
          <p>
            <strong>Option B: Online / Email Request</strong><br />
            If you no longer have access to the mobile application, you can submit an account deletion request by emailing 
            us at <a href="mailto:mmtechglobe@gmail.com" className="text-blue-600 dark:text-blue-400 font-semibold underline">mmtechglobe@gmail.com</a> with 
            the subject line <em>&quot;Account Deletion Request&quot;</em> and your registered phone number. Requests are processed within 24 to 48 hours.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            <em>Note on Financial Ledger Retention:</em> Upon deletion, your identity and contact information are permanently wiped from active systems. 
            Historical transaction ledger records (e.g. previous bank transfer references) are retained in an anonymized archive solely to comply with 
            statutory Nigerian anti-fraud and financial audit reporting obligations.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">7. Your Data Rights</h2>
        <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">
          Under the Nigeria Data Protection Act (NDPA), you are entitled to:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>Request a copy of the personal information we hold about you.</li>
          <li>Request the correction or update of inaccurate profile details.</li>
          <li>Opt-out of non-essential promotional messages at any time.</li>
          <li>Request immediate deletion or restriction of your personal data processing.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">8. Contact &amp; Grievance Redressal</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          For any questions, clarifications, data access requests, or privacy concerns regarding this policy, please reach our 
          Data Protection Officer:
        </p>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900 text-sm space-y-1">
          <div><strong>Publisher &amp; Operator:</strong> MMTECHGLOBE (CAC Certified)</div>
          <div><strong>Support Email:</strong> <a href="mailto:mmtechglobe@gmail.com" className="text-blue-600 dark:text-blue-400 underline">mmtechglobe@gmail.com</a></div>
          <div><strong>Direct Support Line / WhatsApp:</strong> +234 814 111 4647</div>
          <div><strong>Official Website:</strong> <a href="https://meledata.ng" className="text-blue-600 dark:text-blue-400 underline">https://meledata.ng</a></div>
          <div><strong>Jurisdiction:</strong> Federal Republic of Nigeria</div>
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
        &copy; 2026 MMTECHGLOBE. All rights reserved. Powering MELE DATA, MZ DATA &amp; KULLOMA DATA.
      </footer>
    </main>
  );
}
