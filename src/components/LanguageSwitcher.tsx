'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '../i18n/routing';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const t = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = [
    { code: 'zh-TW', label: '繁體中文', shortLabel: '繁中' },
    { code: 'zh-CN', label: '简体中文', shortLabel: '简中' }
  ];

  const currentLocaleData = locales.find(l => l.code === locale);

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
        title={t('language')}
      >
        <Globe className="w-4 h-4 text-indigo-500" />
        <span className="font-bold">{currentLocaleData?.shortLabel || locale}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                locale === loc.code ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
