import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';

const ApplyPage = lazy(() =>
  import('@/pages/applications/ApplyPage').then((module) => ({ default: module.ApplyPage })),
);
const MyApplicationsPage = lazy(() =>
  import('@/pages/applications/MyApplicationsPage').then((module) => ({
    default: module.MyApplicationsPage,
  })),
);
const PriceAgreementPage = lazy(() =>
  import('@/pages/applications/PriceAgreementPage').then((module) => ({
    default: module.PriceAgreementPage,
  })),
);
const ProjectApplicationsPage = lazy(() =>
  import('@/pages/applications/ProjectApplicationsPage').then((module) => ({
    default: module.ProjectApplicationsPage,
  })),
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/auth/OAuthCallbackPage').then((module) => ({
    default: module.OAuthCallbackPage,
  })),
);
const RoleSelectionPage = lazy(() =>
  import('@/pages/auth/RoleSelectionPage').then((module) => ({
    default: module.RoleSelectionPage,
  })),
);
const SignupPage = lazy(() =>
  import('@/pages/auth/SignupPage').then((module) => ({ default: module.SignupPage })),
);
const ContractCreatePage = lazy(() =>
  import('@/pages/contracts/ContractCreatePage').then((module) => ({
    default: module.ContractCreatePage,
  })),
);
const ContractDetailPage = lazy(() =>
  import('@/pages/contracts/ContractDetailPage').then((module) => ({
    default: module.ContractDetailPage,
  })),
);
const DeliveryPage = lazy(() =>
  import('@/pages/deliveries/DeliveryPage').then((module) => ({ default: module.DeliveryPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })),
);
const PaymentFailPage = lazy(() =>
  import('@/pages/payments/PaymentFailPage').then((module) => ({
    default: module.PaymentFailPage,
  })),
);
const PaymentSuccessPage = lazy(() =>
  import('@/pages/payments/PaymentSuccessPage').then((module) => ({
    default: module.PaymentSuccessPage,
  })),
);
const PriceEstimatePage = lazy(() =>
  import('@/pages/PriceEstimatePage').then((module) => ({ default: module.PriceEstimatePage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const ProjectDetailPage = lazy(() =>
  import('@/pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })),
);
const ProjectFormPage = lazy(() =>
  import('@/pages/ProjectFormPage').then((module) => ({ default: module.ProjectFormPage })),
);
const ProjectListPage = lazy(() =>
  import('@/pages/ProjectListPage').then((module) => ({ default: module.ProjectListPage })),
);
const ContractReviewPage = lazy(() =>
  import('@/pages/reviews/ContractReviewPage').then((module) => ({
    default: module.ContractReviewPage,
  })),
);

export function App() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />

          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="select-role" element={<RoleSelectionPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/new" element={<ProjectFormPage />} />
          <Route path="projects/price-estimate" element={<PriceEstimatePage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
          <Route path="projects/:projectId/apply" element={<ApplyPage />} />
          <Route path="projects/:projectId/applications" element={<ProjectApplicationsPage />} />

          <Route path="applications/me" element={<MyApplicationsPage />} />
          <Route path="applications/:applicationId/price" element={<PriceAgreementPage />} />
          <Route path="applications/:applicationId/contract/new" element={<ContractCreatePage />} />
          <Route path="contracts/:contractId" element={<ContractDetailPage />} />
          <Route path="contracts/:contractId/delivery" element={<DeliveryPage />} />
          <Route path="contracts/:contractId/review" element={<ContractReviewPage />} />
          <Route path="payments/success" element={<PaymentSuccessPage />} />
          <Route path="payments/fail" element={<PaymentFailPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0071e3]" />
      <span className="sr-only">페이지 불러오는 중</span>
    </div>
  );
}
