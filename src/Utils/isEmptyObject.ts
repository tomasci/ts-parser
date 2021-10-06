export function isEmptyObject<T>(obj: T): boolean {
	return (
		obj &&
		Object.keys(obj).length === 0 &&
		Object.getPrototypeOf(obj) === Object.prototype
	)
}
