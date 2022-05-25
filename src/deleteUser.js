const { readFile, writeFile, readdir, rm, rename, mkdir } = require("fs/promises")

async function run() {
    const [_p, _e, user] = process.argv

    if (user == undefined) {
        console.log(`Usage: node src/deleteUser <user>`)
        console.log(`Example: node src/deleteUser good.json`)
        return
    }

    console.log(`Clearing calculated data for ${user}`)

    for (const output of await readdir("./output", { withFileTypes: true })) {
        if (output.isFile()) {
            const file = `./output/${output.name}`
            const stats = JSON.parse(await readFile(file))
            await writeFile(file, JSON.stringify(stats.filter(x => x.user != user && x.user != (user + ".json"))))
        }
    }

    await mkdir("./good-old/", { recursive: true })
    try {
        await rename(`./good/${user}`, `./good-old/${user}`)
    } catch (error) { }
    try {
        await rename(`./good/${user}.json`, `./good-old/${user}.json`)
    } catch (error) { }

    console.log(`Cleared user data`)
}

run()