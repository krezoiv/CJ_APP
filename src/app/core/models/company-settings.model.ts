/** The one, always-existing "datos de la librería" row — never created or deleted, only updated. */
export interface CompanySettings {
  id: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  logoBase64: string | null;
  socialMedia: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
}

/** All fields optional — `PATCH /company-settings` merges only what's provided. */
export interface UpdateCompanySettingsPayload {
  businessName?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  logoBase64?: string | null;
  socialMedia?: string | null;
}
