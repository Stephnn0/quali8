import type { Jsonify as RemixJsonify } from "@remix-run/server-runtime/dist/jsonify";

// Just to get auto-import working
export type Jsonify<T> = RemixJsonify<T>;
