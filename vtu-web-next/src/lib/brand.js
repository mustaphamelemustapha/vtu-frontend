export const BRANDS = {
  kullomaData: {
    key: 'kullomadata',
    name: 'KULLOMA DATA',
    tagline: 'Fast, Reliable Airtime & Utility Top-Ups',
    description: 'Instant VTU airtime, SME data bundles, electricity tokens, and cable subscriptions with instant automated delivery.',
    domain: 'kullomadata.com',
    url: 'https://www.kullomadata.com',
    supportEmail: 'kullomadata@gmail.com',
    supportPhone: '+234 814 111 4647',
    whatsappLink: 'https://wa.me/2348141114647',
    logo: '/brand/kullomadata-logo.png',
    icon: '/brand/kullomadata-icon.png',
    primaryColor: '#5B21B6',
    secondaryColor: '#F59E0B',
    publisher: 'MMTECHGLOBE',
    playStoreLink: null,
    appStoreLink: null,
  },
  meleData: {
    key: 'meledata',
    name: 'MELE DATA',
    tagline: 'Instant VTU, Airtime & Utility Bills',
    description: 'Fast, reliable VTU payments for data, airtime, wallet funding, and everyday utility services.',
    domain: 'meledata.ng',
    url: 'https://meledata.ng',
    supportEmail: 'mmtechglobe@gmail.com',
    supportPhone: '+234 814 111 4647',
    whatsappLink: 'https://wa.me/2348141114647',
    logo: '/brand/meledata-logo.png',
    icon: '/brand/meledata-icon-clean.png',
    primaryColor: '#0B4FD2',
    secondaryColor: '#00C6FF',
    publisher: 'MMTECHGLOBE',
    playStoreLink: 'https://play.google.com/store/apps/details?id=com.mmtech.axisvtu&pcampaignid=web_share',
    appStoreLink: 'https://apps.apple.com/ng/app/mele-data/id6779367547',
  },
  mzData: {
    key: 'mzdata',
    name: 'MZ DATA',
    tagline: 'Next-Gen SME Telecom & Digital Bill Hub',
    description: 'Corporate SME data and airtime vending portal for modern enterprises and resellers.',
    domain: 'mzdata.org',
    url: 'https://www.mzdata.org',
    supportEmail: 'mzdatamzdata2@gmail.com',
    supportPhone: '09067054672',
    whatsappLink: 'https://wa.me/2349067054672',
    logo: '/brand/mzdata-logo.jpg',
    icon: '/brand/mzdata-icon.png',
    primaryColor: '#0A2540',
    secondaryColor: '#10B981',
    publisher: 'MMTECHGLOBE',
    playStoreLink: null,
    appStoreLink: null,
  },
};

/**
 * Resolves the active brand either from client hostname or SSR environment.
 * Defaults to MELE DATA.
 */
export function getActiveBrand() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('kulloma')) {
      return BRANDS.kullomaData;
    }
    if (host.includes('mzdata')) {
      return BRANDS.mzData;
    }
    return BRANDS.meleData;
  }

  const envBrand = (process.env.NEXT_PUBLIC_APP_BRAND || '').toLowerCase();
  if (envBrand.includes('kulloma')) return BRANDS.kullomaData;
  if (envBrand.includes('mz')) return BRANDS.mzData;

  // Default to Mele Data
  return BRANDS.meleData;
}
