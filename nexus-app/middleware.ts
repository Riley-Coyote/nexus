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
    
    // Get session - simplified, no complex error handling
    const { data: { session } } = await supabase.auth.getSession()

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

    // Simple redirects - let AuthContext handle complex auth state
    if (!session && isProtectedRoute) {
      const redirectUrl = new URL('/', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from auth pages to the main feed
    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
    
  } catch (error) {
    // On any error, let the request through and let AuthContext handle it
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 