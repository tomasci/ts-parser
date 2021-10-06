export interface IRecipeObject {
	title: string
	ingredients: IIngredient[]
	steps: string[]
	steps_joined: string
	images: string[]
}

interface IIngredient {
	name: string
	details: string
}
