import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { v4 } from 'uuid';

import { readFile, writeFile } from 'fs/promises';

type LanguageOptions = {
  [key: string]: string;
  language: string;
  entrypointFile: string;
};

type File = {
  id?: string;
  filename: string;
  content: string;
  metadata?: any;
};

const DEFAULT_EXECUTION_TIMEOUT = parseInt(process.env.DEFAULT_EXECUTION_TIMEOUT || '60');
const IMAGE_BASE = process.env.IMAGE_BASE || 'ghcr.io/42dotmk/colosseum-executioner-';
const WORKDIR = process.env.WORKDIR || '_work';

if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR);
}

function parseDuration(duration: string) {
  const match = duration.match(/(\d+)m(\d+(?:\.\d+)?)s/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  return minutes * 60 + seconds;
}

const readIfExists = async (path: string) => {
  if (fs.existsSync(path)) {
    return (await readFile(path)).toString();
  }
  return '';
}

export const execute = async (files: File[], input: File[], options: LanguageOptions) => {
  const id = v4();

  const subWorkspace = path.join(WORKDIR, id);
  const srcDir = path.resolve(path.join(subWorkspace, "src"));
  const inputDir = path.resolve(path.join(subWorkspace, "input"));
  const outputDir = path.resolve(path.join(subWorkspace, "output"));
  const lang = options.language;

  if (!fs.existsSync(subWorkspace)) {
    fs.mkdirSync(subWorkspace);
  }

  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }

  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const timeFilename = `time`;
  const stdoutFilename = `stdout`;
  const compileStdoutFilename = `compile.stdout`;
  const compileStderrFilename = `compile.stderr`;
  const stderrFilename = `stderr`;

  const timePath = path.resolve(path.join(subWorkspace, timeFilename));
  const stdoutPath = path.resolve(path.join(subWorkspace, stdoutFilename));
  const stderrPath = path.resolve(path.join(subWorkspace, stderrFilename));
  const compileStdoutPath = path.resolve(path.join(subWorkspace, compileStdoutFilename));
  const compileStderrPath = path.resolve(path.join(subWorkspace, compileStderrFilename));

  for (const file of files) {
    const filePath = path.resolve(path.join(srcDir, file.filename));
    console.log(`Writing file to ${filePath}`)
    await writeFile(filePath, file.content);
  }

  for (const file of input) {
    const filePath = path.resolve(path.join(inputDir, file.filename));
    await writeFile(filePath, file.content);
  }

  try {
    return await new Promise(async (resolve) => {
      await writeFile(timePath, "");
      await writeFile(stdoutPath, "");
      await writeFile(stderrPath, "");
      await writeFile(compileStdoutPath, "");
      await writeFile(compileStderrPath, "");

      const args = [
        'run',
        "--rm",
        "-v",
        `${srcDir}:/exc/src`,
        "-v",
        `${inputDir}:/exc/input`,
        "-v",
        `${outputDir}:/exc/output`,
        "-v",
        `${timePath}:/exc/${timeFilename}`,
        "-v",
        `${stdoutPath}:/exc/${stdoutFilename}`,
        "-v",
        `${stderrPath}:/exc/${stderrFilename}`,
        "-v",
        `${compileStdoutPath}:/exc/${compileStdoutFilename}`,
        "-v",
        // `/Users/user/git/colosseum/executioner/runtimes/languages/gcc/entrypoint.sh:/exc/entrypoint.sh`,
        // "-v",
        `${compileStderrPath}:/exc/${compileStderrFilename}`,
        "-i",
        `${IMAGE_BASE}${lang}`
      ];

      const child = cp.spawn('docker', args);
      console.log(child.spawnargs.join(' '))

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        stdout += data;
      });

      child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        stderr += data;
      });

      child.on('close', async (code) => {
        console.log(`child process exited with code ${code}`);

        const outputs = fs.readdirSync(outputDir);

        const output = [];

        for (const inp of input) {
          const stdoutPath = path.resolve(path.join(outputDir, `${inp.filename}.stdout`));
          const stderrPath = path.resolve(path.join(outputDir, `${inp.filename}.stderr`));
          const timePath = path.resolve(path.join(outputDir, `${inp.filename}.time`));
          const stdout = await readIfExists(stdoutPath);
          
          const stderr = await readIfExists(stderrPath);
          const time = await readIfExists(timePath);

          let parsedTime = null;
          if (time) {
            const timeSplits = time.split("\n").map((t) => t.trim()).filter(x => x).map(x => x.split("\t"));
            const [ realTime ] = timeSplits;
            parsedTime = parseDuration(realTime[1]);
          }

          output.push({
            id: inp.id,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            time: parsedTime,
            metadata: inp.metadata,
          });
        }

        resolve(output);
      });

      console.log('child', child.pid);
    });
  } catch (e) {
    console.error(e);
  } finally {
    if (fs.existsSync(subWorkspace)) {
      fs.rmSync(subWorkspace, { recursive: true });
    }
  }
};
