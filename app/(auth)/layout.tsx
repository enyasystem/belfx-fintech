import React, { type ReactNode } from "react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  // Static-export compatible: do not use cookies() or server-side session logic
  // All auth/session logic should be handled client-side in your components
  return <>{children}</>;
}
