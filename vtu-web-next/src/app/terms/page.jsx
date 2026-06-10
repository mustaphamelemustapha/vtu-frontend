import React from 'react';

export const metadata = {
  title: 'Terms & Conditions | MELE DATA',
  description: 'Terms and Conditions of Service for MELE DATA application and web portal.',
};

export default function TermsAndConditions() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800">
      <h1 className="text-4xl font-black mb-8 text-blue-600">Terms &amp; Conditions</h1>
      <p className="text-sm text-slate-500 mb-8">Last Updated: April 28, 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
        <p className="mb-4 leading-relaxed">
          By accessing or using MELE DATA, you agree to be bound by these Terms and Conditions. 
          If you do not agree with any part of these terms, you must not access or use our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. Account Registration and Wallet Safety</h2>
        <p className="mb-4 leading-relaxed">
          To purchase services, you must register and fund your digital wallet. You are responsible for:
        </p>
        <ul className="list-disc ml-6 mb-4 space-y-2">
          <li>Providing accurate and complete registration info.</li>
          <li>Maintaining the confidentiality of your account credentials and 4-digit transaction PIN.</li>
          <li>All transactions carried out under your account.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Services and Purchases</h2>
        <p className="mb-4 leading-relaxed">
          MELE DATA provides mobile airtime, data packages, utility bill payments, and educational PINs. 
          All transactions are final once processed. 
          If a transaction fails due to provider downtime, the system will automatically refund the debited amount to your wallet balance.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">4. Wallet Funding</h2>
        <p className="mb-4 leading-relaxed">
          Wallet balances are funded via bank transfers to virtual accounts assigned to you. 
          We do not charge deposit fees (0% deposit charges), but any third-party gateway fees are subject to their respective terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">5. Prohibited Uses</h2>
        <p className="mb-4 leading-relaxed">
          You agree not to use the services for any unlawful activities, fraudulent transactions, or attempts to disrupt the security or integrity of our systems. 
          Any suspicious activity will lead to immediate account suspension and review.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
        <p className="mb-4 leading-relaxed">
          For any clarifications regarding these Terms and Conditions, please contact our support desk at mmtechglobe@gmail.com.
        </p>
      </section>

      <footer className="mt-12 pt-8 border-t text-center text-slate-500 text-sm">
        &copy; 2026 MELE DATA. Powered by MMTECHGLOBE.
      </footer>
    </main>
  );
}
