package utils

import (
	"regexp"
	"strconv"
)

func parseTime(minutes string, seconds string) int64 {
	min, _ := strconv.Atoi(minutes)
	sec, _ := strconv.ParseFloat(seconds, 64)
	return int64((float64(min*60) + sec) * 1000)
}

func ParseTime(timeStr string) int {
	re := regexp.MustCompile(`real\s+(\d+)m([\d.]+)s`)
	matches := re.FindStringSubmatch(timeStr)
	if len(matches) != 3 {
		return 0
	}

	return int(parseTime(matches[1], matches[2]))
}
