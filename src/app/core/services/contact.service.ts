import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { ContactFormPayload } from '../models';
import { CONTACT_CHANNELS, CONTACT_INTERESTS, SOCIAL_LINKS } from '../data';

export interface ContactSubmissionResult {
  success: boolean;
}

/**
 * Phase 2: swap `submit()` for
 * `this.http.post<ContactSubmissionResult>(\`${environment.apiUrl}/contact\`, payload)`.
 * Everything else here is static content, safe to keep as-is.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  getChannels() {
    return CONTACT_CHANNELS;
  }

  getSocialLinks() {
    return SOCIAL_LINKS;
  }

  getInterests() {
    return CONTACT_INTERESTS;
  }

  submit(payload: ContactFormPayload): Observable<ContactSubmissionResult> {
    return of({ success: true }).pipe(delay(600));
  }
}
