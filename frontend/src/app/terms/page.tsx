'use client'

import PublicLayout from '@/components/public/PublicLayout';
import HeroSection from '@/components/ui/HeroSection';

export default function TermsPage() {
  return (
    <PublicLayout>
      <HeroSection
        title="Terms & Conditions"
        subtitle="Please read these terms and conditions carefully before using our services."
        backgroundImage="tech-network"
        size="normal"
      />

      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold text-primary-dark mb-4">1. Acceptance of Terms</h2>
          <p className="text-text leading-relaxed mb-6">
            By accessing and using the Global Innovation and Intellectual Property (GIIP) platform, 
            you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">2. Use License</h2>
          <p className="text-text leading-relaxed mb-6">
            Permission is granted to temporarily access the materials on GIIP's website for personal, 
            non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, 
            and under this license you may not:
          </p>
          <ul className="list-disc pl-6 mb-6 text-text">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the website</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
          </ul>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">3. User Accounts</h2>
          <p className="text-text leading-relaxed mb-6">
            When you create an account with us, you must provide information that is accurate, complete, 
            and current at all times. You are responsible for safeguarding the password and for all activities 
            that occur under your account.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">4. Intellectual Property</h2>
          <p className="text-text leading-relaxed mb-6">
            The content on this website, including but not limited to text, graphics, logos, images, and 
            software, is the property of GIIP and is protected by copyright and other intellectual property laws.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">5. Limitation of Liability</h2>
          <p className="text-text leading-relaxed mb-6">
            In no event shall GIIP or its suppliers be liable for any damages (including, without limitation, 
            damages for loss of data or profit, or due to business interruption) arising out of the use or 
            inability to use the materials on GIIP's website.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">6. Revisions</h2>
          <p className="text-text leading-relaxed mb-6">
            GIIP may revise these terms of service for its website at any time without notice. By using this 
            website you are agreeing to be bound by the then current version of these terms of service.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">7. Contact Information</h2>
          <p className="text-text leading-relaxed mb-6">
            If you have any questions about these Terms & Conditions, please contact us at minyuan@wustl.edu.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

