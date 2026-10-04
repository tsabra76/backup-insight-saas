/*
BackupInsight Cloudflare Worker for Hosting
This is a minimal deployment script for running BackupInsight on Cloudflare Workers
*/

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Serve static files from the root path
    if (url.pathname === '/') {
      return Response.redirect('/checkout.html', 302);
    }
    
    // Handle checkout page
    if (url.pathname === '/checkout.html') {
      const html = await env.ASSETS.fetch('checkout.html');
      return new Response(html.body, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Handle API endpoints
    if (url.pathname.startsWith('/api/')) {
      // This would route to your backend server
      const response = await fetch('http://localhost:3000' + url.pathname + url.search);
      return new Response(response.body, {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Default to serving the dashboard
    const html = await env.ASSETS.fetch('dashboard.html');
    return new Response(html.body, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};