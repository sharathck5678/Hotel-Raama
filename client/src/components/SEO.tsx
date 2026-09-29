import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
}

const SITE_NAME = 'Hotel Raama';
const SITE_URL = 'https://hotelraama.com';
const DEFAULT_IMAGE = `${SITE_URL}/hotel-raama-logo.png`;

export const SEO = ({
  title,
  description,
  canonical,
  noindex = false,
  ogImage = DEFAULT_IMAGE,
}: SEOProps) => {
  const canonicalUrl = canonical
    ? `${SITE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
    : window.location.href.split('#')[0];

  useEffect(() => {
    document.title = title;

    const setMeta = (
      selector: string,
      attribute: 'name' | 'property',
      value: string
    ) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
      }

      element.setAttribute('content', value);
    };

    const setLink = (rel: string, href: string) => {
      let element = document.head.querySelector<HTMLLinkElement>(
        `link[rel="${rel}"]`
      );

      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }

      element.setAttribute('href', href);
    };

    // Standard SEO
    setMeta('meta[name="description"]', 'name', description);
    setMeta(
      'meta[name="robots"]',
      'name',
      noindex ? 'noindex, nofollow' : 'index, follow'
    );

    // Canonical
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('meta[property="og:type"]', 'property', 'website');
    setMeta('meta[property="og:title"]', 'property', title);
    setMeta('meta[property="og:description"]', 'property', description);
    setMeta('meta[property="og:url"]', 'property', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'property', SITE_NAME);
    setMeta('meta[property="og:image"]', 'property', ogImage);

    // Twitter / X
    setMeta('meta[name="twitter:card"]', 'name', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', title);
    setMeta('meta[name="twitter:description"]', 'name', description);
    setMeta('meta[name="twitter:image"]', 'name', ogImage);
  }, [title, description, canonicalUrl, noindex, ogImage]);

  return null;
};