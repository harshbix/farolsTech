import { Helmet } from 'react-helmet-async';

export default function SEOHead({
  title,
  description,
  image,
  type = 'website',
  author,
  publishedAt,
  slug,
}) {
  const siteTitle = 'Farols';
  const fullTitle = title ? `${title} – ${siteTitle}` : `${siteTitle} – Tanzania's Digital News Platform`;
  const canonical = slug ? `https://farols.co.tz/posts/${slug}` : 'https://farols.co.tz';
  const ogImage = image || 'https://farols.co.tz/og-default.jpg';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:site_name"   content={siteTitle} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />

      {/* JSON-LD Article structured data */}
      {type === 'article' && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description,
            image: ogImage,
            author: { '@type': 'Person', name: author },
            datePublished: publishedAt ? new Date(publishedAt * 1000).toISOString() : undefined,
            publisher: {
              '@type': 'Organization',
              name: 'Farols',
              url: 'https://farols.co.tz',
            },
          })}
        </script>
      )}
    </Helmet>
  );
}
