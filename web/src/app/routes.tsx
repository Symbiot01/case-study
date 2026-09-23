import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAdmin, RequireTenant } from "@/auth/guards";
import { StoreShell } from "@/components/layout/StoreShell";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPage } from "@/pages/AdminPage";
import { BrandLoginPage, LoginPage, SignupPage } from "@/pages/AuthPages";
import { BrandsPage } from "@/pages/BrandsPage";
import { CartPage } from "@/pages/CartPage";
import { CataloguePage } from "@/pages/CataloguePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { FavouritesPage, OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { ProductPage } from "@/pages/ProductPage";
import { StudioPage } from "@/pages/StudioPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<StoreShell />}>
        <Route index element={<CataloguePage />} />
        <Route path="products/:productId" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="favourites" element={<FavouritesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path=":tenant/login" element={<BrandLoginPage />} />
        <Route path=":tenant/studio" element={<RequireTenant><StudioPage /></RequireTenant>} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
