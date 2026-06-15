import { useEffect } from "react";

import useThemeStore
from "../store/themeStore";

export default function ThemeToggle() {

    const {
        darkMode,
        toggleTheme
    } = useThemeStore();

    useEffect(() => {

        if (darkMode) {

            document.documentElement
                .classList
                .add("dark");

        } else {

            document.documentElement
                .classList
                .remove("dark");
        }

    }, [darkMode]);

    return (

        <button
            onClick={toggleTheme}
            className="
            px-3
            py-1
            border
            rounded
            "
        >
            {darkMode
                ? "☀️"
                : "🌙"}
        </button>

    );
}