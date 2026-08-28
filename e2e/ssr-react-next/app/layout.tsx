import type { ReactNode } from "react";

import RegisterElements from "./RegisterElements";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterElements />
        {children}
      </body>
    </html>
  );
}
