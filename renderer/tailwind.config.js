/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sidebar: '#1e293b', // Example dark blue/slate
                primary: '#3b82f6', // Example blue
                secondary: '#10b981', // Example green
                accent: '#f59e0b', // Example orange
                danger: '#ef4444', // Example red
            }
        },
    },
    plugins: [],
}
