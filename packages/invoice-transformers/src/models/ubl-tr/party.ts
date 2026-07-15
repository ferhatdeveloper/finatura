export type PartySchemeId = "VKN" | "TCKN";

export interface UblPostalAddress {
  streetName?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  countryCode: string;
}

export interface UblPartyIdentification {
  schemeId: PartySchemeId;
  value: string;
}

export interface UblParty {
  partyIdentification: UblPartyIdentification;
  partyName: string;
  postalAddress: UblPostalAddress;
  taxOffice?: string;
  telephone?: string;
  electronicMail?: string;
}

export function buildParty(input: {
  identity: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  countryCode?: string;
  taxOffice?: string;
  telephone?: string;
  email?: string;
}): UblParty {
  const digits = input.identity.replace(/\D/g, "");
  const schemeId: PartySchemeId = digits.length === 10 ? "VKN" : "TCKN";

  return {
    partyIdentification: { schemeId, value: digits },
    partyName: input.name,
    postalAddress: {
      streetName: input.address,
      citySubdivisionName: input.district,
      cityName: input.city,
      postalZone: input.postalCode,
      countryCode: input.countryCode ?? "TR",
    },
    taxOffice: input.taxOffice,
    telephone: input.telephone,
    electronicMail: input.email,
  };
}
