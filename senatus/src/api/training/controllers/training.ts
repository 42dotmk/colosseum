/**
 * training router
 */

import { factories } from '@strapi/strapi';
import { TrainingProblemLike } from '../../event/controllers/event';
import { calculateSubmissionScore } from '../../../utils/scoring';
import { calculateProblemSubmissionStats } from '../../../utils/scoring';
import { getCurrentUser } from '../../../utils/current-user';

export default {
  async trainingProblems(ctx) {
		const now = Date.now();
		const user = await getCurrentUser(strapi, ctx);

		const endedEvents = await strapi.documents('api::event.event').findMany({
			filters: {
				end: {
					$lt: now,
				},
			},
			populate: ['problems'],
		});
		const problems = ((endedEvents || []) as any[])
			.flatMap((event) => (event.problems || [])
			  .map((problem: any) => ({...problem, eventId: event.documentId, eventTitle: event.title})))
			.filter((problem: any) => !!problem?.documentId) as TrainingProblemLike[];
		//*/

		const rawSubmissions = await strapi.documents('api::submission.submission').findMany({
			filters: {
				user: {
					documentId: user.documentId,
				},
			},
			populate: {
				problem: {
					fields: ['documentId', 'points'],
					populate: {
						testCases: true,
						event: {
							fields: ['end']
						}
					}
				},
				executions: {
					populate: {
						testCase: true
					}
				}
			},
			sort: ['createdAt:asc']
		});
		const submissions = rawSubmissions.filter((submission: any) => submission?.metadata?.mode !== 'competition')

		const submissionsWithScore = submissions.map((submission : any) => {
			const result = calculateSubmissionScore(submission.problem, submission.executions || [], true);
			return {
				...submission,
				score: result.score,
				maxScore: result.problemMaxScore
			}
		});
		const problemsWithScores = problems.map((problem) => {
			const submissionsForProblem = submissionsWithScore.filter(
				(submission : any) => submission.problem.documentId === problem.documentId
			);
			const bestSubmission = calculateProblemSubmissionStats(submissionsForProblem);
			return {
				...problem,
				...bestSubmission
			}
		})
		ctx.body = problemsWithScores;
	},
};
