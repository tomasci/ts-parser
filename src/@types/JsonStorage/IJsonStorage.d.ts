export interface IJsonStorage {
	get<T>(key: string): T
	set<T>(key: string, value: T): boolean
}

export interface IJSConfig {
	dir: string
}
