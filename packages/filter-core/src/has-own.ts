// Own-property check so keys like "toString" don't resolve via the prototype.
export function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}
