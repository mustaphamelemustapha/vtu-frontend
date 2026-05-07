import React from 'react';

export const metadata = {
  title: 'Privacy Policy | AxisVTU',
  description: 'Privacy Policy for AxisVTU digital utility services.',
};

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 font-sans text-slate-800">
      <div className="mb-12 border-b pb-8">
        <h1 className="text-4xl font-black mb-3 text-blue-600 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Effective Date: May 7, 2026</p>
      </div>

      <div className="prose prose-slate max-w-none">
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">1. Introduction</h2>
          <p className="leading-relaxed text-slate-600">
            Welcome to AxisVTU. We are a digital utility services platform that allows users to purchase mobile data, 
            airtime, electricity tokens, cable TV subscriptions, exam PINs, and related digital services. 
            We are committed to protecting your personal information and your right to privacy.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">2. Information We Collect</h2>
          <p className="mb-4 leading-relaxed text-slate-600">
            To provide our utility services effectively, we collect information that you provide directly to us, such as:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-slate-600">
            <li><strong>Personal Identifiers:</strong> Name, email address, and phone number.</li>
            <li><strong>Service Purchase Data:</strong> Details of utility services purchased (e.g., recipient phone numbers, meter numbers).</li>
            <li><strong>Account Credit Activity:</strong> Information regarding top-up references and service order history.</li>
            <li><strong>Technical Data:</strong> Device information and application usage statistics to improve performance.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">3. How We Use Your Information</h2>
          <p className="mb-4 leading-relaxed text-slate-600">
            The data we collect is used strictly to:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-slate-600">
            <li>Deliver purchased utility services (data, airtime, tokens) instantly.</li>
            <li>Manage your account credit and purchase history.</li>
            <li>Provide customer support and resolve technical inquiries.</li>
            <li>Detect and prevent fraudulent activities or unauthorized service access.</li>
            <li>Improve the overall user experience and application stability.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">4. Service Processing & Third-Parties</h2>
          <p className="leading-relaxed text-slate-600">
            AxisVTU is a service delivery platform, not a financial institution. We partner with secure third-party 
            payment processors and utility providers to fulfill your requests. Your payment information is 
            processed through these secure gateways, and we do not store sensitive payment card details on our servers.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">5. Data Security</h2>
          <p className="leading-relaxed text-slate-600">
            We implement industry-standard security measures, including encryption and secure protocols, to safeguard 
            your data against unauthorized access, alteration, or disclosure.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">6. Biometric Authentication</h2>
          <p className="leading-relaxed text-slate-600">
            If you enable biometric authentication (fingerprint/face ID) in our app, this data is processed entirely 
            on your local device hardware. AxisVTU does not collect, transmit, or store any biometric data.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-slate-900">7. Your Rights</h2>
          <p className="leading-relaxed text-slate-600">
            You have the right to access, update, or request the deletion of your personal data. You can manage 
            your profile within the application or contact our support team for assistance with account closure.
          </p>
        </section>

        <section className="mb-12 p-8 bg-slate-50 rounded-2xl border border-slate-100">
          <h2 className="text-2xl font-bold mb-6 text-slate-900">8. Contact & Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Website</p>
              <a href="https://axisvtu.com" className="text-blue-600 font-medium hover:underline">axisvtu.com</a>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Support Phone</p>
              <p className="text-slate-700 font-medium">+234 8141114647</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Email</p>
              <a href="mailto:mmtechglobe@gmail.com" className="text-blue-600 font-medium hover:underline">mmtechglobe@gmail.com</a>
            </div>
          </div>
        </section>
      </div>

      <footer className="pt-8 border-t text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} AxisVTU Digital Services. All rights reserved.
      </footer>
    </main>
  );
}

