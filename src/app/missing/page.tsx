import { notFound } from "next/navigation";

/**
 * Target of the Proxy's rewrite for unknown URLs. Calling notFound() before
 * any await lets this prerender as a static 404, so the response really is a 404.
 */
export default function Missing() {
  notFound();
}
