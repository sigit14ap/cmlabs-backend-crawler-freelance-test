const puppeteer = require('puppeteer')
const fs = require('node:fs/promises')

class WebCrawl {
    constructor(urls) {
        this.urls = urls
    }

    async start() {
        const browser = await puppeteer.launch({
            headless: 'new'
        })

        for (const { url, element, callback } of this.urls) {
            console.info(`[Start Crawl] : ${url}`)
            try {
                const page = await browser.newPage()
                await page.setViewport({ width: 1920, height: 1080 })
                await page.setBypassCSP(true)
                await page.goto(url, { timeout: 60000, waitUntil: 'networkidle0' })
                await page.waitForSelector(element, {
                    timeout: 60000
                })

                await this.autoScroll(page)
    
                let html = await page.evaluate(() => {
                    return document.querySelector('html').innerHTML
                })

                html = await callback(page, html, url)

                const fileName = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\..*/, '')

                await fs.writeFile(`${fileName}.html`, html)

                console.info(`[Done Crawl] : ${url}`)
            } catch (error) {
                console.error(`[Error Crawl] : ${url}`)
                console.log(error)
            }
        }

        await browser.close()
    }

    async autoScroll(page){
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                var totalHeight = 0
                var distance = 100
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight
                    window.scrollBy(0, distance)
                    totalHeight += distance
    
                    if(totalHeight >= scrollHeight - window.innerHeight){
                        clearInterval(timer)
                        resolve()
                    }
                }, 100)
            })
        })
    }
}

const data = [{
    url: 'https://cmlabs.co',
    element: '#totalClicks',
    callback: (page, html, url) => {
        return html.replace(/href="\//g, `href="${url}/`)
        .replace(/src="\//g, `href="${url}/`)
        .replace(/data-src=/g, 'src=')
    }
}, {
    url: 'https://sequence.day',
    element: '#logo-container',
    callback: async (page, html, url) => {
        const cssHref = await page.$eval('link[rel="stylesheet"]', (el) => el.href)

        const cssContent = await page.evaluate(async (href) => {
            const response = await fetch(href)
            return await response.text()
        }, cssHref)

        const jsScript = await page.$eval('script', (el) => el.src)

        const jsContent = await page.evaluate(async (href) => {
            const response = await fetch(href)
            return await response.text()
        }, jsScript)

        return html.replace(/url\(\//g, `url(${url}/`)
        .replace(/href="\//g, `href="${url}/`)
        .replace(/src="\//g, `src="${url}/`)
        .replace(/srcset="\//g, `srcset="${url}/`)
        .replace(/srcSet="\//g, `srcSet="${url}/`)
        .replace(/, \/_next\/image/g, `, ${url}/_next/image`)
        .replace('<head>', `<head><style>${cssContent}</style>`)
        .replace('</head>', `<script>${jsContent}</script></head>`)
    }
}, 
{
    url: 'https://github.com',
    element: '.application-main',
    callback: (page, html, url) => {
        return html
    }
}]

const crawl = new WebCrawl(data)
crawl.start()