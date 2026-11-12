import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { v4 } from 'uuid';

import { readFile, writeFile } from 'fs/promises';
import { getServerCaps, resolveLimits } from './limits';

type LanguageOptions = {
  [key: string]: string | number | null | undefined;
  language: string;
  entrypointFile: string;
  // Requested limits (from the language). Capped by this server's capabilities, see limits.ts
  maxCpuTime?: number | string | null;
  maxMemory?: number | string | null;
  // Interactive problem support
  interactive?: string; // '1' when interactive
  interactorSource?: string;
  checkerSource?: string;
};

type File = {
  id?: string;
  filename: string;
  content: string;
  metadata?: any;
};

// One core per execution by default, with one concurrent job per core (see index.ts), so executions do not
// steal CPU from each other (a compile in one container must not slow the timed run in another).
// Set to 0 to remove the quota.
const CPU_LIMIT_PER_EXECUTION = (process.env.CPU_LIMIT_PER_EXECUTION ?? '1') === '0' ? undefined : (process.env.CPU_LIMIT_PER_EXECUTION ?? '1');
const COMPILE_HEADROOM_MB = parseInt(process.env.COMPILE_HEADROOM_MB || '1024');
const PIDS_LIMIT_PER_EXECUTION = process.env.PIDS_LIMIT_PER_EXECUTION ?? '256';
// Safety net for programs that wait without using the CPU (sleep, blocked read). The verdict itself is on CPU time.
const WALL_FACTOR = Number(process.env.WALL_FACTOR || '4');
const WALL_SLACK_SECONDS = Number(process.env.WALL_SLACK_SECONDS || '5');
const COMPILE_TIMEOUT_SECONDS = process.env.COMPILE_TIMEOUT_SECONDS || '60';
const OUTPUT_LIMIT_MB = parseInt(process.env.OUTPUT_LIMIT_MB || '4');
// Optional: run the runtime image for another CPU architecture (for example linux/arm64, emulated or native)
const PLATFORM = process.env.EXECUTION_PLATFORM;
const ENABLE_NETWORK_IN_EXECUTION = process.env.ENABLE_NETWORK_IN_EXECUTION === 'true';
const IMAGE_BASE = process.env.IMAGE_BASE || 'ghcr.io/42dotmk/colosseum-executioner-';
const WORKDIR = process.env.WORKDIR || '_work';

const normalizeRuntimeLanguage = (language: string) => {
  if (!language) {
    return language;
  }

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
  if (!duration) {
    console.error(`Received invalid duration '${duration}'`);
    return null;
  }
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
  const lang = normalizeRuntimeLanguage(options.language);

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

  // Write interactor and checker sources for interactive problems
  if (options.interactive === '1') {
    if (options.interactorSource) {
      await writeFile(path.resolve(path.join(srcDir, 'interactor.cpp')), options.interactorSource);
    }
    if (options.checkerSource) {
      await writeFile(path.resolve(path.join(srcDir, 'checker.cpp')), options.checkerSource);
    }
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

      const extraArgs = [];

      if (CPU_LIMIT_PER_EXECUTION) {
        extraArgs.push(`--cpus=${CPU_LIMIT_PER_EXECUTION}`);
      }

      const limits = resolveLimits(options, getServerCaps());
      console.log(`Limits for this execution: ${limits.timeSeconds}s, ${limits.memoryMb}MB (deadline ${limits.enforcedTimeSeconds}s on this server)`);
      // The container ceiling leaves headroom for compiling (g++ needs ~600MB); the run itself is held to
      // MEMORY_LIMIT_MB by the runtime (RLIMIT_AS, set by /exc/runner). memory-swap equal to memory disables
      // swap so the ceiling cannot be dodged.
      const containerMemoryMb = limits.memoryMb + COMPILE_HEADROOM_MB;
      extraArgs.push(`--memory=${containerMemoryMb}m`, `--memory-swap=${containerMemoryMb}m`);
      // EXECUTION_TIMEOUT is the CPU time limit on this server (scaled for its speed); the verdict is on CPU time,
      // so it does not depend on how busy the machine is. TIME_LIMIT_DISPLAY is the limit the participant is told about. OUTPUT_LIMIT_MB caps what a program may write to stdout.
      extraArgs.push(
        '-e', `EXECUTION_TIMEOUT=${limits.enforcedTimeSeconds}`,
        '-e', `TIME_LIMIT_DISPLAY=${limits.timeSeconds}`,
        '-e', `MEMORY_LIMIT_MB=${limits.memoryMb}`,
        '-e', `WALL_TIMEOUT=${Number((limits.enforcedTimeSeconds * WALL_FACTOR + WALL_SLACK_SECONDS).toFixed(3))}`,
        '-e', `COMPILE_TIMEOUT=${COMPILE_TIMEOUT_SECONDS}`,
        '-e', `OUTPUT_LIMIT_MB=${OUTPUT_LIMIT_MB}`,
      );
      if (PLATFORM) {
        extraArgs.push(`--platform=${PLATFORM}`);
      }
      if (PIDS_LIMIT_PER_EXECUTION) {
        extraArgs.push(`--pids-limit=${PIDS_LIMIT_PER_EXECUTION}`);
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
        `${compileStderrPath}:/exc/${compileStderrFilename}`,
        ...extraArgs,
        "-i",
        `${IMAGE_BASE}${lang}`
      ];

      const child = cp.spawn('docker', args);
      console.log(child.spawnargs.join(' '))

      let runtimeStdout = '';
      let runtimeStderr = '';
      let spawnError: string | null = null;

      child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        runtimeStdout += data;
      });

      child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        runtimeStderr += data;
      });

      child.on('error', (err) => {
        spawnError = err instanceof Error ? err.message : String(err);
        console.error(`docker spawn error: ${spawnError}`);
      });

      child.on('close', async (code) => {
        console.log(`child process exited with code ${code}`);

        const output = [];
        const dockerErrorDetails = [spawnError, runtimeStderr.trim(), runtimeStdout.trim()]
          .filter(Boolean)
          .join("\n")
          .trim();

        for (const inp of input) {
          const stdoutPath = path.resolve(path.join(outputDir, `${inp.filename}.stdout`));
          const stderrPath = path.resolve(path.join(outputDir, `${inp.filename}.stderr`));
          const timePath = path.resolve(path.join(outputDir, `${inp.filename}.time`));
          const stdout = await readIfExists(stdoutPath);
          
          let stderr = await readIfExists(stderrPath);

          if (!stdout && !stderr && code !== 0) {
            stderr = dockerErrorDetails
              ? `Execution runtime failed (exit code ${code}):\n${dockerErrorDetails}`
              : `Execution runtime failed (exit code ${code})`;
          }

          const time = await readIfExists(timePath);

          let parsedTime = null;
          if (time) {
            // The runtime writes the CPU seconds the program used, for example "0.123"
            const plain = time.trim().match(/^\d+(?:\.\d+)?$/);
            if (plain) {
              parsedTime = Number(plain[0]);
            } else {
              console.error(`Failed to parse time from ${time}`);
            }
          }

          output.push({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            time: parsedTime,
            // peak resident memory of the program in MB, reported next to the time
            memory: Number((await readIfExists(path.resolve(path.join(outputDir, `${inp.filename}.mem`)))).trim()) || null,
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
