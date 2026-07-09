const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

interface GeoAddress {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  formatted: string;
}

type Component = { long_name: string; short_name: string; types: string[] };

function pick(components: Component[], type: string): string {
  return components.find((c) => c.types.includes(type))?.long_name || '';
}

function parse(result: { formatted_address: string; address_components: Component[] }): GeoAddress {
  const c = result.address_components;
  const street = [pick(c, 'street_number'), pick(c, 'route')].filter(Boolean).join(' ');
  const sub = pick(c, 'sublocality_level_1') || pick(c, 'sublocality');
  return {
    line1: [street, sub].filter(Boolean).join(', '),
    city: pick(c, 'locality') || pick(c, 'administrative_area_level_2'),
    state: pick(c, 'administrative_area_level_1'),
    pincode: pick(c, 'postal_code'),
    formatted: result.formatted_address,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    return parse(data.results[0]);
  } catch { return null; }
}

export async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; address: GeoAddress } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${KEY}`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng, address: parse(data.results[0]) };
  } catch { return null; }
}
