import geoip from 'geoip-lite';

export interface GeoLocation {
    range: [number, number];
    country: string;
    region: string;
    eu: string;
    timezone: string;
    city: string;
    ll: [number, number]; // [latitude, longitude]
    metro: number;
    area: number;
}

/**
 * Get location from IP address
 */
export const getLocation = (ip: string): GeoLocation | null => {
    // Handle localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return null;
    }
    return geoip.lookup(ip);
};

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

/**
 * Calculate implied speed in km/h between two points in time
 */
export const calculateSpeed = (distKm: number, timeDiffMs: number): number => {
    const hours = timeDiffMs / (1000 * 60 * 60);
    if (hours <= 0) return distKm > 0 ? Infinity : 0;
    return distKm / hours; // km/h
};
