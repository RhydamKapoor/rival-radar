'use client'
import React, { createContext, useEffect, useState } from 'react';
import { usePrefersTheme } from 'react-haiku';

type ThemeType = "light" | "dark" | '';
type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

  export default function ThemeProvider({ children }: { children: React.ReactNode }) {
     const prefersTheme = usePrefersTheme('dark');
    const [theme, setTheme] = useState<ThemeType>(prefersTheme);

    useEffect(() => {
      // Load saved theme or system preference
      const savedTheme = localStorage.getItem('theme') as ThemeType | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    }, []);
  
    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }, [theme]);
  
    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  };

