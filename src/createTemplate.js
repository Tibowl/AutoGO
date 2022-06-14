const { readFile, writeFile, mkdir } = require("fs/promises")
const { read } = require("clipboardy")


async function run() {
    let [_p, _e, char, templateName, good = "clipboard"] = process.argv

    if (templateName == undefined)
        [char, templateName] = [templateName, char]

    if (templateName == undefined) {
        console.log(`Usage: node src/createTemplate [char] <templateName> [GOOD filepath OR 'clipboard']`)
        console.log(`Example: node src/createTemplate KaedeharaKazuha kazuha-er-em`)
        console.log(`Char is required if more than one character exists in template`)
        return
    }
    
    const template = await readGood(good)
    const chars = template.characters.map(x => x.key)
    if (char == undefined && chars.length == 1)
        char = chars[0]

    console.log(`Creating template for ${char}: ${templateName} from ${good}`)

    // Delete artifacts and settings from template
    delete template.artifacts
    delete template.states

    // Filter out other characters
    if (!template.characters.find(x => x.key == char)) {
        console.error(`Could not find char ${char}; chars in GOOD: ${chars.join(", ")}`)
        return
    }
    template.characters = template.characters.filter(x => x.key == char)
    template.buildSettings = template.buildSettings.filter(x => x.key == char)

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
    })
    template.buildSettings.forEach(x => {
        // Force certain settings
        x.useExcludedArts = false
        x.useEquippedArts = false
        x.builds = []
        x.buildDate = 0
        x.maxBuildsToShow = 1
    })
    const templateWeapons = template.weapons
    templateWeapons.forEach(x => {
        // Lock weapons
        x.lock = true
    })
    // Sort object a bit (put weapons at bottom)
    delete template.weapons 
    template.weapons = templateWeapons


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