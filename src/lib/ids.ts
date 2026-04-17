export const uuid = () =>
typeof crypto !== "undefined" && (crypto as any).randomUUID
? (crypto as any).randomUUID()
: "id-" + Math.random().toString(36).slice(2);