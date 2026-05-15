import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { v4 } from 'uuid';
import { readFile, writeFile } from 'fs/promises';

type LanguageOptions = {
  [key: string]: string | undefined;
  language: string;
  entrypointFile: string;
  timeLimitMs: string;
  memoryLimitMb: string;
  interactive?: string;
  interactorSource?: string;
  checkerSource?: string;
};

type File = {
  id?: string;
  filename: string;
  content: string;
  metadata?: any;
};

const CPU_LIMIT_PER_EXECUTION = process.env.CPU_LIMIT_PER_EXECUTION;
const ENABLE_NETWORK_IN_EXECUTION = process.env.ENABLE_NETWORK_IN_EXECUTION === 'true';
const IMAGE_BASE = process.env.IMAGE_BASE || 'ghcr.io/42dotmk/colosseum-executioner-';
const WORKDIR = process.env.WORKDIR || '_work';

const normalizeRuntimeLanguage = (language: string) => {
  if (!language) return language;
  const normalized = language.toLowerCase();
  if (normalized === 'cpp' || normalized === 'c++' || normalized === 'cxx') {
    return 'gcc';
  }
  return normalized;
};

if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR);
}

function parseDuration(duration: string) {
  if (!duration) return null;
  const match = duration.match(/(\d+)m(\d+(?:\.\d+)?)s/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

const readIfExists = async (filePath: string) => {
  if (fs.existsSync(filePath)) {
    return (await readFile(filePath)).toString();
  }
  return '';
};

export const execute = async (files: File[], input: File[], options: LanguageOptions) => {
  const id = v4();
  const subWorkspace = path.join(WORKDIR, id);
  const srcDir = path.resolve(path.join(subWorkspace, "src"));
  const inputDir = path.resolve(path.join(subWorkspace, "input"));
  const outputDir = path.resolve(path.join(subWorkspace, "output"));
  const lang = normalizeRuntimeLanguage(options.language);

  // Ensure workspace directories exist
  [subWorkspace, srcDir, inputDir, outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  });

  const timeFilename = `time`;
  const stdoutFilename = `stdout`;
  const stderrFilename = `stderr`;
  const compileStdoutFilename = `compile.stdout`;
  const compileStderrFilename = `compile.stderr`;

  const timePath = path.resolve(path.join(subWorkspace, timeFilename));
  const stdoutPath = path.resolve(path.join(subWorkspace, stdoutFilename));
  const stderrPath = path.resolve(path.join(subWorkspace, stderrFilename));
  const compileStdoutPath = path.resolve(path.join(subWorkspace, compileStdoutFilename));
  const compileStderrPath = path.resolve(path.join(subWorkspace, compileStderrFilename));

  // Write source files
  for (const file of files) {
    await writeFile(path.resolve(path.join(srcDir, file.filename)), file.content);
  }

  if (options.interactive === '1') {
    if (options.interactorSource) {
      await writeFile(path.resolve(path.join(srcDir, 'interactor.cpp')), options.interactorSource);
    }
    if (options.checkerSource) {
      await writeFile(path.resolve(path.join(srcDir, 'checker.cpp')), options.checkerSource);
    }
  }

  // Write input files
  for (const file of input) {
    await writeFile(path.resolve(path.join(inputDir, file.filename)), file.content);
  }

  try {
    // Pass BOTH resolve and reject to the execution Promise
    return await new Promise(async (resolve, reject) => {
      await writeFile(timePath, "");
      await writeFile(stdoutPath, "");
      await writeFile(stderrPath, "");
      await writeFile(compileStdoutPath, "");
      await writeFile(compileStderrPath, "");

      const timeLimitMs = options.timeLimitMs;
      const memoryLimitMb = options.memoryLimitMb;
      const extraArgs = [];

      extraArgs.push(`--memory=${memoryLimitMb}m`);
      extraArgs.push(`--memory-swap=${memoryLimitMb}m`);

      if (CPU_LIMIT_PER_EXECUTION) {
        extraArgs.push(`--cpus=${CPU_LIMIT_PER_EXECUTION}`);
      }

      if (!ENABLE_NETWORK_IN_EXECUTION) {
        extraArgs.push("--network=none");
      }

      if (options.interactive === '1') {
        extraArgs.push(`-e`, `INTERACTIVE=1`);
        extraArgs.push(`-e`, `SOLUTION_FILE=${options.entrypointFile}`);
      }

      const args = [
        'run',
        "--rm",
        "-v", `${srcDir}:/exc/src`,
        "-v", `${inputDir}:/exc/input`,
        "-v", `${outputDir}:/exc/output`,
        "-v", `${timePath}:/exc/${timeFilename}`,
        "-v", `${stdoutPath}:/exc/${stdoutFilename}`,
        "-v", `${stderrPath}:/exc/${stderrFilename}`,
        "-v", `${compileStdoutPath}:/exc/${compileStdoutFilename}`,
        "-v", `${compileStderrPath}:/exc/${compileStderrFilename}`,
        ...extraArgs,
        `${IMAGE_BASE}${lang}` // Removed "-i" to prevent stalling unless explicit stdin is provided
      ];

      let child: cp.ChildProcess;
      let isTimeout = false;

      try {
        child = cp.spawn('docker', args);
      } catch (err) {
        reject(err);
        return;
      }

      const timeout = setTimeout(() => {
        isTimeout = true;
        console.log(`Execution timed out after ${timeLimitMs} ms, killing container...`);
        child.kill('SIGKILL');
      }, parseInt(timeLimitMs) + 2000);

      let runtimeStdout = '';
      let runtimeStderr = '';
      let spawnError: string | null = null;

      child.stdout?.on('data', (data) => { runtimeStdout += data; });
      child.stderr?.on('data', (data) => { runtimeStderr += data; });
      child.on('error', (err) => { spawnError = err.message; });

      child.on('close', async (code, signal) => {
        clearTimeout(timeout);

        const output = [];
        const dockerErrorDetails = [spawnError, runtimeStderr.trim(), runtimeStdout.trim()]
          .filter(Boolean)
          .join("\n")
          .trim();

        // Fallback global compilation errors from container lifecycle
        const compilationErr = await readIfExists(compileStderrPath);

        for (const inp of input) {
          // Double-check path generation scheme matching your image's output location
          const specStdoutPath = path.resolve(path.join(outputDir, `${inp.filename}.stdout`));
          const specStderrPath = path.resolve(path.join(outputDir, `${inp.filename}.stderr`));
          const specTimePath = path.resolve(path.join(outputDir, `${inp.filename}.time`));

          // Try reading problem-specific output, fall back to global volume logs if empty
          let stdout = await readIfExists(specStdoutPath);
          if (!stdout && !compilationErr) stdout = await readIfExists(stdoutPath);

          let stderr = await readIfExists(specStderrPath);
          if (!stderr) stderr = await readIfExists(stderrPath);

          if (!stdout && !stderr && code !== 0) {
            if (signal === 'SIGKILL' || code === 137) stderr = "Time limit exceeded";
            else if (isTimeout) stderr = "Time limit exceeded";
            else if (compilationErr) stderr = `Compilation Error:\n${compilationErr}`;
            else if (dockerErrorDetails) stderr = `Execution failed: ${dockerErrorDetails}`;
            else stderr = `Execution failed with exit code ${code}`;
          }

          const time = await readIfExists(specTimePath) || await readIfExists(timePath);
          let parsedTime = null;
          if (time) {
            const timeSplits = time.split("\n").map((t) => t.trim()).filter(x => x).map(x => x.split("\t"));
            if (timeSplits.length > 0 && timeSplits[0][1]) {
              parsedTime = parseDuration(timeSplits[0][1]);
            }
          }

          output.push({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            time: parsedTime,
            metadata: inp.metadata,
          });
        }

        resolve(output);

        // Cleanup workspace
        if (fs.existsSync(subWorkspace)) {
          fs.rmSync(subWorkspace, { recursive: true });
        }
      });
    });
  } catch (err) {
    console.error('execution error', err);
    if (fs.existsSync(subWorkspace)) {
      fs.rmSync(subWorkspace, { recursive: true });
    }
    return [];
  }
};