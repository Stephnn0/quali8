import type { Jsonify as RemixJsonify } from "@react-router/server-runtime/dist/jsonify";

// Just to get auto-import working
export type Jsonify<T> = RemixJsonify<T>;
