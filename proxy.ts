export { auth as proxy } from "@/lib/auth/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/library/:path*",
    "/search/:path*",
    "/settings/:path*",
  ],
};
