// The signed-in user's sign-up answers (age range, region and so on). Server only.
// Researchers do not see them yet: the sign-up text promises they appear only next to answers.
import { z } from 'zod';
import { requireSession } from '../auth/session';
import { getProfile, upsertProfile } from '../db/queries';
import { ApiFailure } from './errors';

const short = z.string().max(80);
const profileSchema = z
  .object({
    who: short,
    whoO: short,
    age: short,
    sex: short,
    sexO: short,
    region: short,
    city: short,
    c1: z.boolean(),
    c2: z.boolean(),
    g1: short,
    g1O: short,
    g2: short,
    g2O: short,
  })
  .partial()
  .strict();
const bodySchema = z.object({ profile: profileSchema });

export async function saveMyProfile(headers: Headers, body: unknown): Promise<{ saved: true }> {
  const me = await requireSession(headers);
  const { profile } = bodySchema.parse(body);
  // The app is for people 18 and older. The sign-up flow stops under-18 answers; the server does too.
  if (profile.age === 'under_18') throw new ApiFailure('INVALID_INPUT', 'ResFunder is for people 18 and older.');
  await upsertProfile(me.userId, profile);
  return { saved: true };
}

export async function getMyProfile(headers: Headers): Promise<{ profile: Record<string, unknown> | null }> {
  const me = await requireSession(headers);
  return { profile: await getProfile(me.userId) };
}
