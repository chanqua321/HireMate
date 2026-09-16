import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../../shared/layouts/MainLayout/MainLayout';

import { Home } from '../../features/home';
import { AuthContainer, EmailConfirmed } from '../../features/auth';
import { OnboardingProfile, OnboardingGoal, OnboardingSummary } from '../../features/onboarding';
import { Pricing, Checkout, PaymentSuccess, Invoice } from '../../features/billing';
import { Dashboard } from '../../features/dashboard';
import { InterviewSetup, InterviewRoom, Feedback, Questions } from '../../features/interview';

// Candidate Systems
import CareerOS from '../../pages/career/CareerOS';
import Leaderboard from '../../pages/gamification/Leaderboard';
import BlogList from '../../pages/blog/BlogList';
import BlogDetail from '../../pages/blog/BlogDetail';
import ResourcesPage from '../../pages/resources/ResourcesPage';

// Admin pages
import AdminLayout from '../../pages/admin/AdminLayout';
import AdminRouteGuard from '../../pages/admin/AdminRouteGuard';
import CandidateRouteGuard from '../../components/common/CandidateRouteGuard';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import AdminUsers from '../../pages/admin/AdminUsers';
import AdminInterviews from '../../pages/admin/AdminInterviews';
import AdminRevenue from '../../pages/admin/AdminRevenue';
import AdminPlans from '../../pages/admin/AdminPlans';
import AdminPromos from '../../pages/admin/AdminPromos';
import AdminTickets from '../../pages/admin/AdminTickets';
import AdminBlog from '../../pages/admin/AdminBlog';
import AdminFaq from '../../pages/admin/AdminFaq';
import AdminResources from '../../pages/admin/AdminResources';
import AdminConfig from '../../pages/admin/AdminConfig';
import AdminGamification from '../../pages/admin/AdminGamification';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public & Candidate App Routes */}
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

        {/* Onboarding (Unified In-Page Dashboard View) */}
        <Route path="onboarding" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding.html" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding/profile" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding-profile.html" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding/goal" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding-goal.html" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding/summary" element={<Navigate to="/dashboard?view=onboarding" replace />} />
        <Route path="onboarding-summary.html" element={<Navigate to="/dashboard?view=onboarding" replace />} />

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
        {/* Questions (Chỉ Admin mới có quyền truy cập) */}
        <Route path="questions" element={<AdminRouteGuard><Questions /></AdminRouteGuard>} />
        <Route path="questions.html" element={<AdminRouteGuard><Questions /></AdminRouteGuard>} />

        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard.html" element={<Dashboard />} />

        {/* Candidate Systems: Career OS, Gamification, Blog, Resources (Yêu cầu đăng nhập) */}
        <Route path="career" element={<CandidateRouteGuard><CareerOS /></CandidateRouteGuard>} />
        <Route path="career.html" element={<CandidateRouteGuard><CareerOS /></CandidateRouteGuard>} />
        <Route path="leaderboard" element={<CandidateRouteGuard><Leaderboard /></CandidateRouteGuard>} />
        <Route path="leaderboard.html" element={<CandidateRouteGuard><Leaderboard /></CandidateRouteGuard>} />
        <Route path="blog" element={<CandidateRouteGuard><BlogList /></CandidateRouteGuard>} />
        <Route path="blog.html" element={<CandidateRouteGuard><BlogList /></CandidateRouteGuard>} />
        <Route path="blog/:slug" element={<CandidateRouteGuard><BlogDetail /></CandidateRouteGuard>} />
        <Route path="resources" element={<CandidateRouteGuard><ResourcesPage /></CandidateRouteGuard>} />
        <Route path="resources.html" element={<CandidateRouteGuard><ResourcesPage /></CandidateRouteGuard>} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AdminLayout />
          </AdminRouteGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="interviews" element={<AdminInterviews />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="promos" element={<AdminPromos />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="faq" element={<AdminFaq />} />
        <Route path="resources" element={<AdminResources />} />
        <Route path="gamification" element={<AdminGamification />} />
        <Route path="config" element={<AdminConfig />} />
      </Route>

      {/* Wildcard redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};


