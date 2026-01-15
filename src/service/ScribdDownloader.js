/* global document */
import cliProgress from "cli-progress"
import { puppeteerSg } from "../utils/request/PuppeteerSg.js";
import { pdfGenerator } from "../utils/io/PdfGenerator.js";
import { configLoader } from "../utils/io/ConfigLoader.js";
import { directoryIo } from "../utils/io/DirectoryIo.js"
import * as scribdRegex from "../const/ScribdRegex.js"
import * as scribdFlag  from '../const/ScribdFlag.js'
import { Image } from "../object/Image.js"
import sharp from "sharp";
import path from 'path'
import sanitize from "sanitize-filename";
import { COOKIE_SELECTORS, COOKIE_TEXT_PATTERNS, ACCEPT_BUTTON_PATTERNS } from "../const/CookieSelectors.js";


const output = configLoader.load("DIRECTORY", "output")
const filename = configLoader.load("DIRECTORY", "filename")
const rendertime = parseInt(configLoader.load("SCRIBD", "rendertime"))

class ScribdDownloader {
    constructor() {
        if (!ScribdDownloader.instance) {
            ScribdDownloader.instance = this
        }
        return ScribdDownloader.instance
    }

    async execute(url, flag) {
        let fn;
        if (flag === scribdFlag.IMAGE) {
            console.log(`Mode: IMAGE`)
            fn = this.embeds_image.bind(this)
        } else {
            console.log(`Mode: DEFAULT`)
            fn = this.embeds_default.bind(this)
        }
        if (url.match(scribdRegex.DOCUMENT)) {
            await fn(`https://www.scribd.com/embeds/${scribdRegex.DOCUMENT.exec(url)[2]}/content`)
        } else if (url.match(scribdRegex.EMBED)) {
            await fn(url)
        } else {
            throw new Error(`Unsupported URL: ${url}`)
        }
    }

    async embeds_default(url) {
        const m = scribdRegex.EMBED.exec(url)
        if (m) {
            let id = m[1]
            console.log(`Processing Scribd document with ID: ${id}`)

            // navigate to scribd
            let page = await puppeteerSg.getPage(url)
            console.log(`Navigated to: ${url}`)

            // wait rendering
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Handle cookie consent dialog if present
            await this.handleCookieConsent(page)

            // get the title with multiple fallback selectors
            let title = "Unknown Document"
            const titleSelectors = [
                "div.mobile_overlay a",
                "h1[data-e2e-name='document-title']",
                "h1.document_title",
                ".document_title",
                "[data-e2e-name='document-title']",
                "h1",
                ".title"
            ]
            
            for (const selector of titleSelectors) {
                try {
                    const element = await page.$(selector)
                    if (element) {
                        const href = await element.evaluate((el) => el.href || el.textContent)
                        if (href) {
                            title = decodeURIComponent(href.split('/').pop().trim())
                            console.log(`Found title: ${title}`)
                            break
                        }
                    }
                } catch (error) {
                    console.log(`Title selector ${selector} failed:`, error.message)
                }
            }

            if (title === "Unknown Document") {
                console.log("Warning: Could not find title element, using default title")
            }

            // load all pages with improved selectors
            const documentScrollerSelectors = [
                'div.document_scroller',
                '.document_scroller',
                '[class*="document_scroller"]',
                '.document-container',
                '.document-viewer',
                '.reader-container'
            ]
            
            let documentScroller = null
            for (const selector of documentScrollerSelectors) {
                try {
                    documentScroller = await page.$(selector)
                    if (documentScroller) {
                        console.log(`Found document scroller with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`Document scroller selector ${selector} failed:`, error.message)
                }
            }
            
            if (!documentScroller) {
                // Try to find any scrollable container
                const scrollableElements = await page.$$('div[style*="overflow"], div[class*="scroll"], div[class*="container"]')
                if (scrollableElements.length > 0) {
                    documentScroller = scrollableElements[0]
                    console.log('Using fallback scrollable element')
                } else {
                    throw new Error('Could not find document scroller element. This might not be a valid Scribd document URL.')
                }
            }
            
            await page.click('div.document_scroller');
            const container = await page.$('div.document_scroller');
            
            // Initialize scroll variables
            let clientHeight = await container.evaluate(el => el.clientHeight);
            let cur = await container.evaluate(el => el.scrollTop);
            let height = await container.evaluate(el => el.scrollHeight);
            let prevScrollTop = 0;
            let stuckCount = 0;
            const maxStuckIterations = 5; // Số lần scroll không thay đổi trước khi dừng
            const maxIterations = 10000; // Max iterations để tránh infinite loop
            let iterations = 0;
            
            const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            bar.start(height, 0);
            
            console.log(`Starting scroll: current=${cur}, height=${height}, clientHeight=${clientHeight}`);
            
            while (cur + clientHeight < height && iterations < maxIterations) {
                await page.keyboard.press('PageDown');
                await new Promise(resolve => setTimeout(resolve, rendertime));
                
                // Cập nhật các giá trị sau mỗi lần scroll
                cur = await container.evaluate(el => el.scrollTop);
                height = await container.evaluate(el => el.scrollHeight); // Cập nhật scrollHeight động
                clientHeight = await container.evaluate(el => el.clientHeight);
                
                // Phát hiện khi scroll bị stuck
                if (Math.abs(cur - prevScrollTop) < 1) {
                    stuckCount++;
                    if (stuckCount >= maxStuckIterations) {
                        console.log('\nScroll appears to be stuck, checking if we\'ve reached the end...');
                        // Kiểm tra xem có còn content để load không
                        const remainingHeight = height - (cur + clientHeight);
                        if (remainingHeight < 100) { // Nếu còn < 100px thì coi như đã xong
                            console.log('Reached end of document (within tolerance)');
                            break;
                        }
                        // Thử scroll thêm một chút bằng JavaScript
                        await page.evaluate(() => {
                            const scroller = document.querySelector('div.document_scroller');
                            if (scroller) {
                                scroller.scrollTop = scroller.scrollHeight;
                            }
                        });
                        await new Promise(resolve => setTimeout(resolve, rendertime * 2));
                        cur = await container.evaluate(el => el.scrollTop);
                        height = await container.evaluate(el => el.scrollHeight);
                        
                        // Nếu vẫn không thay đổi, dừng lại
                        if (Math.abs(cur - prevScrollTop) < 1) {
                            console.log('Scroll is truly stuck, stopping...');
                            break;
                        }
                        stuckCount = 0; // Reset counter nếu scroll được
                    }
                } else {
                    stuckCount = 0; // Reset counter nếu scroll đang hoạt động
                }
                
                prevScrollTop = cur;
                iterations++;
                bar.update(Math.min(cur + clientHeight, height));
            }
            
            bar.stop();
            
            if (iterations >= maxIterations) {
                console.log('\nWarning: Reached maximum iterations. Document may be very long or there may be an issue.');
            } else {
                console.log(`\nScroll completed: ${iterations} iterations, final position: ${cur + clientHeight}/${height}`);
            }

            // remove margin to avoid extra blank page with improved selectors
            const pageSelectors = [
                "div.outer_page_container div[id^='outer_page_']",
                ".outer_page_container div[id^='outer_page_']",
                "[class*='outer_page_container'] div[id^='outer_page_']",
                "div[id^='outer_page_']",
                ".page",
                "[class*='page']",
                ".document-page",
                "[class*='document-page']"
            ]
            
            let doc_pages = []
            for (const selector of pageSelectors) {
                try {
                    doc_pages = await page.$$(selector)
                    if (doc_pages.length > 0) {
                        console.log(`Found ${doc_pages.length} pages with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`Page selector ${selector} failed:`, error.message)
                }
            }
            
            if (doc_pages.length === 0) {
                console.log("Warning: No document pages found, trying alternative approach...")
                // Try to find any div that might contain page content
                doc_pages = await page.$$('div[style*="width"], div[style*="height"], div[class*="page"], div[class*="content"]')
                console.log(`Found ${doc_pages.length} potential pages with fallback selectors`)
            }
            
            for (let i = 0; i < doc_pages.length; i++) {
                try {
                    await page.evaluate((i) => {
                        const element = document.getElementById(`outer_page_${(i + 1)}`)
                        if (element) {
                            element.style.margin = 0
                        }
                    }, i)
                } catch (error) {
                    console.log(`Failed to set margin for page ${i + 1}:`, error.message)
                }
            }

            // pdf setting
            let options = {
                path: `${output}/${sanitize(filename == "title" ? title : id)}.pdf`,
                printBackground: true,
                timeout: 0
            }
            // Find first page with improved selectors
            let first_page = null
            const firstPageSelectors = [
                "div.outer_page_container div[id^='outer_page_']",
                ".outer_page_container div[id^='outer_page_']",
                "[class*='outer_page_container'] div[id^='outer_page_']",
                "div[id^='outer_page_']",
                ".page",
                "[class*='page']"
            ]
            
            for (const selector of firstPageSelectors) {
                try {
                    first_page = await page.$(selector)
                    if (first_page) {
                        console.log(`Found first page with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`First page selector ${selector} failed:`, error.message)
                }
            }
            
            if (first_page) {
                try {
                    let style = await first_page.evaluate((el) => el.getAttribute("style"))
                    if (style && style.includes("width:") && style.includes("height:")) {
                        options.height = parseInt(style.split("height:")[1].split("px")[0].trim())
                        options.width = parseInt(style.split("width:")[1].split("px")[0].trim())
                        console.log(`Set PDF dimensions: ${options.width}x${options.height}`)
                    }
                } catch (error) {
                    console.log("Failed to get page dimensions:", error.message)
                }
            } else {
                console.log("Warning: Could not find first page element for dimensions")
            }

            // Remove cookie consent dialogs and other overlays before PDF generation
            await page.evaluate(() => {
                // Remove cookie consent dialogs
                const cookieDialogs = document.querySelectorAll('[class*="cookie"], [class*="consent"], [class*="gdpr"], [class*="privacy"], [id*="cookie"], [id*="consent"], [id*="gdpr"], [id*="privacy"]')
                cookieDialogs.forEach(dialog => dialog.remove())
                
                // Remove other common overlays
                const overlays = document.querySelectorAll('[class*="overlay"], [class*="modal"], [class*="popup"], [class*="banner"]')
                overlays.forEach(overlay => {
                    const text = overlay.textContent.toLowerCase()
                    if (text.includes('cookie') || text.includes('consent') || text.includes('privacy') || text.includes('gdpr')) {
                        overlay.remove()
                    }
                })
            })
            
            // show doc only with improved selectors
            await page.evaluate(() => {
                const containerSelectors = [
                    "div.outer_page_container",
                    ".outer_page_container", 
                    "[class*='outer_page_container']",
                    ".document-container",
                    ".document-viewer",
                    ".reader-container",
                    "[class*='document']",
                    "[class*='page']"
                ]
                
                let container = null
                for (const selector of containerSelectors) {
                    container = document.querySelector(selector)
                    if (container) {
                        console.log(`Found document container with selector: ${selector}`)
                        break
                    }
                }
                
                if (container) {
                    document.body.innerHTML = container.innerHTML
                } else {
                    console.log("Warning: Could not find document container, keeping original body")
                }
            })
            
            await directoryIo.create(path.dirname(options.path))
            await page.pdf(options);
            console.log(`Generated: ${options.path}`)

            await page.close()
            await puppeteerSg.close()
        } else {
            throw new Error(`Unsupported URL: ${url}`)
        }
    }

    async embeds_image(url) {
        let deviceScaleFactor = 2
        const m = scribdRegex.EMBED.exec(url)
        if (m) {
            let id = m[1]
            console.log(`Processing Scribd document with ID: ${id} (IMAGE mode)`)

            // prepare temp dir
            let dir = `${output}/${id}`
            await directoryIo.create(dir)

            // navigate to scribd
            let page = await puppeteerSg.getPage(url)
            console.log(`Navigated to: ${url}`)

            // wait rendering
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Handle cookie consent dialog if present
            await this.handleCookieConsent(page)

            // get the title with multiple fallback selectors
            let title = "Unknown Document"
            const titleSelectors = [
                "div.mobile_overlay a",
                "h1[data-e2e-name='document-title']",
                "h1.document_title",
                ".document_title",
                "[data-e2e-name='document-title']",
                "h1",
                ".title"
            ]
            
            for (const selector of titleSelectors) {
                try {
                    const element = await page.$(selector)
                    if (element) {
                        const href = await element.evaluate((el) => el.href || el.textContent)
                        if (href) {
                            title = decodeURIComponent(href.split('/').pop().trim())
                            console.log(`Found title: ${title}`)
                            break
                        }
                    }
                } catch (error) {
                    console.log(`Title selector ${selector} failed:`, error.message)
                }
            }

            if (title === "Unknown Document") {
                console.log("Warning: Could not find title element, using default title")
            }

            // hide blockers with improved selectors
            const docContainerSelectors = [
                "div.document_scroller",
                ".document_scroller",
                "[class*='document_scroller']",
                ".document-container",
                ".document-viewer",
                ".reader-container"
            ]
            
            let doc_container = null
            for (const selector of docContainerSelectors) {
                try {
                    doc_container = await page.$(selector)
                    if (doc_container) {
                        console.log(`Found document container with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`Document container selector ${selector} failed:`, error.message)
                }
            }
            
            if (doc_container) {
                await doc_container.evaluate((el) => {
                    el["style"]["bottom"] = "0px"
                    el["style"]["margin-top"] = "0px"
                });
            }
            
            const toolbarSelectors = [
                "div.toolbar_drop",
                ".toolbar_drop",
                "[class*='toolbar']",
                "[class*='header']",
                "[class*='nav']"
            ]
            
            for (const selector of toolbarSelectors) {
                try {
                    const doc_toolbar = await page.$(selector)
                    if (doc_toolbar) {
                        await doc_toolbar.evaluate((el) => el["style"]["display"] = "none");
                        console.log(`Hidden toolbar with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`Toolbar selector ${selector} failed:`, error.message)
                }
            }

            // download images with improved selectors
            const pageSelectors = [
                "div.outer_page_container div[id^='outer_page_']",
                ".outer_page_container div[id^='outer_page_']",
                "[class*='outer_page_container'] div[id^='outer_page_']",
                "div[id^='outer_page_']",
                ".page",
                "[class*='page']",
                ".document-page",
                "[class*='document-page']"
            ]
            
            let doc_pages = []
            for (const selector of pageSelectors) {
                try {
                    doc_pages = await page.$$(selector)
                    if (doc_pages.length > 0) {
                        console.log(`Found ${doc_pages.length} pages with selector: ${selector}`)
                        break
                    }
                } catch (error) {
                    console.log(`Page selector ${selector} failed:`, error.message)
                }
            }
            
            if (doc_pages.length === 0) {
                console.log("Warning: No document pages found, trying alternative approach...")
                doc_pages = await page.$$('div[style*="width"], div[style*="height"], div[class*="page"], div[class*="content"]')
                console.log(`Found ${doc_pages.length} potential pages with fallback selectors`)
            }
            let images = []
            const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            bar.start(doc_pages.length, 0);
            for (let i = 0; i < doc_pages.length; i++) {
                await page.evaluate((i) => {
                    document.getElementById(`outer_page_${(i + 1)}`).scrollIntoView()
                }, i)

                let width = 1191
                let height = 1684
                let style = await doc_pages[i].evaluate((el) => el.getAttribute("style"));
                if (style.includes("width:") && style.includes("height:")) {
                    height = Math.ceil(width * parseInt(style.split("height:")[1].split("px")[0].trim()) / parseInt(style.split("width:")[1].split("px")[0].trim()))
                }
                await page.setViewport({ width: width, height: height, deviceScaleFactor: deviceScaleFactor });

                let path = `${dir}/${(i + 1).toString().padStart(4, 0)}.png`
                await doc_pages[i].screenshot({ path: path });

                let metadata = await sharp(path).metadata()
                images.push(new Image(
                    path,
                    metadata.width,
                    metadata.height
                ))
                bar.update(i + 1);
            }
            bar.stop();

            // generate pdf
            await pdfGenerator.generate(images, `${output}/${sanitize(filename == "title" ? title : id)}.pdf`)

            // remove temp dir
            directoryIo.remove(`${dir}`)

            await page.close()
            await puppeteerSg.close()
        } else {
            throw new Error(`Unsupported URL: ${url}`)
        }
    }

    /**
     * Handle cookie consent dialogs that may appear on Scribd pages
     * @param {Object} page - Puppeteer page object
     */
    async handleCookieConsent(page) {
        try {
            console.log('Checking for cookie consent dialogs...')
            
            // Wait a bit for any dialogs to appear
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Look for and handle various cookie consent dialog patterns
            for (const selector of COOKIE_SELECTORS) {
                try {
                    const elements = await page.$$(selector)
                    for (const element of elements) {
                        const text = await element.evaluate(el => el.textContent.toLowerCase())
                        
                        // Check if this element contains cookie-related text
                        const isCookieRelated = COOKIE_TEXT_PATTERNS.some(pattern => 
                            text.includes(pattern)
                        )
                        
                        if (isCookieRelated) {
                            console.log('Found cookie dialog, attempting to handle...')
                            
                            // Try to click accept/agree buttons first
                            const isAcceptButton = ACCEPT_BUTTON_PATTERNS.some(pattern => 
                                text.includes(pattern)
                            )
                            
                            if (isAcceptButton) {
                                try {
                                    await element.click()
                                    console.log('Clicked accept button')
                                    await new Promise(resolve => setTimeout(resolve, 1000))
                                } catch {
                                    console.log('Could not click element, trying alternative approach...')
                                }
                            } else {
                                // If it's a dialog, try to find and click accept buttons within it
                                const acceptButtons = await element.$$('button, a, [role="button"]')
                                for (const btn of acceptButtons) {
                                    const btnText = await btn.evaluate(el => el.textContent.toLowerCase())
                                    const isAcceptBtn = ACCEPT_BUTTON_PATTERNS.some(pattern => 
                                        btnText.includes(pattern)
                                    )
                                    
                                    if (isAcceptBtn) {
                                        try {
                                            await btn.click()
                                            console.log('Clicked accept button within dialog')
                                            await new Promise(resolve => setTimeout(resolve, 1000))
                                            break
                                        } catch {
                                            console.log('Could not click button, continuing...')
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch {
                    // Continue if selector fails
                }
            }
            
            // Final cleanup - remove any remaining cookie dialogs
            await page.evaluate(() => {
                const cookieDialogs = document.querySelectorAll('[class*="cookie"], [class*="consent"], [class*="gdpr"], [class*="privacy"], [id*="cookie"], [id*="consent"], [id*="gdpr"], [id*="privacy"]')
                cookieDialogs.forEach(dialog => {
                    const text = dialog.textContent.toLowerCase()
                    if (text.includes('cookie') || text.includes('consent') || text.includes('privacy') || text.includes('gdpr')) {
                        dialog.remove()
                    }
                })
            })
            
            console.log('Cookie consent handling completed')
            
        } catch (error) {
            console.log('Cookie consent handling failed, continuing...', error.message)
        }
    }
}

export const scribdDownloader = new ScribdDownloader()