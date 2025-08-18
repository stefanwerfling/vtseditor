import {ConfigProjectScriptsScript} from '../Config/Config.js';
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Schema script
 */
export class SchemaScript {

    /**
     * Run
     * @param {ConfigProjectScriptsScript[]} scripts
     */
    static async run(scripts: ConfigProjectScriptsScript[]): Promise<void> {
        for (const script of scripts) {
            console.log(`\n➡️  Running "${script.script}" in ${script.path}`);

            try {
                const { stdout, stderr } = await execAsync(script.script, {
                    cwd: script.path,
                });

                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);

                console.log(`✅ Finished: ${script.script}\n`);
            } catch (error) {
                console.error(`❌ Error while executing "${script.script}" in ${script.path}`);
                throw error;
            }
        }
    }
}