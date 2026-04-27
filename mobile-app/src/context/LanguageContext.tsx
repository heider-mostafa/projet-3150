import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';
import { useAuth } from './AuthContext';

interface LanguageContextType {
    locale: string;
    setLocale: (locale: string) => void;
    t: (scope: string, options?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    locale: 'en',
    setLocale: () => { },
    t: (scope: string) => scope,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [locale, setLocaleState] = useState(i18n.locale);

    // Sync with user's saved preference from DB
    useEffect(() => {
        const savedLang = (profile as any)?.preferred_language;
        if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
            i18n.locale = savedLang;
            setLocaleState(savedLang);
        }
    }, [profile]);

    const setLocale = useCallback((newLocale: string) => {
        i18n.locale = newLocale;
        setLocaleState(newLocale);
    }, []);

    const t = useCallback((scope: string, options?: Record<string, any>) => {
        return i18n.t(scope, options);
    }, [locale]); // re-create when locale changes to trigger re-renders

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
