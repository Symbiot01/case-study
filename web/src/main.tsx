import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppErrorBoundary } from "@/app/ErrorBoundary";
import { queryClient } from "@/app/queryClient";
import { AppRoutes } from "@/app/routes";
import { AuthProvider } from "@/auth/session";
import { CartProvider } from "@/cart/cart";
import { ToastViewport } from "@/components/ui/ToastViewport";
import "@/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <ToastViewport />
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
