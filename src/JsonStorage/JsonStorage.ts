import fs from "fs"
import path from "path"
import {IJSConfig, IJsonStorage} from "../@types/JsonStorage/IJsonStorage"

class JsonStorage implements IJsonStorage {
	private _config: IJSConfig = {
		dir: path.resolve("data"),
	}

	constructor(config?: IJSConfig) {
		config ? (this._config = config) : null
	}

	public get<T>(key: string): T {
		try {
			const data = fs.readFileSync(
				this._config.dir + "/" + key + ".json",
				"utf-8"
			)
			return JSON.parse(data)
		} catch (e) {
			console.log("JsonStorage: something went wrong while reading data")
			return <T>{}
		}
	}

	public set<T>(key: string, value: T): boolean {
		try {
			fs.writeFileSync(
				this._config.dir + "/" + key + ".json",
				JSON.stringify(value),
				"utf-8"
			)
			return true
		} catch (e) {
			console.log("JsonStorage: something went wrong while saving data")
			return false
		}
	}
}

export default JsonStorage
