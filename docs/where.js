/**
 * Where is the code running (physically)?
 */
const IP_API = 'https://ipapi.co/json/';
const TIMEOUT_MS = 5_000;
/**
 * See https://www.iso.org/iso-3166-country-codes.html for the full list of
 * country codes.
 */
export var Country;
(function (Country) {
  Country['EGYPT'] = 'EG';
  Country['USA'] = 'US';
})(Country || (Country = {}));
/**
 * @returns The two-letter country code where the user is physically located.
 */
export async function country() {
  return fetch(IP_API, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then(async (res) => await res.json())
    .then((data) => data.country)
    .catch((error) => {
      console.error('Error retrieving location:', error);
      return undefined;
    });
}
