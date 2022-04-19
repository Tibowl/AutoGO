const puppeteer = require("puppeteer")
const { readFile, readdir, writeFile, mkdir } = require("fs/promises")
const { join } = require("path")
const settings = require("../settings.json")

async function run() {
    const browser = await puppeteer.launch({ headless: false })
    await mkdir("output", { recursive: true })

    for (const templateFile of settings.templates) {
        const { templateName, template, char } = JSON.parse((await readFile(templateFile)).toString())
        const url = `https://frzyc.github.io/genshin-optimizer/#/character/${char}`
        const output = []

        console.log()
        console.log(`Starting template ${templateName}`)
        console.log()

        for (const f of await readdir("./good/", { withFileTypes: true }))
            if (f.isFile() && f.name.endsWith(".json")) {
                const { name: user } = f
                const good = await prepareUser(template, user)

                const page = await browser.newPage()
                console.log(`Replacing database for ${templateName}/${user}`)
                await page.goto("https://frzyc.github.io/genshin-optimizer/#/setting")
                await page.waitForSelector("textarea")
                await page.evaluate(`document.querySelector("textarea").value = \`${JSON.stringify(good).replace(/[\\`$]/g, "\\$&")}\`;`)
                await page.type("textarea", " ")
                await page.waitForTimeout(500)
                await clickButton(page, "Replace Database")
                await page.waitForTimeout(500)

                console.log(`Starting build generation for ${templateName}/${user}`)
                await page.goto(url)
                await page.waitForTimeout(1000)
                await clickButton(page, "Build")
                await page.waitForTimeout(1000)
                await clickButton(page, "Generate")

                await busyWait(page, user)

                console.log(`Exporting data of ${templateName}/${user}`)
                await page.waitForTimeout(500)
                const area = await page.$("textarea")
                const text = await (await area.getProperty("value")).jsonValue()
                console.log(text)
                
                output.push({ user, stats: JSON.parse(text) })
                await writeFile(`output/${templateName}.json`, JSON.stringify(output))

                await page.close()
            }
    }
    await browser.close()
}

async function prepareUser(template, user, templateName) {
    console.log(`Preparing data for ${templateName}/${user}`)
    const userGood = JSON.parse((await readFile(join("good", user))).toString())
    const good = Object.assign({}, template, { artifacts: userGood.artifacts })

    // Clean up artifact settings
    good.artifacts = good.artifacts.map(a => Object.assign(a, {
        "location": "",
        "exclude": false,
        "lock": false
    }))

    // Enable TC mode
    good.states = [{
        "tcMode": true,
        "key": "GlobalSettings"
    }]

    return good
}

async function clickButton(page, targetText) {
    const buttons = await page.$$("button")

    for (const button of buttons) {
        const text = await (await button.getProperty("innerText")).jsonValue()
        if (text == targetText) {
            await button.click()
            return
        }
    }
    console.error(`Could not find button with name ${targetText}`)
}


async function busyWait(page, user) {
    while (true) {
        await page.waitForTimeout(3000)
        const message = await page.$(".MuiAlert-message")
        const text = await (await message.getProperty("innerText")).jsonValue()
        console.log(`${user}: ${text.replace(/\n+/g, " / ")}`)

        if (text.startsWith("Generated")) return
    }
}

run()