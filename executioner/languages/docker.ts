import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { v4 } from 'uuid';

import { readFile, writeFile } from 'fs/promises';

type LanguageOptions = {
  language: string;
  entrypointFile: string;
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
  interactive?: string;
  interactorSource?: string;
  checkerSource?: string;
  [key: string]: string | number | undefined;
};

type File = {
  id?: string;
  filename: string;
  content: string;
  metadata?: any;
};

type ExecutionResult = {
  stdout: string;
  stderr: string;
  time: number | null;
  memoryKb: number | null;
  verdict: string | null;
  metadata: any;
};

// Extra MB added to --memory so bash/time/timeout overhead doesn't eat into
// the problem's stated limit. The soft RSS check below enforces the actual limit.
const MEMORY_OVERHEAD_MB = 16;

const CPU_LIMIT_PER_EXECUTION = process.env.CPU_LIMIT_PER_EXECUTION;
const DEFAULT_MEMORY_LIMIT = process.env.MEMORY_LIMIT_PER_EXECUTION ?? '256m';
const DEFAULT_TIME_LIMIT_SECONDS = parseFloat(process.env.EXECUTION_TIMEOUT ?? '10');
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
    return await new Promise<ExecutionResult[]>(async (resolve) => {
      await writeFile(timePath, "");
      await writeFile(stdoutPath, "");
      await writeFile(stderrPath, "");
      await writeFile(compileStdoutPath, "");
      await writeFile(compileStderrPath, "");

      const extraArgs = [];

      if (CPU_LIMIT_PER_EXECUTION) {
        extraArgs.push(`--cpus=${CPU_LIMIT_PER_EXECUTION}`);
      }

      const effectiveMemoryMb = options.memoryLimitMb
        ? options.memoryLimitMb + MEMORY_OVERHEAD_MB
        : DEFAULT_MEMORY_LIMIT;
      const effectiveMemoryStr = typeof effectiveMemoryMb === 'number'
        ? `${effectiveMemoryMb}m`
        : effectiveMemoryMb;
      extraArgs.push(`--memory=${effectiveMemoryStr}`);
      // Setting memory-swap equal to memory disables swap, so OOM kill is
      // immediate and deterministic rather than relying on the host's swap space.
      extraArgs.push(`--memory-swap=${effectiveMemoryStr}`);

      const effectiveTimeout = options.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS;
      extraArgs.push(`-e`, `EXECUTION_TIMEOUT=${effectiveTimeout}`);

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
          const verdictPath = path.resolve(path.join(outputDir, `${inp.filename}.verdict`));
          const stdout = await readIfExists(stdoutPath);

          let stderr = await readIfExists(stderrPath);

          if (!stdout && !stderr && code !== 0) {
            stderr = dockerErrorDetails
              ? `Execution runtime failed (exit code ${code}):\n${dockerErrorDetails}`
              : `Execution runtime failed (exit code ${code})`;
          }

          const timeContent = await readIfExists(timePath);
          let parsedTime: number | null = null;
          let parsedMemoryKb: number | null = null;
          if (timeContent) {
            // GNU time may prepend "Command exited with non-zero status N\n"
            // on non-zero exits. Scan lines in reverse for the "seconds kb" line.
            const lines = timeContent.trim().split('\n').reverse();
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length === 2) {
                const t = parseFloat(parts[0]);
                const m = parseInt(parts[1], 10);
                if (!isNaN(t) && !isNaN(m)) {
                  parsedTime = t;
                  parsedMemoryKb = m;
                  break;
                }
              }
            }
            if (parsedTime === null) {
              console.error(`Failed to parse time from: ${timeContent}`);
            }
          }

          const verdictContent = await readIfExists(verdictPath);
          let verdict = verdictContent.trim() || (code === 137 ? 'MLE' : null);

          const memoryLimitKb = options.memoryLimitMb != null ? options.memoryLimitMb * 1024 : null;

          // Soft RSS check: program completed cleanly but exceeded the problem's
          // memory limit. The overhead buffer means Docker won't hard-kill it in
          // that case, so we enforce the limit here.
          let isSoftMle = false;
          if (verdict === 'OK' && memoryLimitKb !== null && parsedMemoryKb !== null && parsedMemoryKb > memoryLimitKb) {
            verdict = 'MLE';
            isSoftMle = true;
          }

          // Hard MLE (OOM kill): the RSS at kill time reflects the Docker ceiling
          // (memoryLimitMb + MEMORY_OVERHEAD_MB), not the program's real peak, so
          // it's misleadingly high. Cap at the problem limit so callers see a clean
          // lower-bound value ("used at least N KB") rather than Docker internals.
          if (verdict === 'MLE' && !isSoftMle && memoryLimitKb !== null && parsedMemoryKb !== null && parsedMemoryKb > memoryLimitKb) {
            parsedMemoryKb = memoryLimitKb;
          }

          output.push({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            time: parsedTime,
            memoryKb: parsedMemoryKb,
            verdict,
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
