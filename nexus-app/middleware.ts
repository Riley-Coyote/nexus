import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  try {
    // Create a Supabase client configured for server-side rendering
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Define protected routes
    const protectedRoutes = [
      '/logbook',
      '/dream',
      '/profile',
      '/resonance-field'
    ];

    // Define auth routes (where authenticated users shouldn't go)
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
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from auth routes to feed
    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL('/feed', request.url));
    }

    return response;
  } catch (error) {
    // If middleware fails, allow the request to continue
    console.error('Middleware error:', error);
    return response;
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 