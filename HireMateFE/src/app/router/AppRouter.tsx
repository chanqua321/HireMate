import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../shared/layouts/MainLayout/MainLayout';

import { Home } from '../../features/home';
import { AuthContainer, EmailConfirmed } from '../../features/auth';
import { OnboardingProfile, OnboardingGoal, OnboardingSummary } from '../../features/onboarding';
import { Pricing, Checkout, PaymentSuccess, Invoice } from '../../features/billing';
import { Dashboard } from '../../features/dashboard';
import { InterviewSetup, InterviewRoom, Feedback, Questions } from '../../features/interview';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Home */}
        <Route index element={<Home />} />
        <Route path="index.html" element={<Home />} />

        {/* Auth */}
        <Route path="login" element={<AuthContainer initialMode="login" />} />
        <Route path="login.html" element={<AuthContainer initialMode="login" />} />
        <Route path="register" element={<AuthContainer initialMode="register" />} />
        <Route path="register.html" element={<AuthContainer initialMode="register" />} />
        <Route path="email-confirmed" element={<EmailConfirmed />} />
        <Route path="email-confirmation" element={<EmailConfirmed />} />

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
  );
};

