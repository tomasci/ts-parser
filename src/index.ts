import axios from "axios"
import {IPagesCount} from "./@types/IPagesCount"
import JsonStorage from "./JsonStorage/JsonStorage"
import Logger from "./Logger/Logger"
import {JSDOM} from "jsdom"
import {db} from "./Database/Database"

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
async function getPagesCount(startFrom: number): Promise<number> {
	let error = false
	let counter = startFrom

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
	const oldData: IPagesCount = jsonStorage.get("pagesCount")
	const totalPages: number = await getPagesCount(oldData.count)

	if (totalPages > oldData.count) {
		const data: IPagesCount = {
			date: Date.now(),
			count: totalPages,
		}

		return jsonStorage.set("pagesCount", data)
	}

	logger.log("Pages count not changed, nothing to do")

	return false
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
	return root.window.document.querySelectorAll("a.listRecipieTitle") as NodeListOf<HTMLAnchorElement>
}

async function databaseCheck() {
	const result = await db.$queryRaw`SELECT version()`
	logger.log("Database check:", JSON.stringify(result))
}

async function start() {
	logger.log("Application started")

	await databaseCheck()

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
