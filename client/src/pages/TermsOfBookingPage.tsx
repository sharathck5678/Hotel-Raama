import React from 'react';
import { FileText, Mail, Phone, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../components/ScrollReveal';

export const TermsOfBookingPage: React.FC = () => {
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
            <FileText size={32} className="text-[#47614d]" /> Terms of Booking
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 leading-relaxed">
            By making a reservation with Hotel Raama, you agree to the following booking terms and conditions.
          </p>
        </div>

        {/* Policy Content Card */}
        <div className="bg-white/80 border border-[#cbc0ad] rounded-sm p-8 sm:p-10 shadow-sm space-y-8 font-sans text-xs sm:text-sm text-[#444444] leading-relaxed">
          
          {/* Reservation Confirmation */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Reservation Confirmation
            </h2>
            <p>
              A booking is confirmed only after the required payment or advance amount has been successfully received and a confirmation has been issued by the hotel.
            </p>
          </section>

          {/* Check-In & Check-Out */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2 flex items-center gap-2">
              <Clock size={18} className="text-[#47614d]" /> Check-In & Check-Out
            </h2>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#333333]">
              <div className="bg-[#47614d]/10 border border-[#47614d]/20 px-4 py-2 rounded-sm">
                Check-In: 12:00 PM
              </div>
              <div className="bg-[#47614d]/10 border border-[#47614d]/20 px-4 py-2 rounded-sm">
                Check-Out: 12:00 PM
              </div>
            </div>
            <p>
              Guests are required to provide valid government identification at check-in. Early check-in or late check-out is subject to room availability and may incur additional charges.
            </p>
          </section>

          {/* Cancellation & Refund */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2 flex items-center gap-2">
              <ShieldAlert size={18} className="text-[#8c764b]" /> Cancellation & Refund Policy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-sm space-y-1">
                <span className="font-bold block text-emerald-800 text-xs">7+ Days Before Check-In Date</span>
                <span className="text-[#333333] text-xs font-semibold block">100% Full Refund</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-sm space-y-1">
                <span className="font-bold block text-amber-800 text-xs">3–6 Days Before Check-In Date</span>
                <span className="text-[#333333] text-xs font-semibold block">50% Partial Refund</span>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-sm space-y-1">
                <span className="font-bold block text-rose-800 text-xs">Under 3 Days of Check-In Date</span>
                <span className="text-[#333333] text-xs font-semibold block">No Refund</span>
              </div>
            </div>
          </section>

          {/* No-Show */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              No-Show Policy
            </h2>
            <p>
              If a guest does not arrive for the booked stay without prior cancellation, the reservation may be treated as a no-show, and the applicable booking amount may be non-refundable.
            </p>
          </section>

          {/* Guest Responsibility */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Guest Responsibility
            </h2>
            <p>
              Guests are responsible for any damage to hotel property caused during their stay. Additional charges may apply for damages, loss, or misuse of hotel facilities.
            </p>
          </section>

          {/* Booking Changes */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Booking Changes
            </h2>
            <p>
              Any changes to the guest name, dates, room type, or number of guests are subject to availability and may result in additional charges.
            </p>
          </section>

          {/* Hotel Rights */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333] border-b border-[#cbc0ad]/40 pb-2">
              Hotel Rights
            </h2>
            <p>
              The hotel reserves the right to refuse or cancel a reservation where there has been a violation of hotel policies, fraudulent booking activity, or other circumstances permitted under applicable law.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3 pt-4 border-t border-[#cbc0ad]">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#333333]">
              Contact & Assistance
            </h2>
            <p>For booking assistance or clarification, please contact us at:</p>
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
