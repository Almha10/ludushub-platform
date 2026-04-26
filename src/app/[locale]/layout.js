import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Cairo, Montserrat } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import '../globals.css'; // Global styles

const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata = {
  title: 'LudusHub - Gaming Community',
  description: 'Connecting the future of gamers in Saudi Arabia and the world.',
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();
  
  // Set writing direction and primary font based on locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const primaryFont = locale === 'ar' ? cairo.className : montserrat.className;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${primaryFont} ${cairo.variable} ${montserrat.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />
          <main>
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
