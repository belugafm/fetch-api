import express, { Application, Request, Response } from "express"
import { fetchUrlContent } from "./utils"

const app: Application = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/api/content", async (req: Request, res: Response) => {
    const url = req.query.url
    if (url == null) {
        return res.status(200).send({
            ok: false,
        })
    }
    console.log("url", url)
    // @ts-ignore
    const result = await fetchUrlContent(url)
    if (result == null) {
        return res.status(200).send({
            ok: false,
        })
    }
    console.log(result)
    return res.status(200).send({
        ok: true,
        title: result["title"],
        description: result["description"],
        bodyText: result["bodyText"],
    })
})

const port = process.env.PORT || 8080
try {
    app.listen(port, () => {
        console.log(`Running at Port ${port}...`)
    })
} catch (e) {
    if (e instanceof Error) {
        console.error(e.message)
    }
}
