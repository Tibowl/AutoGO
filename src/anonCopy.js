const {  readdir, copyFile, readFile, mkdir } = require("fs/promises")
const crypto = require("crypto")

async function run() {
    console.log(`Creating copy of GOODs with random names`)

    await mkdir("./good-anon", { recursive: true })
    for (const good of await readdir("./good", { withFileTypes: true })) {
        if (good.isFile() && good.name.endsWith(".json")) {
            const hash = crypto.createHash('sha1')
            hash.update(await readFile(`./good/${good.name}`))
            await copyFile(`./good/${good.name}`, `./good-anon/${hash.digest("hex")}.json`)
        }
    }

    console.log(`Copied user data`)
}

run()