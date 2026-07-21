import "./globals.css";

export const metadata = {
  title: "Batchlab Photo Engine",
  description: "Advanced batch-based real estate photo enhancement and staging studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#FBFBFB]">
        {children}
      </body>
    </html>
  );
}

