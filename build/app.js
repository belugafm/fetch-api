"use strict";
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
const express_1 = __importDefault(require("express"));
const utils_1 = require("./utils");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/content", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const url = req.query.url;
    if (url == null) {
        return res.status(200).send({
            ok: false,
        });
    }
    console.log("url", url);
    // @ts-ignore
    const result = yield (0, utils_1.fetchUrlContent)(url);
    if (result == null) {
        return res.status(200).send({
            ok: false,
        });
    }
    console.log(result);
    return res.status(200).send({
        ok: true,
        title: result["title"],
        description: result["description"],
        bodyText: result["bodyText"],
    });
}));
const port = process.env.PORT || 8000;
try {
    app.listen(port, () => {
        console.log(`Running at Port ${port}...`);
    });
}
catch (e) {
    if (e instanceof Error) {
        console.error(e.message);
    }
}
