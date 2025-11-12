import SEO from './SEO';

export default function Layout({ 
  children, 
  title, 
  description,
  url,
  image,
  keywords,
  structuredData,
  noindex = false,
}) {
  return (
    <>
      <SEO
        title={title}
        description={description}
        url={url}
        image={image}
        keywords={keywords}
        structuredData={structuredData}
        noindex={noindex}
      />
      <main>{children}</main>
    </>
  );
}

