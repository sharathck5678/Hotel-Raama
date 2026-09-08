import React from 'react';
import { ShieldCheck, Mail, Phone, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../components/ScrollReveal';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-4xl mx-auto px-6 sm:px-8">
      <ScrollReveal direction="up" duration={0.8}>
        
        {/* Top Navigation Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#47614d] hover:text-[#374c3c] transition-colors"
          >
            <ArrowLeft size={16} /> Return to Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-[#cbc0ad] pb-8 mb-10">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8c764b] block mb-2">
            Hotel Raama Policies
          </span>
          <h1 className="editorial-section-title text-[#333333] flex items-center gap-3">
            <ShieldCheck size={32} className="text-[#47614d]" /> Privacy Policy
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 leading-relaxed">
            At Hotel Raama, we respect your privacy and are committed to protecting the information you provide when using our website and services.
          </p>
        </div>

        {/* Policy Content Card */}
        <div className="bg-white/80 border border-[#cbc0ad] rounded-sm p-8 sm:p-10 shadow-sm space-y-8 font-sans text-xs sm:text-sm text-[#444444] leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Information We Collect
            </h2>
            <p>
              When you make a booking, enquiry, or use our website, we may collect information such as your name, phone number, email address, booking details, and payment-related information.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-[#555555]">
              <li>Process and manage hotel reservations</li>
              <li>Confirm bookings and communicate with you</li>
              <li>Provide hotel and guest services</li>
              <li>Process payments securely</li>
              <li>Respond to enquiries and requests</li>
              <li>Improve our website and services</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Payment Information
            </h2>
            <p>
              Online payments are processed through our secure payment gateway. We do not store your complete card, UPI, or banking credentials on our servers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Sharing of Information
            </h2>
            <p>
              We do not sell or rent your personal information. Your information may be shared with trusted service providers only when necessary to process bookings, payments, or provide requested services.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Cookies
            </h2>
            <p>
              Our website may use cookies and similar technologies to improve functionality and understand how visitors use our website.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Data Security
            </h2>
            <p>
              We take reasonable measures to protect your personal information from unauthorized access, misuse, or disclosure.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Your Rights
            </h2>
            <p>
              You may contact us to request access, correction, or deletion of your personal information, subject to applicable legal requirements.
            </p>
          </section>

          {/* Section 8: Contact */}
          <section className="space-y-3 pt-4 border-t border-[#cbc0ad]">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333]">
              Contact Us
            </h2>
            <p>For privacy-related questions, please contact us at:</p>
            <div className="flex flex-wrap gap-6 pt-1 text-xs">
              <a href="mailto:reservations@hotelraama.com" className="flex items-center gap-2 text-[#47614d] font-bold hover:underline">
                <Mail size={16} /> reservations@hotelraama.com
              </a>
              <a href="tel:08172257001" className="flex items-center gap-2 text-[#47614d] font-bold hover:underline">
                <Phone size={16} /> 081722 57001
              </a>
            </div>
          </section>

        </div>
      </ScrollReveal>
    </div>
  );
};
