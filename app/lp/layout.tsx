/**
 * Dedicated "ads" layout for paid Meta traffic. These pages drop the site
 * navigation by default (only logo + the single primary CTA remain in the
 * header) — site nav costs ~10-15 % of conversion on paid traffic. Site
 * chrome lives in the page component (LandingC), gated by its showNav prop.
 */
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <div data-traffic="ads">{children}</div>;
}
