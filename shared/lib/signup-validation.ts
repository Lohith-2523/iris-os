import { z } from 'zod';

export const signupEmailSchema = z.string().trim().toLowerCase().max(254).email('Enter a valid email address, such as name@agency.com.');
export const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: signupEmailSchema,
  phone: z.string().trim().min(5).max(40),
  password: z.string().min(6).max(128),
  confirmPassword: z.string(),
  recaptchaToken: z.string().min(20).max(4_096),
}).refine(value => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
