const fetch = require("node-fetch")
const { token, baseURL } = require("../token.json")
const { AutoGO } = require("./autogo")
const { inspect } = require("util")

async function log(text) {
    console.log(text)

    if (typeof text !== "string")
        text = inspect(text, false, 1, false)

    try {
        const response = await (await fetch(`${baseURL}/api/submit-log`, {
            method: "POST",
            body: JSON.stringify({
                token,
                log: text,
                serverTime: Date.now()
            })
        })).json()
        if (response.error) console.error("Remote error while logging:", response.error)
    } catch (error) {
        console.error(`An error ocurred while logging data`, error)
    }
}

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

async function main() {
    const autoGO = new AutoGO()
    autoGO.logger = log
    await autoGO.start()

    while (true) {
        try {
            const nextGood = await (await fetch(`${baseURL}/api/get-next-good`, {
                method: "POST",
                body: JSON.stringify({ token })
            })).json()

            if (nextGood.error) {
                console.error(nextGood.error)
                await sleep(60 * 1000)
                continue
            }

            console.log(nextGood.status)
            if (nextGood.character && nextGood.good) {
                const start = Date.now()
                const output = await autoGO.test(nextGood.good, nextGood.character, nextGood.id)
                const end = Date.now()
                const submission = await (await fetch(`${baseURL}/api/submit-result`, {
                    method: "POST",
                    body: JSON.stringify({
                        token,
                        id: nextGood.id,
                        output,
                        computeTime: end - start
                    })
                })).json()

                if (submission.status)
                    console.log(submission.status)
                else if (submission.error) {
                    log(submission.error)
                    await sleep(10 * 1000)
                }
            } else {
                log("No data, sleeping for 5 minutes")
                await sleep(5 * 60 * 1000)
            }
        } catch (error) {
            console.error(error)
            await sleep(30 * 1000)
        }
    }
    await autoGO.close()
}
main()