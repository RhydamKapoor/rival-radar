import * as z from 'zod'

export const nameSchema = z
                            .string()
                            .trim()
                            .toLowerCase()
                            .min(2, {message: 'At least 2 characters!'})
                            .max(10, {message: 'At most 10 characters!'})

export const phoneNumberSchema = z
                                .string()
                                .refine((val) => (/^[6-9]\d{9}$/).test(val), {message: 'Invalid phone number!'})

export const emailVerificationSchema = z.string().email().toLowerCase().trim()
export const passwordVerificationSchema = z
                                          .string()
                                          .min(4, {message: "Password must be at least 4 characters"})
                                          .max(20, {message: "Password must be less than 20 characters"})
                                          .refine((value) => /[A-Z]/.test(value), {
                                            message: 'Password must contain at least one uppercase letter',
                                          })
                                          .refine((value) => /[a-z]/.test(value), {
                                            message: 'Password must contain at least one lowercase letter',
                                          })
                                          .refine((value) => /[!@#$%^&*(),.?":{}|<>]/.test(value), {
                                            message: 'Password must contain at least one special character',
                                          })
                                          .refine((value) => /[0-9]/.test(value), {
                                            message: 'Password must contain at least one numeric value',
                                          })
                                          .refine((val) => val.trim() !== "", {
                                            message: "Enter the password",
                                          });

export const signupSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailVerificationSchema,
    password: passwordVerificationSchema,
})
export const loginSchema = z.object({
    email: emailVerificationSchema,
    password: z.string().min(1, "Password is required")
})
export const editSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailVerificationSchema,
    newPassword:passwordVerificationSchema.optional().or(z.literal('')),
    oldPassword: z.string().min(1, "Invalid password")
})