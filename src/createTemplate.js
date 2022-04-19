const { readFile, writeFile, mkdir } = require("fs/promises")
const { read } = require("clipboardy")


async function run() {
    const [_p, _e, char, templateName, good = "clipboard"] = process.argv

    if (templateName == undefined) {
        console.log(`Usage: node src/createTemplate <char> <templateName> [GOOD filepath OR 'clipboard']`)
        console.log(`Example: node src/createTemplate KaedeharaKazuha kazuha-er-em`)
        return;
    }

    console.log(`Creating template for ${char}: ${templateName} from ${good}`)

    const template = await readGood(good)

    // Delete artifacts and settings from template
    delete template.artifacts
    delete template.states

    // Filter out other characters
    if (!template.characters.find(x => x.key == char)) {
        console.error(`Could not find char ${char}; chars in GOOD: ${template.characters.map(x => x.key).join(", ")}`)
        return
    }
    template.characters = template.characters.filter(x => x.key == char)

    // Filter out other weapons
    const weapons = template.weapons.map(x => x.key)
    template.weapons = template.weapons.filter(x => x.location == char)

    const weapon = template.weapons[0]?.key
    if (!weapon) {
        console.error(`Could not find weapon of ${char}`)
        return
    }
    console.log(`Found weapon: ${weapon}`)

    template.characters.forEach(x => {
        // Cleanup conditional settings
        x.conditional = Object.fromEntries(Object.entries(x.conditional).filter(x => x[0] == weapon || !weapons.includes(x[0])))

        // Force certain settings
        x.useExcludedArts = true
        x.useEquippedArts = true
        x.builds = []
        x.buildDate = 0
        x.maxBuildsToShow = 1
    })
    template.weapons.forEach(x => {
        x.lock = true
    })


    await mkdir("templates", { recursive: true })
    await writeFile(`./templates/${templateName}.json`, JSON.stringify({
        templateName,
        char,
        template
    }, undefined, 2))

    console.log(`Template ${templateName} has been made`)
}

async function readGood(source) {
    const text = source == "clipboard" ? await read() : (await readFile(source)).toString()

    try {
        return JSON.parse(text)
    } catch (error) {
        console.error(`Could not parse ${source}: ${error}`)
        process.exit()
    }
}

run()