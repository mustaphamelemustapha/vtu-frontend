import React from 'react';

export const metadata = {
  title: 'Terms & Conditions | KULLOMA DATA & MMTECHGLOBE',
  description: 'Terms and Conditions of Service for KULLOMA DATA, MELE DATA, MZ DATA applications and MMTECHGLOBE web portal.',
};

export default function TermsAndConditions() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 font-sans text-slate-800 dark:text-slate-200">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-4xl font-black text-blue-600 dark:text-blue-400">Terms &amp; Conditions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Effective Date: October 11, 2026 &bull; Last Updated: October 2026
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Governing: MELE DATA, MZ DATA, KULLOMA DATA &bull; Operated by MMTECHGLOBE
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">1. Acceptance of Terms</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          By creating an account, accessing, or using any digital service or mobile application provided by <strong>MMTECHGLOBE</strong> 
          (including <strong>MELE DATA</strong>, <strong>MZ DATA</strong>, and <strong>KULLOMA DATA</strong>), you acknowledge that you 
          have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must discontinue 
          use of the applications and web portal immediately.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">2. Nature of Services (Utility Aggregation)</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          Our applications serve as a digital utility vending and electronic recharge aggregation platform. Services provided include:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>Prepaid mobile airtime top-ups across MTN, Airtel, Glo, and 9mobile networks.</li>
          <li>Corporate and SME mobile internet data bundle subscriptions.</li>
          <li>Prepaid and postpaid electricity utility token vending (DISCOs).</li>
          <li>Multi-choice cable television subscription renewals (DSTV, GOTV, StarTimes).</li>
          <li>Educational examination registration tokens (WAEC, NECO, NABTEB).</li>
        </ul>
        <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
          <strong>Digital Utility Classification (Apple Guideline 3.1.5(a)):</strong> All services provided through our applications 
          represent real-world physical and telecommunication utility credits delivered directly to external telecommunication network 
          operators and utility grids. These services are consumed entirely outside of the mobile application on external mobile lines and 
          utility hardware.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">3. Wallet Funding &amp; Zero Deposit Fees</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          To facilitate instant, sub-second checkout, services are debited from your digital prepaid wallet.
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Virtual Bank Accounts:</strong> Each user is provisioned personalized virtual bank accounts (e.g. Wema Bank, Sterling Bank, Moniepoint MFB, 9PSB) via our CBN-licensed payment partners.
          </li>
          <li>
            <strong>Zero Deposit Charges:</strong> We maintain a transparent 0% platform deposit policy. Funds sent via standard Nigerian bank transfer reflect automatically in your wallet without arbitrary platform deductions.
          </li>
          <li>
            <strong>No Inactivity Penalties:</strong> Unused wallet funds remain securely held in your account and do not expire.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">4. Purchase Delivery &amp; Instant Refund Guarantee</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          We operate synchronous delivery pipelines to guarantee high fulfillment reliability:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Synchronous Confirmation:</strong> Purchases are routed to network provider gateways with real-time delivery confirmation and cryptographic transaction receipts.
          </li>
          <li>
            <strong>Automatic Instant Reversals:</strong> In the rare event that an upstream telecommunication provider experiences network downtime, API timeout, or delivery rejection, our system triggers an immediate automatic refund reversing 100% of the debited amount back to your wallet.
          </li>
          <li>
            <strong>Recipient Accuracy:</strong> Users are strictly responsible for verifying the accuracy of the recipient phone number, meter number, or smartcard number prior to entering their 4-digit transaction PIN. Deliveries executed to wrong numbers provided by the user cannot be reversed by telecom operators once delivered.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">5. Account Security &amp; Transaction PIN</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          Your account security depends on keeping your credentials confidential:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>You are strictly responsible for safeguarding your login password and 4-digit transaction authorization PIN.</li>
          <li>MMTECHGLOBE staff will never ask for your password or PIN via phone, SMS, WhatsApp, or email.</li>
          <li>Any transaction authenticated with your verified 4-digit PIN is presumed authorized by you.</li>
          <li>If you suspect unauthorized access, reset your PIN immediately or lock your account via the Profile security menu.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">6. Prohibited Activities</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          Users agree not to utilize our platform, API endpoints, or services for:
        </p>
        <ul className="list-disc ml-6 space-y-2 text-slate-700 dark:text-slate-300">
          <li>Money laundering, funding fraudulent activities, or circulating proceeds of financial crimes.</li>
          <li>Automated vulnerability scanning, denial-of-service attempts, or reverse-engineering server APIs.</li>
          <li>Simultaneous multi-threaded wallet manipulation attempting to bypass balance locking mechanisms.</li>
        </ul>
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          Any account confirmed engaging in fraudulent activity will be suspended permanently and reported to relevant Nigerian law enforcement agencies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">7. Governing Law &amp; Dispute Resolution</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          These Terms and Conditions shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. 
          Any dispute arising out of or in connection with these terms shall first be submitted to informal resolution by contacting our 
          support team. If unresolved within 30 days, disputes shall be resolved through binding arbitration in Nigeria.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">8. Customer Support Desk</h2>
        <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
          For assistance with failed transactions, wallet reconciliations, or general inquiries:
        </p>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900 text-sm space-y-1">
          <div><strong>Operator:</strong> MMTECHGLOBE</div>
          <div><strong>Support Email:</strong> <a href="mailto:mmtechglobe@gmail.com" className="text-blue-600 dark:text-blue-400 underline">mmtechglobe@gmail.com</a></div>
          <div><strong>WhatsApp Desk:</strong> +234 814 111 4647</div>
          <div><strong>Live Web Portal:</strong> <a href="https://meledata.ng" className="text-blue-600 dark:text-blue-400 underline">https://meledata.ng</a></div>
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
        &copy; 2026 MMTECHGLOBE. All rights reserved. Powering MELE DATA, MZ DATA &amp; KULLOMA DATA.
      </footer>
    </main>
  );
}
