// Global type definitions for Deno and Supabase Edge Functions
declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Type definitions for module imports
declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // Add any other types needed for Supabase Edge Functions
  interface Request extends globalThis.Request {
    json(): Promise<any>;
  }
}

// Allow importing from URLs (Deno style)
declare module "https://*" {
  const content: any;
  export default content;
}

// Allow importing from JSR
declare module "jsr:*" {
  const content: any;
  export default content;
}
