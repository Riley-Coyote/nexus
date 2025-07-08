import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  try {
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Define protected routes that require authentication
    const protectedRoutes = [
      '/logbook',
      '/dream',
      '/profile',
      '/resonance-field'
    ];

    // Define auth routes that authenticated users shouldn't access
    const authRoutes = [
      '/auth',
      '/login',
      '/signup'
    ];

    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );

    const isAuthRoute = authRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );

    // Redirect unauthenticated users from protected routes to home
    if (!session && isProtectedRoute) {
      console.log(`🔒 Redirecting unauthenticated user from ${request.nextUrl.pathname} to /`);
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Redirect authenticated users from auth pages to feed
    if (session && isAuthRoute) {
      console.log(`🔒 Redirecting authenticated user from ${request.nextUrl.pathname} to /feed`);
      return NextResponse.redirect(new URL('/feed', request.url))
    }

    // Allow access to all other routes
    return res

  } catch (error) {
    console.error('❌ Middleware error:', error);
    
    // On error, allow the request to continue but don't redirect
    // This prevents middleware errors from breaking the app
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
} 