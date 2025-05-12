'use client'
import { useContext } from "react";
import { ThemeContext } from "@/context/Theme";
import { Moon, Sun } from "lucide-react";


export default function ThemeSwitcher() {
  const { theme, setTheme } = useContext(ThemeContext)!;
  return (
      <button className="cursor-pointer " onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        {theme === "dark" ? <Moon size={22} /> : <Sun size={22} />}
      </button>
  );
}
