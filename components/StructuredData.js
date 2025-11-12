const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://buddybox.tv';

export function getWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BuddyBox.tv',
    alternateName: 'Couchplay',
    url: siteUrl,
    description: 'Play multiplayer party games with friends! Host games on your TV and join from any device.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/store?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BuddyBox.tv',
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    description: 'A platform for multiplayer party games',
    sameAs: [
      // Add your social media URLs here when available
      // 'https://twitter.com/buddybox',
      // 'https://facebook.com/buddybox',
    ],
  };
}

export function getGameStructuredData(game) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    description: game.description,
    gamePlatform: 'Web Browser',
    genre: game.category || 'Party Game',
    aggregateRating: game.averageRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: game.averageRating,
          ratingCount: game.totalRatings || 0,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: game.price ? (game.price * 0.01).toFixed(2) : '0',
      priceCurrency: 'USD',
      availability: game.isActive ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    numberOfPlayers: {
      minValue: game.minPlayers || 2,
      maxValue: game.maxPlayers || 8,
    },
  };
}

export function getBreadcrumbStructuredData(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
}

export function getSoftwareApplicationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BuddyBox.tv',
    applicationCategory: 'Game',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '100',
    },
  };
}

