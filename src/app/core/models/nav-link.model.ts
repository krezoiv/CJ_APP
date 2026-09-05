export interface NavLink {
  label: string;
  /** Router path, e.g. '/' or '/catalogo'. */
  path: string;
  /** Optional in-page anchor to scroll to once on `path`. */
  fragment?: string;
  /** Renders as a highlighted call-to-action button instead of a plain link. */
  isCta?: boolean;
}
