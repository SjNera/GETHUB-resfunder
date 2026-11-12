/**
 * Where the landing page's two buttons go after the intro.
 *
 * Both go through sign-up / sign-in for now. When the developer's Publish and
 * Answer pages exist, change `next` to those paths. Set to null and the
 * intro's last button just says "Got it" and closes. Set a URL
 * (a path like "/publish" or a full https:// link) to send people there.
 */
export const PUBLISH_URL: string | null = "/sign-in?next=/account";
export const ANSWER_URL: string | null = "/sign-in?next=/account";
