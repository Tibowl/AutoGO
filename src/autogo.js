const { Browser } = require("puppeteer")
const puppeteer = require("puppeteer")

// const baseURL = `http://localhost:3000/genshin-optimizer`
const baseURL = `https://frzyc.github.io/genshin-optimizer/`
class AutoGO {
    logger = console.log
    /**@type {Browser} */
    browser

    async start() {
        this.browser = await puppeteer.launch({ headless: false })
    }

    async test(good, char, name) {
        const url = `${baseURL}#/characters/${char}/optimize`

        let stats = []
        const page = await this.browser.newPage()
        this.logger(`Replacing database for ${name}`)
        await page.goto(`${baseURL}#/setting`)
        await this.clickButton(page, "Upload")
        await page.waitForSelector("textarea")
        await page.evaluate(`document.querySelector("textarea").value = \`${JSON.stringify(good).replace(/[\\`$]/g, "\\$&")}\`;`)
        await page.type("textarea", " ")
        await this.clickButton(page, "Replace Database")
        await page.waitForTimeout(500)

        this.logger(`Starting build generation for ${name}`)
        await page.goto(url)
        await this.clickButton(page, "Generate Builds")

        if (await this.busyWait(page, name)) {
            this.logger(`Exporting data of ${name}`)
            await page.waitForTimeout(500)
            const area = await page.$("textarea")
            const text = await (await area.getProperty("value")).jsonValue()
            // console.log(text)

            stats = JSON.parse(text)
        } else {
            this.logger(`No sets could be generated for ${name}`)
        }
        await page.close()
        return stats
    }

    /**
     * Click a button element with a certain text
     * @param {puppeteer.Page} page The current tab
     * @param {string} targetText Text of the button to press
     * @returns
     */
    async clickButton(page, targetText) {
        let count = 0
        while (true) {
            const buttons = await page.$$(".MuiButton-root")
            let found = false
            for (const button of buttons) {
                const text = await (await button.getProperty("innerText")).jsonValue()
                if (text == targetText) {
                    found = true
                    try {
                        await button.click()
                        return
                    } catch (error) {
                        if (count++ % 30 == 10)
                            this.logger(`Was unable to click on ${targetText}, trying again in 100ms`)
                    }
                }
            }

            if (!found && count++ % 30 == 10)
                this.logger(`Could not find button with name ${targetText}, trying again in 100ms`)
            await page.waitForTimeout(100)
        }
    }


    /**
     * Busily wait for build generation to finish, prints progress ever ~3 seconds
     * @param {puppeteer.Page} page The current tab
     * @param {string} name Name of the current generation
     * @returns {Promise<boolean>} true when build generation is successful, false if not
     */
    async busyWait(page, name) {
        let count = 0
        while (true) {
            await page.waitForTimeout(1000)
            const message = await page.$(".MuiAlert-message")
            if (message == null) {
                this.logger(`Attempt #${count} waiting for search text...`)
                if (count++ < 10) continue
                if (await page.$("textarea") != null)
                    return true
            }
            const text = await (await message.getProperty("innerText")).jsonValue()
            this.logger(`${name}: ${text.replace(/\n+/g, " / ")}`)

            if (text.startsWith("Generated")) return true
            if (text.includes("It looks like you haven't added any artifacts to GO yet!")) return false
            if (text.startsWith("Current configuration will not generate any builds for")) return false
        }
    }

    async close() {
        await this.browser.close()
    }
}

module.exports = { AutoGO }