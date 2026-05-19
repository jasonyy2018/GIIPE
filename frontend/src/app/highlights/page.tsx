'use client'

import PublicLayout from '@/components/public/PublicLayout';

export default function Highlights() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="text-center mb-12">
          <h1 className="text-[3rem] md:text-[2rem] font-bold text-primary-dark mb-4">
            Highlights
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mb-8"></div>
          <p className="text-xl text-text max-w-3xl mx-auto leading-relaxed">
            Discover our key initiatives, partnerships, and achievements that drive our mission forward 
            in the field of intellectual property and innovation.
          </p>
        </div>

        {/* Key Initiatives */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-primary-dark mb-8 text-center">
            Key Initiatives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-light rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-handshake text-2xl text-accent"></i>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-4">
                Strategic Partnerships
              </h3>
              <p className="text-text leading-relaxed">
                Collaborating with global organizations to enhance IP protection and innovation ecosystems worldwide. 
                Our partnerships span across academia, industry, and government institutions.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-light rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-award text-2xl text-accent"></i>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-4">
                Annual Innovation Awards
              </h3>
              <p className="text-text leading-relaxed">
                Recognizing outstanding contributions in intellectual property creation and protection globally. 
                Our awards celebrate innovation excellence and policy leadership.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-light rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-book-open text-2xl text-accent"></i>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-4">
                Research Publications
              </h3>
              <p className="text-text leading-relaxed">
                Producing cutting-edge research on IP trends, challenges, and future directions. 
                Our publications influence policy and practice worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-16 bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-primary-dark mb-8 text-center">
            Our Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent mb-2">15+</div>
              <div className="text-text font-medium">Years of Excellence</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">100+</div>
              <div className="text-text font-medium">Research Papers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">50+</div>
              <div className="text-text font-medium">Partner Organizations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">25+</div>
              <div className="text-text font-medium">Countries Reached</div>
            </div>
          </div>
        </div>

        {/* Sponsors Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-primary-dark mb-8 text-center">
            Our Sponsors & Partners
          </h2>
          <p className="text-center text-text mb-8 max-w-2xl mx-auto">
            We are proud to collaborate with leading academic institutions and organizations 
            that share our commitment to advancing intellectual property research and innovation.
          </p>
          
          <div className="sponsors flex justify-center flex-wrap gap-10 md:gap-8 border-t border-gray-200 pt-8">
            <img 
              src={encodeURI("/images/sponsors/SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg")} 
              alt="Fudan University School of Management"
              className="sponsor-logo h-24 md:h-20 object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <img 
              src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
              alt="McDonnell International Scholars Academy, WashU"
              className="sponsor-logo h-24 md:h-20 object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <img 
              src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
              alt="Peking University Guanghua School of Management"
              className="sponsor-logo h-24 md:h-20 object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <img 
              src={encodeURI("/images/sponsors/WashU olin Business School.jpeg")} 
              alt="WashU Olin Business School"
              className="sponsor-logo h-24 md:h-20 object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <img 
              src={encodeURI("/images/sponsors/Institute for Intellectual Property Management at Zhejiang University.png")} 
              alt="Zhejiang University"
              className="sponsor-logo h-24 md:h-20 object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-primary-dark rounded-lg p-8 text-white">
          <h2 className="text-2xl font-semibold mb-4">
            Join Our Mission
          </h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Become part of our global community working to advance intellectual property research 
            and innovation policy for a better future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-block py-3 px-8 bg-transparent text-white border-2 border-white rounded-full font-semibold transition-all duration-300 hover:bg-white hover:text-primary-dark"
            >
              Partner With Us
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}