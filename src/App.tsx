import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AppDetailPage from "./pages/AppDetailPage";
import DeveloperProfilePage from "./pages/DeveloperProfilePage";
import LiveSearchPage from "./pages/LiveSearchPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { I18nProvider } from "./lib/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app/:id" element={<AppDetailPage />} />
            <Route path="/developer/:id" element={<DeveloperProfilePage />} />
            <Route path="/search" element={<LiveSearchPage onAuthRequired={() => {}} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
