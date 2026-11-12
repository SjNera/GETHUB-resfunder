/**
 * Where the landing page's two buttons go after the intro.
 *
 * Both go through sign-up / sign-in first, then continue to `next`. When the U2 (fund) and U3 (answer)
 * pages replace the placeholders, keep these paths or change `next`. Set to null and the intro's last
 * button just says "Got it" and closes.
 */
export const PUBLISH_URL: string | null = "/sign-in?next=/publish";
export const ANSWER_URL: string | null = "/sign-in?next=/surveys";
