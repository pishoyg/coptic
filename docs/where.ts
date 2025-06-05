/**
 * Where is the code running (physically)?
 */

const IP_API = 'https://ipapi.co/json/';
const TIMEOUT_MS = 5_000;

/**
 * See https://www.iso.org/iso-3166-country-codes.html for the full list of
 * country codes.
 */
export enum Country {
  EGYPT = 'EG',
  USA = 'US',
}

interface IpApiResponse {
  country: string;
}

/**
 * @returns The two-letter country code where the user is physically located.
 */
export async function country(): Promise<Country | undefined> {
  return fetch(IP_API, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then(async (res: Response) => (await res.json()) as IpApiResponse)
    .then((data: IpApiResponse) => data.country as Country)
    .catch((error: unknown) => {
      console.error('Error retrieving location:', error);
      return undefined;
    });
}
