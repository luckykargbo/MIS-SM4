"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dummy-convex-url.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
