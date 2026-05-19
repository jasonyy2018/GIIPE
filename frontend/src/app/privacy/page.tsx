'use client'

import PublicLayout from '@/components/public/PublicLayout';
import HeroSection from '@/components/ui/HeroSection';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <HeroSection
        title="Privacy & Cookie Notice"
        subtitle="We are committed to protecting your privacy and personal information."
        backgroundImage="tech-network"
        size="normal"
      />

      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold text-primary-dark mb-4">1. Information We Collect</h2>
          <p className="text-text leading-relaxed mb-6">
            We collect information that you provide directly to us, such as when you create an account, 
            register for events, submit papers, or contact us. This may include:
          </p>
          <ul className="list-disc pl-6 mb-6 text-text">
            <li>Name and contact information</li>
            <li>Email address</li>
            <li>Professional affiliation</li>
            <li>Event registration information</li>
            <li>Paper submissions and related materials</li>
          </ul>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">2. How We Use Your Information</h2>
          <p className="text-text leading-relaxed mb-6">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 mb-6 text-text">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your event registrations and submissions</li>
            <li>Send you notifications and updates about events and conferences</li>
            <li>Respond to your inquiries and provide customer support</li>
            <li>Monitor and analyze trends, usage, and activities</li>
          </ul>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">3. Information Sharing</h2>
          <p className="text-text leading-relaxed mb-6">
            We do not sell, trade, or otherwise transfer your personal information to third parties without 
            your consent, except as described in this policy. We may share your information with:
          </p>
          <ul className="list-disc pl-6 mb-6 text-text">
            <li>Service providers who assist us in operating our website and conducting our business</li>
            <li>Conference organizers and co-organizers for event management purposes</li>
            <li>When required by law or to protect our rights</li>
          </ul>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">4. Cookies</h2>
          <p className="text-text leading-relaxed mb-6">
            We use cookies and similar tracking technologies to track activity on our website and hold certain 
            information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
          </p>
          <p className="text-text leading-relaxed mb-6">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
            However, if you do not accept cookies, you may not be able to use some portions of our website.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">5. Data Security</h2>
          <p className="text-text leading-relaxed mb-6">
            We implement appropriate security measures to protect your personal information against unauthorized 
            access, alteration, disclosure, or destruction. However, no method of transmission over the Internet 
            or electronic storage is 100% secure.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">6. Your Rights</h2>
          <p className="text-text leading-relaxed mb-6">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 mb-6 text-text">
            <li>Access and receive a copy of your personal data</li>
            <li>Rectify inaccurate or incomplete data</li>
            <li>Request deletion of your personal data</li>
            <li>Object to processing of your personal data</li>
            <li>Request restriction of processing</li>
          </ul>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">7. Changes to This Policy</h2>
          <p className="text-text leading-relaxed mb-6">
            We may update our Privacy & Cookie Notice from time to time. We will notify you of any changes 
            by posting the new policy on this page and updating the "Last Updated" date.
          </p>

          <h2 className="text-2xl font-semibold text-primary-dark mb-4">8. Contact Us</h2>
          <p className="text-text leading-relaxed mb-6">
            If you have any questions about this Privacy & Cookie Notice, please contact us at minyuan@wustl.edu.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

