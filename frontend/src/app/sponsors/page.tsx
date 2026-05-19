'use client'

import Image from 'next/image';
import PublicLayout from '@/components/public/PublicLayout';

export default function Sponsors() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="text-center mb-12">
          <h1 className="text-[1.4rem] md:text-[2rem] font-bold text-primary-dark mb-4">
            Our Sponsors
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mb-8"></div>
          <p className="text-[0.9rem] md:text-xl text-text max-w-3xl mx-auto leading-relaxed">
            We are proud to collaborate with leading academic institutions and organizations 
            that share our commitment to advancing intellectual property research and innovation.
          </p>
        </div>

        <div className="sponsors border-t border-gray-200 pt-10 md:pt-10 space-y-12 md:space-y-16">
          {/* GIIP1 Beijing 2019 */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-primary-dark mb-6 md:mb-8 text-center">GIIP1 Beijing 2019</h2>
            <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
              <div className="flex items-center justify-center">
                <Image 
                  src="/images/sponsors/penn-global-research-engagement-grant-program.png"
                  alt="Penn Global Research & Engagement Grant Program"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Penn Wharton China Center.png")} 
                  alt="Penn Wharton China Center"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                  alt="Guanghua School of Management, Peking University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src="/images/sponsors/college-business-shufe.jpeg"
                  alt="College of Business, Shanghai University of Finance and Economics"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src="/images/sponsors/shu-uts-silc-shanghai-university.png"
                  alt="SHU-UTS SILC Business School, Shanghai University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </div>
          
          {/* GIIP2 Hangzhou 2024 */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-primary-dark mb-6 md:mb-8 text-center">GIIP2 Hangzhou 2024</h2>
            <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                  alt="the McDonnell International Scholars Academy at Washington University in St. Louis"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/the National Institute for Innovation Management and Institute for Intellectual Property Management at Zhejiang University.png")} 
                  alt="the National Institute for Innovation Management at Zhejiang University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Institute for Intellectual Property Management at Zhejiang University.png")} 
                  alt="Institute for Intellectual Property Management at Zhejiang University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                  alt="Guanghua School of Management at Peking University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/SHANDONUNIVERSIT BUSINESSSCHOOL.jpeg")} 
                  alt="SHANDONUNIVERSIT BUSINESSSCHOOL"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </div>
          
          {/* GIIP3 Shanghai 2025 */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-primary-dark mb-6 md:mb-8 text-center">GIIP3 Shanghai 2025</h2>
            <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                  alt="the McDonnell International Scholars Academy at Washington University in St. Louis"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/WashU olin Business School.jpeg")} 
                  alt="WashU Olin Business School"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                  alt="Guanghua School of Management, Peking University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg")} 
                  alt="SCHOOL OF MANAGEMENT FUDAN UNIVERSITY"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </div>
          
          {/* GIIP4 Beijing 2026 */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-primary-dark mb-6 md:mb-8 text-center">GIIP4 Beijing 2026</h2>
            <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                  alt="The McDonnell International Scholars Academy"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Boeing Center for Supply Chain Innovation.png")} 
                  alt="Boeing Center for Supply Chain Innovation"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-center">
                <Image 
                  src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                  alt="Guanghua School of Management, Peking University"
                  width={200}
                  height={100}
                  className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

