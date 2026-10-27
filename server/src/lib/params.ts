/** Express 5 can type route params as string | string[]. */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
