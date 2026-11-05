/*
 * runner: runs one participant program and judges it on CPU time, not on wall-clock time.
 *
 * Why: a wall-clock limit makes the verdict depend on how busy the machine is (other jobs, a noisy
 * neighbour, container throttling). CPU time is what the program itself consumed, so scheduling, CPU quotas
 * and queueing do not change it. What no software can remove is the speed of the silicon itself: shared
 * caches, frequency scaling and hybrid (fast and slow) cores change how long the same instructions take.
 * Judging hosts should therefore use homogeneous cores at a fixed frequency and not run other heavy work.
 *
 * Usage:
 *   runner --cpu SECONDS --wall SECONDS [--mem MB] [--fsize MB] [--time-file PATH] [--uid UID] -- cmd args...
 *
 *   --cpu        CPU time limit (user + system, all threads and reaped children)
 *   --wall       safety net only: stops programs that wait without using the CPU (sleep, blocked read)
 *   --mem        address space limit (RLIMIT_AS), checked by the kernel on every allocation
 *   --fsize      largest file the program may write (stdout redirected to a file counts), in MB
 *   --time-file  receives the CPU seconds the program used, for example "0.123"
 *   --mem-file   receives the peak resident memory of the program in MB, for example "52.31"
 *   --uid        run the program as this unprivileged user (and group), with no way to regain privileges
 *
 * Exit status: 124 CPU limit exceeded, 125 wall-clock safety net hit, otherwise the program's own status
 * (128 + signal when it was killed by a signal).
 */
#define _GNU_SOURCE
#include <errno.h>
#include <grp.h>
#include <math.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static double mono_now(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec + ts.tv_nsec / 1e9;
}

/* CPU seconds used so far by the process (all threads) and the children it already reaped. */
static double cpu_used(pid_t pid) {
  char path[64], buf[1024];
  snprintf(path, sizeof path, "/proc/%d/stat", (int)pid);
  FILE *f = fopen(path, "r");
  if (!f) return -1;
  size_t n = fread(buf, 1, sizeof buf - 1, f);
  fclose(f);
  buf[n] = 0;
  char *p = strrchr(buf, ')'); /* the command name may contain spaces and parentheses */
  if (!p) return -1;
  unsigned long ut, st;
  long cut, cst;
  if (sscanf(p + 2, "%*c %*d %*d %*d %*d %*d %*u %*u %*u %*u %*u %lu %lu %ld %ld", &ut, &st, &cut, &cst) != 4) return -1;
  return (double)(ut + st + cut + cst) / (double)sysconf(_SC_CLK_TCK);
}

static void limit(int resource, rlim_t soft, rlim_t hard) {
  struct rlimit rl = {soft, hard};
  setrlimit(resource, &rl);
}

int main(int argc, char **argv) {
  double cpu_limit = 10, wall_limit = 60;
  long mem_mb = 0, fsize_mb = 0;
  const char *time_file = NULL, *mem_file = NULL;
  long uid = -1;
  int i = 1;
  for (; i < argc; i++) {
    if (!strcmp(argv[i], "--")) { i++; break; }
    if (i + 1 >= argc) break;
    if (!strcmp(argv[i], "--cpu")) cpu_limit = atof(argv[++i]);
    else if (!strcmp(argv[i], "--wall")) wall_limit = atof(argv[++i]);
    else if (!strcmp(argv[i], "--mem")) mem_mb = atol(argv[++i]);
    else if (!strcmp(argv[i], "--fsize")) fsize_mb = atol(argv[++i]);
    else if (!strcmp(argv[i], "--time-file")) time_file = argv[++i];
    else if (!strcmp(argv[i], "--mem-file")) mem_file = argv[++i];
    else if (!strcmp(argv[i], "--uid")) uid = atol(argv[++i]);
    else { fprintf(stderr, "runner: unknown option %s\n", argv[i]); return 2; }
  }
  if (i >= argc) { fprintf(stderr, "runner: no command\n"); return 2; }

  pid_t pid = fork();
  if (pid < 0) { perror("runner: fork"); return 2; }
  if (pid == 0) {
    setpgid(0, 0); /* own process group so everything the program starts can be stopped together */
    limit(RLIMIT_CORE, 0, 0);
    if (mem_mb > 0) limit(RLIMIT_AS, (rlim_t)mem_mb << 20, (rlim_t)mem_mb << 20);
    if (fsize_mb > 0) limit(RLIMIT_FSIZE, (rlim_t)fsize_mb << 20, (rlim_t)fsize_mb << 20);
    /* backstop in whole seconds, in case this supervisor were ever stopped */
    limit(RLIMIT_CPU, (rlim_t)ceil(cpu_limit) + 2, (rlim_t)ceil(cpu_limit) + 3);
    if (uid >= 0) {
      if (setgroups(0, NULL) != 0 || setgid((gid_t)uid) != 0 || setuid((uid_t)uid) != 0) {
        perror("runner: cannot drop privileges");
        _exit(126);
      }
      prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
    }
    execvp(argv[i], &argv[i]);
    perror("runner: exec");
    _exit(127);
  }
  setpgid(pid, pid);

  const double started = mono_now();
  const struct timespec tick = {0, 2 * 1000 * 1000}; /* 2 ms */
  int status = 0, reason = 0; /* 1 = cpu, 2 = wall */
  struct rusage ru;
  memset(&ru, 0, sizeof ru);

  for (;;) {
    pid_t w = wait4(pid, &status, WNOHANG, &ru);
    if (w == pid) break;
    if (w < 0 && errno != EINTR) break;
    double cpu = cpu_used(pid);
    if (cpu > cpu_limit) reason = 1;
    else if (mono_now() - started > wall_limit) reason = 2;
    if (reason) {
      kill(-pid, SIGKILL);
      while (wait4(pid, &status, 0, &ru) < 0 && errno == EINTR) {}
      break;
    }
    nanosleep(&tick, NULL);
  }
  kill(-pid, SIGKILL); /* nothing the program started may outlive it */

  double used = (ru.ru_utime.tv_sec + ru.ru_utime.tv_usec / 1e6 + ru.ru_stime.tv_sec + ru.ru_stime.tv_usec / 1e6);
  /* a program that finished between two checks but used more than its limit is still over the limit */
  if (!reason && used > cpu_limit) reason = 1;

  if (mem_file) {
    /* peak resident memory of the program in MB (the largest of it and the children it waited for) */
    FILE *f = fopen(mem_file, "w");
    if (f) { fprintf(f, "%.2f\n", ru.ru_maxrss / 1024.0); fclose(f); }
  }
  if (time_file) {
    FILE *f = fopen(time_file, "w");
    if (f) { fprintf(f, "%.3f\n", used); fclose(f); }
  }
  if (reason == 1) return 124;
  if (reason == 2) return 125;
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
  return 1;
}
