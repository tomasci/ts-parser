import JsonStorage from "../JsonStorage/JsonStorage"
import Logger from "../Logger/Logger"
import {db} from "../Database/Database"
import axios from "axios"
import {JSDOM} from "jsdom"
import {IRecipeObject} from "../@types/Parser/IRecipeObject"

const jsonStorage = new JsonStorage()
const logger = new Logger()

async function RecipeParser(): Promise<void> {
	await parseAllLinks()
}

/**
 * This function take every link from list and send it to parser, then into DB worker
 */
async function parseAllLinks(): Promise<void> {
	const linksData: string[] = jsonStorage.get("links")

	for (const link of linksData) {
		const index = linksData.indexOf(link)

		if (!(await doesLinkParsed(link))) {
			// okay, now parse
			logger.log(
				"Working with link:",
				(index + 1).toString(),
				"of",
				linksData.length.toString()
			)

			const recipe = await parseRecipe(link)
			await insertIntoDatabase(link, recipe)
			// console.log(insert)
		} else {
			logger.log(
				"Skip link:",
				(index + 1).toString(),
				"of",
				linksData.length.toString()
			)
		}
	}
}

/**
 * This function check, does link already exist in database
 * @param link - recipe url
 */
async function doesLinkParsed(link: string): Promise<boolean> {
	const search = await db.posts.count({
		where: {
			link: link,
		},
	})

	return search > 0
}

/**
 * This function takes link, get content from page and returns object with data ready to use
 * @param link - link to parse
 * @return Promise<IRecipeObject> with parsed data
 */
async function parseRecipe(link: string): Promise<IRecipeObject> {
	const page = await axios.get(`https://povar.ru${link}`)
	const root = new JSDOM(page.data)

	const post: IRecipeObject = {
		title: "",
		ingredients: [],
		steps: [],
		steps_joined: "",
		images: [],
	}

	// get title
	const title: HTMLHeadingElement =
		root.window.document.querySelector("h1.detailed")
	post.title = title.textContent

	// get ingredients
	const ingredients: NodeListOf<HTMLLIElement> =
		root.window.document.querySelectorAll('li[itemprop="recipeIngredient"]')

	ingredients.forEach((ingredient) => {
		const line = ingredient.textContent.split("—").map((item) => {
			return item
				.replace(/&nbsp;/g, " ")
				.replace(" ", " ")
				.replace(
					/[^а-яА-Я0-9-.,()/=+!@#$%^*_"№:|£€∞√'`—«»–}{~?><]/g,
					" "
				)
				.trim()
		})

		post.ingredients.push({
			name: line[0],
			details: line[1],
		})
	})

	// get steps
	const steps: NodeListOf<HTMLDivElement> =
		root.window.document.querySelectorAll(
			"div.detailed_step_description_big"
		)

	steps.forEach((step) => {
		post.steps.push(step.textContent)
	})

	post.steps_joined = post.steps.join(" ")

	// get image links
	const bigImage: HTMLImageElement =
		root.window.document.querySelector("div.bigImgBox img")
	post.images.push(bigImage.src)

	// const images: NodeListOf<HTMLImageElement> =
	// 	root.window.document.querySelectorAll("div.detailed_step_photo_big img")
	// images.forEach((image) => {
	// 	// console.log(image.src.toString().replace("/steps/", "/uploads/"))
	// 	post.images.push(image.src.toString().replace("/steps/", "/uploads/"))
	// })

	// result
	// console.log(post)

	return post
}

async function insertIntoDatabase(link: string, recipe: IRecipeObject) {
	// first of all insert post
	const insertPost = await db.posts.create({
		data: {
			link: link,
			post_title: recipe.title,
			post_recipe: recipe.steps_joined,
		},
	})

	// prepare ingredients
	const preparedIngredients = []
	recipe.ingredients.forEach((ingredient) => {
		preparedIngredients.push({
			post_id: insertPost.id,
			ingredient_name: ingredient.name,
			ingredient_details: ingredient.details,
		})
	})

	// prepare steps
	const preparedSteps = []
	recipe.steps.forEach((step) => {
		preparedSteps.push({
			post_id: insertPost.id,
			step_content: step,
		})
	})

	// insert ingredients
	const insertIngredients = await db.ingredients.createMany({
		data: preparedIngredients,
	})

	// insert steps
	const insertSteps = await db.steps.createMany({
		data: preparedSteps,
	})

	// insert image
	const insertImage = await db.images.create({
		data: {
			post_id: insertPost.id,
			image_path: recipe.images[0],
		},
	})

	return {
		insertPost,
		insertIngredients,
		insertSteps,
		insertImage,
	}
}

export default RecipeParser
