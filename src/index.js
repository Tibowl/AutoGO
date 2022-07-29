const puppeteer = require("puppeteer")
const { readFile, readdir, writeFile, mkdir } = require("fs/promises")
const { join } = require("path")
const settings = require("../settings.json")
const { AutoGO } = require("./autogo")

async function run() {
    const autoGO = new AutoGO()
    const start = Date.now()
    await autoGO.start()
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

                    const stats = await autoGO.test(good, char, `${templateName}/${user}`)
                    output.push({
                        user, stats
                    })

                    await writeFile(outputFile, JSON.stringify(output))
                }
        } catch (error) {
            console.error(`An error occurred while handling template ${templateFile}`)
            console.error(error)
        }
    }
    await autoGO.close()

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

run()