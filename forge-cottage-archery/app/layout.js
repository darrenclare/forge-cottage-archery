import "./globals.css";

export const metadata = {
  title: "Forge Cottage Archery",
  description: "The Forge Cottage archery scoreboard - live scoring and all-time bragging rights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
