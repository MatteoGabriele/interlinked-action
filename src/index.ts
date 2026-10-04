import { run } from "./run";

run().catch((error: Error) => {
	console.log(`::error::${error.message}`);
	process.exitCode = 1;
});
