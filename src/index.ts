import axios from "axios"
import {IPagesCount} from "./@types/IPagesCount"
import JsonStorage from "./JsonStorage/JsonStorage"
import Logger from "./Logger/Logger"
import {JSDOM} from "jsdom"

const jsonStorage = new JsonStorage()
const logger = new Logger()

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
			logger.log("Outdated count of pages")
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

	logger.log("Pages count update started")

	while (error === false) {
		logger.log("Current page:", counter.toString())
		try {
			const page = await axios.get(
				`https://povar.ru/list/pp_recepty/${counter}`,
				{
					method: "GET",
				}
			)

			logger.log("Status:", page.status.toString())

			if (page.status === 200) {
				counter++
			}
		} catch (e) {
			error = true
		}
	}

	logger.log("Pages count update finished")

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

async function parseAllLinks() {
	const pagesCountData: IPagesCount = jsonStorage.get("pagesCount")
	const all: string[] = []

	logger.log("Link parsing started")

	for (let i = 1; i <= pagesCountData.count; i++) {
		logger.log("Parsing page:", i.toString())

		const pageLinks: NodeListOf<HTMLAnchorElement> = await parsePage(i)
		pageLinks.forEach((l) => {
			all.push(l.href)
		})
	}

	logger.log("Link parsing finished")

	return jsonStorage.set("links", all)
}

async function parsePage(pageNumber: number) {
	const page = await axios.get(
		`https://povar.ru/list/pp_recepty/${pageNumber}`
	)

	const root = new JSDOM(page.data)
	const links: NodeListOf<HTMLAnchorElement> =
		root.window.document.querySelectorAll("a.listRecipieTitle")

	return links
}

async function start() {
	logger.log("Application started")
	if (!startupCheck()) {
		logger.log("Startup check failed")
		if (await updatePagesCount()) {
			logger.log("Update saved successfully")
			// parse all links only when pages count updated (no need to parse it every time)
			await parseAllLinks()
		}
	}
	logger.log("Startup check done")
}

start().then(() => {
	logger.log("Done!")
})
