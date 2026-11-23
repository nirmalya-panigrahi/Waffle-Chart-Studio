import React from 'react';

export interface StudioFooterLink {
  id: 'waffle' | 'bars' | 'sankey' | 'all';
  label: string;
  href: string;
  showDot: boolean;
}

export const STUDIO_FOOTER_LINKS: StudioFooterLink[] = [
  {
    id: 'waffle',
    label: 'Waffle Chart Studio',
    href: 'https://nirmalya-panigrahi.github.io/Waffle-Chart-Studio/',
    showDot: true,
  },
  {
    id: 'bars',
    label: 'Exec Bar Charts',
    href: 'https://nirmalya-panigrahi.github.io/Exec-Bar-Charts/',
    showDot: true,
  },
  {
    id: 'sankey',
    label: 'Sankey Chart Studio',
    href: 'https://nirmalya-panigrahi.github.io/Sankey-Chart-Studio/',
    showDot: true,
  },
  {
    id: 'all',
    label: 'All chart makers →',
    href: 'https://nirmalya-panigrahi.github.io/Executive-Charts/',
    showDot: false,
  },
];

export function normalizeFooterPathname(pathname: string): string {
  return pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
}

export function isCurrentFooterHref(href: string, currentPathname: string): boolean {
  try {
    const linkPath = normalizeFooterPathname(new URL(href).pathname);
    return linkPath === normalizeFooterPathname(currentPathname);
  } catch {
    return false;
  }
}

export const StudioFooter: React.FC = () => {
  const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <footer className="csf shrink-0" aria-label="More chart makers from the studio">
      <div className="csf-inner">
        <p className="csf-label">More chart makers from the studio</p>
        <nav className="csf-links" aria-label="Chart maker tools">
          {STUDIO_FOOTER_LINKS.map((item) => {
            const isCurrent = isCurrentFooterHref(item.href, currentPathname);
            return (
              <a
                key={item.id}
                className={`csf-link csf-link--${item.id}`}
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={isCurrent ? (e) => e.preventDefault() : undefined}
              >
                {item.showDot && <span className="csf-dot" aria-hidden="true" />}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </footer>
  );
};
