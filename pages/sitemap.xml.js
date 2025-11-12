import { getWebsiteStructuredData } from '../components/StructuredData';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://buddybox.tv';

function generateSiteMap() {
  // Get all static pages
  const staticPages = [
    {
      url: '',
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      url: '/store',
      changefreq: 'weekly',
      priority: 0.9,
    },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${staticPages
       .map((page) => {
         return `
       <url>
           <loc>${siteUrl}${page.url}</loc>
           <changefreq>${page.changefreq}</changefreq>
           <priority>${page.priority}</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  // We generate the XML sitemap with the posts data
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;

