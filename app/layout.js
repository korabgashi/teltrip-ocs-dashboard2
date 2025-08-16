
export const metadata = { title: "OCS Dashboard" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily:'system-ui,-apple-system,Segoe UI,Roboto', background:'#0b1020', color:'#e9ecf1' }}>
        <div style={{ maxWidth: 1200, margin:'0 auto', padding: 24 }}>{children}</div>
      </body>
    </html>
  );
}
