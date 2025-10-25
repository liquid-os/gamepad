import Head from 'next/head';

export default function Layout({ children, title = 'Party Game Hub' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta charSet="UTF-8" />
      </Head>
      <main>{children}</main>
    </>
  );
}

