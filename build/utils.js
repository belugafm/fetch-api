"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUrlContent = exports.openai = void 0;
const cheerio = __importStar(require("cheerio"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = require("openai");
dotenv_1.default.config({ path: "src/.env" });
const consumerKey = process.env.CONSUMER_KEY || "";
const consumerSecret = process.env.CONSUMER_SECRET || "";
const accessToken = process.env.ACCESS_TOKEN || "";
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || "";
console.log(consumerKey);
console.log(consumerSecret);
console.log(accessToken);
console.log(accessTokenSecret);
const configuration = new openai_1.Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
});
exports.openai = new openai_1.OpenAIApi(configuration);
function sleep(sec) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, sec * 1000);
    });
}
function retrieveUrlWithChrome(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const retryCount = 3;
        for (let index = 0; index < retryCount; index++) {
            try {
                const browser = yield puppeteer_1.default.launch({
                    headless: true,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                });
                const page = yield browser.newPage();
                yield page.goto(url, { waitUntil: "domcontentloaded" });
                yield sleep(3);
                const content = yield page.content();
                yield browser.close();
                // const response = await axios.get(url)
                const $ = cheerio.load(content);
                $("style").remove();
                $("script").remove();
                $("noscript").remove();
                $("ul").remove();
                $("nav").remove();
                $("header").remove();
                $("form").remove();
                $("footer").remove();
                $("iframe").remove();
                const title = $("title").text();
                const metaTags = $("meta");
                const meta = {};
                metaTags.each(function () {
                    const name = $(this).attr("name");
                    const content = $(this).attr("content");
                    if (name && content) {
                        meta[name] = content;
                    }
                });
                let bodyText = $("body").text().replace(/\s+/g, " ").replace(/\n/g, "").replace(/"/g, "");
                console.log(bodyText);
                console.log("length", bodyText.length);
                return {
                    bodyText,
                    title,
                    meta,
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    console.log(error.message);
                    if (error.message.includes("Protocol error")) {
                        return null;
                    }
                }
                console.dir(error);
                console.error(`Error fetching content from ${url}: `, error);
                yield sleep(3);
            }
        }
        return null;
    });
}
function getPageSummarizationPrompt(title, description, bodyText) {
    const englishCharacterPattern = /[A-Za-z0-9\s!"#$%&'()’*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g;
    const matches = bodyText.match(englishCharacterPattern);
    const numEnglishChars = matches ? matches.length : 0;
    const englishRatio = numEnglishChars / bodyText.length;
    console.log("englishRatio", englishRatio);
    const maxLength = (englishRatio > 0.95 ? 5000 : 1000) - (description ? description.length : 0) - title.length;
    if (bodyText.length > maxLength) {
        bodyText = bodyText.substring(0, maxLength);
    }
    let chat = [];
    let instruction = `I would like your help to summarize the following webpage content into approximately 1000 words in Japanese.

- Title: '${title}'
- Description: '${description}'
- Body Text: '${bodyText}'

##

Please note that if the body text does not seem to relate to the description, you should ignore the body text and generate a summary based only on the title and description.
Do not mention that you ignored the body text.
Given this information, could you generate a concise summary of the main points and key details in Japanese?
`;
    chat.push({
        role: "system",
        content: instruction,
    });
    return chat;
}
function fetchUrlContent(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield retrieveUrlWithChrome(url);
        if (data) {
            console.log("url", url);
            console.log("bodyText", data["bodyText"]);
            console.log("title", data["title"]);
            const metaTitle = data["meta"]["title"];
            const metaDescription = data["meta"]["description"];
            const twitterTitle = data["meta"]["twitter:title"];
            const twitterDescription = data["meta"]["twitter:description"];
            const title = twitterTitle ? twitterTitle : metaTitle ? metaTitle : data["title"] ? data["title"] : null;
            const description = twitterDescription ? twitterDescription : metaDescription ? metaDescription : null;
            if (title == null) {
                return null;
            }
            const prompt = getPageSummarizationPrompt(title, description, data["bodyText"]);
            console.group("Prompt:");
            console.log(prompt);
            console.groupEnd();
            const answer = yield exports.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: prompt,
                max_tokens: 2048,
                temperature: 0.0,
                frequency_penalty: 0.5,
            });
            const obj = answer.data.choices[0];
            if (obj.message) {
                console.log(obj.message.content);
                return {
                    title,
                    description,
                    bodyText: obj.message.content,
                };
            }
            else {
                return {
                    title,
                    description,
                    bodyText: null,
                };
            }
        }
        else {
            return null;
        }
    });
}
exports.fetchUrlContent = fetchUrlContent;
