/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/web/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: "#0f172a",
                card: "#1e293b",
                accent: "#38bdf8",
                muted: "#94a3b8",
            },
        },
    },
    plugins: [],
}
