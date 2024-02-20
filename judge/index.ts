export function judge(lang: string, code: string) {
  console.log('judge');
}

judge('c', `
#include <stdio.h>
int main() {
  printf("hello world");
  return 0;
}
`);