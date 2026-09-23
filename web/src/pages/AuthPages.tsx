import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api, ApiError } from "@/api/client";
import type { Brand, SignupResult } from "@/api/types";
import { destinationAfterLogin } from "@/auth/guards";
import { useAuth } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SystemState } from "@/components/ui/SystemState";
import { brandSchema, credentialsSchema } from "@/lib/schemas";
import { toastFailure, toastStore } from "@/lib/toast";
import { useDocumentTitle } from "@/lib/title";

function CredentialsForm({
  defaultUsername = "",
  submitLabel,
  busyLabel,
  passwordAutoComplete,
  usernameHint,
  onSubmit,
}: {
  defaultUsername?: string;
  submitLabel: string;
  busyLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  usernameHint?: string;
  onSubmit: (values: { username: string; password: string }) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: defaultUsername, password: "" },
  });

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Username" autoComplete="username" hint={usernameHint} error={form.formState.errors.username?.message} {...form.register("username")} />
      <Field label="Password" type="password" autoComplete={passwordAutoComplete} error={form.formState.errors.password?.message} {...form.register("password")} />
      <Button type="submit" busy={form.formState.isSubmitting} busyLabel={busyLabel} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

function AuthLayout({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  aside: string;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-14 md:px-10 lg:grid-cols-2">
      <section>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-light tracking-tight md:text-5xl">{title}</h1>
        <div className="mt-8">{children}</div>
      </section>
      <aside className="hidden border border-line bg-surface p-8 lg:block">
        <p className="font-display text-3xl leading-snug">{aside}</p>
      </aside>
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  useDocumentTitle("Sign up · E-commerce");

  async function onSubmit(values: { username: string; password: string }) {
    try {
      await api<SignupResult>("/auth/signup", {
        method: "POST",
        auth: false,
        body: JSON.stringify(values),
      });
      toastStore.success("Account created", "Log in to continue.");
      navigate("/login", { state: { username: values.username } });
    } catch (error) {
      toastFailure(error);
    }
  }

  return (
    <AuthLayout eyebrow="Patron ledger" title="Create your account" aside="Usernames are unique. After sign-up, you log in to shop.">
      <CredentialsForm
        submitLabel="Create account"
        busyLabel="Creating account…"
        passwordAutoComplete="new-password"
        usernameHint="Usernames are unique."
        onSubmit={onSubmit}
      />
      <p className="mt-6 text-sm">
        Already have an account? <Link to="/login" className="underline underline-offset-4">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [brandOpen, setBrandOpen] = useState(false);
  const preset = (location.state as { username?: string } | null)?.username ?? "";
  const brandForm = useForm({ resolver: zodResolver(brandSchema), defaultValues: { name: "" } });
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Brand[]>("/brands"),
    enabled: brandOpen,
    meta: { toast: false },
  });

  useDocumentTitle("Log in · E-commerce");

  async function onSubmit(values: { username: string; password: string }) {
    try {
      const me = await login(values);
      navigate(destinationAfterLogin(me.role, searchParams.get("next")), { replace: true });
    } catch (error) {
      toastStore.failure(error instanceof ApiError ? error.message : "Sign-in failed. Check your username and password.");
    }
  }

  function openBrand(values: { name: string }) {
    if (!brands.data) {
      toastStore.failure("The brand list could not be loaded.");
      return;
    }
    const match = brands.data.find(
      (brand) => brand.name.localeCompare(values.name, undefined, { sensitivity: "accent" }) === 0,
    );
    if (!match) {
      brandForm.setError("name", { message: "That brand does not exist." });
      return;
    }
    navigate(`/${encodeURIComponent(match.name)}/login`);
  }

  return (
    <AuthLayout eyebrow="Private client" title="Log in" aside="Shoppers, brand staff, and admins use this door to enter the store.">
      <CredentialsForm
        defaultUsername={preset}
        submitLabel="Log in"
        busyLabel="Signing in…"
        passwordAutoComplete="current-password"
        onSubmit={onSubmit}
      />
      <p className="mt-6 text-sm">
        New here? <Link to="/signup" className="underline underline-offset-4">Create an account</Link>
      </p>
      <button type="button" className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] underline underline-offset-4" onClick={() => setBrandOpen((open) => !open)}>
        Brand staff? Open your brand login
      </button>
      {brandOpen ? (
        <form
          className="mt-4 space-y-4 border border-line bg-surface p-4"
          onSubmit={brandForm.handleSubmit((name) => openBrand(name))}
          noValidate
        >
          <Field label="Brand name" autoComplete="organization" error={brandForm.formState.errors.name?.message} {...brandForm.register("name")} />
          <Button type="submit" variant="secondary">
            Continue
          </Button>
        </form>
      ) : null}
    </AuthLayout>
  );
}

export function BrandLoginPage() {
  const params = useParams();
  const tenant = params.tenant ?? "";
  const { login } = useAuth();
  const navigate = useNavigate();
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Brand[]>("/brands"),
  });

  const canonical = (brands.data ?? []).find(
    (brand) => brand.name.localeCompare(tenant, undefined, { sensitivity: "accent" }) === 0,
  );

  useDocumentTitle(`${canonical?.name ?? tenant} login · E-commerce`);

  useEffect(() => {
    if (canonical && canonical.name !== tenant) {
      navigate(`/${encodeURIComponent(canonical.name)}/login`, { replace: true });
    }
  }, [canonical, navigate, tenant]);

  async function onSubmit(values: { username: string; password: string }) {
    try {
      await login({ ...values, tenantName: canonical?.name ?? tenant });
      navigate(`/${encodeURIComponent(canonical?.name ?? tenant)}/studio`, { replace: true });
    } catch (error) {
      toastFailure(error, "Sign-in failed. Check your username and password.");
    }
  }

  if (brands.isPending) {
    return <p className="px-5 py-16 text-sm text-muted">Loading brand…</p>;
  }

  if (brands.isError) {
    return (
      <SystemState
        title="The brand list could not be loaded."
        body="Try again in a moment."
        action={{ href: "/brands", label: "Browse brands" }}
      />
    );
  }

  if (brands.isSuccess && !canonical) {
    return (
      <SystemState
        title="That brand does not exist."
        body="Check the brand name and try again."
        action={{ href: "/brands", label: "Browse brands" }}
      />
    );
  }

  return (
    <AuthLayout
      eyebrow={canonical?.name ?? tenant}
      title="Brand login"
      aside={`This signs you into ${canonical?.name ?? tenant} only.`}
    >
      <p className="mb-6 text-sm text-muted">This signs you into {canonical?.name ?? tenant} only.</p>
      <CredentialsForm
        submitLabel="Log in"
        busyLabel="Signing in…"
        passwordAutoComplete="current-password"
        onSubmit={onSubmit}
      />
      <p className="mt-6 text-sm">
        Shopping instead? <Link to="/login" className="underline underline-offset-4">Customer login</Link>
      </p>
    </AuthLayout>
  );
}
