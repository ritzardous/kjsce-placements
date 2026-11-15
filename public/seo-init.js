const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Placement Stats',
  alternateName: 'Placement Stats KJSCE',
  url: 'https://kjsce-placements.vercel.app/',
  description: 'Source-backed placement statistics and reviewed interview experiences for KJSCE.',
  inLanguage: 'en-IN',
};

const script = document.createElement('script');
script.type = 'application/ld+json';
script.textContent = JSON.stringify(structuredData);
document.head.appendChild(script);
