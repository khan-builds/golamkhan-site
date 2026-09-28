declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INTERN_PINS?: string;
    ADMIN_PORTAL_CODE?: string;
  }
}
