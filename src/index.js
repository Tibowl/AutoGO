const puppeteer = require("puppeteer")
const { readFile, readdir, writeFile, mkdir } = require("fs/promises")
const { join } = require("path")
const settings = require("../settings.json")

async function run() {
    const start = Date.now()
    const browser = await puppeteer.launch({ headless: false })
    await mkdir("output", { recursive: true })

    const templates = [
        ...settings.templates,
        ...(settings.runFromFolder === true ? (await readdir("./templates")).map(x => `./templates/${x}`) : []),
    ]

    console.log()
    console.log(`Running builds for ${settings.onlyNew ? "only new users" : "all users"} for ${templates.length} template(s)`)
    console.log("=".repeat(64))

    for (const templateFile of templates) {
        try {
            const { templateName, template, char } = JSON.parse((await readFile(templateFile)).toString())

            console.log()
            console.log(`Starting template ${templateName}`)

            const url = `https://frzyc.github.io/genshin-optimizer/#/characters/${char}/optimize`
            const outputFile = `output/${templateName}.json`
            const output = await loadOutput(outputFile)

            if (output.length > 0)
                console.log(`Loaded ${output.length} from output`)
            console.log("=".repeat(64))

            for (const f of await readdir("./good/", { withFileTypes: true }))
                if (f.isFile() && f.name.endsWith(".json")) {
                    const { name: user } = f
                    if (settings.onlyNew && output.some(x => x.user == user))
                        continue

                    const good = await prepareUser(template, user, templateName)

                    const page = await browser.newPage()
                    console.log(`Replacing database for ${templateName}/${user}`)
                    await page.goto("https://frzyc.github.io/genshin-optimizer/#/setting")
                    await page.waitForSelector("textarea")
                    await page.evaluate(`document.querySelector("textarea").value = \`${JSON.stringify(good).replace(/[\\`$]/g, "\\$&")}\`;`)
                    await page.type("textarea", " ")
                    await clickButton(page, "Replace Database")
                    await page.waitForTimeout(500)

                    console.log(`Starting build generation for ${templateName}/${user}`)
                    await page.goto(url)
                    await clickButton(page, "Generate Builds")

                    if (await busyWait(page, user)) {
                        console.log(`Exporting data of ${templateName}/${user}`)
                        await page.waitForTimeout(500)
                        const area = await page.$("textarea")
                        const text = await (await area.getProperty("value")).jsonValue()
                        console.log(text)

                        output.push({
                            user,
                            stats: JSON.parse(text)
                        })
                    } else {
                        console.log(`No sets could be generated for ${templateName}/${user}`)

                        output.push({
                            user,
                            stats: []
                        })
                    }

                    await writeFile(outputFile, JSON.stringify(output))

                    await page.close()
                }
        } catch (error) {
            console.error(`An error occurred while handling template ${templateFile}`)
            console.error(error)
        }
    }
    await browser.close()

    console.log()
    console.log(`Total time: ${(Date.now() - start) / 1000} seconds`)
}

/**
 * @typedef Output
 * @property {string} name
 * @property {number[][]} stats
 */

/**
 *
 * @param {string} file Path of file to load
 * @returns {Promise<Output[]>} Currently loaded output
 */
async function loadOutput(file) {
    if (!settings.onlyNew)
        return []

    let contents
    try {
        contents = await readFile(file)
    } catch (error) {
        return []
    }

    return JSON.parse(contents.toString())
}

/**
 * Prepare user data, filling in a template
 * @param {GOOD} template Template data to fill in
 * @param {string} user Name of user
 * @param {string} templateName Name of template
 * @returns {Promise<GOOD>} Filled in GOOD data
 */
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

    // Map artifact set exclusion overrides (Excluding all sets by default)
    const artifactSets = [
        "rainbow",
        "Adventurer", "ArchaicPetra", "Berserker", "BlizzardStrayer", "BloodstainedChivalry", "BraveHeart",
        "CrimsonWitchOfFlames", "DefendersWill", "EchoesOfAnOffering", "EmblemOfSeveredFate", "Gambler",
        "GladiatorsFinale", "HeartOfDepth", "HuskOfOpulentDreams", "Instructor", "Lavawalker", "LuckyDog",
        "MaidenBeloved", "MartialArtist", "NoblesseOblige", "OceanHuedClam", "PaleFlame", "ResolutionOfSojourner",
        "RetracingBolide", "Scholar", "ShimenawasReminiscence", "TenacityOfTheMillelith", "TheExile",
        "ThunderingFury", "Thundersoother", "TinyMiracle", "TravelingDoctor", "VermillionHereafter",
        "ViridescentVenerer", "WanderersTroupe"
    ]
    good.buildSettings = good.buildSettings.map(bs => {
        if (bs.artSetExclusionOverrides) {
            bs.artSetExclusion = Object.assign(
                {},
                Object.fromEntries(artifactSets.map(x => [x, [2, 4]])),
                bs.artSetExclusionOverrides
            )
            delete bs.artSetExclusionOverrides
        }
        return bs
    })

    return good
}

/**
 * Click a button element with a certain text
 * @param {puppeteer.Page} page The current tab
 * @param {string} targetText Text of the button to press
 * @returns
 */
async function clickButton(page, targetText) {
    while (true) {
        const buttons = await page.$$("button")
        let found = false
        for (const button of buttons) {
            const text = await (await button.getProperty("innerText")).jsonValue()
            if (text == targetText) {
                found = true
                try {
                    await button.click()
                    return
                } catch (error) {
                    console.error(`Was unable to click on ${targetText}, trying again in 100ms`)
                }
            }
        }

        if (!found)
            console.error(`Could not find button with name ${targetText}, trying again in 100ms`)
        await page.waitForTimeout(100)
    }
}


/**
 * Busily wait for build generation to finish, prints progress ever ~3 seconds
 * @param {puppeteer.Page} page The current tab
 * @param {string} user Name of the current user
 * @returns {Promise<boolean>} true when build generation is successful, false if not
 */
async function busyWait(page, user) {
    while (true) {
        await page.waitForTimeout(1000)
        const message = await page.$(".MuiAlert-message")
        if (message == null) continue
        const text = await (await message.getProperty("innerText")).jsonValue()
        console.log(`${user}: ${text.replace(/\n+/g, " / ")}`)

        if (text.startsWith("Generated")) return true
        if (text.includes("It looks like you haven't added any artifacts to GO yet!")) return false
        if (text.startsWith("Current configuration will not generate any builds for")) return false
    }
}

run()