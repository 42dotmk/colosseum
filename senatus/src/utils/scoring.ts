import { isExecutionPassed, shouldUseTestCaseInLiveScore, getSafeWeight, round2 } from '../api/event/controllers/event';
export const DEFAULT_POINTS = 100;
export const calculateSubmissionScore = (
  problem: { documentId: string; points?: number; testCases?: any[] },
  executions: any[],
  eventEnded: boolean,
) => {
    const scopedCases = (problem.testCases || []).filter((testCase) =>
				shouldUseTestCaseInLiveScore(problem, testCase, eventEnded),
			);

			const totalWeight = scopedCases.reduce(
				(sum, testCase) => sum + getSafeWeight(testCase.weight),
				0,
			);

			const executionMap = new Map(
				(executions || [])
					.filter((execution) => execution.testCase?.documentId)
					.map((execution) => [execution.testCase!.documentId, execution]),
			);

			let passedWeight = 0;
			let totalExecutionTime = 0;
            let allProcessed = true;

			for (const testCase of scopedCases) {
				const execution = executionMap.get(testCase.documentId);
				if (!execution?.processed) {
                    allProcessed=false;
					continue;
				}

				const testWeight = getSafeWeight(testCase.weight);

				if (isExecutionPassed(execution)) {
					passedWeight += testWeight;
				}

				if (typeof execution.executionTime === 'number' && execution.executionTime >= 0) {
					totalExecutionTime += execution.executionTime;
				}
			}

			const problemMaxScore = problem.points || DEFAULT_POINTS;
			const rawScore = totalWeight > 0 ? (passedWeight / totalWeight) * problemMaxScore : 0;
            return {
                score: round2(rawScore),
                problemMaxScore,
                totalExecutionTime,
                allProcessed
            }
};
export const calculateProblemSubmissionStats = (submissions: any[]) => {
	if (submissions.length === 0) {
        return {
            lastSubmission: null,
            bestSubmission: null
        }
	}
	let lastSubmission = submissions[submissions.length-1];
	let bestSubmission = submissions[0];
	for(const submission of submissions)
	{
		if(bestSubmission.score<submission.score)
			bestSubmission=submission;
	}
	return {
		lastSubmission: lastSubmission ? {
			score: lastSubmission.score,
			maxScore: lastSubmission.maxScore,
		} : null,
		bestSubmission: bestSubmission ? {
			score: bestSubmission.score,
			maxScore: bestSubmission.maxScore,
		} : null,
	}
};