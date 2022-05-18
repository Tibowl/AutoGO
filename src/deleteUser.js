const { readFile, writeFile, readdir } = require("fs/promises")

async function run() {
    const [_p, _e, user] = process.argv

    if (user == undefined) {
        console.log(`Usage: node src/deleteUser <user>`)
        console.log(`Example: node src/deleteUser good.json`)
        return;
    }

    console.log(`Clearing calculated data for ${user}`)

    for (const output of await readdir("./output", { withFileTypes: true })) {
        if (output.isFile()) {
            const file = `./output/${output.name}`
            const stats = JSON.parse(await readFile(file))
            await writeFile(file, JSON.stringify(stats.filter(x => x.user != user && x.user != (user + ".json"))))
        }
    }

    console.log(`Cleared user data`)
}

run()