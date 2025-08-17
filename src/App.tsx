import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Navigate } from "react-router-dom";
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

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
            <Route path="/work-orders" element={<Layout><WorkOrders /></Layout>} />
            <Route path="/invoicing" element={<Layout><Invoicing /></Layout>} />
            <Route path="/accounting" element={<Layout><Accounting /></Layout>} />
            <Route path="/labels" element={<Layout><Labels /></Layout>} />
            <Route path="/sales" element={<Layout><Sales /></Layout>} />
            <Route path="/customers" element={<Layout><Customers /></Layout>} />
            <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
            <Route path="/other-docs" element={<Layout><OtherDocs /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/staff-and-location" element={<Layout><StaffAndLocation /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
