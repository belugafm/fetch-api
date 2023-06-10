import * as cheerio from "cheerio"
import puppeteer from "puppeteer"
import dotenv from "dotenv"
import { Configuration, OpenAIApi } from "openai"

dotenv.config({ path: "src/.env" })
const consumerKey = process.env.CONSUMER_KEY || ""
const consumerSecret = process.env.CONSUMER_SECRET || ""
const accessToken = process.env.ACCESS_TOKEN || ""
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || ""
console.log("consumerKey", consumerKey)
console.log("consumerSecret", consumerSecret)
console.log("accessToken", accessToken)
console.log("accessTokenSecret", accessTokenSecret)
const configuration = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
})
export const openai = new OpenAIApi(configuration)

function sleep(sec: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, sec * 1000)
    })
}

async function retrieveUrlWithChrome(url: string) {
    const retryCount = 3
    for (let index = 0; index < retryCount; index++) {
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: "domcontentloaded" })
            await sleep(3)
            const content = await page.content()
            await browser.close()

            // const response = await axios.get(url)
            const $ = cheerio.load(content)
            $("style").remove()
            $("script").remove()
            $("noscript").remove()
            $("ul").remove()
            $("nav").remove()
            $("header").remove()
            $("form").remove()
            $("footer").remove()
            $("iframe").remove()
            const title = $("title").text()
            const metaTags = $("meta")
            const meta: Record<string, string> = {}
            metaTags.each(function () {
                const name = $(this).attr("name")
                const content = $(this).attr("content")
                if (name && content) {
                    meta[name] = content
                }
            })
            let bodyText = $("body").text().replace(/\s+/g, " ").replace(/\n/g, "").replace(/"/g, "")
            console.log(bodyText)
            console.log("length", bodyText.length)
            return {
                bodyText,
                title,
                meta,
            }
        } catch (error) {
            if (error instanceof Error) {
                console.log(error.message)
                if (error.message.includes("Protocol error")) {
                    return null
                }
            }
            console.dir(error)
            console.error(`Error fetching content from ${url}: `, error)
            await sleep(3)
        }
    }
    return null
}

function getPageSummarizationPrompt(title: string, description: string | null, bodyText: string): any {
    const englishCharacterPattern = /[A-Za-z0-9\s!"#$%&'()’*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g
    const matches = bodyText.match(englishCharacterPattern)
    const numEnglishChars = matches ? matches.length : 0
    const englishRatio = numEnglishChars / bodyText.length
    console.log("englishRatio", englishRatio)
    const maxLength = (englishRatio > 0.95 ? 5000 : 1000) - (description ? description.length : 0) - title.length
    if (bodyText.length > maxLength) {
        bodyText = bodyText.substring(0, maxLength)
    }
    let chat = []
    let instruction = `I would like your help to summarize the following webpage content into approximately 1000 words in Japanese.

- Title: '${title}'
- Description: '${description}'
- Body Text: '${bodyText}'

##

Please note that if the body text does not seem to relate to the description, you should ignore the body text and generate a summary based only on the title and description.
Do not mention that you ignored the body text.
Given this information, could you generate a concise summary of the main points and key details in Japanese?
`
    chat.push({
        role: "system",
        content: instruction,
    })
    return chat
}

export async function fetchUrlContent(url: string) {
    const data = await retrieveUrlWithChrome(url)
    if (data) {
        console.log("url", url)
        console.log("bodyText", data["bodyText"])
        console.log("title", data["title"])
        const metaTitle = data["meta"]["title"]
        const metaDescription = data["meta"]["description"]
        const twitterTitle = data["meta"]["twitter:title"]
        const twitterDescription = data["meta"]["twitter:description"]

        const title = twitterTitle ? twitterTitle : metaTitle ? metaTitle : data["title"] ? data["title"] : null
        const description = twitterDescription ? twitterDescription : metaDescription ? metaDescription : null
        if (title == null) {
            return null
        }
        const prompt = getPageSummarizationPrompt(title, description, data["bodyText"])
        console.group("Prompt:")
        console.log(prompt)
        console.groupEnd()
        const answer = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: prompt,
            max_tokens: 2048,
            temperature: 0.0,
            frequency_penalty: 0.5,
        })
        const obj = answer.data.choices[0]
        if (obj.message) {
            console.log(obj.message.content)
            return {
                title,
                description,
                bodyText: obj.message.content,
            }
        } else {
            return {
                title,
                description,
                bodyText: null,
            }
        }
    } else {
        return null
    }
}
