import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Iris OS',
    short_name: 'Iris OS',
    description: 'Enterprise agency operating system for finance, clients, projects, delivery, reporting, and Atlas AI.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0c0c0e',
    theme_color: '#0c0c0e',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      {
        src: '/icons/iris-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/iris-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/iris-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/iris-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/icons/iris-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Projects',
        short_name: 'Projects',
        url: '/projects',
        icons: [{ src: '/icons/iris-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Atlas AI',
        short_name: 'Atlas',
        url: '/atlas',
        icons: [{ src: '/icons/iris-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
