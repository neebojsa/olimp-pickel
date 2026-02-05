import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import Login from "./pages/Login";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Invoicing from "./pages/Invoicing";
import Accounting from "./pages/Accounting";
import CostManagement from "./pages/CostManagement";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import OtherDocs from "./pages/OtherDocs";
import DeliveryNoteView from "./pages/DeliveryNoteView";
import OrderConfirmationView from "./pages/OrderConfirmationView";
import Settings from "./pages/Settings";
import StaffAndLocation from "./pages/StaffAndLocation";
import NotFound from "./pages/NotFound";

const ProtectedRoute: React.FC<{ children: React.ReactNode; page?: string }> = ({ children, page }) => {
  const { staff, isLoading, hasPagePermission } = useAuth();
  
  // Debug logging
  console.log('ProtectedRoute - staff:', staff);
  console.log('ProtectedRoute - page:', page);
  console.log('ProtectedRoute - hasPagePermission:', page ? hasPagePermission(page) : 'no page specified');
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!staff) {
    console.log('No staff, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (page && !hasPagePermission(page)) {
    console.log('No page permission, redirecting to inventory');
    return <Navigate to="/inventory" replace />;
  }
  
  console.log('ProtectedRoute - rendering children');
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { staff } = useAuth();
  const { loadUserTheme } = useTheme();

  useEffect(() => {
    if (staff) {
      loadUserTheme();
    }
  }, [staff, loadUserTheme]);

  // Load system settings (title and favicon) on app startup
  useEffect(() => {
    const loadSystemSettings = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        // Update document title
        if (data.app_title) {
          document.title = data.app_title;
        }
        
        // Update favicon
        if (data.favicon_url) {
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
          existingLinks.forEach(link => link.remove());
          
          // Add new favicon link
          const link = document.createElement('link');
          link.rel = 'icon';
          link.type = data.favicon_url.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/x-icon';
          link.href = data.favicon_url;
          document.head.appendChild(link);
        }
      }
    };

    loadSystemSettings();
  }, []);

  return (
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
              <Route path="/cost-management" element={
                <ProtectedRoute page="cost-management">
                  <Layout><CostManagement /></Layout>
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
              <Route path="/delivery-note/:id" element={
                <ProtectedRoute page="other-docs">
                  <Layout><DeliveryNoteView /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/order-confirmation/:id" element={
                <ProtectedRoute page="other-docs">
                  <Layout><OrderConfirmationView /></Layout>
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
  );
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
