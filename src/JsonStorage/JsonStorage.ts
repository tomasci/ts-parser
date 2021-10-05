import fs from "fs"
import path from "path"
import {IJSConfig, IJsonStorage} from "../@types/JsonStorage/IJsonStorage"
import Logger from "../Logger/Logger"

/**
 * JsonStorage is simple class that allows to save and read any data to files,
 * but works like localStorage
 *
 * @class
 * @implements {IJsonStorage}
 */
class JsonStorage implements IJsonStorage {
	private _logger: Logger = new Logger()
	private _config: IJSConfig = {
		dir: path.resolve("data"),
	}

	/**
	 * JsonStorage constructor
	 * @param config {IJSConfig} - configuration
	 */
	constructor(config?: IJSConfig) {
		config ? (this._config = config) : null
		// todo: check if dir exists
	}

	/**
	 * Read json data from file
	 * @param key - filename
	 * @return T file content or false
	 */
	public get<T>(key: string): T {
		try {
			const data = fs.readFileSync(
				this._config.dir + "/" + key + ".json",
				"utf-8"
			)
			return JSON.parse(data)
		} catch (e) {
			this._logger.log(
				"JsonStorage: something went wrong while reading data"
			)
			return <T>{}
		}
	}

	/**
	 * Save json data to file
	 * @param key - filename
	 * @param value - json data
	 */
	public set<T>(key: string, value: T): boolean {
		try {
			fs.writeFileSync(
				this._config.dir + "/" + key + ".json",
				JSON.stringify(value),
				"utf-8"
			)
			return true
		} catch (e) {
			this._logger.log(
				"JsonStorage: something went wrong while saving data"
			)
			return false
		}
	}
}

export default JsonStorage
