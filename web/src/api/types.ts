export type Role = "USER" | "TENANT" | "ADMIN";

export type Me = {
  id: number;
  username: string;
  role: Role;
  tenant_id: number | null;
  tenant_name: string | null;
};

export type Tokens = {
  access_token: string;
  refresh_token: string | null;
  expires_in: number | null;
  token_type: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  tenant_id: number;
  category_id: number;
  tenant_name: string | null;
  category_name: string | null;
  has_image: boolean;
  image_version: string | null;
};

export type ProductPage = {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type Category = {
  id: number;
  name: string;
};

export type Brand = {
  id: number;
  name: string;
};

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string | null;
  quantity: number;
  price: number;
};

export type Order = {
  id: number;
  user_id: number;
  total_quantity: number;
  total_amount: number;
  items: OrderItem[];
};

export type OrderPage = {
  orders: Order[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type OrderCreated = {
  message: string;
  order_id: number;
  total_quantity: number;
  total_amount: number;
  items: Array<{
    product_id: number;
    product_name: string | null;
    quantity: number;
    price: number;
  }>;
};

export type TenantSummary = {
  id: number;
  name: string;
  product_count: number;
  staff_count: number;
};

export type StaffUser = {
  id: number;
  username: string;
  role: string | null;
  tenant_id: number;
};

export type SignupResult = {
  message: string;
  user_id: number;
  username: string;
};
