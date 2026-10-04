import { run } from "./run";
import { logError } from "./utils/workflow";

run().catch((error: Error) => {
	logError(error.message);
	process.exitCode = 1;
});
