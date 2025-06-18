import React, { type ReactNode } from "react"

// You might want a shared Navbar/Sidebar for the main app layout here
// For now, it's a simple pass-through if authenticated.

export default function MainAppLayout({
  children,
}: {
  children: ReactNode
}) {
  // Static-export compatible: do not use cookies() or server-side session logic
  // All auth/session logic should be handled client-side in your components
  return <>{children}</>;
}
