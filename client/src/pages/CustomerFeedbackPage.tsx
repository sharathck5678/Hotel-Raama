import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  BedDouble,
  Utensils,
  Sparkle,
  UserCheck,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { validateFeedbackToken, submitCustomerFeedback } from '../services/api';
import { SEO } from '../components/SEO';

interface BookingSummary {
  guestName: string;
  bookingId: string;
  roomTypeName?: string;
  checkIn?: string;
  checkOut?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Exceptional',
};

interface StarRatingInputProps {
  label: string;
  description: string;
  icon: React.ElementType;
  value: number;
  onChange: (val: number) => void;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  label,
  description,
  icon: Icon,
  value,
  onChange,
}) => {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const activeRating = hoverVal !== null ? hoverVal : value;

  return (
    <div className="bg-white/90 backdrop-blur-xs rounded-xl p-4 sm:p-5 border border-[#00174A]/10 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#00174A]/5 text-[#00174A]">
            <Icon size={18} className="text-[#D6B369]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-[#00174A]">{label}</h3>
            <p className="text-[11px] sm:text-xs text-[#667085]">{description}</p>
          </div>
        </div>

        {activeRating > 0 && (
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#D6B369]/15 text-[#8A6D2B] border border-[#D6B369]/30">
            {RATING_LABELS[activeRating]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 mt-3 pt-2 border-t border-slate-100">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(null)}
              className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 transition-transform active:scale-95 focus:outline-hidden cursor-pointer"
              aria-label={`Rate ${star} out of 5 stars`}
            >
              <Star
                size={26}
                className={`transition-all duration-200 ${
                  isFilled
                    ? 'fill-[#D6B369] text-[#D6B369] drop-shadow-xs scale-105'
                    : 'text-slate-300 hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-bold text-[#00174A]">
          {activeRating > 0 ? `${activeRating} / 5` : 'Select'}
        </span>
      </div>
    </div>
  );
};

export const CustomerFeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingSummary | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  // Form State
  const [overallRating, setOverallRating] = useState<number>(0);
  const [roomRating, setRoomRating] = useState<number>(0);
  const [foodRating, setFoodRating] = useState<number>(0);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(0);
  const [serviceRating, setServiceRating] = useState<number>(0);
  const [recommendation, setRecommendation] = useState<boolean | null>(null);
  const [comment, setComment] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setErrorCode('INVALID_TOKEN');
      setErrorMessage('This feedback link is invalid.');
      setLoading(false);
      return;
    }

    validateFeedbackToken(token)
      .then((res) => {
        if (res.success && res.data) {
          setBookingInfo(res.data);
        } else {
          setErrorCode(res.code || 'INVALID_TOKEN');
          setErrorMessage(res.message || 'This feedback link is invalid.');
        }
      })
      .catch(() => {
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('Unable to reach the server. Please check your internet connection.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    if (!overallRating || !roomRating || !foodRating || !cleanlinessRating || !serviceRating) {
      toast.error('Please provide a 1–5 star rating for all 5 categories.');
      return;
    }

    if (recommendation === null) {
      toast.error('Please let us know whether you would recommend Hotel Raama.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        overallRating,
        roomRating,
        foodRating,
        cleanlinessRating,
        serviceRating,
        recommendation,
        comment: comment.trim(),
      };

      const res = await submitCustomerFeedback(token, payload);

      if (res.success) {
        setSubmittedSuccess(true);
        toast.success('Thank you! Your feedback has been received.');
      } else {
        if (res.code === 'ALREADY_SUBMITTED') {
          setErrorCode('ALREADY_SUBMITTED');
          setErrorMessage('Feedback has already been submitted for this stay. Thank you for sharing your experience.');
        } else if (res.code === 'EXPIRED') {
          setErrorCode('EXPIRED');
          setErrorMessage('This feedback link has expired.');
        } else {
          toast.error(res.message || 'Failed to submit feedback. Please try again.');
        }
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial Token Verification State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F0DF] flex items-center justify-center p-4">
        <SEO title="Guest Feedback | Hotel Raama" description="Hotel Raama Private Guest Feedback" noindex />
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 max-w-md w-full text-center border border-[#00174A]/10 shadow-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#D6B369] border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-lg font-serif font-bold text-[#00174A]">Verifying Feedback Link</h2>
          <p className="text-xs text-[#667085] mt-1">Please wait while we securely load your reservation details...</p>
        </div>
      </div>
    );
  }

  // 2. Success Submission State
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F0DF] py-12 px-4 flex items-center justify-center">
        <SEO title="Thank You for Your Feedback | Hotel Raama" description="Feedback Submitted Successfully" noindex />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl max-w-lg w-full p-8 sm:p-10 border border-[#00174A]/10 shadow-xl text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <span className="text-[11px] uppercase tracking-widest text-[#D6B369] font-bold block mb-1">
            HOTEL RAAMA • HASSAN
          </span>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#00174A] mb-3">
            Thank you for your feedback!
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed mb-4">
            Your response has been received successfully.
          </p>

          <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            We sincerely appreciate you taking the time to share your experience. Your thoughts help our team continuously elevate our hospitality standards.
          </p>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-[#00174A] text-white hover:bg-[#071A3D] font-bold text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer"
            >
              <Building2 size={16} /> Return to Hotel Raama
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Error States (Invalid Token, Expired, Already Submitted)
  if (errorCode) {
    let title = 'Feedback Notice';
    let icon = AlertCircle;
    let iconBg = 'bg-amber-50 text-amber-600';

    if (errorCode === 'ALREADY_SUBMITTED') {
      title = 'Feedback Already Submitted';
      icon = CheckCircle2;
      iconBg = 'bg-blue-50 text-blue-600';
    } else if (errorCode === 'EXPIRED') {
      title = 'Link Expired';
      icon = Clock;
      iconBg = 'bg-red-50 text-red-600';
    } else if (errorCode === 'INVALID_TOKEN') {
      title = 'Invalid Feedback Link';
      icon = AlertCircle;
      iconBg = 'bg-amber-50 text-amber-600';
    }

    const IconComponent = icon;

    return (
      <div className="min-h-screen bg-[#F7F0DF] py-12 px-4 flex items-center justify-center">
        <SEO title="Feedback Notice | Hotel Raama" description="Hotel Raama Private Guest Feedback" noindex />
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl max-w-md w-full p-8 text-center border border-[#00174A]/10 shadow-lg"
        >
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-4`}>
            <IconComponent size={30} />
          </div>

          <h2 className="text-xl font-serif font-bold text-[#00174A] mb-2">{title}</h2>

          <p className="text-sm text-slate-600 font-sans leading-relaxed mb-6">
            {errorMessage || 'This feedback link is not valid or has already been used.'}
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-full bg-[#00174A] text-white hover:bg-[#071A3D] font-bold text-xs uppercase tracking-wider transition-all"
          >
            Visit Hotel Raama Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // 4. Feedback Form View
  return (
    <div className="min-h-screen bg-[#F7F0DF] py-8 sm:py-14 px-4 sm:px-6">
      <SEO
        title="Guest Feedback | Hotel Raama"
        description="Share your stay experience privately with Hotel Raama management."
        noindex
      />

      <div className="max-w-2xl mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00174A]/5 border border-[#00174A]/10 text-[#00174A] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck size={14} className="text-[#D6B369]" /> Private Guest Experience Form
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#00174A] tracking-tight">
            How was your stay with us?
          </h1>

          <p className="text-xs sm:text-sm text-[#4a5568] max-w-lg mx-auto mt-2 font-sans">
            Your review is completely confidential and shared directly with the hotel leadership to improve our hospitality.
          </p>

          {bookingInfo && (
            <div className="mt-4 inline-block bg-white/70 backdrop-blur-xs rounded-xl px-4 py-2 border border-[#00174A]/10 text-xs text-[#00174A]">
              <span className="font-semibold">Guest:</span> {bookingInfo.guestName} &nbsp;•&nbsp;{' '}
              <span className="font-semibold">Ref:</span> {bookingInfo.bookingId}
            </div>
          )}
        </div>

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. Overall Rating */}
          <StarRatingInput
            label="Overall Experience"
            description="How would you rate your entire stay at Hotel Raama?"
            icon={Sparkles}
            value={overallRating}
            onChange={setOverallRating}
          />

          {/* 2. Room Rating */}
          <StarRatingInput
            label="Room & Comfort"
            description="Bed quality, amenities, room space, and air-conditioning"
            icon={BedDouble}
            value={roomRating}
            onChange={setRoomRating}
          />

          {/* 3. Food Rating */}
          <StarRatingInput
            label="Food & Dining"
            description="Quality and taste at Swaad Restaurant & Liquid Lounge"
            icon={Utensils}
            value={foodRating}
            onChange={setFoodRating}
          />

          {/* 4. Cleanliness */}
          <StarRatingInput
            label="Cleanliness & Hygiene"
            description="Room sanitization, bathroom cleanliness, and hotel premises"
            icon={Sparkle}
            value={cleanlinessRating}
            onChange={setCleanlinessRating}
          />

          {/* 5. Staff & Service */}
          <StarRatingInput
            label="Staff & Hospitality"
            description="Front desk assistance, room service responsiveness, and courtesy"
            icon={UserCheck}
            value={serviceRating}
            onChange={setServiceRating}
          />

          {/* 6. Would You Recommend? */}
          <div className="bg-white/90 backdrop-blur-xs rounded-xl p-4 sm:p-5 border border-[#00174A]/10 shadow-xs">
            <h3 className="font-semibold text-sm sm:text-base text-[#00174A] mb-1">
              Would you recommend Hotel Raama to friends & family?
            </h3>
            <p className="text-[11px] sm:text-xs text-[#667085] mb-4">
              Your honest recommendation helps us know if we met your expectations.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecommendation(true)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  recommendation === true
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp size={16} /> Yes, Definitely
              </button>

              <button
                type="button"
                onClick={() => setRecommendation(false)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  recommendation === false
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown size={16} /> No, Needs Work
              </button>
            </div>
          </div>

          {/* 7. Suggestions (Optional) */}
          <div className="bg-white/90 backdrop-blur-xs rounded-xl p-4 sm:p-5 border border-[#00174A]/10 shadow-xs">
            <label htmlFor="feedback-comment" className="block font-semibold text-sm sm:text-base text-[#00174A] mb-1">
              Any Suggestions or Feedback? <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <p className="text-[11px] sm:text-xs text-[#667085] mb-3">
              Tell us what you liked most or what we can do better next time.
            </p>

            <textarea
              id="feedback-comment"
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comments here..."
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm text-[#00174A] focus:outline-hidden focus:ring-2 focus:ring-[#D6B369] focus:border-transparent placeholder:text-slate-400 resize-y"
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {comment.length} / 2000 characters
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-full bg-[#00174A] hover:bg-[#071A3D] active:scale-[0.99] text-white font-bold text-xs sm:text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-[#D6B369]/30"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Submitting Feedback...</span>
                </>
              ) : (
                <>
                  <Send size={16} className="text-[#D6B369]" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500 font-sans mt-3">
            🔒 Private & Confidential. This feedback will never be published publicly.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CustomerFeedbackPage;
