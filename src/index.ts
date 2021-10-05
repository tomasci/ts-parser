import axios from "axios"
import {IPagesCount} from "./@types/IPagesCount"
import JsonStorage from "./JsonStorage/JsonStorage"

const jsonStorage = new JsonStorage()

function isEmptyObject<T>(obj: T): boolean {
	return (
		obj &&
		Object.keys(obj).length === 0 &&
		Object.getPrototypeOf(obj) === Object.prototype
	)
}

function startupCheck(): boolean {
	const file: IPagesCount = jsonStorage.get("pagesCount")

	if (!isEmptyObject(file)) {
		// if not empty

		if (file.date + 86400000 < Date.now()) {
			// if date in file + 1day < current (1 day is 3600s * 24h = 86400, but date is in ms. so 1s => 1000ms, 86 400 000)
			console.log("Outdated count of pages")
			return false
		}

		return true
	} else {
		// if empty
		return false
	}
}

/**
 * @return Promise<number> of pages
 */
async function getPagesCount(): Promise<number> {
	let error = false
	let counter = 29

	while (error === false) {
		console.log("Current page:", counter)
		try {
			const page = await axios.get(
				`https://povar.ru/list/pp_recepty/${counter}`,
				{
					method: "GET",
				}
			)

			console.log("Status:", page.status)

			if (page.status === 200) {
				counter++
			}
		} catch (e) {
			error = true
		}
	}

	return counter - 1
}

async function updatePagesCount() {
	const totalPages: number = await getPagesCount()
	const data: IPagesCount = {
		date: Date.now(),
		count: totalPages,
	}

	// return saveFileJson(config.dataDir, config.pagesCountFile, data)
	return jsonStorage.set("pagesCount", data)
}

async function start() {
	console.log("Application started")
	if (!startupCheck()) {
		console.log("Startup check failed")
		if (await updatePagesCount()) {
			console.log("Page count update finished")
		}
	}
}

start().then(() => {
	console.log("Done!")
})
