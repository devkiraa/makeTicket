import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://maketicket.app';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const now = new Date();

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/ticket-maker`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/event-ticket-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/ticket-creator`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/blog/how-to-make-tickets-for-an-event`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/how-to-create-qr-code-event-tickets`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/best-event-ticketing-platforms`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    // 2. Dynamic Routes (Events & Users)
    const res = await fetch(`${apiUrl}/sitemap-data`, {
        next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!res.ok) return staticRoutes;
    
    const data = await res.json();
    
    const eventRoutes: MetadataRoute.Sitemap = data.events.map((e: any) => ({
      url: `${base}/${e.username}/${e.slug}`,
      lastModified: new Date(e.updatedAt),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const userRoutes: MetadataRoute.Sitemap = data.users.map((u: any) => ({
      url: `${base}/${u.username}`,
      lastModified: new Date(u.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

    return [...staticRoutes, ...eventRoutes, ...userRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticRoutes;
  }
}
