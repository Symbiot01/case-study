import { z } from "zod";

const usernamePattern = /^[A-Za-z0-9_-]{3,32}$/;
const namePattern = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Enter a username.")
  .regex(usernamePattern, "Use 3–32 letters, numbers, _ or -.");

export const passwordSchema = z
  .string()
  .min(1, "Enter a password.")
  .refine(
    (value) => value.length >= 8 && value.length <= 64 && /[A-Za-z]/.test(value) && /\d/.test(value),
    "Use 8 or more characters, with a letter and a number.",
  );

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

function labeledName(empty: string, format: string, max: number, pattern?: RegExp) {
  return z
    .string()
    .trim()
    .min(1, empty)
    .max(max, format)
    .refine((value) => value.length >= 2 && (pattern ? pattern.test(value) : true), format);
}

export const brandNameSchema = labeledName(
  "Enter a brand name.",
  "Use 2–40 letters, numbers, spaces, or hyphens.",
  40,
  namePattern,
);

export const categoryNameSchema = labeledName(
  "Enter a category name.",
  "Use 2–40 letters, numbers, spaces, or hyphens.",
  40,
  namePattern,
);

export const productNameSchema = labeledName("Enter a product name.", "Use 2–80 characters.", 80);

export const priceSchema = z
  .string()
  .trim()
  .min(1, "Enter a price greater than 0.")
  .refine((value) => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return false;
    }
    const amount = Number(value);
    return amount > 0 && amount <= 999999.99;
  }, "Enter a price greater than 0, with at most 2 decimal places.");

export const stockSchema = z
  .string()
  .trim()
  .min(1, "Enter a whole number from 0 to 100000.")
  .refine((value) => /^\d+$/.test(value) && Number(value) <= 100000, "Enter a whole number from 0 to 100000.");

export const productSchema = z.object({
  name: productNameSchema,
  price: priceSchema,
  quantity: stockSchema,
  category_id: z.string().min(1, "Choose a category."),
});

export const categorySchema = z.object({
  name: categoryNameSchema,
});

export const brandSchema = z.object({
  name: brandNameSchema,
});

export const staffSchema = credentialsSchema;

export function orderQuantitySchema(available: number) {
  return z
    .string()
    .trim()
    .min(1, "Enter at least 1.")
    .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, "Enter at least 1.")
    .refine((value) => Number(value) <= available, `Only ${available} left.`);
}

export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}
