import { z } from 'zod';

export const startingCarSchema = z.object({
    odometer: z
        .string()
        .trim()
        .min(1, 'Odometer is required.')
        .refine((value) => /^\d{1,6}$/.test(value), 'Use up to 6 digits.'),
});

export type StartingCarFormValues = z.infer<typeof startingCarSchema>;