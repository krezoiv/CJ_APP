import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Testimonial } from '../models';
import { TESTIMONIALS } from '../data';

/**
 * Phase 2: replace the `of(TESTIMONIALS)` body with
 * `this.http.get<Testimonial[]>(\`${environment.apiUrl}/testimonials\`)`.
 */
@Injectable({ providedIn: 'root' })
export class TestimonialsService {
  getTestimonials(): Observable<Testimonial[]> {
    return of(TESTIMONIALS);
  }
}
