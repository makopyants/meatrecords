import { z } from "zod";

export const CreateArtistSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, {
    message: "Только строчные буквы, цифры и дефис",
  }),
});

export type CreateArtist = z.infer<typeof CreateArtistSchema>;
