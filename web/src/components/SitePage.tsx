import type { ReactNode } from 'react';
import { SiteFooter } from './SiteFooter';
import { SiteHeader, type SiteNavKey } from './SiteHeader';

interface SitePageProps {
  active?: SiteNavKey;
  children: ReactNode;
}

export function SitePage({ active, children }: SitePageProps) {
  return (
    <div className="site-page">
      <SiteHeader active={active} />
      {children}
      <SiteFooter />
    </div>
  );
}
