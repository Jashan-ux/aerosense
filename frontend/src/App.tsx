import React from 'react';
import { createRouter, createRoute, createRootRoute, RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import DashboardLayout from './components/layout/DashboardLayout';
import FleetOverview from './pages/FleetOverview';
import TurbineDeepDive from './pages/TurbineDeepDive';
import BusinessImpact from './pages/BusinessImpact';
import ComponentAnalysis from './pages/ComponentAnalysis';
import HistoricalAnalytics from './pages/HistoricalAnalytics';
import { Toaster } from './components/ui/sonner';

const rootRoute = createRootRoute({
  component: DashboardLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: FleetOverview,
});

const turbineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/turbine/$id',
  component: TurbineDeepDive,
});

const businessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/business',
  component: BusinessImpact,
});

const componentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/component/$type',
  component: ComponentAnalysis,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: HistoricalAnalytics,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  turbineRoute,
  businessRoute,
  componentRoute,
  analyticsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="bottom-right" />
      </NotificationProvider>
    </ThemeProvider>
  );
}
