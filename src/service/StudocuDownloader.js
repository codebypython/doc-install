/* global document */
import fs from "fs"
import path from "path"
import sanitize from "sanitize-filename"
import sharp from "sharp"
import cliProgress from "cli-progress"
import { puppeteerSg } from "../utils/request/PuppeteerSg.js"
import { configLoader } from "../utils/io/ConfigLoader.js"
import { directoryIo } from "../utils/io/DirectoryIo.js"
import { pdfGenerator } from "../utils/io/PdfGenerator.js"
import { Image } from "../object/Image.js"
import * as studocuRegex from "../const/StudocuRegex.js"
import * as studocuFlag from "../const/StudocuFlag.js"

const output = configLoader.load("DIRECTORY", "output")
const filename = configLoader.load("DIRECTORY", "filename")
const renderTime = parseInt(configLoader.loadOptional("STUDOCU", "rendertime", "150"), 10)
const cookieFile = configLoader.loadOptional("SESSION", "cookie_file", "")

class StudocuDownloader {
    constructor() {
        if (!StudocuDownloader.instance) {
            StudocuDownloader.instance = this
        }
        return StudocuDownloader.instance
    }

    async execute(url, flag) {
        if (!url.match(studocuRegex.DOCUMENT)) {
            throw new Error(`Unsupported URL: ${url}`)
        }

        if (flag === studocuFlag.IMAGE) {
            console.log("Mode: IMAGE")
            await this.downloadImageMode(url)
            return
        }

        console.log("Mode: DEFAULT")
        await this.downloadDefaultMode(url)
    }

    async downloadDefaultMode(url) {
        const page = await puppeteerSg.getPage(url)
        await this.applySessionIfConfigured(page, url)
        await this.wait(1200)
        await this.scrollViewer(page)

        const title = await this.getTitle(page)
        const docId = this.getDocId(url)
        const dest = `${output}/${sanitize(filename === "title" ? title : docId)}.pdf`

        const containerSelector = await this.findDocumentContainer(page)
        if (!containerSelector) {
            throw new Error("No printable document container found. Ensure the document is public or available in your own account.")
        }

        await page.evaluate((selector) => {
            const container = document.querySelector(selector)
            if (!container) {
                return
            }
            document.body.innerHTML = container.innerHTML
            document.body.style.margin = "0"
        }, containerSelector)

        await directoryIo.create(path.dirname(dest))
        await page.pdf({
            path: dest,
            printBackground: true,
            preferCSSPageSize: true,
            timeout: 0,
        })
        console.log(`Generated: ${dest}`)

        await page.close()
        await puppeteerSg.close()
    }

    async downloadImageMode(url) {
        const page = await puppeteerSg.getPage(url)
        await this.applySessionIfConfigured(page, url)
        await this.wait(1200)
        await this.scrollViewer(page)

        const title = await this.getTitle(page)
        const docId = this.getDocId(url)
        const tempDir = `${output}/${docId}`
        const dest = `${output}/${sanitize(filename === "title" ? title : docId)}.pdf`

        await directoryIo.create(tempDir)

        const pageHandles = await this.findPageNodes(page)
        if (!pageHandles.length) {
            throw new Error("No page nodes found for image mode. Ensure the content is actually visible in browser.")
        }

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
        bar.start(pageHandles.length, 0)

        const images = []
        for (let i = 0; i < pageHandles.length; i++) {
            const handle = pageHandles[i]
            await handle.evaluate((el) => el.scrollIntoView({ block: "center" }))
            await this.wait(renderTime)

            const filePath = `${tempDir}/${(i + 1).toString().padStart(4, "0")}.png`
            await handle.screenshot({ path: filePath })
            const metadata = await sharp(filePath).metadata()
            images.push(new Image(filePath, metadata.width, metadata.height))
            bar.update(i + 1)
        }
        bar.stop()

        await pdfGenerator.generate(images, dest)
        await directoryIo.remove(tempDir)

        await page.close()
        await puppeteerSg.close()
    }

    async applySessionIfConfigured(page, url) {
        if (!cookieFile) {
            return
        }
        if (!fs.existsSync(cookieFile)) {
            console.log(`Cookie file not found: ${cookieFile}`)
            return
        }

        try {
            const raw = fs.readFileSync(cookieFile, { encoding: "utf-8" })
            const cookies = JSON.parse(raw)
            if (Array.isArray(cookies) && cookies.length > 0) {
                await page.setCookie(...cookies)
                await page.goto(url, { waitUntil: "load" })
                console.log("Applied user cookie session.")
            }
        } catch (error) {
            console.log(`Failed to apply cookie session: ${error.message}`)
        }
    }

    async findDocumentContainer(page) {
        const selectors = [
            "#page-container",
            ".page-container",
            "[data-test-selector='document-viewer']",
            "#viewer-wrapper",
            ".viewer-wrapper",
            "main",
        ]
        for (const selector of selectors) {
            const el = await page.$(selector)
            if (el) {
                return selector
            }
        }
        return null
    }

    async findPageNodes(page) {
        const selectors = [
            "#page-container > *",
            ".page-content",
            "[id^='page-']",
            "[data-page-number]",
            ".page",
        ]
        for (const selector of selectors) {
            const nodes = await page.$$(selector)
            if (nodes.length > 0) {
                console.log(`Found ${nodes.length} nodes with selector: ${selector}`)
                return nodes
            }
        }
        return []
    }

    async scrollViewer(page) {
        const scrollerSelector = await this.findScrollerSelector(page)
        if (!scrollerSelector) {
            await this.wait(1200)
            return
        }

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
        let metrics = await page.$eval(scrollerSelector, (el) => ({
            scrollTop: el.scrollTop,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
        }))

        bar.start(metrics.scrollHeight, 0)
        let safety = 0
        while ((metrics.scrollTop + metrics.clientHeight) < metrics.scrollHeight && safety < 2000) {
            await page.$eval(scrollerSelector, (el) => {
                el.scrollBy(0, Math.max(500, Math.floor(el.clientHeight * 0.8)))
            })
            await this.wait(renderTime)
            metrics = await page.$eval(scrollerSelector, (el) => ({
                scrollTop: el.scrollTop,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
            }))
            bar.update(Math.min(metrics.scrollTop + metrics.clientHeight, metrics.scrollHeight))
            safety++
        }
        bar.stop()
    }

    async findScrollerSelector(page) {
        const selectors = [
            "#viewer-wrapper",
            "#document-wrapper",
            ".viewer-wrapper",
            ".document-wrapper",
            "#page-container",
            "main",
        ]

        for (const selector of selectors) {
            const exists = await page.$(selector)
            if (exists) {
                return selector
            }
        }
        return null
    }

    async getTitle(page) {
        const selectors = [
            "h1",
            "[data-test-selector='document-title']",
            "title",
        ]

        for (const selector of selectors) {
            const el = await page.$(selector)
            if (!el) {
                continue
            }
            const text = await el.evaluate((node) => node.textContent?.trim() || "")
            if (text) {
                return text
            }
        }
        return "studocu-document"
    }

    getDocId(url) {
        const parts = url.split("/").filter(Boolean)
        return parts[parts.length - 1]?.split("?")[0] || "studocu-document"
    }

    async wait(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms))
    }
}

export const studocuDownloader = new StudocuDownloader()
