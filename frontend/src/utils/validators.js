import { z } from "zod";

import { getDefaultCountry, validateAndFormatPhoneNumber } from "./phoneNumber";
import { isValidSkuFormat, normalizeSkuForSubmit } from "./sku";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .transform((value) => normalizeSkuForSubmit(value))
    .refine(isValidSkuFormat, "SKU must be 3-50 characters using uppercase letters, digits, and single hyphens."),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  quantity_in_stock: z.coerce.number().int().min(0, "Quantity cannot be negative"),
});

export function getCustomerFormDefaultValues() {
  return {
    full_name: "",
    email: "",
    phone_country: getDefaultCountry(),
    national_phone_number: "",
  };
}

export const customerSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    phone_country: z.string().min(2, "Select a country/region code"),
    national_phone_number: z.string().min(1, "Phone number is required."),
  })
  .superRefine((value, context) => {
    const result = validateAndFormatPhoneNumber(value.national_phone_number, value.phone_country);

    if (!result.isValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["national_phone_number"],
        message: result.error,
      });
    }
  });

export const orderSchema = z
  .object({
    customer_id: z.coerce.number().int().positive("Select a customer"),
    items: z
      .array(
        z.object({
          product_id: z.coerce.number().int().positive("Select a product"),
          quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
        }),
      )
      .min(1, "Add at least one product"),
  })
  .superRefine((value, context) => {
    const productIds = value.items.map((item) => item.product_id);
    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Each product can only be added once. Update the quantity instead.",
      });
    }
  });
