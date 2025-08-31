import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Invoicing from "./pages/Invoicing";
import Accounting from "./pages/Accounting";
import Labels from "./pages/Labels";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import OtherDocs from "./pages/OtherDocs";
import Settings from "./pages/Settings";
import StaffAndLocation from "./pages/StaffAndLocation";
import NotFound from "./pages/NotFound";

const ProtectedRoute: React.FC<{ children: React.ReactNode; page?: string }> = ({ children, page }) => {
  const { staff, isLoading, hasPagePermission } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!staff) {
    return <Navigate to="/login" replace />;
  }
  
  if (page && !hasPagePermission(page)) {
    return <Navigate to="/inventory" replace />;
  }
  
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/inventory" replace />} />
              <Route path="/inventory" element={
                <ProtectedRoute page="inventory">
                  <Layout><Inventory /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/work-orders" element={
                <ProtectedRoute page="work-orders">
                  <Layout><WorkOrders /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/invoicing" element={
                <ProtectedRoute page="invoicing">
                  <Layout><Invoicing /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/accounting" element={
                <ProtectedRoute page="accounting">
                  <Layout><Accounting /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/labels" element={
                <ProtectedRoute page="labels">
                  <Layout><Labels /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/sales" element={
                <ProtectedRoute page="sales">
                  <Layout><Sales /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute page="customers">
                  <Layout><Customers /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/suppliers" element={
                <ProtectedRoute page="suppliers">
                  <Layout><Suppliers /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/other-docs" element={
                <ProtectedRoute page="other-docs">
                  <Layout><OtherDocs /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute page="settings">
                  <Layout><Settings /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/staff-and-location" element={
                <ProtectedRoute page="settings">
                  <Layout><StaffAndLocation /></Layout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
