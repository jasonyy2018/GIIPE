'use client'

import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import HeroSection from '@/components/ui/HeroSection';

export default function About() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <HeroSection
        title="About GIIP"
        subtitle="Global Innovation and Intellectual Property (GIIP) is a leading platform dedicated to advancing knowledge and fostering collaboration in the field of intellectual property and innovation."
        backgroundImage="tech-network"
        size="normal"
      />

      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        {/* Main Content */}
        <div className="mb-16">
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-text leading-relaxed mb-6">
              In 2019, we decided to develop a high-level forum on global innovation and intellectual property (GIIP). We believe that global competition is increasingly defined by rivalry for technological leadership, and that the boundary between firm competitiveness and institutional infrastructure is blurring. Therefore, it is important to bring together scholars, practitioners, and policymakers to engage in rigorous, cross-disciplinary discussions on this important topic. What we did not anticipate was how quickly this topic would move from important to urgent in the years that followed.
            </p>
            <p className="text-text leading-relaxed mb-6">
              The conference was briefly interrupted by the Covid-19 pandemic, but since its resumption in 2024, it has earned growing recognition among leading IP scholars worldwide. Staying true to our founding vision, we intentionally keep the conference small, striving for deeper conversations at the frontier of research.
            </p>
          </div>

          {/* Co-organizers Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-primary-dark mb-8">Co-organizers</h2>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
              {/* Changqi Wu */}
              <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
                <div className="w-[100px] h-[100px] md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
                  <img 
                    src="/images/speakers/Changqi Wu Peking University.jpeg" 
                    alt="Changqi Wu"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-primary-dark mb-2">Changqi Wu</h3>
                <p className="text-text">Guanghua School of Management, Peking University</p>
              </div>

              {/* Minyuan Zhao */}
              <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
                <div className="w-[100px] h-[100px] md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
                  <img 
                    src="/images/speakers/Minyuan Zhao WashU.jpeg" 
                    alt="Minyuan Zhao"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-primary-dark mb-2">Minyuan Zhao</h3>
                <p className="text-text">Olin School of Business, WashU</p>
              </div>
            </div>
          </div>
        </div>

            {/* Action buttons removed */}
      </div>
    </PublicLayout>
  );
}