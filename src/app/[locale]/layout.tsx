import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import { BookSearch, Package, Search, Sword, FileChartColumn } from "lucide-react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing, Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import LanguageSwitcher from "@/components/LanguageSwitcher";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Metadata'});

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  const tNav = await getTranslations({locale, namespace: 'Navigation'});
  const tFooter = await getTranslations({locale, namespace: 'Footer'});

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col text-gray-900 dark:text-gray-100`}>
        <NextIntlClientProvider messages={messages}>
          <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg md:text-xl tracking-tight text-indigo-600 dark:text-indigo-400 shrink-0">
                <BookSearch className="w-5 h-5 md:w-6 md:h-6" />
                <span className="hidden sm:inline">Fusion Planner</span>
              </Link>
              <div className="flex items-center gap-2 md:gap-6">
                <nav className="flex items-center gap-2 md:gap-6 overflow-x-auto no-scrollbar">
                  <Link href="/deviations" className="text-sm font-medium hover:text-indigo-600 transition-colors flex items-center gap-1.5 whitespace-nowrap px-1 md:px-0">
                    <Package className="w-4 h-4" /> 
                    <span className="hidden sm:inline">{tNav('deviations')}</span>
                  </Link>
                  <Link href="/skills" className="text-sm font-medium hover:text-indigo-600 transition-colors flex items-center gap-1.5 whitespace-nowrap px-1 md:px-0">
                    <Sword className="w-4 h-4" /> 
                    <span className="hidden sm:inline">{tNav('skills')}</span>
                  </Link>
                  <Link href="/filter" className="bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400 p-2 md:px-4 md:py-2 rounded-xl text-sm font-medium hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all flex items-center gap-1.5 shrink-0">
                    <Search className="w-4 h-4" /> 
                    <span className="hidden sm:inline">{tNav('filter')}</span>
                  </Link>
                </nav>
                <div className="shrink-0">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8 flex-1">
            {children}
          </main>
          <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-auto bg-white/50 dark:bg-gray-900/50 ">
            <div className="container lg:relative lg:justify-between mx-auto px-4 flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4 order-2 md:order-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileChartColumn size={14} />
                  <span>{tFooter('dataSource')}</span>
                  <Link
                      href="https://www.bilibili.com/video/BV1oqNFzREK3"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 underline underline-offset-4 decoration-gray-400"
                  >{tFooter('bilibiliLink')}</Link>
                </div>
              </div>
              
              <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 text-sm text-gray-500 order-3 md:order-2">
                &copy; 2026 Once Human Deviation Fusion Tool.
              </div>

              <div className="flex items-center gap-6 order-1 md:order-3">
                <Link 
                  href="https://discord.gg/UMeUNQssfE"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <Image 
                    src="/discord-icon.svg" 
                    alt="Discord" 
                    width={20} 
                    height={20} 
                    className="w-5 h-5"
                  />
                </Link>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
