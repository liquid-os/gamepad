import Head from 'next/head';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://buddybox.tv';
const siteName = 'BuddyBox.tv - Couchplay';
const defaultDescription = 'Play multiplayer party games with friends! Host games on your TV and join from any device. Create lobbies, play trivia, word games, and more.';

export default function SEO({
  title,
  description = defaultDescription,
  image = `${siteUrl}/favicon.ico`,
  type = 'website',
  url,
  keywords = ['party games', 'multiplayer games', 'couch co-op', 'trivia games', 'word games', 'social games', 'online party games'],
  noindex = false,
  nofollow = false,
  structuredData,
}) {
  const pageTitle = title ? `${title} | ${siteName}` : siteName;
  const pageUrl = url ? `${siteUrl}${url}` : siteUrl;
  const imageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={`${noindex ? 'noindex' : 'index'}, ${nofollow ? 'nofollow' : 'follow'}`} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="UTF-8" />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Additional SEO */}
      <meta name="theme-color" content="#DA2359" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="BuddyBox" />

      {/* Favicon */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/favicon.ico" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        Array.isArray(structuredData) ? (
          structuredData.map((data, index) => (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
            />
          ))
        ) : (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )
      )}
    </Head>
  );
}

