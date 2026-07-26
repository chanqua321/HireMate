import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '../layouts/MainLayout';

// Pages
import { Home } from '../pages/home/Home';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { OnboardingProfile } from '../pages/onboarding/OnboardingProfile';
import { OnboardingGoal } from '../pages/onboarding/OnboardingGoal';
import { OnboardingSummary } from '../pages/onboarding/OnboardingSummary';
import { Pricing } from '../pages/billing/Pricing';
import { Checkout } from '../pages/billing/Checkout';
import { PaymentSuccess } from '../pages/billing/PaymentSuccess';
import { Invoice } from '../pages/billing/Invoice';
import { InterviewSetup } from '../pages/interview/InterviewSetup';
import { InterviewRoom } from '../pages/interview/InterviewRoom';
import { Feedback } from '../pages/interview/Feedback';
import { Questions } from '../pages/interview/Questions';
import { Dashboard } from '../pages/dashboard/Dashboard';

export const AppRouter: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MainLayout />}>
          {/* Home */}
          <Route index element={<Home />} />
          <Route path="index.html" element={<Home />} />

          {/* Auth */}
          <Route path="login" element={<Login />} />
          <Route path="login.html" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="register.html" element={<Register />} />

          {/* Onboarding */}
          <Route path="onboarding/profile" element={<OnboardingProfile />} />
          <Route path="onboarding-profile.html" element={<OnboardingProfile />} />
          <Route path="onboarding/goal" element={<OnboardingGoal />} />
          <Route path="onboarding-goal.html" element={<OnboardingGoal />} />
          <Route path="onboarding/summary" element={<OnboardingSummary />} />
          <Route path="onboarding-summary.html" element={<OnboardingSummary />} />

          {/* Billing & Pricing */}
          <Route path="pricing" element={<Pricing />} />
          <Route path="pricing.html" element={<Pricing />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout.html" element={<Checkout />} />
          <Route path="payment-success" element={<PaymentSuccess />} />
          <Route path="payment-success.html" element={<PaymentSuccess />} />
          <Route path="invoice" element={<Invoice />} />
          <Route path="invoice.html" element={<Invoice />} />

          {/* AI Interview */}
          <Route path="interview-setup" element={<InterviewSetup />} />
          <Route path="interview-setup.html" element={<InterviewSetup />} />
          <Route path="interview-room" element={<InterviewRoom />} />
          <Route path="interview-room.html" element={<InterviewRoom />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="feedback.html" element={<Feedback />} />
          <Route path="questions" element={<Questions />} />
          <Route path="questions.html" element={<Questions />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard.html" element={<Dashboard />} />

          {/* Wildcard redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};
