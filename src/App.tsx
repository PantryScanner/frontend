import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Dispense from "./pages/Dispense";
import DispensaDetail from "./pages/DispensaDetail";
import ProductDetail from "./pages/ProductDetail";
import Dispositivi from "./pages/Dispositivi";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            } />
            <Route path="/inventario" element={
              <ProtectedRoute><AppLayout><Inventario /></AppLayout></ProtectedRoute>
            } />
            <Route path="/prodotti/:id" element={
              <ProtectedRoute><AppLayout><ProductDetail /></AppLayout></ProtectedRoute>
            } />
            <Route path="/dispense" element={
              <ProtectedRoute><AppLayout><Dispense /></AppLayout></ProtectedRoute>
            } />
            <Route path="/dispense/:id" element={
              <ProtectedRoute><AppLayout><DispensaDetail /></AppLayout></ProtectedRoute>
            } />
            <Route path="/dispositivi" element={
              <ProtectedRoute><AppLayout><Dispositivi /></AppLayout></ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
